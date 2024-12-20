import { expect } from "chai";
import { describe, it } from "node:test";

import * as AMF3 from "../../src/AMF3.js";
import { concat, Helpers } from "../Helpers.js";
import Constants from "./Constants.js";

describe("AMF3.Reader", () => {
	// u8 marker
	it("can read null", () => {
		const array = [AMF3.Marker.NULL];
		const reader = new AMF3.Reader(Helpers.pullFrom(array));
		expect(reader.read()).to.equal(null);
	});
	
	// u8 marker
	it("can read undefined", () => {
		const array = [AMF3.Marker.UNDEFINED];
		const reader = new AMF3.Reader(Helpers.pullFrom(array));
		expect(reader.read()).to.equal(undefined);
	});
	
	// u8 marker, u8 value
	it("can read true", () => {
		const array = [AMF3.Marker.TRUE];
		const reader = new AMF3.Reader(Helpers.pullFrom(array));
		expect(reader.read()).to.equal(true);
	});
	
	// u8 marker, u8 value
	it("can read false", () => {
		const array = [AMF3.Marker.FALSE];
		const reader = new AMF3.Reader(Helpers.pullFrom(array));
		expect(reader.read()).to.equal(false);
	});
	
	// u8 marker, u29 integer
	it("can read positive integer", () => {
		const array = concat([AMF3.Marker.INTEGER], [0x01]);
		const reader = new AMF3.Reader(Helpers.pullFrom(array));
		expect(reader.read()).to.equal(1);
	});
	
	// u8 marker, u29 integer
	it("can read negative integer", () => {
		const array = concat([AMF3.Marker.INTEGER], [0xFF, 0xFF, 0xFF, 0xFF]);
		const reader = new AMF3.Reader(Helpers.pullFrom(array));
		expect(reader.read()).to.equal(-1);
	});
	
	// u8 marker, u29 integer
	it("can read positive big integer", () => {
		const array = concat([AMF3.Marker.INTEGER], [0xBF, 0xFF, 0xFF, 0xFF]);
		const reader = new AMF3.Reader(Helpers.pullFrom(array));
		expect(reader.read()).to.equal(Constants.INTEGER_MAX);
	});
	
	// u8 marker, u29 integer
	it("can read negative big integer", () => {
		const array = concat([AMF3.Marker.INTEGER], [0xC0, 0x80, 0x80, 0x00]);
		const reader = new AMF3.Reader(Helpers.pullFrom(array));
		expect(reader.read()).to.equal(Constants.INTEGER_MIN);
	});
	
	// u8 marker, f64 double
	it("can read double", () => {
		const array = concat([AMF3.Marker.DOUBLE], Constants.HALF);
		const reader = new AMF3.Reader(Helpers.pullFrom(array));
		expect(reader.read()).to.equal(0.5);
	});
	
	// u8 marker, u29 reference, f64 epochMilli
	it("can read date", () => {
		const array = concat([AMF3.Marker.DATE], [0 << 1 | 1], Constants.ONE, [AMF3.Marker.DATE], [0 << 1 | 0]);
		const reader = new AMF3.Reader(Helpers.pullFrom(array));
		expect(reader.read()).to.deep.equal(new Date(1)); // by value
		expect(reader.read()).to.deep.equal(new Date(1)); // by reference
	});
	
	// u8 marker, u29 length/reference * utf8 bytes
	it("can read string", () => {
		const array = concat([AMF3.Marker.STRING], [3 << 1 | 1], Constants.EURO, [AMF3.Marker.STRING], [0 << 1 | 0]);
		const reader = new AMF3.Reader(Helpers.pullFrom(array));
		expect(reader.read()).to.equal("€"); // by value
		expect(reader.read()).to.equal("€"); // by reference
	});
	
	it("can read empty string", () => {
		const array = concat([AMF3.Marker.STRING], [0 << 1 | 1], [AMF3.Marker.STRING], [0 << 1 | 1]);
		const reader = new AMF3.Reader(Helpers.pullFrom(array));
		expect(reader.read()).to.equal(""); // by value
		expect(reader.read()).to.equal(""); // by value
	});
	
	// u8 marker, u29 length/reference * values
	it("can read array", () => {
		const array = concat([AMF3.Marker.ARRAY], [1 << 1 | 1], [0 << 1 | 1], [AMF3.Marker.ARRAY], [0 << 1 | 0]);
		const reader = new AMF3.Reader(Helpers.pullFrom(array));
		const data = reader.read();
		expect(data).to.deep.equal([data]);
	});
	
	// u8 marker, empty traits, dynamic members
	it("can read anonymous", () => {
		const array = concat(
			[AMF3.Marker.OBJECT], [0 << 4 | +true << 3 | +false << 2 | 0x03], [0 << 1 | 1], // 0 properties, dynamic, !externalizable, no name
			[8 << 1 | 1], Constants.PROPERTY, [AMF3.Marker.OBJECT], [0 << 1 | 0], [0 << 1 | 1] // dynamic members: self reference, then empty string
		);
		const reader = new AMF3.Reader(Helpers.pullFrom(array));
		const data = reader.read();
		expect(data).to.deep.equal({"@name": "", "@externalizable": false, "@dynamic": true, "@properties": [], "property": data});
	});
	
	// u8 marker, traits, properties
	it("can read typed", () => {
		const array = concat(
			[AMF3.Marker.OBJECT], [1 << 4 | +true << 3 | +false << 2 | 0x03], [4 << 1 | 1], Constants.NAME, // 1 property, dynamic, !externalizable, "Name"
			[8 << 1 | 1], Constants.PROPERTY, // list of properties
			[AMF3.Marker.OBJECT], [0 << 1 | 0], // self-reference
			[0 << 1 | 1] // end of dynamic members
		);
		const reader = new AMF3.Reader(Helpers.pullFrom(array));
		const data = reader.read();
		expect(data).to.deep.equal({"@name": "Name", "@externalizable": false, "@dynamic": true, "@properties": ["property"], "property": data});
	});
});
