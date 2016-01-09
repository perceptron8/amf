"use strict";

var _ = require("underscore");
var assert = require("assert");

var TextDecoder = require("text-encoding").TextDecoder;
var NumberDecoder = require("number-encoding").NumberDecoder;
var utf8decoder = new TextDecoder("utf-8");
var u8decoder = new NumberDecoder("Uint8");
var u32decoder = new NumberDecoder("Uint32");
var f64decoder = new NumberDecoder("Float64");

var Marker = require("./Marker");

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
			if (!_.isEmpty(string)) {
				this.strings.set(this.strings.size, string);
			}
			return string;
		} else {
			var reference = index >> 1;
			assert(this.strings.has(reference));
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
			assert(this.objects.has(reference));
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
			assert(this.objects.has(reference));
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
				assert(this.traits.has(reference));
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
				switch (object["@name"]) {
				case "flex.messaging.io.ArrayCollection":
					object.source = this.read();
					break;
				default:
					// TODO support more types?
					throw new Error("Unsupported externalizable.");
				}
			}
			return object;
		} else {
			// restore object
			var reference = index >> 1;
			assert(this.objects.has(reference));
			return this.objects.get(reference);
		}
	};

	read() {
		var marker = u8decoder.decode(this.readBytes(u8decoder.length));
		if (marker === Marker.NULL) {
			return null;
		} else if (marker == Marker.UNDEFINED) {
			return undefined;
		} else if (marker === Marker.TRUE) {
			return true;
		} else if (marker === Marker.FALSE) {
			return false;
		} else if (marker === Marker.INTEGER) {
			return this.readSignedInteger();
		} else if (marker === Marker.DOUBLE) {
			return this.readDouble();
		} else if (marker === Marker.STRING) {
			return this.readString();
		} else if (marker === Marker.DATE) {
			return this.readDate();
		} else if (marker === Marker.ARRAY) {
			return this.readArray();
		} else if (marker === Marker.OBJECT) {
			return this.readObject();
		} else {
			throw new Error("Unsupported marker.");
		}
	};
}

module.exports = Reader;
