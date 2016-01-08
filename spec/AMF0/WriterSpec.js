"use strict";

var _ = require("underscore");
var _s = require("underscore.string");

var AMF0 = require("../../lib/AMF0");
var Helpers = require("../Helpers");
var Constants = require("./Constants");

describe("AMF0.Writer", function() {
	// u8 marker
	it("can write null", function() {
		var array = [];
		var writer = new AMF0.Writer(Helpers.pushTo(array));
		writer.write(null);
		expect(array).toEqual([AMF0.Marker.NULL]);
	});
	
	// u8 marker
	it("can write undefined", function() {
		var array = [];
		var writer = new AMF0.Writer(Helpers.pushTo(array));
		writer.write(undefined);
		expect(array).toEqual([AMF0.Marker.UNDEFINED]);
	});
	
	// u8 marker, u8 value
	it("can write true", function() {
		var array = [];
		var writer = new AMF0.Writer(Helpers.pushTo(array));
		writer.write(true);
		expect(array).toEqual([AMF0.Marker.BOOLEAN, 0x01]);
	});
	
	// u8 marker, u8 value
	it("can write false", function() {
		var array = [];
		var writer = new AMF0.Writer(Helpers.pushTo(array));
		writer.write(false);
		expect(array).toEqual([AMF0.Marker.BOOLEAN, 0x00]);
	});
	
	// u8 marker, f64 number
	it("can write number", function() {
		var array = [];
		var writer = new AMF0.Writer(Helpers.pushTo(array));
		writer.write(1);
		expect(array).toEqual([AMF0.Marker.NUMBER].concat(Constants.ONE));
	});
	
	// u8 marker, f64 epochMilli, s16 timeZone
	it("can write date", function() {
		var array = [];
		var writer = new AMF0.Writer(Helpers.pushTo(array));
		writer.write(new Date(1));
		expect(array).toEqual([AMF0.Marker.DATE].concat(Constants.ONE, [0x00, 0x00]));
	});
	
	// u8 marker, u16 length * utf8 bytes
	it("can write short string", function() {
		var array = [];
		var writer = new AMF0.Writer(Helpers.pushTo(array));
		writer.write("€");
		expect(array).toEqual([AMF0.Marker.STRING].concat(Constants.EURO));
	});
	
	// u8 marker, u32 length * utf8 bytes
	it("can write long string", function() {
		var array = [];
		var writer = new AMF0.Writer(Helpers.pushTo(array));
		writer.write(_s.repeat(" ", 0x00010000));
		expect(array.slice(0, 6)).toEqual([AMF0.Marker.LONG_STRING].concat([0x00, 0x01, 0x00, 0x00], [0x20]));
	});
	
	// u8 marker, u32 length * values
	it("can write array", function() {
		var array = [];
		var writer = new AMF0.Writer(Helpers.pushTo(array));
		var data = [];
		data.push(data); // self reference
		writer.write(data);
		expect(array).toEqual([AMF0.Marker.STRICT_ARRAY].concat([0x00, 0x00, 0x00, 0x01], [AMF0.Marker.REFERENCE], [0x00, 0x00]));
	});
	
	// u8 marker, u32 length * values
	it("can write anonymous", function() {
		var array = [];
		var writer = new AMF0.Writer(Helpers.pushTo(array));
		var data = {};
		data["property"] = data; // self reference
		writer.write(data);
		expect(array).toEqual([AMF0.Marker.OBJECT].concat(Constants.PROPERTY, [AMF0.Marker.REFERENCE], [0x00, 0x00], Constants.EMPTY, [AMF0.Marker.OBJECT_END]));
	});
	
	// u8 marker, u32 length * values
	it("can write typed", function() {
		var array = [];
		var writer = new AMF0.Writer(Helpers.pushTo(array));
		var data = {};
		data["@name"] = "Name";
		data["property"] = data; // self reference
		writer.write(data);
		expect(array).toEqual([AMF0.Marker.TYPED_OBJECT].concat(Constants.NAME, Constants.PROPERTY, [AMF0.Marker.REFERENCE], [0x00, 0x00], Constants.EMPTY, [AMF0.Marker.OBJECT_END]));
	});
});
