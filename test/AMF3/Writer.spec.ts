import { expect } from "chai";
import { describe, it } from "node:test";

import * as AMF3 from "../../src/AMF3.js";
import { concat, Helpers } from "../Helpers.js";
import Constants from "./Constants.js";

describe("AMF3.Writer", () => {
	// u8 marker
	it("can write null", () => {
		const array = <any[]>[];
		const writer = new AMF3.Writer(Helpers.pushTo(array));
		writer.write(null);
		expect(array).to.deep.equal([AMF3.Marker.NULL]);
	});
	
	// u8 marker
	it("can write undefined", () => {
		const array = <any[]>[];
		const writer = new AMF3.Writer(Helpers.pushTo(array));
		writer.write(undefined);
		expect(array).to.deep.equal([AMF3.Marker.UNDEFINED]);
	});
	
	// u8 marker, u8 value
	it("can write true", () => {
		const array = <any[]>[];
		const writer = new AMF3.Writer(Helpers.pushTo(array));
		writer.write(true);
		expect(array).to.deep.equal([AMF3.Marker.TRUE]);
	});
	
	// u8 marker, u8 value
	it("can write false", () => {
		const array = <any[]>[];
		const writer = new AMF3.Writer(Helpers.pushTo(array));
		writer.write(false);
		expect(array).to.deep.equal([AMF3.Marker.FALSE]);
	});
	
	// u8 marker, u29 integer
	it("can write positive integer", () => {
		const array = <any[]>[];
		const writer = new AMF3.Writer(Helpers.pushTo(array));
		writer.write(1);
		expect(array).to.deep.equal([AMF3.Marker.INTEGER].concat([0x01]));
	});
	
	// u8 marker, u29 integer
	it("can write negative integer", () => {
		const array = <any[]>[];
		const writer = new AMF3.Writer(Helpers.pushTo(array));
		writer.write(-1);
		expect(array).to.deep.equal(concat([AMF3.Marker.INTEGER], [0xFF, 0xFF, 0xFF, 0xFF]));
	});
	
	// u8 marker, u29 integer
	it("can write big integer", () => {
		const array = <any[]>[];
		const writer = new AMF3.Writer(Helpers.pushTo(array));
		writer.write(Constants.INTEGER_MAX);
		expect(array).to.deep.equal(concat([AMF3.Marker.INTEGER], [0xBF, 0xFF, 0xFF, 0xFF]));
	});
	
	// u8 marker, u29 integer
	it("can write negative big integer", () => {
		const array = <any[]>[];
		const writer = new AMF3.Writer(Helpers.pushTo(array));
		writer.write(Constants.INTEGER_MIN);
		expect(array).to.deep.equal(concat([AMF3.Marker.INTEGER], [0xC0, 0x80, 0x80, 0x00]));
	});
	
	// u8 marker, f64 double
	it("can write double", () => {
		const array = <any[]>[];
		const writer = new AMF3.Writer(Helpers.pushTo(array));
		writer.write(0.5);
		expect(array).to.deep.equal(concat([AMF3.Marker.DOUBLE], Constants.HALF));
	});
	
	// u8 marker, u29 length/reference, f64 epochMilli
	it("can write dates", () => {
		const array = <any[]>[];
		const writer = new AMF3.Writer(Helpers.pushTo(array));
		const date = new Date(1);
		writer.write(date); // by value 
		writer.write(date); // by reference
		expect(array).to.deep.equal(concat(
			[AMF3.Marker.DATE], [0 << 1 | 1], Constants.ONE,
			[AMF3.Marker.DATE], [0 << 1 | 0])
		);
	});
	
	// u8 marker, u29 length/reference * utf8 bytes
	it("can write string", () => {
		const array = <any[]>[];
		const writer = new AMF3.Writer(Helpers.pushTo(array));
		writer.write("€"); // by value
		writer.write("€"); // by reference
		expect(array).to.deep.equal(concat(
			[AMF3.Marker.STRING], [3 << 1 | 1], Constants.EURO, // by value
			[AMF3.Marker.STRING], [0 << 1 | 0] // by reference
		));
	});
	
	// u8 marker, u29 length/reference * utf8 bytes
	it("can write empty string", () => {
		const array = <any[]>[];
		const writer = new AMF3.Writer(Helpers.pushTo(array));
		writer.write(""); // by value
		writer.write(""); // by value
		expect(array).to.deep.equal(concat(
			[AMF3.Marker.STRING], [0 << 1 | 1], // by value
			[AMF3.Marker.STRING], [0 << 1 | 1] // by value
		));
	});
	
	// u8 marker, u29 length/reference * values
	it("can write array", () => {
		const array = <any[]>[];
		const writer = new AMF3.Writer(Helpers.pushTo(array));
		const data = <any[]>[];
		data.push(data); // self reference
		writer.write(data);
		expect(array).to.deep.equal(concat(
			[AMF3.Marker.ARRAY], [1 << 1 | 1], [0 << 1 | 1], // length, empty associative part
			[AMF3.Marker.ARRAY], [0 << 1 | 0] // self-reference
		));
	});
	
	// u8 marker, empty traits, dynamic members
	it("can write anonymous", () => {
		const array = <any[]>[];
		const writer = new AMF3.Writer(Helpers.pushTo(array));
		const data = <any>{};
		data["property"] = data; // self reference
		writer.write(data);
		expect(array).to.deep.equal(concat(
			[AMF3.Marker.OBJECT], [0 << 4 | +true << 3 | +false << 2 | 0x03], [0 << 1 | 1], // 0 properties, dynamic, !externalizable, no name
			[8 << 1 | 1], Constants.PROPERTY, [AMF3.Marker.OBJECT], [0 << 1 | 0], [0 << 1 | 1] // dynamic members: self reference, then empty string
		));
	});
	
	// u8 marker, traits, properties
	it("can write typed", () => {
		const array = <any[]>[];
		const writer = new AMF3.Writer(Helpers.pushTo(array));
		const data = <any>{};
		data["@name"] = "Name";
		data["@properties"] = ["property"];
		data["property"] = data; // self reference
		writer.write(data);
		expect(array).to.deep.equal(concat(
			[AMF3.Marker.OBJECT], [1 << 4 | +true << 3 | +false << 2 | 0x03], [4 << 1 | 1], Constants.NAME, // 1 property, dynamic, !externalizable, "Name"
			[8 << 1 | 1], Constants.PROPERTY, // list of properties
			[AMF3.Marker.OBJECT], [0 << 1 | 0], // self-reference
			[0 << 1 | 1] // end of dynamic members
		));
	});
});
