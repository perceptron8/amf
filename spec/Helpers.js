"use strict";

class Helpers {
	static pullFrom(array) {
		return function(length) {
			return Uint8Array.from(
				array.splice(0, length)
			);
		}
	}
	
	static pushTo(array) {
		return function(bytes) {
			for (let byte of bytes) {
				array.push(byte);
			}
		}
	}
}

module.exports = Helpers;
