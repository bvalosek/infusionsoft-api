# Infusionsoft API

    pre-alpha

A promise-driven Node.js wrapper for the XML-RPC Infusionsoft API.

## Usage

Install via `npm`:

```
$ npm install infusionsoft-api
```

## API Scraper

Included is a Node app that will scrape the Infusionsoft API documentation and
update the interfaces in the `infusionsoft` directory. This allows for the
XML-RPC interfaces to be updated as Infusionsoft updates their docs.

This is a double-edged sword; any issues with their documentation will result
in issues with this API wrapper.

To update the auto-generated interfaces, run the `generate` script manually:

```
node generator/generate
```

## License
Copyright 2013 Brandon Valosek

**Infusionsoft API** is released under the MIT license.

