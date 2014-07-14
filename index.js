process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

var Twilio = require('twilio'),
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

var failureCount = 0;

function Watcher(params){
	params = _.extend({}, DEFAULTS, params);

	var emitter = new EventEmitter();
	var twilio = Twilio(params.twilio.sid, params.twilio.token);
	var _toFailureTxt = function(number){
		return _.extend({}, {to: number, from: params.twilio.number, body: params.message});
	};

	var _sendFailureMessages = function(){
		if (failureCount === 0) return;

		console.log('sending alerts');

		params.phones
			.map(_toFailureTxt)
			.forEach(function(msg){
				twilio.sms.messages.create(msg, function(error, result) {
					if (error){
						console.error(error);
					} else {
						console.log('txt sent success.');
					}
				});
		});
	};

	_sendFailureMessages = _.throttle(_sendFailureMessages, params.txtInterval);

	var _doCheck = function(){
		request
			.get(params.url)
			.end(function(err, res){
				if (err || !res.ok){
					failureCount++;
					console.log('"'+params.url + '" is down. ' + failureCount);
				} else {
					failureCount = 0;
					console.log('"'+params.url + '" is up.');
				}

				if (failureCount > params.maxFailureCount){
					_sendFailureMessages();
				}

				return _.delay(_doCheck, params.checkInterval);
			});
	};

	_doCheck();

	return emitter;
}

module.exports = Watcher;
