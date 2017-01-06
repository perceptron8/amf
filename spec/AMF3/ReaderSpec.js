"use strict";

const _ = require("underscore");
const _s = require("underscore.string");

const AMF3 = require("../../lib/AMF3");
const Helpers = require("../Helpers");
const Constants = require("./Constants");

describe("AMF3.Reader", function() {
	// u8 marker
	it("can read null", function() {
		const array = [AMF3.Marker.NULL];
		const reader = new AMF3.Reader(Helpers.pullFrom(array));
		expect(reader.read()).toEqual(null);
	});
	
	// u8 marker
	it("can read undefined", function() {
		const array = [AMF3.Marker.UNDEFINED];
		const reader = new AMF3.Reader(Helpers.pullFrom(array));
		expect(reader.read()).toEqual(undefined);
	});
	
	// u8 marker, u8 value
	it("can read true", function() {
		const array = [AMF3.Marker.TRUE];
		const reader = new AMF3.Reader(Helpers.pullFrom(array));
		expect(reader.read()).toEqual(true);
	});
	
	// u8 marker, u8 value
	it("can read false", function() {
		const array = [AMF3.Marker.FALSE];
		const reader = new AMF3.Reader(Helpers.pullFrom(array));
		expect(reader.read()).toEqual(false);
	});
	
	// u8 marker, u29 integer
	it("can read positive integer", function() {
		const array = [AMF3.Marker.INTEGER].concat([0x01]);
		const reader = new AMF3.Reader(Helpers.pullFrom(array));
		expect(reader.read()).toEqual(1);
	});
	
	// u8 marker, u29 integer
	it("can read negative integer", function() {
		const array = [AMF3.Marker.INTEGER].concat([0xFF, 0xFF, 0xFF, 0xFF]);
		const reader = new AMF3.Reader(Helpers.pullFrom(array));
		expect(reader.read()).toEqual(-1);
	});
	
	// u8 marker, u29 integer
	it("can read positive big integer", function() {
		const array = [AMF3.Marker.INTEGER].concat([0xBF, 0xFF, 0xFF, 0xFF]);
		const reader = new AMF3.Reader(Helpers.pullFrom(array));
		expect(reader.read()).toEqual(Constants.INTEGER_MAX);
	});
	
	// u8 marker, u29 integer
	it("can read negative big integer", function() {
		const array = [AMF3.Marker.INTEGER].concat([0xC0, 0x80, 0x80, 0x00]);
		const reader = new AMF3.Reader(Helpers.pullFrom(array));
		expect(reader.read()).toEqual(Constants.INTEGER_MIN);
	});
	
	// u8 marker, f64 double
	it("can read double", function() {
		const array = [AMF3.Marker.DOUBLE].concat(Constants.HALF);
		const reader = new AMF3.Reader(Helpers.pullFrom(array));
		expect(reader.read()).toEqual(0.5);
	});
	
	// u8 marker, u29 reference, f64 epochMilli
	it("can read date", function() {
		const array = [AMF3.Marker.DATE].concat([0 << 1 | 1], Constants.ONE, [AMF3.Marker.DATE],[0 << 1 | 0]);
		const reader = new AMF3.Reader(Helpers.pullFrom(array));
		expect(reader.read()).toEqual(new Date(1)); // by value
		expect(reader.read()).toEqual(new Date(1)); // by reference
	});
	
	// u8 marker, u29 length/reference * utf8 bytes
	it("can read string", function() {
		const array = [].concat([AMF3.Marker.STRING], [3 << 1 | 1], Constants.EURO, [AMF3.Marker.STRING], [0 << 1 | 0]);
		const reader = new AMF3.Reader(Helpers.pullFrom(array));
		expect(reader.read()).toEqual("€"); // by value
		expect(reader.read()).toEqual("€"); // by reference
	});
	
	it("can read empty string", function() {
		const array = [].concat([AMF3.Marker.STRING], [0 << 1 | 1], [AMF3.Marker.STRING], [0 << 1 | 1]);
		const reader = new AMF3.Reader(Helpers.pullFrom(array));
		expect(reader.read()).toEqual(""); // by value
		expect(reader.read()).toEqual(""); // by value
	});
	
	// u8 marker, u29 length/reference * values
	it("can read array", function() {
		const array = [AMF3.Marker.ARRAY].concat([1 << 1 | 1], [0 << 1 | 1], [AMF3.Marker.ARRAY], [0 << 1 | 0]);
		const reader = new AMF3.Reader(Helpers.pullFrom(array));
		const data = reader.read();
		expect(data).toEqual([data]);
	});
	
	// u8 marker, empty traits, dynamic members
	it("can read anonymous", function() {
		const array = [].concat(
			[AMF3.Marker.OBJECT], [0 << 4 | true << 3 | false << 2 | 0x03], [0 << 1 | 1], // 0 properties, dynamic, !externalizable, no name
			[8 << 1 | 1], Constants.PROPERTY, [AMF3.Marker.OBJECT], [0 << 1 | 0], [0 << 1 | 1] // dynamic members: self reference, then empty string
		);
		const reader = new AMF3.Reader(Helpers.pullFrom(array));
		const data = reader.read();
		expect(data).toEqual({"@name": "", "@externalizable": false, "@dynamic": true, "@properties": [], "property": data});
	});
	
	// u8 marker, traits, properties
	it("can read typed", function() {
		const array = [].concat(
			[AMF3.Marker.OBJECT], [1 << 4 | true << 3 | false << 2 | 0x03], [4 << 1 | 1], Constants.NAME, // 1 property, dynamic, !externalizable, "Name"
			[8 << 1 | 1], Constants.PROPERTY, // list of properties
			[AMF3.Marker.OBJECT], [0 << 1 | 0], // self-reference
			[0 << 1 | 1] // end of dynamic members
		);
		const reader = new AMF3.Reader(Helpers.pullFrom(array));
		const data = reader.read();
		expect(data).toEqual({"@name": "Name", "@externalizable": false, "@dynamic": true, "@properties": ["property"], "property": data});
	});
});
