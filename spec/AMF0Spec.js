"use strict";

var _ = require("underscore");
var _s = require("underscore.string");

var AMF0 = require("../lib/AMF0");

// strings

var EMPTY = [0, 0].concat([]); // ""
var NAME = [0, 4].concat([78, 97, 109, 101]); // "Name"
var PROPERTY = [0, 8].concat([112, 114, 111, 112, 101, 114, 116, 121]); // "property"
var EURO = [0, 3].concat([0xE2, 0x82, 0xAC]); // "€"

// doubles

var ONE = [0x3f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];

//wrappers

function pullFrom(array) {
	return function(length) {
		return Uint8Array.from(
			array.splice(0, length)
		);
	}
}
function pushTo(array) {
	return function(bytes) {
		for (var byte of bytes) {
			array.push(byte);
		}
	}
}

// specs

describe("AMF0.Reader", function() {
	// u8 marker
	it("can read null", function() {
		var array = [AMF0.MARKER.NULL];
		var reader = new AMF0.Reader(pullFrom(array));
		expect(reader.read()).toEqual(null);
	});
	
	// u8 marker
	it("can read undefined", function() {
		var array = [AMF0.MARKER.UNDEFINED];
		var reader = new AMF0.Reader(pullFrom(array));
		expect(reader.read()).toEqual(undefined);
	});
	
	// u8 marker, u8 value
	it("can read true", function() {
		var array = [AMF0.MARKER.BOOLEAN, 0x01];
		var reader = new AMF0.Reader(pullFrom(array));
		expect(reader.read()).toEqual(true);
	});
	
	// u8 marker, u8 value
	it("can read false", function() {
		var array = [AMF0.MARKER.BOOLEAN, 0x00];
		var reader = new AMF0.Reader(pullFrom(array));
		expect(reader.read()).toEqual(false);
	});
	
	// u8 marker, f64 number
	it("can read number", function() {
		var array = [AMF0.MARKER.NUMBER].concat(ONE);
		var reader = new AMF0.Reader(pullFrom(array));
		expect(reader.read()).toEqual(1);
	});
	
	// u8 marker, f64 epochMilli, s16 timeZone
	it("can read date", function() {
		var array = [AMF0.MARKER.DATE].concat(ONE, [0x00, 0x00]);
		var reader = new AMF0.Reader(pullFrom(array));
		expect(reader.read()).toEqual(new Date(1));
	});
	
	// u8 marker, u16 length * utf8 bytes
	it("can read short string", function() {
		var array = [AMF0.MARKER.STRING].concat([0x00, 0x03], [0xE2, 0x82, 0xAC]);
		var reader = new AMF0.Reader(pullFrom(array));
		expect(reader.read()).toEqual("€");
	});
	
	// u8 marker, u32 length * utf8 bytes
	it("can read long string", function() {
		var array = [AMF0.MARKER.LONG_STRING].concat([0x00, 0x00, 0x00, 0x01], [0x20]);
		var reader = new AMF0.Reader(pullFrom(array));
		expect(reader.read()).toEqual(" ");
	});
	
	// u8 marker, u32 length * values
	it("can read array", function() {
		var array = [AMF0.MARKER.STRICT_ARRAY].concat([0x00, 0x00, 0x00, 0x01], [AMF0.MARKER.REFERENCE], [0x00, 0x00]);
		var reader = new AMF0.Reader(pullFrom(array));
		var data = reader.read();
		expect(data).toEqual([data]);
	});
	
	// u8 marker, u32 length * values
	it("can read anonymous", function() {
		var array = [AMF0.MARKER.OBJECT].concat(PROPERTY, [AMF0.MARKER.REFERENCE], [0x00, 0x00], EMPTY, [AMF0.MARKER.OBJECT_END]);
		var reader = new AMF0.Reader(pullFrom(array));
		var data = reader.read();
		expect(data).toEqual({"property": data});
	});
	
	// u8 marker, u32 length * values
	it("can read typed", function() {
		var array = [AMF0.MARKER.TYPED_OBJECT].concat(NAME, PROPERTY, [AMF0.MARKER.REFERENCE], [0x00, 0x00], EMPTY, [AMF0.MARKER.OBJECT_END]);
		var reader = new AMF0.Reader(pullFrom(array));
		var data = reader.read();
		expect(data["@name"]).toEqual("Name");
		expect(data["property"]).toEqual(data);
	});
});


describe("AMF0.Writer", function() {
	// u8 marker
	it("can write null", function() {
		var array = [];
		var writer = new AMF0.Writer(pushTo(array));
		writer.write(null);
		expect(array).toEqual([AMF0.MARKER.NULL]);
	});
	
	// u8 marker
	it("can write undefined", function() {
		var array = [];
		var writer = new AMF0.Writer(pushTo(array));
		writer.write(undefined);
		expect(array).toEqual([AMF0.MARKER.UNDEFINED]);
	});
	
	// u8 marker, u8 value
	it("can write true", function() {
		var array = [];
		var writer = new AMF0.Writer(pushTo(array));
		writer.write(true);
		expect(array).toEqual([AMF0.MARKER.BOOLEAN, 0x01]);
	});
	
	// u8 marker, u8 value
	it("can write false", function() {
		var array = [];
		var writer = new AMF0.Writer(pushTo(array));
		writer.write(false);
		expect(array).toEqual([AMF0.MARKER.BOOLEAN, 0x00]);
	});
	
	// u8 marker, f64 number
	it("can write number", function() {
		var array = [];
		var writer = new AMF0.Writer(pushTo(array));
		writer.write(1);
		expect(array).toEqual([AMF0.MARKER.NUMBER].concat(ONE));
	});
	
	// u8 marker, f64 epochMilli, s16 timeZone
	it("can write date", function() {
		var array = [];
		var writer = new AMF0.Writer(pushTo(array));
		writer.write(new Date(1));
		expect(array).toEqual([AMF0.MARKER.DATE].concat(ONE, [0x00, 0x00]));
	});
	
	// u8 marker, u16 length * utf8 bytes
	it("can write short string", function() {
		var array = [];
		var writer = new AMF0.Writer(pushTo(array));
		writer.write("€");
		expect(array).toEqual([AMF0.MARKER.STRING].concat(EURO));
	});
	
	// u8 marker, u32 length * utf8 bytes
	it("can write long string", function() {
		var array = [];
		var writer = new AMF0.Writer(pushTo(array));
		writer.write(_s.repeat(" ", 0x00010000));
		expect(array.slice(0, 6)).toEqual([AMF0.MARKER.LONG_STRING].concat([0x00, 0x01, 0x00, 0x00], [0x20]));
	});
	
	// u8 marker, u32 length * values
	it("can write array", function() {
		var array = [];
		var writer = new AMF0.Writer(pushTo(array));
		var data = [];
		data.push(data); // self reference
		writer.write(data);
		expect(array).toEqual([AMF0.MARKER.STRICT_ARRAY].concat([0x00, 0x00, 0x00, 0x01], [AMF0.MARKER.REFERENCE], [0x00, 0x00]));
	});
	
	// u8 marker, u32 length * values
	it("can write anonymous", function() {
		var array = [];
		var writer = new AMF0.Writer(pushTo(array));
		var data = {};
		data["property"] = data; // self reference
		writer.write(data);
		expect(array).toEqual([AMF0.MARKER.OBJECT].concat(PROPERTY, [AMF0.MARKER.REFERENCE], [0x00, 0x00], EMPTY, [AMF0.MARKER.OBJECT_END]));
	});
	
	// u8 marker, u32 length * values
	it("can write typed", function() {
		var array = [];
		var writer = new AMF0.Writer(pushTo(array));
		var data = {};
		data["@name"] = "Name";
		data["property"] = data; // self reference
		writer.write(data);
		expect(array).toEqual([AMF0.MARKER.TYPED_OBJECT].concat(NAME, PROPERTY, [AMF0.MARKER.REFERENCE], [0x00, 0x00], EMPTY, [AMF0.MARKER.OBJECT_END]));
	});
});
