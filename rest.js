const util = require('util');
const _ = require('underscore');
const request = require('request');
const crypto = require('crypto');
const VError = require('verror');
const md5 = require('md5');

var OKEX = function (api_key, secret, server, timeout) {
  this.api_key = api_key;
  this.secret = secret;
  this.server = server || 'https://www.okex.com';
  this.timeout = timeout || 20000;
};

var headers = {"contentType": "application/x-www-form-urlencoded"};

OKEX.prototype.privateRequest = function(method, params, callback, requestOptions) {
    var functionName = 'OKEX.privateRequest()',
        self = this;

    if(!this.api_key || !this.secret) {
        var error = new VError('%s must provide api_key and secret to make this API request.', functionName);
        return callback(error);
    }

    if(!_.isObject(params)) {
        var error = new VError('%s second parameter %s must be an object. If no params then pass an empty object {}', functionName, params);
        return callback(error);
    }

    if (!callback || typeof(callback) != 'function') {
        var error = new VError('%s third parameter needs to be a callback function', functionName);
        return callback(error);
    }

    params.api_key = this.api_key;
    console.log(params)
    params.sign = this.signMessage(params);

    var options = {
        url: this.server + '/api/v1/' + method + '.do',
        method: 'POST',
        headers: headers,
        form: params,
        ...requestOptions
    };

    var requestDesc = util.format('%s request to url %s with method %s and params %s',
        options.method, options.url, method, JSON.stringify(params));

    executeRequest(options, requestDesc, callback);
};

/**
 * This method returns a signature for a request as a md5-encoded uppercase string
 * @param  {Object}  params   The object to encode
 * @return {String}           The request signature
 */
OKEX.prototype.signMessage = function getMessageSignature(params) {
    var formattedParams = formatParameters(params);

    // append secret key value pair
    formattedParams += '&secret_key=' + this.secret;

    return md5(formattedParams).toUpperCase();
};

/**
 * This method returns the parameters as key=value pairs separated by & sorted by the key
 * @param  {Object}  params   The object to encode
 * @return {String}           formatted parameters
 */
function formatParameters(params) {
    var sortedKeys = [],
        formattedParams = '';

    // sort the properties of the parameters
    sortedKeys = _.keys(params).sort();

    // create a string of key value pairs separated by '&' with '=' assignement
    for (i = 0; i < sortedKeys.length; i++) {
        if (i != 0) {
            formattedParams += '&';
        }
        formattedParams += sortedKeys[i] + '=' + params[sortedKeys[i]];
    }

    return formattedParams;
}


OKEX.prototype.publicRequest = function(method, params, callback, requestOptions) {
    var functionName = 'OKEX.publicRequest()';

    if(!_.isObject(params)) {
        var error = new VError('%s second parameter %s must be an object. If no params then pass an empty object {}', functionName, params);
        return callback(error);
    }

    if (!callback || typeof(callback) != 'function') {
        var error = new VError('%s third parameter needs to be a callback function with err and data parameters', functionName);
        return callback(error);
    }

    var url = this.server + '/api/v1/' + method + '.do';

    var options = {
        url: url,
        method: 'GET',
        headers: headers,
        timeout: this.timeout,
        qs: params,
        json: {},        // request will parse the json response into an object
        ...requestOptions
    };

    var requestDesc = util.format('%s request to url %s with parameters %s',
        options.method, options.url, JSON.stringify(params));

    executeRequest(options, requestDesc, callback)
};

function executeRequest(options, requestDesc, callback) {
    var functionName = 'OKEX.executeRequest()';

    request(options, function(err, response, data) {
        var error = null,   // default to no errors
            returnObject = data;

        if(err) {
            error = new VError(err, '%s failed %s', functionName, requestDesc);
            error.name = err.code;
        }
        else if (response.statusCode < 200 || response.statusCode >= 300) {
            error = new VError('%s HTTP status code %s returned from %s', functionName,
                response.statusCode, requestDesc);
            error.name = response.statusCode;
        }
        else if (options.form) {
            try {
                returnObject = JSON.parse(data);
            }
            catch(e) {
                error = new VError(e, 'Could not parse response from server: ' + data);
            }
        }
        // if json request was not able to parse json response into an object
        else if (options.json && !_.isObject(data) ) {
            error = new VError('%s could not parse response from %s\nResponse: %s', functionName, requestDesc, data);
        }

        if (_.has(returnObject, 'error_code')) {
            var errorMessage = mapErrorMessage(returnObject.error_code);

            error = new VError('%s %s returned error code %s, message: "%s"', functionName,
                requestDesc, returnObject.error_code, errorMessage);

            error.name = returnObject.error_code;
        }

        callback(error, returnObject);
    });
}

//
// Public Functions
//

OKEX.prototype.getTicker = function getTicker(symbol, options, callback) {
    this.publicRequest('ticker', {symbol: symbol}, callback, options);
};

OKEX.prototype.getDepth = function getDepth(symbol, size, merge, options, callback) {
    var params = {
        symbol: symbol,
        size: 200,
        merge: 1
    };

    if (!_.isUndefined(size) ) params.size = size;
    if (!_.isUndefined(merge) ) params.merge = merge;

    this.publicRequest('depth', params, callback, options);
};

OKEX.prototype.getTrades = function getTrades(symbol, since, options, callback) {
    var params = {symbol: symbol};
    if (since) params.since = since;

    this.publicRequest('trades', params, callback, options);
};

OKEX.prototype.getKline = function getKline(symbol, type, size, since, options, callback) {
    var params = {symbol: symbol};
    if (type) params.type = type;
    if (size) params.size = size;
    if (since) params.since = since;

    this.publicRequest('kline', params, callback, options);
};

OKEX.prototype.getLendDepth = function getLendDepth(symbol, options, callback) {
    this.publicRequest('kline', {symbol: symbol}, callback, options);
};

//
// Private Functions
//

OKEX.prototype.getUserInfo = function getUserInfo(options, callback) {
    this.privateRequest('userinfo', {}, callback, options);
};

OKEX.prototype.addTrade = function addTrade(symbol, type, amount, price, options, callback) {
    var params = {
        //api_key: this.api_key,
        symbol: symbol,
        type: type
    };

    if (amount) params.amount = amount;
    if (price) params.price = price;

    this.privateRequest('trade', params, callback, options);
};

OKEX.prototype.addBatchTrades = function addBatchTrades(symbol, type, orders, options, callback) {
    this.privateRequest('batch_trade', {
        symbol: symbol,
        type: type,
        orders_data: orders
    }, callback, options);
};

OKEX.prototype.cancelOrder = function cancelOrder(symbol, order_id, options, callback) {
    this.privateRequest('cancel_order', {
        symbol: symbol,
        order_id: order_id
    }, callback, options);
};

OKEX.prototype.getOrderInfo = function getOrderInfo(symbol, order_id, options, callback) {
    this.privateRequest('order_info', {
        symbol: symbol,
        order_id: order_id
    }, callback, options);
};

OKEX.prototype.getOrdersInfo = function getOrdersInfo(symbol, type, order_id, options, callback) {
    this.privateRequest('orders_info', {
        symbol: symbol,
        type: type,
        order_id: order_id
    }, callback, options);
};

OKEX.prototype.getAccountRecords = function getAccountRecords(symbol, type, current_page, page_length, options, callback) {
    this.privateRequest('account_records', {
        symbol: symbol,
        type: type,
        current_page: current_page,
        page_length: page_length
    }, callback, options);
};

OKEX.prototype.getTradeHistory = function getTradeHistory(symbol, since, options, callback) {
    this.privateRequest('trade_history', {
        symbol: symbol,
        since: since
    }, callback, options);
};

OKEX.prototype.getOrderHistory = function getOrderHistory(symbol, status, current_page, page_length, options, callback) {
    this.privateRequest('order_history', {
        symbol: symbol,
        status: status,
        current_page: current_page,
        page_length: page_length
    }, callback, options);
};

OKEX.prototype.addWithdraw = function addWithdraw(symbol, chargefee, trade_pwd, withdraw_address, withdraw_amount, options, callback) {
    this.privateRequest('withdraw', {
        symbol: symbol,
        chargefee: chargefee,
        trade_pwd: trade_pwd,
        withdraw_address: withdraw_address,
        withdraw_amount: withdraw_amount
    }, callback, options);
};

OKEX.prototype.cancelWithdraw = function cancelWithdraw(symbol, withdraw_id, options, callback) {
    this.privateRequest('cancel_withdraw', {
        symbol: symbol,
        withdraw_id: withdraw_id
    }, callback, options);
};

/**
 * Maps the OKEX error codes to error message
 * @param  {Integer}  error_code   OKEX error code
 * @return {String}                error message
 */
function mapErrorMessage(error_code) {
    var errorCodes = {
        10000: 'Required parameter can not be null',
        10001: 'Requests are too frequent',
        10002: 'System Error',
        10003: 'Restricted list request, please try again later',
        10004: 'IP restriction',
        10005: 'Key does not exist',
        10006: 'User does not exist',
        10007: 'Signatures do not match',
        10008: 'Illegal parameter',
        10009: 'Order does not exist',
        10010: 'Insufficient balance',
        10011: 'Order is less than minimum trade amount',
        10012: 'Unsupported symbol (not btc_usd or ltc_usd)',
        10013: 'This interface only accepts https requests',
        10014: 'Order price must be between 0 and 1,000,000',
        10015: 'Order price differs from current market price too much',
        10016: 'Insufficient coins balance',
        10017: 'API authorization error',
        10026: 'Loan (including reserved loan) and margin cannot be withdrawn',
        10027: 'Cannot withdraw within 24 hrs of authentication information modification',
        10028: 'Withdrawal amount exceeds daily limit',
        10029: 'Account has unpaid loan, please cancel/pay off the loan before withdraw',
        10031: 'Deposits can only be withdrawn after 6 confirmations',
        10032: 'Please enabled phone/google authenticator',
        10033: 'Fee higher than maximum network transaction fee',
        10034: 'Fee lower than minimum network transaction fee',
        10035: 'Insufficient BTC/LTC',
        10036: 'Withdrawal amount too low',
        10037: 'Trade password not set',
        10040: 'Withdrawal cancellation fails',
        10041: 'Withdrawal address not approved',
        10042: 'Admin password error',
        10100: 'User account frozen',
        10216: 'Non-available API',
        503: 'Too many requests (Http)'};

    if (!errorCodes[error_code]) {
        return 'Unknown OKEX error code: ' + error_code;
    }

    return( errorCodes[error_code] );
}

module.exports = OKEX;