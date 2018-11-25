# OKEX  API Wrapper


A node.js wrapper for the [REST APIs](hhttps://www.okex.com/rest_api.html) exposed by bitcoin exchange [OKEX](https://www.okex.com).

This module is forked from [okex-rest](https://github.com/devmanio/okex-rest).

Changes:

- Now it's possible to add any request properties
- Header removed

### Install

`npm install okex-rest`

```js
var OKEX = require('okex-rest');

// Test public data APIs
var publicClient = new OKEX();

// get iota_btc ticker
publicClient.getTicker(console.log, 'iota_btc');

// get iota_btc order book
publicClient.getDepth(console.log, 'iota_btc');

// get trades defaulting to iota_btc
publicClient.getTrades(console.log);

// replace the parameters with your API key and secret
var privateClient = new OKCoin('your-api-key', 'your-api-secret');

privateClient.getUserInfo(console.log);

// buy limit order for 1 IOTA at price 00021054 BTC
privateClient.addTrade(console.log, 'iota_btc', 'buy', '1', '00021054');

```