"use strict";

var _ = require("underscore");
var _s = require("underscore.string");

var AMF0 = require("../lib/AMF0");

// strings
var EMPTY = [0, 0].concat([]); // ""
var NAME = [0, 4].concat([78, 97, 109, 101]); // "Name"
var PROPERTY = [0, 8].concat([112, 114, 111, 112, 101, 114, 116, 121]); // "property"
var EURO = [0xE2, 0x82, 0xAC]; // "€"

//doubles
var ONE = [0x3f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];

describe("AMF0.Writer", function() {
	// u8 marker
	it("can write null", function() {
		var writer = new AMF0.Writer([]);
		writer.write(null);
		expect(writer.array).toEqual([AMF0.MARKER.NULL]);
	});
	
	// u8 marker
	it("can write undefined", function() {
		var writer = new AMF0.Writer([]);
		writer.write(undefined);
		expect(writer.array).toEqual([AMF0.MARKER.UNDEFINED]);
	});
	
	// u8 marker, u8 value
	it("can write true", function() {
		var writer = new AMF0.Writer([]);
		writer.write(true);
		expect(writer.array).toEqual([AMF0.MARKER.BOOLEAN, 0x01]);
	});
	
	// u8 marker, u8 value
	it("can write false", function() {
		var writer = new AMF0.Writer([]);
		writer.write(false);
		expect(writer.array).toEqual([AMF0.MARKER.BOOLEAN, 0x00]);
	});
	
	// u8 marker, f64 number
	it("can write number", function() {
		var writer = new AMF0.Writer([]);
		writer.write(1);
		expect(writer.array).toEqual([AMF0.MARKER.NUMBER].concat(ONE));
	});
	
	// u8 marker, f64 epochMilli, s16 timeZone
	it("can write date", function() {
		var writer = new AMF0.Writer([]);
		writer.write(new Date(1));
		expect(writer.array).toEqual([AMF0.MARKER.DATE].concat(ONE, [0x00, 0x00]));
	});
	
	// u8 marker, u16 length * utf8 bytes
	it("can write short string", function() {
		var writer = new AMF0.Writer([]);
		writer.write("€");
		expect(writer.array).toEqual([AMF0.MARKER.STRING].concat([0x00, 0x03], EURO));
	});
	
	// u8 marker, u32 length * utf8 bytes
	it("can write long string", function() {
		var writer = new AMF0.Writer([]);
		writer.write(_s.repeat(" ", 0x00010000));
		expect(writer.array.slice(0, 6)).toEqual([AMF0.MARKER.LONG_STRING].concat([0x00, 0x01, 0x00, 0x00], [0x20]));
	});
	
	// u8 marker, u32 length * values
	it("can write array", function() {
		var writer = new AMF0.Writer([]);
		var data = [];
		data.push(data); // self reference
		writer.write(data);
		expect(writer.array).toEqual([AMF0.MARKER.STRICT_ARRAY].concat([0x00, 0x00, 0x00, 0x01], [AMF0.MARKER.REFERENCE], [0x00, 0x00]));
	});
	
	// u8 marker, u32 length * values
	it("can write anonymous", function() {
		var writer = new AMF0.Writer([]);
		var data = {};
		data["property"] = data; // self reference
		writer.write(data);
		expect(writer.array).toEqual([AMF0.MARKER.OBJECT].concat(PROPERTY, [AMF0.MARKER.REFERENCE], [0x00, 0x00], EMPTY, [AMF0.MARKER.OBJECT_END]));
	});
	
	// u8 marker, u32 length * values
	it("can write typed", function() {
		var writer = new AMF0.Writer([]);
		var data = {};
		data["@name"] = "Name";
		data["property"] = data; // self reference
		writer.write(data);
		expect(writer.array).toEqual([AMF0.MARKER.TYPED_OBJECT].concat(NAME, PROPERTY, [AMF0.MARKER.REFERENCE], [0x00, 0x00], EMPTY, [AMF0.MARKER.OBJECT_END]));
	});
});

describe("AMF0.Reader", function() {
	// u8 marker
	it("can read null", function() {
		var reader = new AMF0.Reader([AMF0.MARKER.NULL]);
		expect(reader.read()).toEqual(null);
	});
	
	// u8 marker
	it("can read undefined", function() {
		var reader = new AMF0.Reader([AMF0.MARKER.UNDEFINED]);
		expect(reader.read()).toEqual(undefined);
	});
	
	// u8 marker, u8 value
	it("can read true", function() {
		var reader = new AMF0.Reader([AMF0.MARKER.BOOLEAN, 0x01]);
		expect(reader.read()).toEqual(true);
	});
	
	// u8 marker, u8 value
	it("can read false", function() {
		var reader = new AMF0.Reader([AMF0.MARKER.BOOLEAN, 0x00]);
		expect(reader.read()).toEqual(false);
	});
	
	// u8 marker, f64 number
	it("can read number", function() {
		var reader = new AMF0.Reader([AMF0.MARKER.NUMBER].concat(ONE));
		expect(reader.read()).toEqual(1);
	});
	
	// u8 marker, f64 epochMilli, s16 timeZone
	it("can read date", function() {
		var reader = new AMF0.Reader([AMF0.MARKER.DATE].concat(ONE, [0x00, 0x00]));
		expect(reader.read()).toEqual(new Date(1));
	});
	
	// u8 marker, u16 length * utf8 bytes
	it("can read short string", function() {
		var reader = new AMF0.Reader([AMF0.MARKER.STRING].concat([0x00, 0x03], [0xE2, 0x82, 0xAC]));
		expect(reader.read()).toEqual("€");
	});
	
	// u8 marker, u32 length * utf8 bytes
	it("can read long string", function() {
		var reader = new AMF0.Reader([AMF0.MARKER.LONG_STRING].concat([0x00, 0x00, 0x00, 0x01], [0x20]));
		expect(reader.read()).toEqual(" ");
	});
	
	// u8 marker, u32 length * values
	it("can read array", function() {
		var reader = new AMF0.Reader([AMF0.MARKER.STRICT_ARRAY].concat([0x00, 0x00, 0x00, 0x01], [AMF0.MARKER.REFERENCE], [0x00, 0x00]));
		var data = reader.read();
		expect(data).toEqual([data]);
	});
	
	// u8 marker, u32 length * values
	it("can read anonymous", function() {
		var reader = new AMF0.Reader([AMF0.MARKER.OBJECT].concat(PROPERTY, [AMF0.MARKER.REFERENCE], [0x00, 0x00], EMPTY, [AMF0.MARKER.OBJECT_END]));
		var data = reader.read();
		expect(data).toEqual({"property": data});
	});
	
	// u8 marker, u32 length * values
	it("can read typed", function() {
		var reader = new AMF0.Reader([AMF0.MARKER.TYPED_OBJECT].concat(NAME, PROPERTY, [AMF0.MARKER.REFERENCE], [0x00, 0x00], EMPTY, [AMF0.MARKER.OBJECT_END]));
		var data = reader.read();
		expect(data["@name"]).toEqual("Name");
		expect(data["property"]).toEqual(data);
	});
});
