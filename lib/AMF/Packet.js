"use strict";

var _ = require("underscore");
var assert = require("assert");

var NumberEncoder = require("number-encoding").NumberEncoder;
var NumberDecoder = require("number-encoding").NumberDecoder;
var u16encoder = new NumberEncoder("Uint16");
var u16decoder = new NumberDecoder("Uint16");

var Header = require("./Header");
var Message = require("./Message");

function array(input) {
	if (input instanceof ArrayBuffer) {
		return new Uint8Array(input);
	} else if (ArrayBuffer.isView(input)) {
		return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
	} else {
		throw new Error("The provided value is not of type '(ArrayBuffer or ArrayBufferView)'");
	}
}

function view(array, offset, length) {
	if (ArrayBuffer.isView(array)) {
		return new Uint8Array(array.buffer, array.byteOffset + offset, length);
	} else {
		throw new Error("The provided value is not of type '(ArrayBufferView)'");
	}
}

function concat(chunks, length) {
	var buffer = new Uint8Array(length);
	var offset = 0;
	for (var chunk of chunks) {
		buffer.set(chunk, offset);
		offset += chunk.length;
	}
	return buffer;
}

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
		push(u16encoder.encode(this.headers.length));
		this.headers.forEach(header => header.encode(push));
		push(u16encoder.encode(this.messages.length));
		this.messages.forEach(message => message.encode(push));
	}
	
	static decode(pull) {
		assert(_.isFunction(pull));
		var version = u16decoder.decode(pull(u16decoder.length));
		var headersCount = u16decoder.decode(pull(u16decoder.length));
		var headers = _.range(headersCount).map(() => Header.decode(pull));
		var messagesCount = u16decoder.decode(pull(u16decoder.length));
		var messages = _.range(messagesCount).map(() => Message.decode(pull));
		return new Packet(headers, messages, version);
	}
	
	encodeAll() {
		var chunks = [];
		var length = 0;
		this.encode(chunk => {
			chunks.push(chunk);
			length += chunk.length;
		});
		return concat(chunks, length);
	}
	
	static decodeAll(input) {
		var buffer = array(input);
		var offset = 0;
		return Packet.decode(length => {
			var slice = view(buffer, offset, length);
//			console.log(offset, length);
			offset += length;
			return slice;
		});
	}
}

module.exports = Packet;
