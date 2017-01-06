"use strict";

const AMF = require("../lib/AMF");
const AMF0 = require("../lib/AMF0");
const AMF3 = require("../lib/AMF3");
const Helpers = require("./Helpers");

const TextEncoder = require("text-encoding").TextEncoder;
const TextDecoder = require("text-encoding").TextDecoder;
const NumberEncoder = require("number-encoding").NumberEncoder;
const NumberDecoder = require("number-encoding").NumberDecoder;

const utf8encoder = new TextEncoder("utf-8");
const u16encoder = new NumberEncoder("Uint16");

// test data

const header = new AMF.Header("name", "value");
const message = new AMF.Message("targetUri", "responseUri");
const packet = new AMF.Packet([header], [message]);

const UNKNOWN_LENGTH = [0xFF, 0xFF, 0xFF, 0xFF];

const chunks = [].concat([
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

const buffer = [];
for (let chunk of chunks) {
	for (let byte of chunk) {
		buffer.push(byte);
	}
}

// expectations

describe("AMF.Packet", function() {
	it("can encode", function() {
		const encoded = [];
		const push = Helpers.pushTo(encoded);
		packet.encode(push);
		expect(encoded).toEqual(buffer);
	});
	it("can decode", function() {
		const pull = Helpers.pullFrom(buffer);
		const decoded = AMF.Packet.decode(pull);
		expect(decoded).toEqual(packet);
	});
});
