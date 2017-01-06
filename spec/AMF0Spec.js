"use strict";

const AMF0 = require("../lib/AMF0");

describe("AMF0", function() {
	it("has Marker", function() {
		expect(AMF0.Marker).toBeDefined();
	});
	
	it("has Reader", function() {
		expect(AMF0.Reader).toBeDefined();
	});
	
	it("has Writer", function() {
		expect(AMF0.Writer).toBeDefined();
	});
});
