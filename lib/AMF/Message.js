"use strict";

const _ = require("underscore");
const assert = require("assert");

const AMF0 = require("../AMF0");
const AMF3 = require("../AMF3");

class Message {
	constructor(targetUri, responseUri, value) {
		assert(_.isString(targetUri));
		assert(_.isString(responseUri));
		this.targetUri = targetUri;
		this.responseUri = responseUri;
		this.value = value;
	}
	
	encode(push) {
		const writer0 = new AMF0.Writer(push);
		const writer3 = new AMF3.Writer(push);
		writer0.writeRawString(this.targetUri);
		writer0.writeRawString(this.responseUri);
		// unknown length
		writer0.writeRawBytes([0xFF, 0xFF, 0xFF, 0xFF]);
		writer0.writeRawByte(AMF0.Marker.AVMPLUS_OBJECT);
		writer3.write(this.value);
	}
	
	static decode(pull) {
		const reader = new AMF0.Reader(pull);
		const targetUri = reader.readRawString();
		const responseUri = reader.readRawString();
		// ignore length
		reader.readRawBytes(4);
		const value = reader.read();
		return new Message(targetUri, responseUri, value);
	}
}

module.exports = Message;
