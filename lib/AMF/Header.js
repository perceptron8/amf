"use strict";

var _ = require("underscore");
var assert = require("assert");

var AMF0 = require("../AMF0");

class Header {
	constructor(name, value, mustUnderstand) {
		assert(_.isString(name));
		assert(_.isBoolean(mustUnderstand) || _.isUndefined(mustUnderstand));
		this.name = name;
		this.value = value;
		this.mustUnderstand = !_.isUndefined(mustUnderstand) ? mustUnderstand : false;
	}
	
	encode(push) {
		var writer = new AMF0.Writer(push);
		writer.writeRawString(this.name);
		writer.writeRawByte(this.mustUnderstand ? 1 : 0);
		writer.write(this.value);
	}
	
	static decode(pull) {
		var reader = new AMF0.Reader(pull);
		var name = reader.readRawString();
		var mustUnderstand = reader.readRawByte() != 0;
		var value = reader.read();
		return new Header(name, value, mustUnderstand);
	}
}

module.exports = Header;
