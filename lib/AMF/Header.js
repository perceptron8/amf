"use strict";

const _ = require("underscore");
const assert = require("assert");

const AMF0 = require("../AMF0");

class Header {
	constructor(name, value, mustUnderstand) {
		assert(_.isString(name));
		assert(_.isBoolean(mustUnderstand) || _.isUndefined(mustUnderstand));
		this.name = name;
		this.value = value;
		this.mustUnderstand = !_.isUndefined(mustUnderstand) ? mustUnderstand : false;
	}
	
	encode(push) {
		const writer = new AMF0.Writer(push);
		writer.writeRawString(this.name);
		writer.writeRawByte(this.mustUnderstand ? 1 : 0);
		// unknown length
		writer.writeRawBytes([0xFF, 0xFF, 0xFF, 0xFF]);
		writer.write(this.value);
	}
	
	static decode(pull) {
		const reader = new AMF0.Reader(pull);
		const name = reader.readRawString();
		const mustUnderstand = reader.readRawByte() != 0;
		// ignore length
		reader.readRawBytes(4);
		const value = reader.read();
		return new Header(name, value, mustUnderstand);
	}
}

module.exports = Header;
