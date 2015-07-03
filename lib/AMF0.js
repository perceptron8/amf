"use strict";

var assert = require("assert");
var _ = require("underscore");

var TextEncoder = require("text-encoding").TextEncoder;
var TextDecoder = require("text-encoding").TextDecoder;
var NumberEncoder = require("number-encoding").NumberEncoder;
var NumberDecoder = require("number-encoding").NumberDecoder;

var utf8encoder = new TextEncoder("utf-8");
var utf8decoder = new TextDecoder("utf-8");
var s16encoder = new NumberEncoder("Int16");
var s16decoder = new NumberDecoder("Int16");
var u16encoder = new NumberEncoder("Uint16");
var u16decoder = new NumberDecoder("Uint16");
var u32encoder = new NumberEncoder("Uint32");
var u32decoder = new NumberDecoder("Uint32");
var f64encoder = new NumberEncoder("Float64");
var f64decoder = new NumberDecoder("Float64");

var AMF0 = {};

AMF0.MARKER = {
	NUMBER:         0x00,
	BOOLEAN:        0x01,
	STRING:         0x02,
	OBJECT:         0x03,
	MOVIECLIP:      0x04, // not supported
	NULL:           0x05,
	UNDEFINED:      0x06,
	REFERENCE:      0x07,
	ECMA_ARRAY:     0x08, // not supported
	OBJECT_END:     0x09,
	STRICT_ARRAY:   0x0A,
	DATE:           0x0B,
	LONG_STRING:    0x0C,
	UNSUPPORTED:    0x0D, // not supported
	RECORDSET:      0x0E, // not supported
	XML_DOCUMENT:   0x0F, // not supported
	TYPED_OBJECT:   0x10,
	AVMPLUS_OBJECT: 0x11
};

var EMPTY_STRING = "";

AMF0.Writer = function(array, index) {
	assert(_.isArray(array));
	this.array = array;
	this.index = index || array.length;
	this.references = new Map();
};

AMF0.Writer.prototype.writeRawByte = function(byte) {
	this.array[this.index++] = byte & 0xFF;
};

AMF0.Writer.prototype.writeRawBytes = function(bytes) {
	for (var byte of bytes) {
		this.writeRawByte(byte);
	}
};

AMF0.Writer.prototype.writeRawString = function(string) {
	var bytes = utf8encoder.encode(string);
	assert(bytes.length <= 0xFFFF);
	this.writeRawBytes(u16encoder.encode(bytes.length));
	this.writeRawBytes(bytes);
};

AMF0.Writer.prototype.writeNull = function() {
	this.writeRawByte(AMF0.MARKER.NULL);
};

AMF0.Writer.prototype.writeUndefined = function() {
	this.writeRawByte(AMF0.MARKER.UNDEFINED);
};

AMF0.Writer.prototype.writeBoolean = function(boolean) {
	this.writeRawByte(AMF0.MARKER.BOOLEAN);
	this.writeRawByte(boolean ? 1 : 0);
};

AMF0.Writer.prototype.writeNumber = function(number) {
	this.writeRawByte(AMF0.MARKER.NUMBER);
	this.writeRawBytes(f64encoder.encode(number));
};

AMF0.Writer.prototype.writeDate = function(date) {
	var epochMilli = date.getTime();
	var zoneOffset = 0x0000; // as in spec
	this.writeRawByte(AMF0.MARKER.DATE);
	this.writeRawBytes(f64encoder.encode(epochMilli));
	this.writeRawBytes(s16encoder.encode(zoneOffset));
};

AMF0.Writer.prototype.writeString = function(string) {
	var bytes = utf8encoder.encode(string);
	if (bytes.length <= 0xFFFF) {
		this.writeRawByte(AMF0.MARKER.STRING);
		this.writeRawBytes(u16encoder.encode(bytes.length));
	} else {
		this.writeRawByte(AMF0.MARKER.LONG_STRING);
		this.writeRawBytes(u32encoder.encode(bytes.length));
	}
	this.writeRawBytes(bytes);
};

AMF0.Writer.prototype.writeReference = function(reference) {
	assert(reference <= 0xFFFF);
	this.writeRawByte(AMF0.MARKER.REFERENCE);
	this.writeRawBytes(u16encoder.encode(reference));
};

AMF0.Writer.prototype.writeArray = function(array) {
	if (!this.references.has(array)) {
		this.references.set(array, this.references.size);
		this.writeRawByte(AMF0.MARKER.STRICT_ARRAY);
		this.writeRawBytes(u32encoder.encode(array.length));
		for (var value of array) {
			this.write(value);
		}
	} else {
		var reference = this.references.get(array);
		this.writeReference(reference);
	}
};

AMF0.Writer.prototype.writeObject = function(object) {
	if (!this.references.has(object)) {
		this.references.set(object, this.references.size);
		// inspect
		var name = object["@name"];
		if (!_.isEmpty(name)) {
			// write marker
			this.writeRawByte(AMF0.MARKER.TYPED_OBJECT);
			// write name
			this.writeRawString(name);
		} else {
			// write marker
			this.writeRawByte(AMF0.MARKER.OBJECT);
		}
		// write properties
		for (var key in object) {
			if (key[0] != "@") {
				var value = object[key];
				this.writeRawString(key);
				this.write(value);	
			}
		}
		this.writeRawString(EMPTY_STRING);
		this.writeRawByte(AMF0.MARKER.OBJECT_END);
	} else {
		var reference = this.references.get(object);
		this.writeReference(reference);
	}
};

AMF0.Writer.prototype.write = function(value) {
	if (_.isNull(value)) {
		this.writeNull();
	} else if (_.isUndefined(value)) {
		this.writeUndefined();
	} else if (_.isBoolean(value)) {
		this.writeBoolean(value);
	} else if (_.isNumber(value)) {
		this.writeNumber(value);
	} else if (_.isDate(value)) {
		this.writeDate(value);
	} else if (_.isString(value)) {
		this.writeString(value);
	} else if (_.isArray(value)) {
		this.writeArray(value);
	} else if (_.isObject(value)) {
		this.writeObject(value);
	} else {
		throw "IllegalStateException";
	}
};

AMF0.Reader = function(array, index) {
	assert(_.isArray(array));
	this.array = array;
	this.index = index || 0;
	this.references = new Map();
};

AMF0.Reader.prototype.readRawByte = function() {
	return this.array[this.index++] & 0xFF;
};

AMF0.Reader.prototype.readRawBytes = function(length) {
	var bytes = [];
	for (var i = 0; i < length; i++) {
		var byte = this.readRawByte();
		bytes.push(byte);
	}
	return new Uint8Array(bytes);
};

AMF0.Reader.prototype.readRawString = function() {
	var length = u16decoder.decode(this.readRawBytes(u16decoder.length));
	var bytes = this.readRawBytes(length);
	var string = utf8decoder.decode(bytes);
	return string;
};

AMF0.Reader.prototype.readNull = function() {
	return null;
};

AMF0.Reader.prototype.readUndefined = function() {
	return undefined;
};

AMF0.Reader.prototype.readBoolean = function() {
	return !!this.readRawByte();
};

AMF0.Reader.prototype.readNumber = function() {
	var number = f64decoder.decode(this.readRawBytes(f64decoder.length));
	return number;
};

AMF0.Reader.prototype.readDate = function() {
	var epochMilli = f64decoder.decode(this.readRawBytes(f64decoder.length));
	return new Date(epochMilli);
};

AMF0.Reader.prototype.readString = function(long) {
	var decoder = long ? u32decoder : u16decoder;
	var length = decoder.decode(this.readRawBytes(decoder.length));
	var string = utf8decoder.decode(this.readRawBytes(length));
	return string;
};

AMF0.Reader.prototype.readArray = function() {
	var array = [];
	this.references.set(this.references.size, array);
	var length = u32decoder.decode(this.readRawBytes(u32decoder.length));
	for (var index = 0; index < length; index++) {
		var value = this.read();
		array.push(value);
	}
	return array;
};

AMF0.Reader.prototype.readObject = function(typed) {
	// create
	var object = {};
	// remember
	this.references.set(this.references.size, object);
	// read class name
	if (typed) {
		var name = this.readRawString();
		object["@name"] = name;
	}
	// read properties
	for (var key = this.readRawString(); key != EMPTY_STRING; key = this.readRawString()) {
		assert(key[0] != "@");
		var value = this.read();
		object[key] = value;
	}
	// read object end marker
	var marker = this.readRawByte();
	assert(marker == AMF0.MARKER.OBJECT_END);
	return object;
};

AMF0.Reader.readObjectPlus = function() {
	var reader = new AMF3.Reader(this.array, this.index);
	return reader.read();
};

AMF0.Reader.prototype.readReference = function() {
	var reference = u16decoder.decode(this.readRawBytes(u16decoder.length));
	return this.references.get(reference);
};

AMF0.Reader.prototype.read = function() {
	var marker = this.readRawByte();
	switch (marker) {
	case AMF0.MARKER.NULL:
		return this.readNull();
	case AMF0.MARKER.UNDEFINED:
		return this.readUndefined();
	case AMF0.MARKER.BOOLEAN:
		return this.readBoolean();
	case AMF0.MARKER.NUMBER:
		return this.readNumber();
	case AMF0.MARKER.DATE:
		return this.readDate();
	case AMF0.MARKER.STRING:
		return this.readString(false);
	case AMF0.MARKER.LONG_STRING:
		return this.readString(true);
	case AMF0.MARKER.STRICT_ARRAY:
		return this.readArray();
	case AMF0.MARKER.OBJECT:
		return this.readObject(false);
	case AMF0.MARKER.TYPED_OBJECT:
		return this.readObject(true);
	case AMF0.MARKER.AVMPLUS_OBJECT:
		return this.readObjectPlus();
	case AMF0.MARKER.REFERENCE:
		return this.readReference();
	case AMF0.MARKER.OBJECT_END:
		throw "IllegalStateException";
	}
};

module.exports = AMF0;
