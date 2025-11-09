import { isString } from "lodash-es";
import { assert } from "../utils/assert.js";

import * as AMF0 from "../AMF0.js";
import * as AMF3 from "../AMF3.js";

export class Message {
	targetUri: string;
	responseUri: string;
	value: any;

	constructor(targetUri: string, responseUri: string, value: any) {
		assert(isString(targetUri));
		assert(isString(responseUri));
		this.targetUri = targetUri;
		this.responseUri = responseUri;
		this.value = value;
	}
	
	encode(push: (data: Uint8Array) => void): void {
		const writer0 = new AMF0.Writer(push);
		const writer3 = new AMF3.Writer(push);
		writer0.writeRawString(this.targetUri);
		writer0.writeRawString(this.responseUri);
		// unknown length
		writer0.writeRawBytes([0xFF, 0xFF, 0xFF, 0xFF]);
		writer0.writeRawByte(AMF0.Marker.AVMPLUS_OBJECT);
		writer3.write(this.value);
	}
	
	static decode(pull: (length: number) => Uint8Array): Message {
		const reader = new AMF0.Reader(pull);
		const targetUri = reader.readRawString();
		const responseUri = reader.readRawString();
		// ignore length
		reader.readRawBytes(4);
		const value = reader.read();
		return new Message(targetUri, responseUri, value);
	}
}
