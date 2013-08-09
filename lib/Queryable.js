var Q = require('q');
var _ = require('underscore');

module.exports = Queryable = require('typedef')

// A class that can be used to build up an Infusionsoft DataService query. Each
// of the primary methods mutates the queryable and returns a new one, allowing
// us to piece-wise create the eventually executed function. All actual hits to
// the API return promises for the eventual value
.class('Queryable') .define({

    __constructor__: function(T, dataService)
    {
        // Context info
        this.dataService = dataService;
        this._T          = T;

        // Building up the query
        this._where     = [];
        this._like      = [];
        this._join      = [];
        this._fields    = Queryable.getFields(T);
        this._ascending = true;
        this._page      = 0;
        this._orderBy   = undefined;
        this._take      = undefined;

        // Store results for later
        this._results        = [];
        this._executePromise = undefined;
        this._doneLoading    = false;
    },

    // Attempt to determine all the fields on a given type
    __static__getFields: function(T)
    {
        var ret = [];

        _(typedef.signature(T)).each(function(info, key) {
            if (info.decorations.FIELD)
                ret.push(key);
        });

        return ret;
    },

    // Copies all of the relevent info to give us a fresh query object to
    // mutate. Shallow(ish) copies for arrays
    clone: function()
    {
        var q = new Queryable(this._T, this.dataService);

        var _this = this;

        for (var key in this) {
            if (_(this[key]).isArray())
                q[key] = _(this[key]).clone();
            else
                q[key] = this[key];
        }

        return q;
    },

    // ------------------------------------------------------------------------
    // Query build methods. These just setup the parameters of the query and do
    // not actually execute yet. They all start with cloneing this as to not
    // mutate

    // Add more conditions that we will be feeding to the dataservice
    where: function(key, value, like)
    {
        var q = this.clone();
        var type = like !== undefined ? '_like' : '_where';

        // Can submit either an object or a k/v via arguments
        var opts = {};
        if (!_(key).isObject())
            opts[key] = value;
        else
            opts = key;

        // Add each of the pairs to the where array
        _(opts).each(function(v, k) {
            q[type].push({ key: k, value: v });
        });

        return q;
    },

    // LEverage the where function
    like: function(key, value)
    {
        return this.clone().where.call(this, key, value, true);
    },

    // Set limit
    take: function(n)
    {
        var q = this.clone();
        q._take = n;
        return q;
    },

    // Basic pagination
    page: function(page)
    {
        var q = this.clone();
        q._page = page;
        return q;
    },

    // Field to order results
    orderBy: function(o)
    {
        var q = this.clone();
        q._orderBy = o;
        q._ascending = true;
        return q;
    },

    orderByDescending: function(o)
    {
        var q = this.clone();
        q._orderBy = o;
        q._ascending = false;
        return q;
    },

    // Set what fields we will be using
    select: function(f)
    {
        var q = this.clone();

        if (arguments.length > 1)
            q._fields = _(arguments).toArray();
        else if (f)
            q._fields = _(f).isArray() ? f : [f];
        else
            q._fields = Queryable.getFields(this._T);

        return q;
    },

    // Wow.
    join: function(inner, outerKey, innerKey, selector)
    {
        var q = this.clone();

        q._join.push({
            inner: inner,
            innerKey: innerKey,
            outerKey: outerKey,
            selector: selector
        });

        return q;
    },

    // ------------------------------------------------------------------------
    // Terminator methods. These will all return a promise for the eventual
    // value of the actual query execution

    sum: function(fn)
    {
        return this.execute().then(function(res) {
            return _(res).reduce(function(acc, x) {
                return acc + (0|fn(x));
            }, 0);
        });
    },

    groupBy: function(fn)
    {
        return this.execute().then(function(res) {
            return _(res).groupBy(fn);
        });
    },

    // Return a promise for when the results are in the array
    toArray: function()
    {
        return this.execute();
    },

    first: function()
    {
        if (this._executePromise)
            return this._executePromise.then(function(res) {
                return res[0];
            });

        return this.clone().take(1).execute().then(function(res) {
            return res[0];
        });
    },

    count: function()
    {
        return this.execute().then(function(res) {
            return res.length;
        });
    },

    // Given our joins and other transforms, return the results. Returns a
    // promise incase we are waiting on other stuff to be finished (ie joins)
    _getResults: function()
    {
        if (this._join.length) {

            var results = this._results;

            // Functions we need to call, that return a promise, for the value
            // we're recieving after subsequent joins
            var joins = [];

            this._join.forEach(function(join) {

                var f = function(outer) {
                    var inner = join.inner.toArray();

                    return inner.then(function(inner) {
                        var next = [];
                        outer.forEach(function(o) {
                            var oKey = o[join.outerKey];

                            // find the corresponding thing
                            var i = _(inner).find(function(i) {
                                return i[join.innerKey] == oKey;
                            });

                            if (i)
                                next.push(join.selector(o, i));

                        });
                        return next;
                    });
                };

                joins.push(f);
            });

            // Execute all of the joins, in order, feeding the result into the
            // next join. When they all are done, complete the promise for this
            // result
            return joins.reduce(Q.when, Q(results)).then(function(last) {
                return last;
            });

        } else {
            return Q(this._results);
        }
    },

    // Actually hit the API. Returns a promise for the eventual value of these
    // results. Ends up mutating the query and marking it as done
    //
    // If we already have a promise, return that, meaning that it can only be
    // eecuted once
    execute: function()
    {
        if (this._executePromise)
            return this._executePromise;

        var q = this.clone();

        var table  = q._T.__name__;
        var page   = q._page;
        var fields = q._fields;

        // Create the query from our stuff
        var query = {};
        _(q._where.concat(q._like)).each(function (q) {
            query[q.key] = q.value;
        });

        var doneLoading      = Q.defer();
        this._executePromise = doneLoading.promise;

        var left = q._take;

        // A single iteration of fetching via the API. Called repeatedly in
        // the case of large / unbounded TAKES
        var loop = function() {

            // always take 1000 unless we're almost done
            var take = left < 1000 ? left : 1000;

            // Hit the API and incremement the page
            q._fetch(table, take, page++, query, fields).done(function(res) {

                // publish progress
                doneLoading.notify(q._results.length);

                if (left !== undefined) left -= res.length;

                // Either resolve the the promise with the results if we're
                // done or call the loop again

                if (q._doneLoading || left <= 0)
                    doneLoading.resolve(q._getResults());
                else
                    process.nextTick(loop);

            });
        };

        // do tha damn thing
        loop();
        return doneLoading.promise;
    },

    // Where the actual API call is fired off. Returns a promise for the
    // eventual raw value from the API call
    _fetch: function(table, limit, page, query, fields)
    {
        if (this._doneLoading)
            return;

        var _this = this;

        // Execute -- add orderBy and ascending?
        var args = [table, limit, page, query, fields];
        if (this._orderBy) {
            args.push(this._orderBy);
            args.push(this._ascending);
        }

        var p = this.dataService.query.apply(this.dataService.query, args)

        // Pack results back into <T> and add it to our _results array
        .then(function(results) {
            results.forEach(function(r) {
                var obj = new _this._T();
                _(r).each(function(value, key) {
                    obj[key] = value;
                });
                _this._results.push(obj);
            });

            // If we hit the last page
            if (results.length !== limit)
                _this._doneLoading = true;

            return _this._results;
        });

        return p;
    },

});
