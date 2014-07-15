up-or-txt
==========

Monitor a url and start txting if it goes down.


You can get this working with a free twilio account.

```
npm install up-or-txt
```

The example below will monitor https://www.google.com and start txting you if google returns a non-200 more than 3 times in a row.  It will continue to txt you every 10 minutes until it is back up.
```js
var watch = require('up-or-txt');

watch({
	twilio:{
		sid: 'your-twilio-sid',
		token: 'your-twilio-token',
		number: 'your-twilio-phone-number'
	},
	phones: ['your-number'],
	checkInterval: 1000 * 30,
	txtInterval: 1000 * 60 * 10,
	url: 'https://www.google.com/',
	maxFailureCount: 3,
	message: 'google is broken!'
});
```
