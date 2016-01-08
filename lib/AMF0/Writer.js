"use strict";

var _ = require("underscore");
var assert = require("assert");

var TextEncoder = require("text-encoding").TextEncoder;
var NumberEncoder = require("number-encoding").NumberEncoder;
var utf8encoder = new TextEncoder("utf-8");
var u16encoder = new NumberEncoder("Uint16");
var u32encoder = new NumberEncoder("Uint32");
var f64encoder = new NumberEncoder("Float64");

var Marker = require("./Marker");

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
		this.writeRawByte(Marker.NULL);
	}
	
	writeUndefined() {
		this.writeRawByte(Marker.UNDEFINED);
	}
	
	writeBoolean(boolean) {
		this.writeRawByte(Marker.BOOLEAN);
		this.writeRawByte(boolean ? 1 : 0);
	}
	
	writeNumber(number) {
		this.writeRawByte(Marker.NUMBER);
		this.writeRawBytes(f64encoder.encode(number));
	}
	
	writeDate(date) {
		var epochMilli = date.getTime();
		var zoneOffset = 0x0000;
		this.writeRawByte(Marker.DATE);
		this.writeRawBytes(f64encoder.encode(epochMilli));
		this.writeRawBytes(u16encoder.encode(zoneOffset));
	}
	
	writeString(string) {
		var bytes = utf8encoder.encode(string);
		var length = bytes.length;
		if (length <= 0xFFFF) {
			this.writeRawByte(Marker.STRING);
			this.writeRawBytes(u16encoder.encode(length));
		} else {
			this.writeRawByte(Marker.LONG_STRING);
			this.writeRawBytes(u32encoder.encode(length));
		}
		this.writeRawBytes(bytes);
	}
	
	writeReference(reference) {
		assert(reference <= 0xFFFF);
		this.writeRawByte(Marker.REFERENCE);
		this.writeRawBytes(u16encoder.encode(reference));
	}
	
	writeArray(array) {
		if (!this.references.has(array)) {
			this.references.set(array, this.references.size);
			this.writeRawByte(Marker.STRICT_ARRAY);
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
				this.writeRawByte(Marker.TYPED_OBJECT);
				this.writeRawString(name);
			} else {
				this.writeRawByte(Marker.OBJECT);
			}
			for (var key in object) {
				if (key[0] != "@") {
					var value = object[key];
					this.writeRawString(key);
					this.write(value);	
				}
			}
			this.writeRawString("");
			this.writeRawByte(Marker.OBJECT_END);
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

module.exports = Writer;
