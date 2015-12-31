"use strict";

var _ = require("underscore");
var _s = require("underscore.string");

var AMF3 = require("../lib/AMF3");

var HALF = [0x3f, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
var ONE = [0x3f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];

var INTEGER_MIN = -Math.pow(2, 28);
var INTEGER_MAX = +Math.pow(2, 28) - 1;

var NAME = [78, 97, 109, 101]; // "Name"
var PROPERTY = [112, 114, 111, 112, 101, 114, 116, 121]; // "property"
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
	
	// u8 marker, u29 integer
	it("can write positive integer", function() {
		var writer = new AMF3.Writer([]);
		writer.write(1);
		expect(writer.array).toEqual([AMF3.MARKER.INTEGER].concat([0x01]));
	});
	
	// u8 marker, u29 integer
	it("can write negative integer", function() {
		var writer = new AMF3.Writer([]);
		writer.write(-1);
		expect(writer.array).toEqual([AMF3.MARKER.INTEGER].concat([0xFF, 0xFF, 0xFF, 0xFF]));
	});
	
	// u8 marker, u29 integer
	it("can write big integer", function() {
		var writer = new AMF3.Writer([]);
		writer.write(INTEGER_MAX);
		expect(writer.array).toEqual([AMF3.MARKER.INTEGER].concat([0xBF, 0xFF, 0xFF, 0xFF]));
	});
	
	// u8 marker, u29 integer
	it("can write negative big integer", function() {
		var writer = new AMF3.Writer([]);
		writer.write(INTEGER_MIN);
		expect(writer.array).toEqual([AMF3.MARKER.INTEGER].concat([0xC0, 0x80, 0x80, 0x00]));
	});
	
	// u8 marker, f64 double
	it("can write double", function() {
		var writer = new AMF3.Writer([]);
		writer.write(0.5);
		expect(writer.array).toEqual([AMF3.MARKER.DOUBLE].concat(HALF));
	});
	
	// u8 marker, u29 length/reference, f64 epochMilli
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
	
	// u8 marker, u29 length/reference * utf8 bytes
	it("can write string", function() {
		var writer = new AMF3.Writer([]);
		writer.write("€"); // by value
		writer.write("€"); // by reference
		expect(writer.array).toEqual([].concat(
			[AMF3.MARKER.STRING], [3 << 1 | 1], EURO, // by value
			[AMF3.MARKER.STRING], [0 << 1 | 0] // by reference
		));
	});
	
	// u8 marker, u29 length/reference * values
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
	
	// u8 marker, empty traits, dynamic members
	it("can write anonymous", function() {
		var writer = new AMF3.Writer([]);
		var data = {};
		data["property"] = data; // self reference
		writer.write(data);
		expect(writer.array).toEqual([].concat(
			[AMF3.MARKER.OBJECT], [0 << 4 | true << 3 | false << 2 | 0x03], [0 << 1 | 1], // 0 properties, dynamic, !externalizable, no name
			[8 << 1 | 1], PROPERTY, [AMF3.MARKER.OBJECT], [0 << 1 | 0], [0 << 1 | 1] // dynamic members: self reference, then empty string
		));
	});
	
	// u8 marker, traits, properties
	it("can write typed", function() {
		var writer = new AMF3.Writer([]);
		var data = {};
		data["@name"] = "Name";
		data["@properties"] = ["property"];
		data["property"] = data; // self reference
		writer.write(data);
		expect(writer.array).toEqual([].concat(
			[AMF3.MARKER.OBJECT], [1 << 4 | true << 3 | false << 2 | 0x03], [4 << 1 | 1], NAME, // 1 property, dynamic, !externalizable, "Name"
			[8 << 1 | 1], PROPERTY, // list of properties
			[AMF3.MARKER.OBJECT], [0 << 1 | 0], // self-reference
			[0 << 1 | 1] // end of dynamic members
		));
	});
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
	
	// u8 marker, u29 integer
	it("can read positive integer", function() {
		var reader = new AMF3.Reader([AMF3.MARKER.INTEGER].concat([0x01]));
		expect(reader.read()).toEqual(1);
	});
	
	// u8 marker, u29 integer
	it("can read negative integer", function() {
		var reader = new AMF3.Reader([AMF3.MARKER.INTEGER].concat([0xFF, 0xFF, 0xFF, 0xFF]));
		expect(reader.read()).toEqual(-1);
	});
	
	// u8 marker, u29 integer
	it("can read positive big integer", function() {
		var reader = new AMF3.Reader([AMF3.MARKER.INTEGER].concat([0xBF, 0xFF, 0xFF, 0xFF]));
		expect(reader.read()).toEqual(INTEGER_MAX);
	});
	
	// u8 marker, u29 integer
	it("can read negative big integer", function() {
		var reader = new AMF3.Reader([AMF3.MARKER.INTEGER].concat([0xC0, 0x80, 0x80, 0x00]));
		expect(reader.read()).toEqual(INTEGER_MIN);
	});
	
	// u8 marker, f64 double
	it("can read double", function() {
		var reader = new AMF3.Reader([AMF3.MARKER.DOUBLE].concat(HALF));
		expect(reader.read()).toEqual(0.5);
	});
	
	// u8 marker, u29 reference, f64 epochMilli
	it("can read date", function() {
		var reader = new AMF3.Reader([AMF3.MARKER.DATE].concat([0 << 1 | 1], ONE, [AMF3.MARKER.DATE],[0 << 1 | 0]));
		expect(reader.read()).toEqual(new Date(1)); // by value
		expect(reader.read()).toEqual(new Date(1)); // by reference
	});
	
	// u8 marker, u29 length/reference * utf8 bytes
	it("can read string", function() {
		var reader = new AMF3.Reader([AMF3.MARKER.STRING].concat([3 << 1 | 1], EURO, [AMF3.MARKER.STRING], [0 << 1 | 0]));
		expect(reader.read()).toEqual("€"); // by value
		expect(reader.read()).toEqual("€"); // by reference
	});
	
	// u8 marker, u29 length/reference * values
	it("can read array", function() {
		var reader = new AMF3.Reader([AMF3.MARKER.ARRAY].concat([1 << 1 | 1], [0 << 1 | 1], [AMF3.MARKER.ARRAY], [0 << 1 | 0])); 
		var data = reader.read();
		expect(data).toEqual([data]);
	});
	
	// u8 marker, empty traits, dynamic members
	it("can read anonymous", function() {
		var reader = new AMF3.Reader([].concat(
			[AMF3.MARKER.OBJECT], [0 << 4 | true << 3 | false << 2 | 0x03], [0 << 1 | 1], // 0 properties, dynamic, !externalizable, no name
			[8 << 1 | 1], PROPERTY, [AMF3.MARKER.OBJECT], [0 << 1 | 0], [0 << 1 | 1] // dynamic members: self reference, then empty string
		));
		var data = reader.read();
		expect(data).toEqual({"@name": "", "@externalizable": false, "@dynamic": true, "@properties": [], "property": data});
	});
	
	// u8 marker, traits, properties
	it("can read typed", function() {
		var reader = new AMF3.Reader([].concat(
			[AMF3.MARKER.OBJECT], [1 << 4 | true << 3 | false << 2 | 0x03], [4 << 1 | 1], NAME, // 1 property, dynamic, !externalizable, "Name"
			[8 << 1 | 1], PROPERTY, // list of properties
			[AMF3.MARKER.OBJECT], [0 << 1 | 0], // self-reference
			[0 << 1 | 1] // end of dynamic members
		));
		var data = reader.read();
		expect(data).toEqual({"@name": "Name", "@externalizable": false, "@dynamic": true, "@properties": ["property"], "property": data});
	});
});

describe("AMF3", function() {
	it("deals well with powers of two", function() {
		var buffer = [];
		var writer = new AMF3.Writer(buffer);
		var reader = new AMF3.Reader(buffer);
		for (var i = 0; i < 28; i++) {
			var v = 1 << i;
			writer.write(v);
			expect(reader.read()).toEqual(v);
		}
	});
	
	it("deals well with random integers", function() {
		var buffer = [];
		var writer = new AMF3.Writer(buffer);
		var reader = new AMF3.Reader(buffer);
		for (var t = 0; t < 100; t++) {
			// TODO test negative values
			var v = _.random(/*INTEGER_MIN, */INTEGER_MAX);
			writer.write(v);
			expect(reader.read()).toEqual(v);
		}
	});
	
	it("deals well with random doubles", function() {
		var buffer = [];
		var writer = new AMF3.Writer(buffer);
		var reader = new AMF3.Reader(buffer);
		var m = 1 << 29;
		for (var t = 0; t < 100; t++) {
			var r = Math.random();
			var v = r * m;
			writer.write(v);
			// warn: floating point equality
			expect(reader.read()).toEqual(v);
		}
	});
});
