"use strict";

var assert = require("assert");
var _ = require("underscore");

var AMF0 = require("./AMF0");
var AMF3 = require("./AMF3");

var TextEncoder = require("text-encoding").TextEncoder;
var TextDecoder = require("text-encoding").TextDecoder;

var NumberEncoder = require("number-encoding").NumberEncoder;
var NumberDecoder = require("number-encoding").NumberDecoder;

var u16encoder = new NumberEncoder("Uint16");
var u16decoder = new NumberDecoder("Uint16");
var u32encoder = new NumberEncoder("Uint32");
var u32decoder = new NumberDecoder("Uint32");

function concat(arrays) {
	var totalLength = 0;
	for (var array of arrays) {
		totalLength += array.length;
	}
	var result = new Uint8Array(totalLength);
	var offset = 0;
	for (var array of arrays) {
		result.set(array, offset);
		offset += array.length;
	}
	return result;
}

class Header {
	constructor(name, value) {
		this.name = name;
		this.value = value;
	}
	
	encode() {
		var writer = new AMF0.Writer([]);
		writer.writeRawString(this.name);
		writer.writeRawByte(0); // must understand... not
		writer.write(this.value);
		return Uint8Array.from(writer.array);
	}
	
	static decode(array) {
		// TODO
	}
}

class Message {
	constructor(targetUri, responseUri, value) {
		this.targetUri = targetUri;
		this.responseUri = responseUri;
		this.value = value;
	}
	
	encode() {
		var writer0 = new AMF0.Writer([]);
		writer0.writeRawString(this.targetUri);
		writer0.writeRawString(this.responseUri);
		
		var writer3 = new AMF3.Writer([]);
		writer3.write(this.value);
		
		var length = u32encoder.encode(1 + writer3.array.length);
		writer0.writeRawBytes(length); // avm marker + amf3 bytes
		
		writer0.writeRawByte(AMF0.MARKER.AVMPLUS_OBJECT);
		writer0.writeRawBytes(writer3.array);
		
		return Uint8Array.from(writer0.array);
	}
	
	static decode(array) {
		// TODO
	}
}

class Packet {
	constructor(headers, messages) {
		this.version = 0; // really constant
		this.headers = headers;
		this.messages = messages;
	}

	encode() {
		var version = u16encoder.encode(this.version);
		var headersCount = u16encoder.encode(this.headers.count);
		var headers = this.headers.map(header => header.encode());
		var messagesCount = u16encoder.encode(this.messages.count);
		var messages = this.messages.map(message => message.encode());
		return concat([].concat(
			[version], [headersCount], headers, [messagesCount], messages)
		);
	}
	
	static decode(array) {
		// TODO
	}
}

var AMF = {
	Packet: Packet,
	Header: Header,
	Message: Message
};

module.exports = AMF;
