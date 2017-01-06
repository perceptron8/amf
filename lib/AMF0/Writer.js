"use strict";

const _ = require("underscore");
const assert = require("assert");

const TextEncoder = require("text-encoding").TextEncoder;
const NumberEncoder = require("number-encoding").NumberEncoder;
const utf8encoder = new TextEncoder("utf-8");
const u16encoder = new NumberEncoder("Uint16");
const u32encoder = new NumberEncoder("Uint32");
const f64encoder = new NumberEncoder("Float64");

const Marker = require("./Marker");

class Writer {
	constructor(push) {
		assert(_.isFunction(push));
		this.push = push;
		this.references = new Map();
	}
	
	writeRawByte(byte) {
		this.push(Uint8Array.of(byte));
	}
	
	writeRawBytes(bytes) {
		this.push(Uint8Array.from(bytes));
	}
	
	writeRawString(string) {
		const bytes = utf8encoder.encode(string);
		const length = bytes.length;
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
		const epochMilli = date.getTime();
		const zoneOffset = 0x0000;
		this.writeRawByte(Marker.DATE);
		this.writeRawBytes(f64encoder.encode(epochMilli));
		this.writeRawBytes(u16encoder.encode(zoneOffset));
	}
	
	writeString(string) {
		const bytes = utf8encoder.encode(string);
		const length = bytes.length;
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
			for (let value of array) {
				this.write(value);
			}
		} else {
			const reference = this.references.get(array);
			this.writeReference(reference);
		}
	}
	
	writeObject(object) {
		if (!this.references.has(object)) {
			this.references.set(object, this.references.size);
			const name = object["@name"];
			if (!_.isEmpty(name)) {
				this.writeRawByte(Marker.TYPED_OBJECT);
				this.writeRawString(name);
			} else {
				this.writeRawByte(Marker.OBJECT);
			}
			for (let key in object) {
				if (key[0] != "@") {
					const value = object[key];
					this.writeRawString(key);
					this.write(value);	
				}
			}
			this.writeRawString("");
			this.writeRawByte(Marker.OBJECT_END);
		} else {
			const reference = this.references.get(object);
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
