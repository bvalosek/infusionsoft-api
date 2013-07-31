var xmlrpc  = require('xmlrpc');
var _       = require('underscore');
var typedef = require('typedef');
var Q       = require('q');

module.exports = ApiBase = typedef

.class('ApiBase') .define({

    // Setup the XML client
    __constructor__: function(appName, apiKey)
    {
        this.appName = appName;
        this.apiKey  = apiKey;
        this.client  = xmlrpc.createSecureClient(
            'https://' + this.appName + '.infusionsoft.com/api/xmlrpc');
    },

    // Given an interface with xml-rpc decorations, create a sub class that has
    // public member functions that correspond to the stuff exposed in the
    // interface
    __static__createClass: function(iface)
    {
        var hash       = {};
        var collection = iface.__name__.substring(1);

        _(typedef.signature(iface)).each(function (info, key) {

            // create the function that calls method call and returns a promise
            hash[key] = function() {
                var args       = [this.apiKey].concat(_(arguments).toArray());
                var methodName = collection + '.' + key;
                var d          = Q.defer();

                this.client.methodCall(methodName, args, d.makeNodeResolver());

                return d.promise;
            };
        });

        return typedef.class(collection).extends(ApiBase).define(hash);
    }

});
