# Infusionsoft API

A promise-driven, fluent-style Node.js wrapper for the XML-RPC [Infusionsoft API](http://help.infusionsoft.com/developers/api-basics).

Write badass Infusionsoft apps on the server that are fully and natively asynchronous.

It's pretty dope.

## Usage

Install via `npm`:

```
$ npm install infusionsoft-api
```

Do cool stuff (like query the infusionsoft tables directly)

```
var DataContext = require('infusionsoft-api/DataContext');

var sdk = new DataContext('myapp', 'MY_API_KEY');

sdk.Contacts
    .where('FirstName', 'Brandon')
    .like('LastName', 'V%')
    .select('Id', 'FirstName', 'LastName', 'Email')
    .orderByDescending('LastName')
    .take(100)
    .toArray()
    .done(function(result) {
        console.log(result);
    });
```

All fields are also static members on the their corresponding class:

```
sdk.Contacts.where(Contact.Id, 12345).first().done( ... )
```


You can also use the API Services:

```
ds.ContactService
    .findByEmail('brandon@aol.com', ['Id', 'FirstName', 'LastName']);
```

Awesome.


## API Scraper

Included is a Node app that will scrape the Infusionsoft API documentation and
update the interfaces in the `infusionsoft` directory. This allows for the
XML-RPC interfaces to be updated as Infusionsoft updates their docs.

This is a double-edged sword; any issues with their documentation will result
in issues with this API wrapper.

To update the auto-generated interfaces for the various API services
(DataService, ContactService, etc), run the `generate` script manually

```
node generator/generate
```

Likewise, run `node generator/generateTables` to update all of the
corresponding tables.

## More Examples

All examples use `sdk` as an instantiated DataContext with your app name and API key. ie:

```
var sdk = new DataContext('myAppName', 'MY_API_KEY');
```

### Get monthly revenue from a particular month

```
sdk.Payments
    .like(Payment.PayDate, '2013-06%')
    .sum(function(x) { return x.PayAmt; })
    .done(function(total) {
        console.log('total revenue: ' + total);
    });
```

## License
Copyright 2013 Brandon Valosek

**Infusionsoft API** is released under the MIT license.

