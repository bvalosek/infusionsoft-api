var request = require('request');
var cheerio = require('cheerio');

var DOC_URL = 'http://help.infusionsoft.com';

// Find all of the service doc pages
request(DOC_URL + '/api-docs', function(err, resp, body){
    var $    = cheerio.load(body);
    var list = $('ul.nav-list li a');

    list.each(function() {
        var href = $(this).attr('href');
        if (/service$/.test(href)) {
            getServiceInterface(href);
        }
    });
});

// Check a service page
function getServiceInterface(href)
{
    request(DOC_URL + href, function(err, resp, body) {
        var $ = cheerio.load(body);
        var serviceName = $('.content h1').text().replace(' API', '').trim();
        console.log(serviceName);

        var methods = [];

        // fill out with method name
        $('.full_method').each(function() {
            var $el = $(this);

            var collection = $el.find('.collection').text().replace('.','').trim();
            var method     = $el.find('.method').text().trim();

            methods.push({ methodName: method, params: [] });

        });

        // now params
        var index = 0;
        $('table.table-striped').each(function() {
            var node = methods[index++];

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

        console.log(methods);
    });
}
