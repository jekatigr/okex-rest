# OKEX API Wrapper 2


A node.js wrapper for the [REST APIs](hhttps://www.okex.com/rest_api.html) exposed by bitcoin exchange [OKEX](https://www.okex.com).

This module is forked from [okex-rest](https://github.com/devmanio/okex-rest).

Changes:

- Now it's possible to add any request properties
- Header removed
- Callbacks moved to last argument (for [promisify](https://nodejs.org/dist/latest-v8.x/docs/api/util.html#util_util_promisify_original) compatibility)

### Install

`npm install okex-rest2`

```js
var OKEX = require('okex-rest2');

// Test public data APIs
var publicClient = new OKEX();

// get iota_btc ticker
publicClient.getTicker(console.log, 'iota_btc');

// get iota_btc order book
publicClient.getDepth(console.log, 'iota_btc');

// get trades defaulting to iota_btc
publicClient.getTrades(console.log);

// replace the parameters with your API key and secret
var privateClient = new OKEX('your-api-key', 'your-api-secret');

privateClient.getUserInfo(console.log);

// buy limit order for 1 IOTA at price 00021054 BTC
privateClient.addTrade(console.log, 'iota_btc', 'buy', '1', '00021054');

```