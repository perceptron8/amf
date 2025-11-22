import { isEmpty, isFunction } from "lodash-es";
import { NumberDecoder } from "@perceptron8/number-encoding";
import { assert } from "../utils/assert.js";
import { Marker } from "./Marker.js";

const utf8decoder = new TextDecoder("utf-8");

const u8decoder = new NumberDecoder("Uint8");
const f64decoder = new NumberDecoder("Float64");

interface Traits {
	"@name": string;
	"@externalizable": boolean;
	"@dynamic": boolean;
	"@properties": string[];
}

export class Reader {
	pull: (length: number) => Uint8Array;
	strings: Map<number, string>;
	objects: Map<number, any>;
	traits: Map<number, Traits>;

	constructor(pull: (length: number) => Uint8Array) {
		assert(isFunction(pull));
		this.pull = pull;
		this.strings = new Map();
		this.objects = new Map();
		this.traits = new Map();
	}
	
	readByte(): number {
		return this.pull(1)[0];
	}
	
	readBytes(length: number): Uint8Array {
		return this.pull(length);
	}
	
	readUnsignedInteger(): number {
		const b0 = this.readByte();
		if (!(b0 & 0x80)) return b0;
		const b1 = this.readByte();
		if (!(b1 & 0x80)) return (b0 & 0x7F) << 7 | (b1 & 0x7F);
		const b2 = this.readByte();
		if (!(b2 & 0x80)) return (b0 & 0x7F) << 14 | (b1 & 0x7F) << 7 | (b2 & 0x7F);
		const b3 = this.readByte();
		return (b0 & 0x7F) << 22 | ((b1 & 0x7F) << 15) | (b2 & 0x7F) << 8 | (b3 & 0xFF);
	}
	
	readSignedInteger(): number {
		const number = this.readUnsignedInteger();
		// is sign extension needed?
		return number & 0x010000000 ? number | 0xE0000000 : number;
	};

	readDouble(): number {
		const bytes = this.readBytes(f64decoder.length);
		return f64decoder.decode(bytes);
	};

	readString(): string {
		const index = this.readUnsignedInteger();
		if (index & 1) {
			const length = index >> 1;
			const bytes = this.readBytes(length);
			const string = utf8decoder.decode(bytes);
			if (!isEmpty(string)) {
				this.strings.set(this.strings.size, string);
			}
			return string;
		} else {
			const reference = index >> 1;
			assert(this.strings.has(reference));
			return this.strings.get(reference)!;
		}
	};

	readDate(): Date {
		const index = this.readUnsignedInteger();
		if (index & 1) {
			const epochMilli = this.readDouble();
			const date = new Date(epochMilli);
			this.objects.set(this.objects.size, date);
			return date;
		} else {
			const reference = index >> 1;
			assert(this.objects.has(reference));
			return this.objects.get(reference)!;
		}
	};

	readArray(): any[] {
		const index = this.readUnsignedInteger();
		if (index & 1) {
			const array = <any[]>[];
			this.objects.set(this.objects.size, array);
			const length = index >> 1;
			// associative part (must be empty)
			const key = this.readString();
			assert(isEmpty(key));
			// dense part (must not be empty)
			for (let i = 0; i < length; i++) {
				const value = this.read();
				array.push(value);
			}
			return array;
		} else {
			const reference = index >> 1;
			assert(this.objects.has(reference));
			return this.objects.get(reference);
		}
	};

	readObject(): any {
		const index = this.readUnsignedInteger();
		if (index & 1 << 0) {
			const object = <any> {};
			this.objects.set(this.objects.size, object);
			// read object
			if (index & 1 << 1) {
				// read traits
				const traits = <Traits>{};
				this.traits.set(this.traits.size, traits);
				const name = this.readString();
				traits["@name"] = name;
				traits["@externalizable"] = !!(index & 1 << 2);
				traits["@dynamic"] = !!(index & 1 << 3);
				traits["@properties"] = [];
				const length = index >> 4;
				for (let i = 0; i < length; i++) {
					const property = this.readString();
					traits["@properties"].push(property);
				}
				Object.assign(object, traits);
			} else {
				// get traits
				const reference = index >> 2;
				assert(this.traits.has(reference));
				const traits = this.traits.get(reference)!;
				Object.assign(object, traits);
			}
			if (!object["@externalizable"]) {
				// read properties
				for (const property of object["@properties"]) {
					assert(property[0] != "@");
					const value = this.read();
					object[property] = value;
				}
				if (object["@dynamic"]) {
					// read dynamic properties
					for (let property = this.readString(); property != ""; property = this.readString()) {
						assert(property[0] != "@");
						const value = this.read();
						object[property] = value;
					}
				}
			} else {
				// deexternalize
				switch (object["@name"]) {
				case "flex.messaging.io.ArrayCollection":
					object.source = this.read();
					break;
				default:
					// TODO support more types?
					throw new Error("Unsupported externalizable.");
				}
			}
			return object;
		} else {
			// restore object
			const reference = index >> 1;
			assert(this.objects.has(reference));
			return this.objects.get(reference);
		}
	};

	read(): any {
		const marker = u8decoder.decode(this.readBytes(u8decoder.length));
		if (marker === Marker.NULL) {
			return null;
		} else if (marker == Marker.UNDEFINED) {
			return undefined;
		} else if (marker === Marker.TRUE) {
			return true;
		} else if (marker === Marker.FALSE) {
			return false;
		} else if (marker === Marker.INTEGER) {
			return this.readSignedInteger();
		} else if (marker === Marker.DOUBLE) {
			return this.readDouble();
		} else if (marker === Marker.STRING) {
			return this.readString();
		} else if (marker === Marker.DATE) {
			return this.readDate();
		} else if (marker === Marker.ARRAY) {
			return this.readArray();
		} else if (marker === Marker.OBJECT) {
			return this.readObject();
		} else {
			throw new Error("Unsupported marker.");
		}
	};
}
