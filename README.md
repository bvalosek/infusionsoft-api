# Infusionsoft API

A promise-driven, fluent-style Node.js wrapper for the XML-RPC Infusionsoft API.

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

var ds = new DataContext('myapp', 'MY_API_KEY');

ds.Contacts
    .where('FirstName', 'Brandon')
    .like('LastName', 'V%')
    .orderBy('LastName')
    .descending()
    .take(100)
    .select('Id', 'FirstName', 'LastName', 'Email')
    .done(function(result) {
        console.log(result);
    });
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

## License
Copyright 2013 Brandon Valosek

**Infusionsoft API** is released under the MIT license.

