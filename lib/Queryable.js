var _ = require('underscore');

module.exports = Queryable = require('typedef')

// A class that can be used to build up an Infusionsoft DataService query
.class('Queryable') .define({

    __constructor__: function(T, dataService)
    {
        this.dataService = dataService;
        this._T          = T;
        this._results    = [];
        this._where      = [];
        this._fields     = [];
        this._like       = [];
        this._page       = 0;
        this._take       = 100;
        this._orderBy    = 'Id';
        this._ascending  = true;
    },

    // Add more conditions that we will be feeding to the dataservice
    __fluent__where: function(key, value, like)
    {
        var type = like !== undefined ? '_like' : '_where';

        // Can submit either an object or a k/v via arguments
        var opts = {};
        if (!_(key).isObject())
            opts[key] = value;
        else
            opts = key;

        // Add each of the pairs to the where array
        var _this = this;
        _(opts).each(function(v, k) {
            _this[type].push({ key: k, value: v });
        });

        return this;
    },

    // LEverage the where function
    __fluent__like: function(key, value)
    {
        this.where.call(this, key, value, true);
        return this;
    },

    __fluent__take: function(n)
    {
        this._take = n;
        return this;
    },

    __fluent__page: function(page)
    {
        this._page = page;
        return this;
    },

    __fluent__orderBy: function(o)
    {
        this._orderBy = o;
        return this;
    },

    __fluent__ascending: function()
    {
        this._ascending = true;
        return this;
    },

    __fluent__descending: function()
    {
        this._ascending = false;
        return this;
    },

    select: function(f)
    {
        // The fields can be explicitly passed in via an array or singular
        // string, or just do ALL of them
        var fields;
        if (arguments.length > 1)
            fields = _(arguments).toArray();
        else if (f)
            fields = _(f).isArray() ? f : [f];
        else
            fields = this._T.FIELDS;

        var table  = this._T.__name__;
        var limit  = this._take;
        var page   = this._page;

        // Singluar where, no likes, not ascending and not ordering by
        if (this._where.length == 1 && !this._like.length && !this._ascending &&
           !this._orderBy) {
            var key   = this._where[0].key;
            var value = this._where[0].value;

            return this.dataService.findByField(
                table, limit, page, key, value, fields);

        // otherwise use query style
        } else {
            var query = {};
            _(this._where.concat(this._like)).each(function (q) {
                query[q.key] = q.value;
            });

            if (this._orderBy)
                return this.dataService.query(
                    table, limit, page, query, fields, this._orderBy,
                    this._ascending);
            else
                return this.dataService.query(
                    table, limit, page, query, fields);
        }
    }

});
