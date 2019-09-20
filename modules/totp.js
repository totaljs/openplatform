// MIT License
// Copyright (c) 2019 Peter Širka <petersirka@gmail.com>

const Crypto = require('crypto');

// Base32 methods are updated code from "Base32.js" library
// Source: https://github.com/mikepb/base32.js
function charmap(alphabet) {
	var mappings = {};
	var chars = alphabet.split('');
	for (var i = 0; i < chars.length; i++) {
		var c = chars[i];
		if (!(c in mappings))
			mappings[c] = i;
	}
	return mappings;
}

var CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
var CHARMAP = charmap(CHARS);
CHARMAP[0] = 14;
CHARMAP[1] = 8;

function base32encode(arr) {
	var buf = [];
	var shift = 3;
	var carry = 0;

	for (var i = 0; i < arr.length; i++) {

		var byte = arr[i];
		var symbol = carry | (byte >> shift);
		buf.push(CHARS[symbol & 0x1f]);
		if (shift > 5) {
			shift -= 5;
			symbol = byte >> shift;
			buf.push(CHARS[symbol & 0x1f]);
		}
		shift = 5 - shift;
		carry = byte << shift;
		shift = 8 - shift;
	}

	if (shift !== 3) {
		buf.push(CHARS[carry & 0x1f]);
		shift = 3;
		carry = 0;
	}

	return buf.join('');
}

function base32decode(val) {

	var buf = [];
	var arr = val.toUpperCase().split('');
	var shift = 8;
	var carry = 0;

	for (var i = 0; i < arr.length; i++) {
		var c = arr[i];
		if (c === '=')
			continue;

		var symbol = CHARMAP[c] & 0xff;
		shift -= 5;

		if (shift > 0) {
			carry |= symbol << shift;
		} else if (shift < 0) {
			buf.push(carry | (symbol >> -shift));
			shift += 8;
			carry = (symbol << shift) & 0xff;
		} else {
			buf.push(carry | symbol);
			shift = 8;
			carry = 0;
		}
	}

	if (shift !== 8 && carry !== 0) {
		buf.push(carry);
		shift = 8;
		carry = 0;
	}

	return Buffer.from(buf);
}

// Inspired from "Speakeasy" library
// Source: https://github.com/speakeasyjs/speakeasy
exports.hotp = function(key, counter) {

	var buffer = Buffer.from(base32decode(key), 'base32');
	var buffersize = 20;
	var digits = 6;

	key = Buffer.from(Array(Math.ceil(buffersize / buffer.length) + 1).join(buffer.toString('hex')), 'hex').slice(0, buffersize);

	var buf = Buffer.alloc(8);
	var tmp = counter || 0;

	for (var i = 0; i < 8; i++) {
		// mask 0xff over number to get last 8
		buf[7 - i] = tmp & 0xff;
		// shift 8 and get ready to loop over the next batch of 8
		tmp = tmp >> 8;
	}

	var hmac = Crypto.createHmac('sha1', key);
	hmac.update(buf);
	var digest = hmac.digest();

	// compute HOTP offset
	var offset = digest[digest.length - 1] & 0xf;

	// calculate binary code (RFC4226 5.4)
	var code = (digest[offset] & 0x7f) << 24 |
	(digest[offset + 1] & 0xff) << 16 |
	(digest[offset + 2] & 0xff) << 8 |
	(digest[offset + 3] & 0xff);

	// left-pad code
	code = new Array(digits + 1).join('0') + code.toString(10);

	// return length number off digits
	return code.substr(-digits);
};

// Inspired from "Speakeasy" library
// Source: https://github.com/speakeasyjs/speakeasy
exports.hotpverify = function(key, token, counter, window, totp) {

	if (!window)
		window = 5;

	if (!counter)
		counter = 0;

	token += '';

	var loopstart = totp ? counter - window : counter;
	var inc = 0;

	// Now loop through from C (C - W in case of TOTP)
	// to C + W to determine if there is a correct code
	for (var i = loopstart; i <= counter + window; ++i) {
		inc = i;
		if (exports.hotp(key, inc) === token) {
			// We have found a matching code, trigger callback
			// and pass offset
			return { delta: i - counter };
		}
	}

	// If we get to here then no codes have matched, return null
	return null;
};

exports.totp = function(key, time, ticks) {
	if (!time)
		time = 30;
	var now = ticks || Date.now();
	var counter = Math.floor((now / 1000) / time);
	return exports.hotp(key, counter);
};

exports.totpverify = function(key, token, time, ticks) {
	if (!time)
		time = 30;
	var now = ticks || Date.now();
	var counter = Math.floor((now / 1000) / time);
	return exports.hotpverify(key, token, counter, 1, true);
};

exports.generate = function(label, issuer, type) {

	// type can be "totp" (default), "hotp"

	var bytes = Crypto.randomBytes(20);
	var set = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz';
	var builder = [];

	for (var i = 0, l = bytes.length; i < l; i++)
		builder.push(set[Math.floor(bytes[i] / 255.0 * (set.length - 1))]);

	var secret = base32encode(Buffer.from(builder.join('').toUpperCase())).toString().replace(/=/g, '');
	var data = {};
	data.secret = secret;
	data.url = 'otpauth://' + (type || 'totp') + '/' + label + '?secret=' + data.secret + '&issuer=' + encodeURIComponent(issuer || '');//  + '&algorithm=sha1&digits=6&period=30';
	data.qrcode = 'https://api.qrserver.com/v1/create-qr-code/?color=000000&bgcolor=FFFFFF&data=' + encodeURIComponent(data.url) + '&qzone=0&margin=0&size=200x200&ecc=L';
	return data;
};
