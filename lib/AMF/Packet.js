"use strict";

var _ = require("underscore");
var assert = require("assert");

var NumberEncoder = require("number-encoding").NumberEncoder;
var NumberDecoder = require("number-encoding").NumberDecoder;
var u16encoder = new NumberEncoder("Uint16");
var u16decoder = new NumberDecoder("Uint16");

var Header = require("./Header");
var Message = require("./Message");

class Packet {
	constructor(headers, messages, version) {
		assert(_.isArray(headers));
		assert(_.isArray(messages));
		assert(_.isNumber(version) || _.isUndefined(version));
		this.headers = headers;
		this.messages = messages;
		this.version = !_.isUndefined(version) ? version : 0;
	}
	
	encode(push) {
		assert(_.isFunction(push));
		push(u16encoder.encode(this.version));
		push(u16encoder.encode(this.headers.count));
		this.headers.forEach(header => header.encode(push));
		push(u16encoder.encode(this.messages.count));
		this.messages.forEach(message => message.encode(push));
	}
	
	static decode(pull) {
		assert(_.isFunction(pull));
		var version = u16decoder.decode(pull(u16decoder.length));
		var headersCount = u16decoder.decode(pull(u16decoder.length));
		var headers = _.range(headersCount).map(() => Header.decode(pull));
		var messagesCount = u16decoder.decode(pull(u16decoder.length));
		var messages = _.range(headersCount).map(() => Message.decode(pull));
		return new Packet(headers, messages, version);
	}
}

module.exports = Packet;