process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

var Twilio = require('twilio'),
	log = require('debug')('up-or-txt'),
	EventEmitter = require('events').EventEmitter,
	request = require('superagent'),
	_ = require('lodash');

var DEFAULTS = {
	twilio: {
		sid: process.env.TWILIO_ACCOUNT_SID,
		token: process.env.TWILIO_AUTH_TOKEN,
	},
	phones: [],
	checkInterval: 20 * 1000,
	txtInterval: 5 * 60 * 1000,
	maxFailureCount: 3,
	url: '',
	message: 'your site is down!'
};

var runIfDifferent = function(fn){
	var lastArgs;
	return function(){
		var currentArgs = _.toArray(arguments);
		if (_.isEqual(currentArgs, lastArgs)) return;

		lastArgs = currentArgs;
		fn.apply(null, currentArgs);
	};
};

function Watcher(params){
	params = _.extend({}, DEFAULTS, params);

	var failureCount = 0;
	var log = runIfDifferent(console.log.bind(console));
	var emitter = new EventEmitter();
	var twilio = new Twilio(params.twilio.sid, params.twilio.token);
	var MESSAGE_DEFAULTS = {from: params.twilio.number, body: params.message};

	var _createFailTxtMessage = function(toNumber){
		return _.extend({}, MESSAGE_DEFAULTS, {to: toNumber});
	};

	var _sendTxtMessage = function(txtMessage){
		twilio.sms.messages.create(txtMessage, function(err) {
			if (err){
				emitter.emit('txt-error', err);
				console.error(err);
			} else {
				emitter.emit('txt-success', err);
			}
		});
	};

	var _sendFailureMessages = _.throttle(function(){
		if (failureCount === 0) return;

		console.log('sending txts');

		params.phones
			.map(_createFailTxtMessage)
			.forEach(_sendTxtMessage);

	}, params.txtInterval);

	var _doCheck = function(){
		request
			.get(params.url)
			.end(function(err, res){
				if (err || !res.ok){
					failureCount++;
					if (failureCount <= params.maxFailureCount){
						log('"'+params.url + '" failed to respond. ' + failureCount);
					}
				} else {
					failureCount = 0;
					log('"'+params.url + '" is up.');
				}

				if (failureCount > params.maxFailureCount){
					log('"'+params.url + '" is down. ');
					_sendFailureMessages();
				}

				return _.delay(_doCheck, params.checkInterval);
			});
	};

	_doCheck();

	return emitter;
}

module.exports = Watcher;
