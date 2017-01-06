"use strict";

const _ = require("underscore");

const AMF3 = require("../lib/AMF3");
const Helpers = require("./Helpers");
const Constants = require("./AMF3/Constants");

describe("AMF3", function() {
	it("has Marker", function() {
		expect(AMF3.Marker).toBeDefined();
	});
	
	it("has Reader", function() {
		expect(AMF3.Reader).toBeDefined();
	});
	
	it("has Writer", function() {
		expect(AMF3.Writer).toBeDefined();
	});
	
	it("deals well with powers of two", function() {
		const buffer = [];
		const writer = new AMF3.Writer(Helpers.pushTo(buffer));
		const reader = new AMF3.Reader(Helpers.pullFrom(buffer));
		for (let i = 0; i < 28; i++) {
			const v = 1 << i;
			writer.write(v);
			expect(reader.read()).toEqual(v);
		}
	});
	
	it("deals well with random integers", function() {
		const buffer = [];
		const writer = new AMF3.Writer(Helpers.pushTo(buffer));
		const reader = new AMF3.Reader(Helpers.pullFrom(buffer));
		for (let t = 0; t < 100; t++) {
			const v = _.random(Constants.INTEGER_MIN, Constants.INTEGER_MAX);
			writer.write(v);
			expect(reader.read()).toEqual(v);
		}
	});
	
	it("deals well with random doubles", function() {
		const buffer = [];
		const writer = new AMF3.Writer(Helpers.pushTo(buffer));
		const reader = new AMF3.Reader(Helpers.pullFrom(buffer));
		const m = 1 << 29;
		for (let t = 0; t < 100; t++) {
			const r = Math.random();
			const v = r * m;
			writer.write(v);
			// warn: floating point equality
			expect(reader.read()).toEqual(v);
		}
	});
});
