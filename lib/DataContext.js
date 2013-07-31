var typedef   = require('typedef');
var xmlrpc    = require('xmlrpc');
var _         = require('underscore');
var Q         = require('q');
var Queryable = require('./Queryable');

module.exports = DataContext = typedef

// Tracks the API key and app name that let's us query the API services and
// load stuff from the Tables
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
        this._addService(require('../infusionsoft/services/IDataService'));
    },

    _setupTables: function()
    {
        this._addTable(require('../infusionsoft/tables/Contact'));
    },

    // Create a queryable that can be used via data service
    _addTable: function(T)
    {
       this[T.__name__] = new Queryable(T, this.DataService);
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