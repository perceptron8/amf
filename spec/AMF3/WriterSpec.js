"use strict";

const _ = require("lodash");

const AMF3 = require("../../lib/AMF3");
const Helpers = require("../Helpers");
const Constants = require("./Constants");

describe("AMF3.Writer", function() {
	// u8 marker
	it("can write null", function() {
		const array = [];
		const writer = new AMF3.Writer(Helpers.pushTo(array));
		writer.write(null);
		expect(array).toEqual([AMF3.Marker.NULL]);
	});
	
	// u8 marker
	it("can write undefined", function() {
		const array = [];
		const writer = new AMF3.Writer(Helpers.pushTo(array));
		writer.write(undefined);
		expect(array).toEqual([AMF3.Marker.UNDEFINED]);
	});
	
	// u8 marker, u8 value
	it("can write true", function() {
		const array = [];
		const writer = new AMF3.Writer(Helpers.pushTo(array));
		writer.write(true);
		expect(array).toEqual([AMF3.Marker.TRUE]);
	});
	
	// u8 marker, u8 value
	it("can write false", function() {
		const array = [];
		const writer = new AMF3.Writer(Helpers.pushTo(array));
		writer.write(false);
		expect(array).toEqual([AMF3.Marker.FALSE]);
	});
	
	// u8 marker, u29 integer
	it("can write positive integer", function() {
		const array = [];
		const writer = new AMF3.Writer(Helpers.pushTo(array));
		writer.write(1);
		expect(array).toEqual([AMF3.Marker.INTEGER].concat([0x01]));
	});
	
	// u8 marker, u29 integer
	it("can write negative integer", function() {
		const array = [];
		const writer = new AMF3.Writer(Helpers.pushTo(array));
		writer.write(-1);
		expect(array).toEqual([AMF3.Marker.INTEGER].concat([0xFF, 0xFF, 0xFF, 0xFF]));
	});
	
	// u8 marker, u29 integer
	it("can write big integer", function() {
		const array = [];
		const writer = new AMF3.Writer(Helpers.pushTo(array));
		writer.write(Constants.INTEGER_MAX);
		expect(array).toEqual([AMF3.Marker.INTEGER].concat([0xBF, 0xFF, 0xFF, 0xFF]));
	});
	
	// u8 marker, u29 integer
	it("can write negative big integer", function() {
		const array = [];
		const writer = new AMF3.Writer(Helpers.pushTo(array));
		writer.write(Constants.INTEGER_MIN);
		expect(array).toEqual([AMF3.Marker.INTEGER].concat([0xC0, 0x80, 0x80, 0x00]));
	});
	
	// u8 marker, f64 double
	it("can write double", function() {
		const array = [];
		const writer = new AMF3.Writer(Helpers.pushTo(array));
		writer.write(0.5);
		expect(array).toEqual([AMF3.Marker.DOUBLE].concat(Constants.HALF));
	});
	
	// u8 marker, u29 length/reference, f64 epochMilli
	it("can write dates", function() {
		const array = [];
		const writer = new AMF3.Writer(Helpers.pushTo(array));
		const date = new Date(1);
		writer.write(date); // by value 
		writer.write(date); // by reference
		expect(array).toEqual([].concat(
			[AMF3.Marker.DATE], [0 << 1 | 1], Constants.ONE,
			[AMF3.Marker.DATE], [0 << 1 | 0])
		);
	});
	
	// u8 marker, u29 length/reference * utf8 bytes
	it("can write string", function() {
		const array = [];
		const writer = new AMF3.Writer(Helpers.pushTo(array));
		writer.write("€"); // by value
		writer.write("€"); // by reference
		expect(array).toEqual([].concat(
			[AMF3.Marker.STRING], [3 << 1 | 1], Constants.EURO, // by value
			[AMF3.Marker.STRING], [0 << 1 | 0] // by reference
		));
	});
	
	// u8 marker, u29 length/reference * utf8 bytes
	it("can write empty string", function() {
		const array = [];
		const writer = new AMF3.Writer(Helpers.pushTo(array));
		writer.write(""); // by value
		writer.write(""); // by value
		expect(array).toEqual([].concat(
			[AMF3.Marker.STRING], [0 << 1 | 1], // by value
			[AMF3.Marker.STRING], [0 << 1 | 1] // by value
		));
	});
	
	// u8 marker, u29 length/reference * values
	it("can write array", function() {
		const array = [];
		const writer = new AMF3.Writer(Helpers.pushTo(array));
		const data = [];
		data.push(data); // self reference
		writer.write(data);
		expect(array).toEqual([].concat(
			[AMF3.Marker.ARRAY], [1 << 1 | 1], [0 << 1 | 1], // length, empty associative part
			[AMF3.Marker.ARRAY], [0 << 1 | 0] // self-reference
		));
	});
	
	// u8 marker, empty traits, dynamic members
	it("can write anonymous", function() {
		const array = [];
		const writer = new AMF3.Writer(Helpers.pushTo(array));
		const data = {};
		data["property"] = data; // self reference
		writer.write(data);
		expect(array).toEqual([].concat(
			[AMF3.Marker.OBJECT], [0 << 4 | true << 3 | false << 2 | 0x03], [0 << 1 | 1], // 0 properties, dynamic, !externalizable, no name
			[8 << 1 | 1], Constants.PROPERTY, [AMF3.Marker.OBJECT], [0 << 1 | 0], [0 << 1 | 1] // dynamic members: self reference, then empty string
		));
	});
	
	// u8 marker, traits, properties
	it("can write typed", function() {
		const array = [];
		const writer = new AMF3.Writer(Helpers.pushTo(array));
		const data = {};
		data["@name"] = "Name";
		data["@properties"] = ["property"];
		data["property"] = data; // self reference
		writer.write(data);
		expect(array).toEqual([].concat(
			[AMF3.Marker.OBJECT], [1 << 4 | true << 3 | false << 2 | 0x03], [4 << 1 | 1], Constants.NAME, // 1 property, dynamic, !externalizable, "Name"
			[8 << 1 | 1], Constants.PROPERTY, // list of properties
			[AMF3.Marker.OBJECT], [0 << 1 | 0], // self-reference
			[0 << 1 | 1] // end of dynamic members
		));
	});
});
