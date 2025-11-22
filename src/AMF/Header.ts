import { isBoolean, isString, isUndefined } from "lodash-es";
import * as AMF0 from "../AMF0.js";
import { assert } from "../utils/assert.js";

export class Header {
	name: string;
	value: any;
	mustUnderstand: boolean;

	constructor(name: string, value: any, mustUnderstand?: boolean) {
		assert(isString(name));
		assert(isBoolean(mustUnderstand) || isUndefined(mustUnderstand));
		this.name = name;
		this.value = value;
		this.mustUnderstand = mustUnderstand ?? false;
	}
	
	encode(push: (data: Uint8Array) => void): void {
		const writer = new AMF0.Writer(push);
		writer.writeRawString(this.name);
		writer.writeRawByte(this.mustUnderstand ? 1 : 0);
		// unknown length
		writer.writeRawBytes([0xFF, 0xFF, 0xFF, 0xFF]);
		writer.write(this.value);
	}
	
	static decode(pull: (length: number) => Uint8Array): Header {
		const reader = new AMF0.Reader(pull);
		const name = reader.readRawString();
		const mustUnderstand = reader.readRawByte() !== 0;
		// ignore length
		reader.readRawBytes(4);
		const value = reader.read();
		return new Header(name, value, mustUnderstand);
	}
}
