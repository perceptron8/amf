import { isFunction } from "lodash-es";
import { NumberDecoder } from "number-encoding";
import { assert } from "../utils/assert.js";

import * as AMF3 from "../AMF3.js";
import { Marker } from "./Marker.js";

const utf8decoder = new TextDecoder("utf-8");
const u16decoder = new NumberDecoder("Uint16");
const u32decoder = new NumberDecoder("Uint32");
const f64decoder = new NumberDecoder("Float64");

export class Reader {
	pull: (length: number) => Uint8Array;
	references: Map<number, any>;

	constructor(pull: (length: number) => Uint8Array) {
		assert(isFunction(pull));
		this.pull = pull;
		this.references = new Map();
	}
	
	readRawByte(): number {
		return this.pull(1)[0];
	}
	
	readRawBytes(length: number): Uint8Array {
		return this.pull(length);
	}
	
	readRawString(): string {
		const length = u16decoder.decode(this.readRawBytes(u16decoder.length));
		const bytes = this.readRawBytes(length);
		const string = utf8decoder.decode(bytes);
		return string;
	}
	
	readNull(): null {
		return null;
	}
	
	readUndefined(): undefined {
		return undefined;
	}
	
	readBoolean(): boolean {
		return !!this.readRawByte();
	}
	
	readNumber(): number {
		const bytes = this.readRawBytes(f64decoder.length);
		const number = f64decoder.decode(bytes);
		return number;
	}
	
	readDate(): Date {
		const bytes = this.readRawBytes(f64decoder.length);
		const epochMilli = f64decoder.decode(bytes);
		const date = new Date(epochMilli);
		return date;
	}
	
	readShortString(): string {
		const length = u16decoder.decode(this.readRawBytes(u16decoder.length));
		const string = utf8decoder.decode(this.readRawBytes(length));
		return string;
	}
	
	readLongString(): string {
		const length = u32decoder.decode(this.readRawBytes(u32decoder.length));
		const string = utf8decoder.decode(this.readRawBytes(length));
		return string;
	}
	
	readArray(): any[] {
		const array = <any[]>[];
		this.references.set(this.references.size, array);
		const length = u32decoder.decode(this.readRawBytes(u32decoder.length));
		for (let index = 0; index < length; index++) {
			const value = this.read();
			array.push(value);
		}
		return array;
	}
	
	readObject(typed: boolean): any {
		// create
		const object = <any>{};
		// remember
		this.references.set(this.references.size, object);
		// read class name
		if (typed) {
			const name = this.readRawString();
			object["@name"] = name;
		}
		// read properties
		for (let key = this.readRawString(); key !== ""; key = this.readRawString()) {
			assert(key[0] != "@");
			const value = this.read();
			object[key] = value;
		}
		// read object end marker
		const marker = this.readRawByte();
		assert(marker == Marker.OBJECT_END);
		return object;
	}
	
	readObjectPlus(): any {
		const reader = new AMF3.Reader(this.pull);
		return reader.read();
	}
	
	readReference(): number {
		const reference = u16decoder.decode(this.readRawBytes(u16decoder.length));
		return this.references.get(reference);
	}
	
	read(): any {
		const marker = this.readRawByte();
		switch (marker) {
		case Marker.NULL:
			return this.readNull();
		case Marker.UNDEFINED:
			return this.readUndefined();
		case Marker.BOOLEAN:
			return this.readBoolean();
		case Marker.NUMBER:
			return this.readNumber();
		case Marker.DATE:
			return this.readDate();
		case Marker.STRING:
			return this.readShortString();
		case Marker.LONG_STRING:
			return this.readLongString();
		case Marker.STRICT_ARRAY:
			return this.readArray();
		case Marker.OBJECT:
			return this.readObject(false);
		case Marker.TYPED_OBJECT:
			return this.readObject(true);
		case Marker.AVMPLUS_OBJECT:
			return this.readObjectPlus();
		case Marker.REFERENCE:
			return this.readReference();
		case Marker.OBJECT_END:
			throw "IllegalStateException";
		}
	}
}
