"use strict";

const _ = require("lodash");
const assert = require("assert");

const TextDecoder = require("text-encoding").TextDecoder;
const NumberDecoder = require("number-encoding").NumberDecoder;
const utf8decoder = new TextDecoder("utf-8");
const u16decoder = new NumberDecoder("Uint16");
const u32decoder = new NumberDecoder("Uint32");
const f64decoder = new NumberDecoder("Float64");

const AMF3 = require("../AMF3");

const Marker = require("./Marker");

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
		const length = u16decoder.decode(this.readRawBytes(u16decoder.length));
		const bytes = this.readRawBytes(length);
		const string = utf8decoder.decode(bytes);
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
		const bytes = this.readRawBytes(f64decoder.length);
		const number = f64decoder.decode(bytes);
		return number;
	}
	
	readDate() {
		const bytes = this.readRawBytes(f64decoder.length);
		const epochMilli = f64decoder.decode(bytes);
		const date = new Date(epochMilli);
		return date;
	}
	
	readShortString() {
		const length = u16decoder.decode(this.readRawBytes(u16decoder.length));
		const string = utf8decoder.decode(this.readRawBytes(length));
		return string;
	}
	
	readLongString() {
		const length = u32decoder.decode(this.readRawBytes(u32decoder.length));
		const string = utf8decoder.decode(this.readRawBytes(length));
		return string;
	}
	
	readArray() {
		const array = [];
		this.references.set(this.references.size, array);
		const length = u32decoder.decode(this.readRawBytes(u32decoder.length));
		for (let index = 0; index < length; index++) {
			const value = this.read();
			array.push(value);
		}
		return array;
	}
	
	readObject(typed) {
		// create
		const object = {};
		// remember
		this.references.set(this.references.size, object);
		// read class name
		if (typed) {
			const name = this.readRawString();
			object["@name"] = name;
		}
		// read properties
		for (let key = this.readRawString(); key != ""; key = this.readRawString()) {
			assert(key[0] != "@");
			const value = this.read();
			object[key] = value;
		}
		// read object end marker
		const marker = this.readRawByte();
		assert(marker == Marker.OBJECT_END);
		return object;
	}
	
	readObjectPlus() {
		const reader = new AMF3.Reader(this.pull);
		return reader.read();
	}
	
	readReference() {
		const reference = u16decoder.decode(this.readRawBytes(u16decoder.length));
		return this.references.get(reference);
	}
	
	read() {
		const marker = this.readRawByte();
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
