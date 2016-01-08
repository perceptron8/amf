"use strict";

var _ = require("underscore");
var _s = require("underscore.string");

var AMF0 = require("../../lib/AMF0");
var Helpers = require("../Helpers");
var Constants = require("./Constants");

describe("AMF0.Reader", function() {
	// u8 marker
	it("can read null", function() {
		var array = [AMF0.Marker.NULL];
		var reader = new AMF0.Reader(Helpers.pullFrom(array));
		expect(reader.read()).toEqual(null);
	});
	
	// u8 marker
	it("can read undefined", function() {
		var array = [AMF0.Marker.UNDEFINED];
		var reader = new AMF0.Reader(Helpers.pullFrom(array));
		expect(reader.read()).toEqual(undefined);
	});
	
	// u8 marker, u8 value
	it("can read true", function() {
		var array = [AMF0.Marker.BOOLEAN, 0x01];
		var reader = new AMF0.Reader(Helpers.pullFrom(array));
		expect(reader.read()).toEqual(true);
	});
	
	// u8 marker, u8 value
	it("can read false", function() {
		var array = [AMF0.Marker.BOOLEAN, 0x00];
		var reader = new AMF0.Reader(Helpers.pullFrom(array));
		expect(reader.read()).toEqual(false);
	});
	
	// u8 marker, f64 number
	it("can read number", function() {
		var array = [AMF0.Marker.NUMBER].concat(Constants.ONE);
		var reader = new AMF0.Reader(Helpers.pullFrom(array));
		expect(reader.read()).toEqual(1);
	});
	
	// u8 marker, f64 epochMilli, s16 timeZone
	it("can read date", function() {
		var array = [AMF0.Marker.DATE].concat(Constants.ONE, [0x00, 0x00]);
		var reader = new AMF0.Reader(Helpers.pullFrom(array));
		expect(reader.read()).toEqual(new Date(1));
	});
	
	// u8 marker, u16 length * utf8 bytes
	it("can read short string", function() {
		var array = [AMF0.Marker.STRING].concat(Constants.EURO);
		var reader = new AMF0.Reader(Helpers.pullFrom(array));
		expect(reader.read()).toEqual("€");
	});
	
	// u8 marker, u32 length * utf8 bytes
	it("can read long string", function() {
		var array = [AMF0.Marker.LONG_STRING].concat([0x00, 0x00, 0x00, 0x01], [0x20]);
		var reader = new AMF0.Reader(Helpers.pullFrom(array));
		expect(reader.read()).toEqual(" ");
	});
	
	// u8 marker, u32 length * values
	it("can read array", function() {
		var array = [AMF0.Marker.STRICT_ARRAY].concat([0x00, 0x00, 0x00, 0x01], [AMF0.Marker.REFERENCE], [0x00, 0x00]);
		var reader = new AMF0.Reader(Helpers.pullFrom(array));
		var data = reader.read();
		expect(data).toEqual([data]);
	});
	
	// u8 marker, u32 length * values
	it("can read anonymous", function() {
		var array = [AMF0.Marker.OBJECT].concat(Constants.PROPERTY, [AMF0.Marker.REFERENCE], [0x00, 0x00], Constants.EMPTY, [AMF0.Marker.OBJECT_END]);
		var reader = new AMF0.Reader(Helpers.pullFrom(array));
		var data = reader.read();
		expect(data).toEqual({"property": data});
	});
	
	// u8 marker, u32 length * values
	it("can read typed", function() {
		var array = [AMF0.Marker.TYPED_OBJECT].concat(Constants.NAME, Constants.PROPERTY, [AMF0.Marker.REFERENCE], [0x00, 0x00], Constants.EMPTY, [AMF0.Marker.OBJECT_END]);
		var reader = new AMF0.Reader(Helpers.pullFrom(array));
		var data = reader.read();
		expect(data["@name"]).toEqual("Name");
		expect(data["property"]).toEqual(data);
	});
});
