import { NumberEncoder } from "@perceptron8/number-encoding";
import { isArray, isBoolean, isDate, isEmpty, isFunction, isNull, isNumber, isObject, isString, isUndefined } from "lodash-es";
import { assert } from "../utils/assert.js";

const utf8encoder = new TextEncoder();
const u16encoder = new NumberEncoder("Uint16");
const u32encoder = new NumberEncoder("Uint32");
const f64encoder = new NumberEncoder("Float64");

import { Marker } from "./Marker.js";

export class Writer {
	push: (data: Uint8Array) => void;
	references: Map<any, number>;

	constructor(push: (data: Uint8Array) => void) {
		assert(isFunction(push));
		this.push = push;
		this.references = new Map();
	}
	
	writeRawByte(byte: number): void {
		this.push(Uint8Array.of(byte));
	}
	
	writeRawBytes(bytes: Iterable<number>): void {
		this.push(Uint8Array.from(bytes));
	}
	
	writeRawString(string: string): void {
		const bytes = utf8encoder.encode(string);
		const length = bytes.length;
		assert(length <= 0xFFFF);
		this.writeRawBytes(u16encoder.encode(length));
		this.writeRawBytes(bytes);
	}
	
	writeNull(): void {
		this.writeRawByte(Marker.NULL);
	}
	
	writeUndefined(): void {
		this.writeRawByte(Marker.UNDEFINED);
	}
	
	writeBoolean(boolean: boolean): void {
		this.writeRawByte(Marker.BOOLEAN);
		this.writeRawByte(boolean ? 1 : 0);
	}
	
	writeNumber(number: number): void {
		this.writeRawByte(Marker.NUMBER);
		this.writeRawBytes(f64encoder.encode(number));
	}
	
	writeDate(date: Date): void {
		const epochMilli = date.getTime();
		const zoneOffset = 0x0000;
		this.writeRawByte(Marker.DATE);
		this.writeRawBytes(f64encoder.encode(epochMilli));
		this.writeRawBytes(u16encoder.encode(zoneOffset));
	}
	
	writeString(string: string): void {
		const bytes = utf8encoder.encode(string);
		const length = bytes.length;
		if (length <= 0xFFFF) {
			this.writeRawByte(Marker.STRING);
			this.writeRawBytes(u16encoder.encode(length));
		} else {
			this.writeRawByte(Marker.LONG_STRING);
			this.writeRawBytes(u32encoder.encode(length));
		}
		this.writeRawBytes(bytes);
	}
	
	writeReference(reference: number): void {
		assert(reference <= 0xFFFF);
		this.writeRawByte(Marker.REFERENCE);
		this.writeRawBytes(u16encoder.encode(reference));
	}
	
	writeArray(array: any[]): void {
		if (!this.references.has(array)) {
			this.references.set(array, this.references.size);
			this.writeRawByte(Marker.STRICT_ARRAY);
			this.writeRawBytes(u32encoder.encode(array.length));
			for (const value of array) {
				this.write(value);
			}
		} else {
			const reference = this.references.get(array)!;
			this.writeReference(reference);
		}
	}
	
	writeObject(object: any): void {
		if (!this.references.has(object)) {
			this.references.set(object, this.references.size);
			const name = object["@name"];
			if (!isEmpty(name)) {
				this.writeRawByte(Marker.TYPED_OBJECT);
				this.writeRawString(name);
			} else {
				this.writeRawByte(Marker.OBJECT);
			}
			for (const key in object) {
				if (key[0] != "@") {
					const value = object[key];
					this.writeRawString(key);
					this.write(value);	
				}
			}
			this.writeRawString("");
			this.writeRawByte(Marker.OBJECT_END);
		} else {
			const reference = this.references.get(object)!;
			this.writeReference(reference);
		}
	}
	
	write(value: any): void {
		if (isNull(value)) {
			this.writeNull();
		} else if (isUndefined(value)) {
			this.writeUndefined();
		} else if (isBoolean(value)) {
			this.writeBoolean(value);
		} else if (isNumber(value)) {
			this.writeNumber(value);
		} else if (isDate(value)) {
			this.writeDate(value);
		} else if (isString(value)) {
			this.writeString(value);
		} else if (isArray(value)) {
			this.writeArray(value);
		} else if (isObject(value)) {
			this.writeObject(value);
		} else {
			throw "IllegalStateException";
		}
	}
}
