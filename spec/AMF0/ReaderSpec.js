"use strict";

const _ = require("underscore");
const _s = require("underscore.string");

const AMF0 = require("../../lib/AMF0");
const Helpers = require("../Helpers");
const Constants = require("./Constants");

describe("AMF0.Reader", function() {
	// u8 marker
	it("can read null", function() {
		const array = [AMF0.Marker.NULL];
		const reader = new AMF0.Reader(Helpers.pullFrom(array));
		expect(reader.read()).toEqual(null);
	});
	
	// u8 marker
	it("can read undefined", function() {
		const array = [AMF0.Marker.UNDEFINED];
		const reader = new AMF0.Reader(Helpers.pullFrom(array));
		expect(reader.read()).toEqual(undefined);
	});
	
	// u8 marker, u8 value
	it("can read true", function() {
		const array = [AMF0.Marker.BOOLEAN, 0x01];
		const reader = new AMF0.Reader(Helpers.pullFrom(array));
		expect(reader.read()).toEqual(true);
	});
	
	// u8 marker, u8 value
	it("can read false", function() {
		const array = [AMF0.Marker.BOOLEAN, 0x00];
		const reader = new AMF0.Reader(Helpers.pullFrom(array));
		expect(reader.read()).toEqual(false);
	});
	
	// u8 marker, f64 number
	it("can read number", function() {
		const array = [AMF0.Marker.NUMBER].concat(Constants.ONE);
		const reader = new AMF0.Reader(Helpers.pullFrom(array));
		expect(reader.read()).toEqual(1);
	});
	
	// u8 marker, f64 epochMilli, s16 timeZone
	it("can read date", function() {
		const array = [AMF0.Marker.DATE].concat(Constants.ONE, [0x00, 0x00]);
		const reader = new AMF0.Reader(Helpers.pullFrom(array));
		expect(reader.read()).toEqual(new Date(1));
	});
	
	// u8 marker, u16 length * utf8 bytes
	it("can read short string", function() {
		const array = [AMF0.Marker.STRING].concat(Constants.EURO);
		const reader = new AMF0.Reader(Helpers.pullFrom(array));
		expect(reader.read()).toEqual("€");
	});
	
	// u8 marker, u32 length * utf8 bytes
	it("can read long string", function() {
		const array = [AMF0.Marker.LONG_STRING].concat([0x00, 0x00, 0x00, 0x01], [0x20]);
		const reader = new AMF0.Reader(Helpers.pullFrom(array));
		expect(reader.read()).toEqual(" ");
	});
	
	// u8 marker, u32 length * values
	it("can read array", function() {
		const array = [AMF0.Marker.STRICT_ARRAY].concat([0x00, 0x00, 0x00, 0x01], [AMF0.Marker.REFERENCE], [0x00, 0x00]);
		const reader = new AMF0.Reader(Helpers.pullFrom(array));
		const data = reader.read();
		expect(data).toEqual([data]);
	});
	
	// u8 marker, u32 length * values
	it("can read anonymous", function() {
		const array = [AMF0.Marker.OBJECT].concat(Constants.PROPERTY, [AMF0.Marker.REFERENCE], [0x00, 0x00], Constants.EMPTY, [AMF0.Marker.OBJECT_END]);
		const reader = new AMF0.Reader(Helpers.pullFrom(array));
		const data = reader.read();
		expect(data).toEqual({"property": data});
	});
	
	// u8 marker, u32 length * values
	it("can read typed", function() {
		const array = [AMF0.Marker.TYPED_OBJECT].concat(Constants.NAME, Constants.PROPERTY, [AMF0.Marker.REFERENCE], [0x00, 0x00], Constants.EMPTY, [AMF0.Marker.OBJECT_END]);
		const reader = new AMF0.Reader(Helpers.pullFrom(array));
		const data = reader.read();
		expect(data["@name"]).toEqual("Name");
		expect(data["property"]).toEqual(data);
	});
});
