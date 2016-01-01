"use strict";

var _ = require("underscore");
var assert = require("assert");

var TextEncoder = require("text-encoding").TextEncoder;
var TextDecoder = require("text-encoding").TextDecoder;
var NumberEncoder = require("number-encoding").NumberEncoder;
var NumberDecoder = require("number-encoding").NumberDecoder;

var utf8encoder = new TextEncoder("utf-8");
var utf8decoder = new TextDecoder("utf-8");
var u8encoder = new NumberEncoder("Uint8");
var u8decoder = new NumberDecoder("Uint8");
var u32encoder = new NumberEncoder("Uint32");
var u32decoder = new NumberDecoder("Uint32");
var f64encoder = new NumberEncoder("Float64");
var f64decoder = new NumberDecoder("Float64");

var INTEGER_MIN = -Math.pow(2, 28);
var INTEGER_MAX = +Math.pow(2, 28) - 1;

var isSafe = function(number) {
	return INTEGER_MIN <= number && number <= INTEGER_MAX;
};

var MARKER = {
	UNDEFINED:     0x00,
	NULL:          0x01,
	FALSE:         0x02,
	TRUE:          0x03,
	INTEGER:       0x04,
	DOUBLE:        0x05,
	STRING:        0x06,
	XML_DOC:       0x07, // not supported
	DATE:          0x08,
	ARRAY:         0x09,
	OBJECT:        0x0A,
	XML:           0x0B, // not supported
	BYTE_ARRAY:    0x0C, // not supported
	VECTOR_INT:    0x0D, // not supported
	VECTOR_UINT:   0x0E, // not supported
	VECTOR_DOUBLE: 0x0F, // not supported
	VECTOR_OBJECT: 0x10, // not supported
	DICTIONARY:    0x11  // not supported
};

class Reader {
	constructor(pull) {
		assert(_.isFunction(pull));
		this.pull = pull;
		this.strings = new Map();
		this.objects = new Map();
		this.traits = new Map();
	}
	
	readByte() {
		return this.pull(1)[0];
	}
	
	readBytes(length) {
		return this.pull(length);
	}
	
	readUnsignedInteger() {
		var b0 = this.readByte();
		if (!(b0 & 0x80)) return b0;
		var b1 = this.readByte();
		if (!(b1 & 0x80)) return (b0 & 0x7F) << 7 | (b1 & 0x7F);
		var b2 = this.readByte();
		if (!(b2 & 0x80)) return (b0 & 0x7F) << 14 | (b1 & 0x7F) << 7 | (b2 & 0x7F);
		var b3 = this.readByte();
		return (b0 & 0x7F) << 22 | ((b1 & 0x7F) << 15) | (b2 & 0x7F) << 8 | (b3 & 0xFF);
	}
	
	readSignedInteger() {
		var number = this.readUnsignedInteger();
		// is sign extension needed?
		return number & 0x010000000 ? number | 0xE0000000 : number;
	};

	readDouble() {
		var bytes = this.readBytes(f64decoder.length);
		return f64decoder.decode(bytes);
	};

	readString() {
		var index = this.readUnsignedInteger();
		if (index & 1) {
			var length = index >> 1;
			var bytes = this.readBytes(length);
			var string = utf8decoder.decode(bytes);
			this.strings.set(this.strings.size, string);
			return string;
		} else {
			var reference = index >> 1;
			return this.strings.get(reference);
		}
	};

	readDate() {
		var index = this.readUnsignedInteger();
		if (index & 1) {
			var epochMilli = this.readDouble();
			var date = new Date(epochMilli);
			this.objects.set(this.objects.size, date);
			return date;
		} else {
			var reference = index >> 1;
			return this.objects.get(reference);
		}
	};

	readArray() {
		var index = this.readUnsignedInteger();
		if (index & 1) {
			var array = [];
			this.objects.set(this.objects.size, array);
			var length = index >> 1;
			// associative part (must be empty)
			var key = this.readString();
			assert(key == "");
			// dense part (must not be empty)
			for (var i = 0; i < length; i++) {
				var value = this.read();
				array.push(value);
			}
			return array;
		} else {
			var reference = index >> 1;
			return this.objects.get(reference);
		}
	};

	readObject() {
		var index = this.readUnsignedInteger();
		if (index & 1 << 0) {
			var object = {};
			this.objects.set(this.objects.size, object);
			// read object
			if (index & 1 << 1) {
				// read traits
				var traits = {};
				this.traits.set(this.traits.size, traits);
				var name = this.readString();
				traits["@name"] = name;
				traits["@externalizable"] = !!(index & 1 << 2);
				traits["@dynamic"] = !!(index & 1 << 3);
				traits["@properties"] = [];
				var length = index >> 4;
				for (var i = 0; i < length; i++) {
					var property = this.readString();
					traits["@properties"].push(property);
				}
				_.extend(object, traits);
			} else {
				// get traits
				var reference = index >> 2;
				var traits = this.traits.get(reference);
				_.extend(object, traits);
			}
			if (!object["@externalizable"]) {
				// read properties
				for (var property of object["@properties"]) {
					assert(property[0] != "@");
					var value = this.read();
					object[property] = value;
				}
				if (object["@dynamic"]) {
					// read dynamic properties
					for (var property = this.readString(); property != ""; property = this.readString()) {
						assert(property[0] != "@");
						var value = this.read();
						object[property] = value;
					}
				}
			} else {
				// deexternalize
				switch (type) {
				case "flex.messaging.io.ArrayCollection":
					object.source = this.read();
					break;
				default:
					// TODO support more types
					throw "IllegalStateException";
				}
			}
			return object;
		} else {
			// restore object
			var reference = index >> 1;
			return this.objects.get(reference);
		}
	};

	read() {
		var marker = u8decoder.decode(this.readBytes(u8decoder.length));
		if (marker === MARKER.NULL) {
			return null;
		} else if (marker == MARKER.UNDEFINED) {
			return undefined;
		} else if (marker === MARKER.TRUE) {
			return true;
		} else if (marker === MARKER.FALSE) {
			return false;
		} else if (marker === MARKER.INTEGER) {
			return this.readSignedInteger();
		} else if (marker === MARKER.DOUBLE) {
			return this.readDouble();
		} else if (marker === MARKER.STRING) {
			return this.readString();
		} else if (marker === MARKER.DATE) {
			return this.readDate();
		} else if (marker === MARKER.ARRAY) {
			return this.readArray();
		} else if (marker === MARKER.OBJECT) {
			return this.readObject();
		} else {
			throw "IllegalStateException";
		}
	};
}

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
		this.push([byte]);
	}
	
	writeBytes(bytes) {
		this.push(bytes);
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
				var bytes = utf8encoder.encode(string);
				this.writeUnsignedInteger(bytes.length << 1 | 1);
				this.writeBytes(bytes);
			} else {
				var reference = this.strings.get(string);
				this.writeUnsignedInteger(reference << 1 | 0);
			}
		} else {
			this.writeUnsignedInteger(0 << 1 | 1);
		}
	}
	
	writeDate(date) {
		if (!this.objects.has(date)) {
			this.objects.set(date, this.objects.size);
			var epochMilli = date.getTime();
			this.writeUnsignedInteger(0 << 1 | 1);
			this.writeDouble(epochMilli);
		} else {
			var reference = this.objects.get(date);
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
			for (var value of array) {
				this.write(value);
			}
		} else {
			var reference = this.objects.get(array);
			this.writeUnsignedInteger(reference << 1 | 0);
		}
	}
	
	writeObject(object) {
		if (!this.objects.has(object)) {
			this.objects.set(object, this.objects.size);
			// inspect traits
			var name = _.result(object, "@name", "");
			var dynamic = _.result(object, "@dynamic", true);
			var externalizable = _.result(object, "@externalizable", false);
			var properties = _.result(object, "@properties", []);
			// write traits
			if (!this.traits.has(name)) {
				this.traits.set(name, this.traits.size);
				this.writeUnsignedInteger(properties.length << 4 | dynamic << 3 | externalizable << 2 | 0x03);
				this.writeString(name);
				// write property names
				for (var property of properties) {
					this.writeString(property);
				}
				// no empty string here
			} else {
				var reference = this.traits.get(name);
				this.writeUnsignedInteger(reference << 2 | 0x01);
			}
			if (!externalizable) {
				// write property values
				for (var property of properties) {
					assert(property[0] != "@");
					this.write(object[property]);
				}
				// write dynamic members
				if (dynamic) {
					var keys = Object.keys(object);
					var members = _.difference(keys, properties);
					for (var member of members) {
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
					// TODO support more types
					throw "IllegalStateException";
				}
			}
		} else {
			var reference = this.objects.get(object);
			this.writeUnsignedInteger(reference << 1 | 0);
		}
	}
	
	write(value) {
		if (value === null) {
			this.writeByte(MARKER.NULL);
		} else if (value === undefined) {
			this.writeByte(MARKER.UNDEFINED);
		} else if (value === true) {
			this.writeByte(MARKER.TRUE);
		} else if (value === false) {
			this.writeByte(MARKER.FALSE);
		} else if (_.isNumber(value)) {
			if (Number.isInteger(value) && isSafe(value)) {
				this.writeByte(MARKER.INTEGER);
				this.writeSignedInteger(value);
			} else {
				this.writeByte(MARKER.DOUBLE);
				this.writeDouble(value);
			}
		} else if (_.isString(value)) {
			this.writeByte(MARKER.STRING);
			this.writeString(value);
		} else if (_.isDate(value)) {
			this.writeByte(MARKER.DATE);
			this.writeDate(value);
		} else if (_.isArray(value)) {
			this.writeByte(MARKER.ARRAY);
			this.writeArray(value);
		} else if (_.isObject(value)) {
			this.writeByte(MARKER.OBJECT);
			this.writeObject(value);
		} else {
			throw "IllegalStateException";
		}
	}
};

module.exports = {
	MARKER: MARKER,
	Reader: Reader,
	Writer: Writer
};
