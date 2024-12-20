import { expect } from "chai";
import { describe, it } from "node:test";

import * as AMF0 from "../../src/AMF0.js";
import { concat, Helpers } from "../Helpers.js";
import Constants from "./Constants.js";

describe("AMF0.Writer", () => {
	// u8 marker
	it("can write null", () => {
		const array = <number[]>[];
		const writer = new AMF0.Writer(Helpers.pushTo(array));
		writer.write(null);
		expect(array).to.deep.equal([AMF0.Marker.NULL]);
	});
	
	// u8 marker
	it("can write undefined", () => {
		const array = <number[]>[];
		const writer = new AMF0.Writer(Helpers.pushTo(array));
		writer.write(undefined);
		expect(array).to.deep.equal([AMF0.Marker.UNDEFINED]);
	});
	
	// u8 marker, u8 value
	it("can write true", () => {
		const array = <number[]>[];
		const writer = new AMF0.Writer(Helpers.pushTo(array));
		writer.write(true);
		expect(array).to.deep.equal([AMF0.Marker.BOOLEAN, 0x01]);
	});
	
	// u8 marker, u8 value
	it("can write false", () => {
		const array = <number[]>[];
		const writer = new AMF0.Writer(Helpers.pushTo(array));
		writer.write(false);
		expect(array).to.deep.equal([AMF0.Marker.BOOLEAN, 0x00]);
	});
	
	// u8 marker, f64 number
	it("can write number", () => {
		const array = <number[]>[];
		const writer = new AMF0.Writer(Helpers.pushTo(array));
		writer.write(1);
		expect(array).to.deep.equal(concat([AMF0.Marker.NUMBER], Constants.ONE));
	});
	
	// u8 marker, f64 epochMilli, s16 timeZone
	it("can write date", () => {
		const array = <number[]>[];
		const writer = new AMF0.Writer(Helpers.pushTo(array));
		writer.write(new Date(1));
		expect(array).to.deep.equal(concat([AMF0.Marker.DATE], Constants.ONE, [0x00, 0x00]));
	});
	
	// u8 marker, u16 length * utf8 bytes
	it("can write short string", () => {
		const array = <number[]>[];
		const writer = new AMF0.Writer(Helpers.pushTo(array));
		writer.write("€");
		expect(array).to.deep.equal(concat([AMF0.Marker.STRING], Constants.EURO));
	});
	
	// u8 marker, u32 length * utf8 bytes
	it("can write long string", () => {
		const array = <number[]>[];
		const writer = new AMF0.Writer(Helpers.pushTo(array));
		writer.write(" ".repeat(0x00010000));
		expect(array.slice(0, 6)).to.deep.equal(concat([AMF0.Marker.LONG_STRING], [0x00, 0x01, 0x00, 0x00], [0x20]));
	});
	
	// u8 marker, u32 length * values
	it("can write array", () => {
		const array = <number[]>[];
		const writer = new AMF0.Writer(Helpers.pushTo(array));
		const data = <any[]>[];
		data.push(data); // self reference
		writer.write(data);
		expect(array).to.deep.equal(concat([AMF0.Marker.STRICT_ARRAY], [0x00, 0x00, 0x00, 0x01], [AMF0.Marker.REFERENCE], [0x00, 0x00]));
	});
	
	// u8 marker, u32 length * values
	it("can write anonymous", () => {
		const array = <number[]>[];
		const writer = new AMF0.Writer(Helpers.pushTo(array));
		const data = <any>{};
		data["property"] = data; // self reference
		writer.write(data);
		expect(array).to.deep.equal(concat([AMF0.Marker.OBJECT], Constants.PROPERTY, [AMF0.Marker.REFERENCE], [0x00, 0x00], Constants.EMPTY, [AMF0.Marker.OBJECT_END]));
	});
	
	// u8 marker, u32 length * values
	it("can write typed", () => {
		const array = <number[]>[];
		const writer = new AMF0.Writer(Helpers.pushTo(array));
		const data = <any>{};
		data["@name"] = "Name";
		data["property"] = data; // self reference
		writer.write(data);
		expect(array).to.deep.equal(concat([AMF0.Marker.TYPED_OBJECT], Constants.NAME, Constants.PROPERTY, [AMF0.Marker.REFERENCE], [0x00, 0x00], Constants.EMPTY, [AMF0.Marker.OBJECT_END]));
	});
});
