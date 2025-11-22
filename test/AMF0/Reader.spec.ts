import { expect } from "chai";
import { describe, it } from "node:test";
import * as AMF0 from "../../src/AMF0.js";
import { concat, Helpers } from "../Helpers.js";
import Constants from "./Constants.js";

describe("AMF0.Reader", () => {
	// u8 marker
	it("can read null", () => {
		const array = [AMF0.Marker.NULL];
		const reader = new AMF0.Reader(Helpers.pullFrom(array));
		expect(reader.read()).to.equal(null);
	});
	
	// u8 marker
	it("can read undefined", () => {
		const array = [AMF0.Marker.UNDEFINED];
		const reader = new AMF0.Reader(Helpers.pullFrom(array));
		expect(reader.read()).to.equal(undefined);
	});
	
	// u8 marker, u8 value
	it("can read true", () => {
		const array = [AMF0.Marker.BOOLEAN, 0x01];
		const reader = new AMF0.Reader(Helpers.pullFrom(array));
		expect(reader.read()).to.equal(true);
	});
	
	// u8 marker, u8 value
	it("can read false", () => {
		const array = [AMF0.Marker.BOOLEAN, 0x00];
		const reader = new AMF0.Reader(Helpers.pullFrom(array));
		expect(reader.read()).to.equal(false);
	});
	
	// u8 marker, f64 number
	it("can read number", () => {
		const array = concat([AMF0.Marker.NUMBER], Constants.ONE);
		const reader = new AMF0.Reader(Helpers.pullFrom(array));
		expect(reader.read()).to.equal(1);
	});
	
	// u8 marker, f64 epochMilli, s16 timeZone
	it("can read date", () => {
		const array = concat([AMF0.Marker.DATE], Constants.ONE, [0x00, 0x00]);
		const reader = new AMF0.Reader(Helpers.pullFrom(array));
		expect(reader.read()).to.deep.equal(new Date(1));
	});
	
	// u8 marker, u16 length * utf8 bytes
	it("can read short string", () => {
		const array = concat([AMF0.Marker.STRING], Constants.EURO);
		const reader = new AMF0.Reader(Helpers.pullFrom(array));
		expect(reader.read()).to.equal("€");
	});
	
	// u8 marker, u32 length * utf8 bytes
	it("can read long string", () => {
		const array = concat([AMF0.Marker.LONG_STRING], [0x00, 0x00, 0x00, 0x01], [0x20]);
		const reader = new AMF0.Reader(Helpers.pullFrom(array));
		expect(reader.read()).to.equal(" ");
	});
	
	// u8 marker, u32 length * values
	it("can read array", () => {
		const array = concat([AMF0.Marker.STRICT_ARRAY], [0x00, 0x00, 0x00, 0x01], [AMF0.Marker.REFERENCE], [0x00, 0x00]);
		const reader = new AMF0.Reader(Helpers.pullFrom(array));
		const data = reader.read();
		expect(data).to.deep.equal([data]);
	});
	
	// u8 marker, u32 length * values
	it("can read anonymous", () => {
		const array = concat([AMF0.Marker.OBJECT], Constants.PROPERTY, [AMF0.Marker.REFERENCE], [0x00, 0x00], Constants.EMPTY, [AMF0.Marker.OBJECT_END]);
		const reader = new AMF0.Reader(Helpers.pullFrom(array));
		const data = reader.read();
		expect(data).to.deep.equal({"property": data});
	});
	
	// u8 marker, u32 length * values
	it("can read typed", () => {
		const array = concat([AMF0.Marker.TYPED_OBJECT], Constants.NAME, Constants.PROPERTY, [AMF0.Marker.REFERENCE], [0x00, 0x00], Constants.EMPTY, [AMF0.Marker.OBJECT_END]);
		const reader = new AMF0.Reader(Helpers.pullFrom(array));
		const data = reader.read();
		expect(data["@name"]).to.equal("Name");
		expect(data["property"]).to.deep.equal(data);
	});
});
