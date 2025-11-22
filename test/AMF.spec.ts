import { expect } from "chai";
import { describe, it } from "node:test";

import { NumberEncoder } from "@perceptron8/number-encoding";
import * as AMF from "../src/AMF.js";
import * as AMF0 from "../src/AMF0.js";
import * as AMF3 from "../src/AMF3.js";
import { Helpers } from "./Helpers.js";

const utf8encoder = new TextEncoder();
const u16encoder = new NumberEncoder("Uint16");

// test data

const header = new AMF.Header("name", "value");
const message = new AMF.Message("targetUri", "responseUri", undefined);
const packet = new AMF.Packet([header], [message]);

const UNKNOWN_LENGTH = [0xFF, 0xFF, 0xFF, 0xFF];

const chunks = ([] as Iterable<number>[]).concat([
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

const buffer = [] as number[];
for (const chunk of chunks) {
	for (const byte of chunk) {
		buffer.push(byte);
	}
}

// expectations

describe("AMF.Packet", () => {
	it("can encode", () => {
		const encoded = <any[]>[];
		const push = Helpers.pushTo(encoded);
		packet.encode(push);
		expect(encoded).to.deep.equal(buffer);
	});
	it("can decode", () => {
		const pull = Helpers.pullFrom(buffer);
		const decoded = AMF.Packet.decode(pull);
		expect(decoded).to.deep.equal(packet);
	});
});
