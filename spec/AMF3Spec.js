"use strict";

var _ = require("underscore");

var AMF3 = require("../lib/AMF3");

var INTEGER_MIN = -Math.pow(2, 28);
var INTEGER_MAX = +Math.pow(2, 28) - 1;

function pullFrom(array) {
	return function(length) {
		return Uint8Array.from(
			array.splice(0, length)
		);
	}
}
function pushTo(array) {
	return function(bytes) {
		for (var byte of bytes) {
			array.push(byte);
		}
	}
}

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
		var writer = new AMF3.Writer(pushTo(buffer));
		var reader = new AMF3.Reader(pullFrom(buffer));
		for (var i = 0; i < 28; i++) {
			var v = 1 << i;
			writer.write(v);
			expect(reader.read()).toEqual(v);
		}
	});
	
	it("deals well with random integers", function() {
		var buffer = [];
		var writer = new AMF3.Writer(pushTo(buffer));
		var reader = new AMF3.Reader(pullFrom(buffer));
		for (var t = 0; t < 100; t++) {
			var v = _.random(INTEGER_MIN, INTEGER_MAX);
			writer.write(v);
			expect(reader.read()).toEqual(v);
		}
	});
	
	it("deals well with random doubles", function() {
		var buffer = [];
		var writer = new AMF3.Writer(pushTo(buffer));
		var reader = new AMF3.Reader(pullFrom(buffer));
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
