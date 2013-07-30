var request = require('request');
var cheerio = require('cheerio');
var Q       = require('q');
var _       = require('underscore');

var DOC_URL = 'http://help.infusionsoft.com';

module.exports = scraper = {

    // Return a promise for a hash of information for all of the infusionsoft
    // API calls
    scrapeDocs: function(url)
    {
        url = url || DOC_URL;

        // Request the page and fire off seperate requests for each service
        return Q.nfcall(request, url + '/api-docs').then(function(data) {

            console.log('docs page loaded');

            var $    = cheerio.load(data);
            var list = $('ul.nav-list li a');
            var serviceRequests = [];

            list.each(function() {
                var href = $(this).attr('href');

                if (/service$/.test(href))
                    serviceRequests.push(
                        scraper.getServiceInterface(url + href));

            });

            // Spread out over all of the promises, when they're all done,
            // we've got the data in the arguments var, iterate over that and
            // build the hash to return
            return Q.spread(serviceRequests, function() {
                console.log('all pages loaded');
                return _(arguments).toArray();
            });

        });
    },

    // Given a URL, parse all of the methods and corresponding parameter names
    // for a Service API endpoint, return promise for node of information
    getServiceInterface: function(href)
    {
        return Q.nfcall(request, href).then(function(data) {
            var $           = cheerio.load(data);
            var serviceName = $('.content h1').text().replace(' API', '').trim();

            var serviceDescription = $('.content').next('p').text();

            console.log(serviceName + ' page loaded');

            var ret = {
                serviceName: serviceName,
                description: serviceDescription,
                methods: []
            };

            // method name
            $('.full_method').each(function() {
                var $el        = $(this);
                var collection  = $el.find('.collection').text().replace('.','').trim();
                var method      = $el.find('.method').text().trim();
                var description = $el.next('p').text();

                ret.methods.push({ name: method, description: description, params: [] });
            });

            // now params
            var index = 0;
            $('table.table-striped').each(function() {
                var node = ret.methods[index++];

                if (!node)
                    return;

                // see if its the correct kind of table
                var headers = $(this).find('thead tr th');
                if (headers.length != 3)
                    return;

                // iterate over all the paramters
                $(this).find('tbody tr').each(function() {
                    var td = $(this).find('td').first().text().trim();
                    if (td != 'Key' && td != 'privateKey')
                        node.params.push(td);
                });
            });

            return ret;
        });
    }
};

