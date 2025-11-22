import { expect } from "chai";
import { random } from "lodash-es";
import { describe, it } from "node:test";
import * as AMF3 from "../src/AMF3.js";
import Constants from "./AMF3/Constants.js";
import { Helpers } from "./Helpers.js";

describe("AMF3", () => {
	it("has Marker", () => {
		expect(AMF3.Marker).to.not.be.undefined;
	});
	
	it("has Reader", () => {
		expect(AMF3.Reader).to.not.be.undefined;
	});
	
	it("has Writer", () => {
		expect(AMF3.Writer).to.not.be.undefined;
	});
	
	it("deals well with powers of two", () => {
		const buffer = <number[]>[];
		const writer = new AMF3.Writer(Helpers.pushTo(buffer));
		const reader = new AMF3.Reader(Helpers.pullFrom(buffer));
		for (let i = 0; i < 28; i++) {
			const v = 1 << i;
			writer.write(v);
			expect(reader.read()).to.equal(v);
		}
	});
	
	it("deals well with random integers", () => {
		const buffer = <number[]>[];
		const writer = new AMF3.Writer(Helpers.pushTo(buffer));
		const reader = new AMF3.Reader(Helpers.pullFrom(buffer));
		for (let t = 0; t < 100; t++) {
			const v = random(Constants.INTEGER_MIN, Constants.INTEGER_MAX);
			writer.write(v);
			expect(reader.read()).to.equal(v);
		}
	});
	
	it("deals well with random doubles", () => {
		const buffer = <number[]>[];
		const writer = new AMF3.Writer(Helpers.pushTo(buffer));
		const reader = new AMF3.Reader(Helpers.pullFrom(buffer));
		const m = 1 << 29;
		for (let t = 0; t < 100; t++) {
			const r = Math.random();
			const v = r * m;
			writer.write(v);
			// warn: floating point equality
			expect(reader.read()).to.equal(v);
		}
	});
});
