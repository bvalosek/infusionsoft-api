# Infusionsoft API

A promise-driven, fluent-style Node.js wrapper for the XML-RPC [Infusionsoft API](http://help.infusionsoft.com/developers/api-basics).

Write badass Infusionsoft apps on the server that are fully and natively asynchronous.

It's pretty dope.

## Usage

Install via `npm`:

```
$ npm install infusionsoft-api
```

Do cool stuff:

```
var DataContext = require('infusionsoft-api/DataContext');

var sdk = new DataContext('myapp', 'MY_API_KEY');

sdk.Contacts
    .where(Contact.FirstName, 'Brandon')
    .like(Contact.LastName, 'V%')
    .select(Contact.Id, Contact.Email)
    .orderByDescending('LastName')
    .take(100)
    .toArray()
    .done(function(result) {
        console.log(result);
    });
```

You can also use the API Services directly:

```
ds.ContactService
    .findByEmail('brandon@aol.com', ['Id', 'FirstName', 'LastName']);
```

Awesome.

## Promises

All asynchronous methods return a [Promise](https://github.com/kriskowal/q)
that represents the eventual value that will be returned.

Promises are glorious and make writing heavily asynchronous code much less
awful than it would otherwise be.

See the **More Examples** section to see them in action.


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

Finally, run `node generator/generateApi` to create a file that `require`s all
the generated files for easy use.

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

### Login a user and get their info

And an example of using the `fail` method to catch any problems.

```
sdk.DataService
    .authenticateUser('user@email.com', 'md5-hash-of-password')
    .then(function(userId) {
        return sdk.Users.where(User.Id, userId).first();
    })
    .then(function(user) {
        console.log('Hello ' + user.FirstName + ' ' + user.LastName);
    })
    .fail(function(err) {
        console.log('uh oh: ' + err);
    });
```

### Get all invoices for a specific month, grouped by product

Uses [underscore](http://underscorejs.org/).

```
sdk.Invoices
    .like(Invoice.DateCreated, '2013-08%')
    .groupBy(function(x) { return x.ProductSold; })
    .done(function(result) {
        _(result).each(function(invoices, productId) {
            console.log(productId, invoices.length);
        });
    });
```

## License
Copyright 2013 Brandon Valosek

**Infusionsoft API** is released under the MIT license.

