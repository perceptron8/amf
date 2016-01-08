"use strict";

var _ = require("underscore");
var assert = require("assert");

var AMF0 = require("../AMF0");
var AMF3 = require("../AMF3");

class Message {
	constructor(targetUri, responseUri, value) {
		assert(_.isString(targetUri));
		assert(_.isString(responseUri));
		this.targetUri = targetUri;
		this.responseUri = responseUri;
		this.value = value;
	}
	
	encode(push) {
		var writer0 = new AMF0.Writer(push);
		var writer3 = new AMF3.Writer(push);
		writer0.writeRawString(this.targetUri);
		writer0.writeRawString(this.responseUri);
		// ignore length
		writer0.writeRawBytes([0xFF, 0xFF, 0xFF, 0xFF]);
		writer0.writeRawByte(AMF0.Marker.AVMPLUS_OBJECT);
		writer3.write(this.value);
	}
	
	static decode(pull) {
		var reader = new AMF0.Reader(pull);
		var targetUri = reader.readRawString();
		var responseUri = reader.readRawString();
		// ignore length
		reader.readRawBytes(4);
		var value = reader.read();
		return new Message(targetUri, responseUri, value);
	}
}

module.exports = Message;
