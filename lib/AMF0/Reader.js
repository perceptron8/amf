"use strict";

var _ = require("underscore");
var assert = require("assert");

var TextDecoder = require("text-encoding").TextDecoder;
var NumberDecoder = require("number-encoding").NumberDecoder;
var utf8decoder = new TextDecoder("utf-8");
var u16decoder = new NumberDecoder("Uint16");
var u32decoder = new NumberDecoder("Uint32");
var f64decoder = new NumberDecoder("Float64");

var AMF3 = require("../AMF3");

var Marker = require("./Marker");

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
		assert(marker == Marker.OBJECT_END);
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
		case Marker.NULL:
			return this.readNull();
		case Marker.UNDEFINED:
			return this.readUndefined();
		case Marker.BOOLEAN:
			return this.readBoolean();
		case Marker.NUMBER:
			return this.readNumber();
		case Marker.DATE:
			return this.readDate();
		case Marker.STRING:
			return this.readShortString();
		case Marker.LONG_STRING:
			return this.readLongString();
		case Marker.STRICT_ARRAY:
			return this.readArray();
		case Marker.OBJECT:
			return this.readObject(false);
		case Marker.TYPED_OBJECT:
			return this.readObject(true);
		case Marker.AVMPLUS_OBJECT:
			return this.readObjectPlus();
		case Marker.REFERENCE:
			return this.readReference();
		case Marker.OBJECT_END:
			throw "IllegalStateException";
		}
	}
}

module.exports = Reader;
