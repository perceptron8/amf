import { isArray, isFunction, isNumber, isUndefined, range } from "lodash-es";
import { NumberDecoder, NumberEncoder } from "@perceptron8/number-encoding";
import { assert } from "../utils/assert.js";
import { Header } from "./Header.js";
import { Message } from "./Message.js";

const u16encoder = new NumberEncoder("Uint16");
const u16decoder = new NumberDecoder("Uint16");

function array(input: ArrayBuffer | ArrayBufferView) {
	if (input instanceof ArrayBuffer) {
		return new Uint8Array(input);
	} else if (ArrayBuffer.isView(input)) {
		return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
	} else {
		throw new Error("The provided value is not of type '(ArrayBuffer or ArrayBufferView)'");
	}
}

function view(array: ArrayBufferView, offset: number, length: number) {
	if (ArrayBuffer.isView(array)) {
		return new Uint8Array(array.buffer, array.byteOffset + offset, length);
	} else {
		throw new Error("The provided value is not of type '(ArrayBufferView)'");
	}
}

function concat(chunks: Uint8Array[], length: number) {
	const buffer = new Uint8Array(length);
	let offset = 0;
	for (const chunk of chunks) {
		buffer.set(chunk, offset);
		offset += chunk.length;
	}
	return buffer;
}

export class Packet {
	headers: Header[];
	messages: Message[];
	version: number;

	constructor(headers: Header[], messages: Message[], version?: number) {
		assert(isArray(headers));
		assert(isArray(messages));
		assert(isNumber(version) || isUndefined(version));
		this.headers = headers;
		this.messages = messages;
		this.version = version ?? 0;
	}
	
	encode(push: (data: Uint8Array) => void): void {
		assert(isFunction(push));
		push(u16encoder.encode(this.version));
		push(u16encoder.encode(this.headers.length));
		this.headers.forEach(header => header.encode(push));
		push(u16encoder.encode(this.messages.length));
		this.messages.forEach(message => message.encode(push));
	}
	
	static decode(pull: (length: number) => Uint8Array): Packet {
		assert(isFunction(pull));
		const version = u16decoder.decode(pull(u16decoder.length));
		const headersCount = u16decoder.decode(pull(u16decoder.length));
		const headers = range(headersCount).map(() => Header.decode(pull));
		const messagesCount = u16decoder.decode(pull(u16decoder.length));
		const messages = range(messagesCount).map(() => Message.decode(pull));
		return new Packet(headers, messages, version);
	}
	
	encodeAll() {
		const chunks = <Uint8Array[]>[];
		let length = 0;
		this.encode(chunk => {
			chunks.push(chunk);
			length += chunk.length;
		});
		return concat(chunks, length);
	}
	
	static decodeAll(input: ArrayBuffer | ArrayBufferView) {
		const buffer = array(input);
		let offset = 0;
		return Packet.decode(length => {
			const slice = view(buffer, offset, length);
			offset += length;
			return slice;
		});
	}
}
