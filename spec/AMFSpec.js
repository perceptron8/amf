"use strict";

var AMF = require("../lib/AMF");
var AMF0 = require("../lib/AMF0");
var AMF3 = require("../lib/AMF3");
var Helpers = require("./Helpers");

var TextEncoder = require("text-encoding").TextEncoder;
var TextDecoder = require("text-encoding").TextDecoder;
var NumberEncoder = require("number-encoding").NumberEncoder;
var NumberDecoder = require("number-encoding").NumberDecoder;

var utf8encoder = new TextEncoder("utf-8");
var u16encoder = new NumberEncoder("Uint16");
var u16encoder = new NumberEncoder("Uint16");

// test data

var header = new AMF.Header("name", "value");
var message = new AMF.Message("targetUri", "responseUri");
var packet = new AMF.Packet([header], [message]);

var UNKNOWN_LENGTH = [0xFF, 0xFF, 0xFF, 0xFF];

var chunks = [].concat([
	// version
	u16encoder.encode(packet.version),
	// headers (length)
	u16encoder.encode(packet.headers.length),
	// headers (array)
	u16encoder.encode(header.name.length),
	utf8encoder.encode(header.name),
	[header.mustUnderstand ? 1 : 0],
	UNKNOWN_LENGTH,
	[AMF0.Marker.STRING],
	u16encoder.encode(header.value.length),
	utf8encoder.encode(header.value),
	// messages (length)
	u16encoder.encode(packet.messages.length),
	// messages (array)
	u16encoder.encode(message.targetUri.length),
	utf8encoder.encode(message.targetUri),
	u16encoder.encode(message.responseUri.length),
	utf8encoder.encode(message.responseUri),
	UNKNOWN_LENGTH,
	[AMF0.Marker.AVMPLUS_OBJECT],
	[AMF3.Marker.UNDEFINED]
]);

var buffer = [];
for (var chunk of chunks) {
	for (var byte of chunk) {
		buffer.push(byte);
	}
}

// expectations

describe("AMF.Packet", function() {
	it("can encode", function() {
		var encoded = [];
		var push = Helpers.pushTo(encoded);
		packet.encode(push);
		expect(encoded).toEqual(buffer);
	});
	it("can decode", function() {
		var pull = Helpers.pullFrom(buffer);
		var decoded = AMF.Packet.decode(pull);
		expect(decoded).toEqual(packet);
	});
});
