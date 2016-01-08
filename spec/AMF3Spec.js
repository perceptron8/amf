"use strict";

var _ = require("underscore");

var AMF3 = require("../lib/AMF3");
var Helpers = require("./Helpers");
var Constants = require("./AMF3/Constants");

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
		var buffer = [];
		var writer = new AMF3.Writer(Helpers.pushTo(buffer));
		var reader = new AMF3.Reader(Helpers.pullFrom(buffer));
		for (var i = 0; i < 28; i++) {
			var v = 1 << i;
			writer.write(v);
			expect(reader.read()).toEqual(v);
		}
	});
	
	it("deals well with random integers", function() {
		var buffer = [];
		var writer = new AMF3.Writer(Helpers.pushTo(buffer));
		var reader = new AMF3.Reader(Helpers.pullFrom(buffer));
		for (var t = 0; t < 100; t++) {
			var v = _.random(Constants.INTEGER_MIN, Constants.INTEGER_MAX);
			writer.write(v);
			expect(reader.read()).toEqual(v);
		}
	});
	
	it("deals well with random doubles", function() {
		var buffer = [];
		var writer = new AMF3.Writer(Helpers.pushTo(buffer));
		var reader = new AMF3.Reader(Helpers.pullFrom(buffer));
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
