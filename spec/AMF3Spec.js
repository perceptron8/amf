"use strict";

var _ = require("underscore");
var _s = require("underscore.string");

var AMF3 = require("../lib/AMF3");

var HALF = [0x3f, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
var ONE = [0x3f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];

var EURO = [0xE2, 0x82, 0xAC]; // "€"

describe("AMF3.Writer", function() {
	// u8 marker
	it("can write null", function() {
		var writer = new AMF3.Writer([]);
		writer.write(null);
		expect(writer.array).toEqual([AMF3.MARKER.NULL]);
	});
	
	// u8 marker
	it("can write undefined", function() {
		var writer = new AMF3.Writer([]);
		writer.write(undefined);
		expect(writer.array).toEqual([AMF3.MARKER.UNDEFINED]);
	});
	
	// u8 marker, u8 value
	it("can write true", function() {
		var writer = new AMF3.Writer([]);
		writer.write(true);
		expect(writer.array).toEqual([AMF3.MARKER.TRUE]);
	});
	
	// u8 marker, u8 value
	it("can write false", function() {
		var writer = new AMF3.Writer([]);
		writer.write(false);
		expect(writer.array).toEqual([AMF3.MARKER.FALSE]);
	});
	
	// u8 marker, i29 integer
	it("can write integer", function() {
		var writer = new AMF3.Writer([]);
		writer.write(1);
		expect(writer.array).toEqual([AMF3.MARKER.INTEGER].concat([0x01]));
	});
	
	// u8 marker, i29 integer
	it("can write big integer", function() {
		var writer = new AMF3.Writer([]);
		writer.write(Math.pow(2, 29) - 1);
		expect(writer.array).toEqual([AMF3.MARKER.INTEGER].concat([0xFF, 0xFF, 0xFF, 0xFF]));
	});
	
	// u8 marker, f64 double
	it("can write double", function() {
		var writer = new AMF3.Writer([]);
		writer.write(0.5);
		expect(writer.array).toEqual([AMF3.MARKER.DOUBLE].concat(HALF));
	});
	
	// u8 marker, i29 length/reference, f64 epochMilli
	it("can write dates", function() {
		var writer = new AMF3.Writer([]);
		var date = new Date(1);
		writer.write(date); // by value 
		writer.write(date); // by reference
		expect(writer.array).toEqual([].concat(
			[AMF3.MARKER.DATE], [0 << 1 | 1], ONE,
			[AMF3.MARKER.DATE], [0 << 1 | 0])
		);
	});
	
	// u8 marker, i29 length/reference * utf8 bytes
	it("can write string", function() {
		var writer = new AMF3.Writer([]);
		writer.write("€"); // by value
		writer.write("€"); // by reference
		expect(writer.array).toEqual([].concat(
			[AMF3.MARKER.STRING], [3 << 1 | 1], EURO, // by value
			[AMF3.MARKER.STRING], [0 << 1 | 0] // by reference
		));
	});
	
	// u8 marker, i29 length/reference * values
	it("can write array", function() {
		var writer = new AMF3.Writer([]);
		var data = [];
		data.push(data); // self reference
		writer.write(data);
		expect(writer.array).toEqual([].concat(
			[AMF3.MARKER.ARRAY], [1 << 1 | 1], [0 << 1 | 1], // length, empty associative part
			[AMF3.MARKER.ARRAY], [0 << 1 | 0] // self-reference
		));
	});
	
	/*
	// u8 marker, u32 length * values
	it("can write anonymous", function() {
		var writer = new AMF3.Writer([]);
		var data = {};
		data["property"] = data; // self reference
		writer.write(data);
		expect(writer.array).toEqual([AMF3.MARKER.OBJECT].concat(PROPERTY, [AMF3.MARKER.REFERENCE], [0x00, 0x00], EMPTY, [AMF3.MARKER.OBJECT_END]));
	});
	
	// u8 marker, u32 length * values
	it("can write typed", function() {
		var writer = new AMF3.Writer([]);
		var data = {};
		data["@name"] = "Name";
		data["property"] = data; // self reference
		writer.write(data);
		expect(writer.array).toEqual([AMF3.MARKER.TYPED_OBJECT].concat(NAME, PROPERTY, [AMF3.MARKER.REFERENCE], [0x00, 0x00], EMPTY, [AMF3.MARKER.OBJECT_END]));
	});
	*/
});

describe("AMF3.Reader", function() {
	// u8 marker
	it("can read null", function() {
		var reader = new AMF3.Reader([AMF3.MARKER.NULL]);
		expect(reader.read()).toEqual(null);
	});
	
	// u8 marker
	it("can read undefined", function() {
		var reader = new AMF3.Reader([AMF3.MARKER.UNDEFINED]);
		expect(reader.read()).toEqual(undefined);
	});
	
	// u8 marker, u8 value
	it("can read true", function() {
		var reader = new AMF3.Reader([AMF3.MARKER.TRUE]);
		expect(reader.read()).toEqual(true);
	});
	
	// u8 marker, u8 value
	it("can read false", function() {
		var reader = new AMF3.Reader([AMF3.MARKER.FALSE]);
		expect(reader.read()).toEqual(false);
	});
	
	// u8 marker, i29 integer
	it("can read integer", function() {
		var reader = new AMF3.Reader([AMF3.MARKER.INTEGER].concat([0x01]));
		expect(reader.read()).toEqual(1);
	});
	
	// u8 marker, i29 integer
	it("can read big integer", function() {
		var reader = new AMF3.Reader([AMF3.MARKER.INTEGER].concat([0xFF, 0xFF, 0xFF, 0xFF]));
		expect(reader.read()).toEqual(Math.pow(2, 29) - 1);
	});
	
	// u8 marker, f64 double
	it("can read double", function() {
		var reader = new AMF3.Reader([AMF3.MARKER.DOUBLE].concat(HALF));
		expect(reader.read()).toEqual(0.5);
	});
	
	// u8 marker, i29 reference, f64 epochMilli
	it("can read date", function() {
		var reader = new AMF3.Reader([AMF3.MARKER.DATE].concat([0 << 1 | 1], ONE, [AMF3.MARKER.DATE],[0 << 1 | 0]));
		expect(reader.read()).toEqual(new Date(1)); // by value
		expect(reader.read()).toEqual(new Date(1)); // by reference
	});
	
	// u8 marker, i29 length/reference * utf8 bytes
	it("can read string", function() {
		var reader = new AMF3.Reader([AMF3.MARKER.STRING].concat([3 << 1 | 1], EURO, [AMF3.MARKER.STRING], [0 << 1 | 0]));
		expect(reader.read()).toEqual("€"); // by value
		expect(reader.read()).toEqual("€"); // by reference
	});
	
	// u8 marker, i29 length/reference * values
	it("can read array", function() {
		var reader = new AMF3.Reader([AMF3.MARKER.ARRAY].concat([1 << 1 | 1], [0 << 1 | 1], [AMF3.MARKER.ARRAY], [0 << 1 | 0])); 
		var data = reader.read();
		expect(data).toEqual([data]);
	});
	
	/*
	// u8 marker, u32 length * values
	it("can read anonymous", function() {
		var reader = new AMF3.Reader([AMF3.MARKER.OBJECT].concat(PROPERTY, [AMF3.MARKER.REFERENCE], [0x00, 0x00], EMPTY, [AMF3.MARKER.OBJECT_END]));
		var data = reader.read();
		expect(data).toEqual({"property": data});
		expect(data["@traits"]).toEqual(AMF.DEFAULT_TRAITS);
	});
	
	// u8 marker, u32 length * values
	it("can read typed", function() {
		var reader = new AMF3.Reader([AMF3.MARKER.TYPED_OBJECT].concat(NAME, PROPERTY, [AMF3.MARKER.REFERENCE], [0x00, 0x00], EMPTY, [AMF3.MARKER.OBJECT_END]));
		var data = reader.read();
		expect(data["@name"]).toEqual("Name");
		expect(data["property"]).toEqual(data);
	});
	 */
});