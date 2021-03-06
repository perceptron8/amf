"use strict";

const _ = require("lodash");
const assert = require("assert");

const TextEncoder = require("text-encoding").TextEncoder;
const NumberEncoder = require("number-encoding").NumberEncoder;
const utf8encoder = new TextEncoder("utf-8");
const u8encoder = new NumberEncoder("Uint8");
const u32encoder = new NumberEncoder("Uint32");
const f64encoder = new NumberEncoder("Float64");

const Marker = require("./Marker");

const INTEGER_MIN = -Math.pow(2, 28);
const INTEGER_MAX = +Math.pow(2, 28) - 1;

const isSafe = function(number) {
	return INTEGER_MIN <= number && number <= INTEGER_MAX;
};

class Writer {
	constructor(push) {
		assert(_.isFunction(push));
		this.push = push;
		// instance -> index
		this.strings = new Map();
		// instance -> index
		this.objects = new Map();
		// @name -> index
		this.traits = new Map();
	}
	
	writeByte(byte) {
		this.push(Uint8Array.of(byte));
	}
	
	writeBytes(bytes) {
		this.push(Uint8Array.from(bytes));
	}
	
	writeUnsignedInteger(number) {
		if (number < 0x80) {
			this.writeBytes([number]);
		} else if (number < 0x4000) {
			this.writeBytes([number >> 7 & 0x7f | 0x80, number & 0x7f]);
		} else if (number < 0x200000) {
			this.writeBytes([number >> 14 & 0x7f | 0x80, number >> 7 & 0x7f | 0x80, number & 0x7f]);
		} else if (number < 0x40000000) {
			this.writeBytes([number >> 22 & 0x7f | 0x80, number >> 15 & 0x7f | 0x80, number >> 8 & 0x7f | 0x80, number & 0xff]);
		} else {
			throw "RangeException";
		}
	}
	
	writeSignedInteger(number) {
		this.writeUnsignedInteger(number & 0x1FFFFFFF);
	}
	
	writeDouble(number) {
		this.writeBytes(f64encoder.encode(number));
	}
	
	writeString(string) {
		if (!_.isEmpty(string)) {
			if (!this.strings.has(string)) {
				this.strings.set(string, this.strings.size);
				const bytes = utf8encoder.encode(string);
				this.writeUnsignedInteger(bytes.length << 1 | 1);
				this.writeBytes(bytes);
			} else {
				const reference = this.strings.get(string);
				this.writeUnsignedInteger(reference << 1 | 0);
			}
		} else {
			this.writeUnsignedInteger(0 << 1 | 1);
		}
	}
	
	writeDate(date) {
		if (!this.objects.has(date)) {
			this.objects.set(date, this.objects.size);
			const epochMilli = date.getTime();
			this.writeUnsignedInteger(0 << 1 | 1);
			this.writeDouble(epochMilli);
		} else {
			const reference = this.objects.get(date);
			this.writeUnsignedInteger(reference << 1 | 0);
		}
	}
	
	writeArray(array) {
		if (!this.objects.has(array)) {
			this.objects.set(array, this.objects.size);
			this.writeUnsignedInteger(array.length << 1 | 1);
			// associative part
			this.writeString("");
			// dense part
			for (let value of array) {
				this.write(value);
			}
		} else {
			const reference = this.objects.get(array);
			this.writeUnsignedInteger(reference << 1 | 0);
		}
	}
	
	writeObject(object) {
		if (!this.objects.has(object)) {
			this.objects.set(object, this.objects.size);
			// inspect traits
			const name = _.result(object, "@name", "");
			const dynamic = _.result(object, "@dynamic", true);
			const externalizable = _.result(object, "@externalizable", false);
			const properties = _.result(object, "@properties", []);
			// write traits
			if (!this.traits.has(name)) {
				this.traits.set(name, this.traits.size);
				this.writeUnsignedInteger(properties.length << 4 | dynamic << 3 | externalizable << 2 | 0x03);
				this.writeString(name);
				// write property names
				for (let property of properties) {
					this.writeString(property);
				}
				// no empty string here
			} else {
				const reference = this.traits.get(name);
				this.writeUnsignedInteger(reference << 2 | 0x01);
			}
			if (!externalizable) {
				// write property values
				for (let property of properties) {
					assert(property[0] != "@");
					this.write(object[property]);
				}
				// write dynamic members
				if (dynamic) {
					const keys = Object.keys(object);
					const members = _.difference(keys, properties);
					for (let member of members) {
						if (member[0] != "@") {
							this.writeString(member);
							this.write(object[member]);	
						}
					}
					this.writeString("");
				}
			} else {
				// externalize
				switch (name) {
				case "flex.messaging.io.ArrayCollection":
					this.write(object.source);
					break;
				default:
					// TODO support more types?
					throw "IllegalStateException";
				}
			}
		} else {
			const reference = this.objects.get(object);
			this.writeUnsignedInteger(reference << 1 | 0);
		}
	}
	
	write(value) {
		if (value === null) {
			this.writeByte(Marker.NULL);
		} else if (value === undefined) {
			this.writeByte(Marker.UNDEFINED);
		} else if (value === true) {
			this.writeByte(Marker.TRUE);
		} else if (value === false) {
			this.writeByte(Marker.FALSE);
		} else if (_.isNumber(value)) {
			if (Number.isInteger(value) && isSafe(value)) {
				this.writeByte(Marker.INTEGER);
				this.writeSignedInteger(value);
			} else {
				this.writeByte(Marker.DOUBLE);
				this.writeDouble(value);
			}
		} else if (_.isString(value)) {
			this.writeByte(Marker.STRING);
			this.writeString(value);
		} else if (_.isDate(value)) {
			this.writeByte(Marker.DATE);
			this.writeDate(value);
		} else if (_.isArray(value)) {
			this.writeByte(Marker.ARRAY);
			this.writeArray(value);
		} else if (_.isObject(value)) {
			this.writeByte(Marker.OBJECT);
			this.writeObject(value);
		} else {
			throw "IllegalStateException";
		}
	}
};

module.exports = Writer;
