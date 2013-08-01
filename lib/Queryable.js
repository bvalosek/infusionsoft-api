var Q      = require('q');
var _      = require('underscore');
var moment = require('moment');

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
        this._page      = 0;
        this._take      = undefined;

        // A way to run an each function
        this._iterator = undefined;

        // group on the backend
        this._groupBy = undefined;

        this._fields    = T.FIELDS;
        this._orderBy   = 'Id';
        this._ascending = true;

        // Store results for later
        this._results     = [];
        this._doneLoading = false;
    },

    // Copies all of the relevent info to give us a fresh query object to
    // mutate. Shallow(ish) copies for arrays
    clone: function()
    {
        var q = new Queryable(this._T, this.dataService);

        var _this = this;

        ['_page', '_take', '_orderBy', '_ascending', '_doneLoading', '_iterator', '_groupBy']
            .forEach(function(p) {
                q[p] = _this[p];
            });

        ['_where', '_like', '_fields', '_results'].forEach(function(p) {
            q[p] = _(_this[p]).clone();
        });

        return q;
    },

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

    // Basic pagination via infusionsoft
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
        return q;
    },

    // Toggle
    ascending: function(asc)
    {
        var q = this.clone();
        q._ascending = asc !== undefined ? asc : true;
        return q;
    },

    // Leverage ascending
    descending: function()
    {
        return this.clone().ascending(false);
    },

    groupBy: function(g)
    {
        var q = this.clone();
        q._groupBy = g;
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
            q._fields = q._T.FIELDS;

        return q;
    },

    // ------------------------------------------------------------------------
    // Terminator methods. These will all return a promise for the eventual
    // value of the actual query execution


    // Iterate over everything until we've exahausted our TAKE. returns a
    // promise when the iteration is over
    each: function(fn)
    {
        var q = this.clone();
        q._iterator = fn;
        return q.execute();
    },

    // Return a promise for when the results are in the array
    toArray: function()
    {
        return this.clone().execute();
    },

    first: function()
    {
        return this.clone().take(1).execute().then(function(res) {
            return res[0];
        });
    },

    // Actually hit the API. Returns a promise for when we're complete done
    execute: function()
    {
        var q = this.clone();

        var table  = q._T.__name__;
        var page   = q._page;
        var fields = q._fields;
        var take   = q._take;

        // Create the query from our stuff
        var query = {};
        _(q._where.concat(q._like)).each(function (q) {
            query[q.key] = q.value;
        });

        // Easy mode, only need 1 page request
        if (q._take <= 1000) {
            return q._fetch(table, take, page, query, fields);

        // Large amount of take
        } else if (q._take > 1000) {
            var total = q._take;
            var left  = total;
            take      = 1000;

            // Create an array of all of the calls we need to get through the limit
            var reqFunctions = [];
            while (left) {
                reqFunctions.push(
                    q._fetch.bind(q, table, take, page, query, fields));

                // next page, amount to take next is either 1000 or whatever is left
                page++;
                left = left - take;
                take = left < 1000 ? left : 1000;
            }

            for(var n = 0; n < reqFunctions.length; n++) {

            }

            // Run through each call in the array
            return reqFunctions.reduce(Q.when, Q())
                .then(function() {
                    return q._results;
                });

        // Take ALL
        } else {
            take = 1000;
            var doneLoading = Q.defer();

            var loop = function() {
                q._fetch(table, take, page, query, fields).done(function(res) {
                    doneLoading.notify(q._results.length);
                    if (q._doneLoading)
                        doneLoading.resolve(q._getResults());
                    else
                        process.nextTick(loop);

                    page++;
                });
            };

            // do tha damn thing
            loop();
            return doneLoading.promise;
        }
    },

    _getResults: function()
    {
        var results = this._results;

        if (this._groupBy) {
            results = _(results).groupBy(this._groupBy);
        }

        return results;
    },

    // Incrementally hit the API. This is the function that we should
    // bind/store in an array to call sequentially when building stuff up.
    _fetch: function(table, limit, page, query, fields)
    {
        if (this._doneLoading)
            return;

        console.log('fetch', table, limit, page, query);

        var _this = this;

        // Execute
        var p = this.dataService.query(table, limit, page, query, fields,
            this._orderBy, this._ascending)

        // Pack results back into <T> and add it to our _results array
        .then(function(results) {
            results.forEach(function(r) {
                var obj = new _this._T();
                _(r).each(function(value, key) {

                    if (_(value).isDate())
                        value = moment(value);

                    obj[key] = value;
                });
                _this._results.push(obj);

                if (_this._iterator)
                    _this._iterator(obj);
            });

            // If we hit the last page
            if (results.length !== limit)
                _this._doneLoading = true;

            return _this._results;
        });

        return p;
    },

});
