var Queryable  = require('./Queryable');
var api        = require('../infusionsoft/api');
var inflection = require('inflection');
var typedef    = require('typedef');
var xmlrpc     = require('xmlrpc');
var _          = require('underscore');
var Q          = require('q');

module.exports = DataContext = typedef

// Tracks the API key and app name that let's us query the API services and
// load stuff from the Tables. Can be setup by providing app name and API key,
// or (eventually) username / login + vendor key (to get a temp key)
//
// Point is to hang all of the (pluralized) tables off of this as well as all
// of the services.
.class('DataContext') .define({

    __constructor__: function(appName, apiKey)
    {
        this.appName = appName;
        this.apiKey  = apiKey;
        this.client  = xmlrpc.createSecureClient(
            'https://' + this.appName + '.infusionsoft.com/api/xmlrpc');

        this._setupServices();
        this._setupTables();
    },

    // Create all of the API services in this data context
    _setupServices: function()
    {
        var _this = this;

        _(api.services).each(function(service, key) {
            _this._addService(service);
        });
    },

    _setupTables: function()
    {
        var _this = this;

        _(api.tables).each(function(table, key) {
            _this._addTable(table);
        });
    },

    // Create a queryable that can be used via data service
    _addTable: function(T)
    {
        var tName = inflection.pluralize(T.__name__);
        this[tName] = new Queryable(T, this.DataService);
    },

    // Given an interface, create and instantiate a class that let's us call
    // all of the methods
    _addService: function(iface)
    {
        var hash        = {};
        var collection  = iface.__name__.substring(1);
        var dataContext = this;

        _(typedef.signature(iface)).each(function (info, key) {

            // create the function that calls method call and returns a promise
            hash[key] = function() {
                var args       = [dataContext.apiKey].concat(_(arguments).toArray());
                var methodName = collection + '.' + key;
                var d          = Q.defer();

                dataContext.client.methodCall(methodName, args, d.makeNodeResolver());

                return d.promise;
            };
        });

        // instantiate a version of this class
        this[collection] = new (typedef.class(collection).define(hash))();
    }

});
