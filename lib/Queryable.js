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
        this._page      = 0;
        this._take      = 100;

        this._fields    = T.FIELDS;
        this._orderBy   = 'Id';
        this._ascending = true;

        // Store results for later
        this._results    = [];
    },

    // Copies all of the relevent info to give us a fresh query object to
    // mutate. Shallow(ish) copies for arrays
    clone: function()
    {
        var q = new Queryable(this._T, this.dataService);

        var _this = this;

        ['_page', '_take', '_orderBy', '_ascending'].forEach(function(p) {
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
    forEach: function(fn)
    {

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
        var limit  = q._take;
        var page   = q._page;
        var fields = q._fields;

        // Create the query from our stuff
        var query = {};
        _(q._where.concat(q._like)).each(function (q) {
            query[q.key] = q.value;
        });

        // Execute
        var p = q.dataService.query(table, limit, page, query, fields,
            q._orderBy, q._ascending)

        // Pack results back into <T> and add it to our _results array
        .then(function(results) {
            results.forEach(function(r) {
                var obj = new q._T();
                _(r).each(function(value, key) {
                    obj[key] = value;
                });
                q._results.push(obj);
            });

            // Promise now represents eventual value of the results
            return q._results;
        });

        return p;
    }

});
