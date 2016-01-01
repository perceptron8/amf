"use strict";

var _ = require("underscore");
var assert = require("assert");

var TextEncoder = require("text-encoding").TextEncoder;
var TextDecoder = require("text-encoding").TextDecoder;
var NumberEncoder = require("number-encoding").NumberEncoder;
var NumberDecoder = require("number-encoding").NumberDecoder;

var utf8encoder = new TextEncoder("utf-8");
var utf8decoder = new TextDecoder("utf-8");
var u16encoder = new NumberEncoder("Uint16");
var u16decoder = new NumberDecoder("Uint16");
var u32encoder = new NumberEncoder("Uint32");
var u32decoder = new NumberDecoder("Uint32");
var f64encoder = new NumberEncoder("Float64");
var f64decoder = new NumberDecoder("Float64");

var MARKER = {
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

class Reader {
	constructor(pull) {
		assert(_.isFunction(pull));
		this.pull = pull;
		this.references = new Map();
	}
	
	readRawByte() {
		return this.pull(1)[0];
	}
	
	readRawBytes(length) {
		return this.pull(length);
	}
	
	readRawString() {
		var length = u16decoder.decode(this.readRawBytes(u16decoder.length));
		var bytes = this.readRawBytes(length);
		var string = utf8decoder.decode(bytes);
		return string;
	}
	
	readNull() {
		return null;
	}
	
	readUndefined() {
		return undefined;
	}
	
	readBoolean() {
		return !!this.readRawByte();
	}
	
	readNumber() {
		var bytes = this.readRawBytes(f64decoder.length);
		var number = f64decoder.decode(bytes);
		return number;
	}
	
	readDate() {
		var bytes = this.readRawBytes(f64decoder.length);
		var epochMilli = f64decoder.decode(bytes);
		var date = new Date(epochMilli);
		return date;
	}
	
	readShortString() {
		var length = u16decoder.decode(this.readRawBytes(u16decoder.length));
		var string = utf8decoder.decode(this.readRawBytes(length));
		return string;
	}
	
	readLongString() {
		var length = u32decoder.decode(this.readRawBytes(u32decoder.length));
		var string = utf8decoder.decode(this.readRawBytes(length));
		return string;
	}
	
	readArray() {
		var array = [];
		this.references.set(this.references.size, array);
		var length = u32decoder.decode(this.readRawBytes(u32decoder.length));
		for (var index = 0; index < length; index++) {
			var value = this.read();
			array.push(value);
		}
		return array;
	}
	
	readObject(typed) {
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
		for (var key = this.readRawString(); key != ""; key = this.readRawString()) {
			assert(key[0] != "@");
			var value = this.read();
			object[key] = value;
		}
		// read object end marker
		var marker = this.readRawByte();
		assert(marker == MARKER.OBJECT_END);
		return object;
	}
	
	readObjectPlus() {
		var reader = new AMF3.Reader(this.pull);
		return reader.read();
	}
	
	readReference() {
		var reference = u16decoder.decode(this.readRawBytes(u16decoder.length));
		return this.references.get(reference);
	}
	
	read() {
		var marker = this.readRawByte();
		switch (marker) {
		case MARKER.NULL:
			return this.readNull();
		case MARKER.UNDEFINED:
			return this.readUndefined();
		case MARKER.BOOLEAN:
			return this.readBoolean();
		case MARKER.NUMBER:
			return this.readNumber();
		case MARKER.DATE:
			return this.readDate();
		case MARKER.STRING:
			return this.readShortString();
		case MARKER.LONG_STRING:
			return this.readLongString();
		case MARKER.STRICT_ARRAY:
			return this.readArray();
		case MARKER.OBJECT:
			return this.readObject(false);
		case MARKER.TYPED_OBJECT:
			return this.readObject(true);
		case MARKER.AVMPLUS_OBJECT:
			return this.readObjectPlus();
		case MARKER.REFERENCE:
			return this.readReference();
		case MARKER.OBJECT_END:
			throw "IllegalStateException";
		}
	}
}

class Writer {
	constructor(push) {
		assert(_.isFunction(push));
		this.push = push;
		this.references = new Map();
	}
	
	writeRawByte(byte) {
		this.push([byte]);
	}
	
	writeRawBytes(bytes) {
		this.push(bytes);
	}
	
	writeRawString(string) {
		var bytes = utf8encoder.encode(string);
		var length = bytes.length;
		assert(length <= 0xFFFF);
		this.writeRawBytes(u16encoder.encode(length));
		this.writeRawBytes(bytes);
	}
	
	writeNull() {
		this.writeRawByte(MARKER.NULL);
	}
	
	writeUndefined() {
		this.writeRawByte(MARKER.UNDEFINED);
	}
	
	writeBoolean(boolean) {
		this.writeRawByte(MARKER.BOOLEAN);
		this.writeRawByte(boolean ? 1 : 0);
	}
	
	writeNumber(number) {
		this.writeRawByte(MARKER.NUMBER);
		this.writeRawBytes(f64encoder.encode(number));
	}
	
	writeDate(date) {
		var epochMilli = date.getTime();
		var zoneOffset = 0x0000;
		this.writeRawByte(MARKER.DATE);
		this.writeRawBytes(f64encoder.encode(epochMilli));
		this.writeRawBytes(u16encoder.encode(zoneOffset));
	}
	
	writeString(string) {
		var bytes = utf8encoder.encode(string);
		var length = bytes.length;
		if (length <= 0xFFFF) {
			this.writeRawByte(MARKER.STRING);
			this.writeRawBytes(u16encoder.encode(length));
		} else {
			this.writeRawByte(MARKER.LONG_STRING);
			this.writeRawBytes(u32encoder.encode(length));
		}
		this.writeRawBytes(bytes);
	}
	
	writeReference(reference) {
		assert(reference <= 0xFFFF);
		this.writeRawByte(MARKER.REFERENCE);
		this.writeRawBytes(u16encoder.encode(reference));
	}
	
	writeArray(array) {
		if (!this.references.has(array)) {
			this.references.set(array, this.references.size);
			this.writeRawByte(MARKER.STRICT_ARRAY);
			this.writeRawBytes(u32encoder.encode(array.length));
			for (var value of array) {
				this.write(value);
			}
		} else {
			var reference = this.references.get(array);
			this.writeReference(reference);
		}
	}
	
	writeObject(object) {
		if (!this.references.has(object)) {
			this.references.set(object, this.references.size);
			var name = object["@name"];
			if (!_.isEmpty(name)) {
				this.writeRawByte(MARKER.TYPED_OBJECT);
				this.writeRawString(name);
			} else {
				this.writeRawByte(MARKER.OBJECT);
			}
			for (var key in object) {
				if (key[0] != "@") {
					var value = object[key];
					this.writeRawString(key);
					this.write(value);	
				}
			}
			this.writeRawString("");
			this.writeRawByte(MARKER.OBJECT_END);
		} else {
			var reference = this.references.get(object);
			this.writeReference(reference);
		}
	}
	
	write(value) {
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
	}
}

module.exports = {
	MARKER: MARKER,
	Reader: Reader,
	Writer: Writer
};
