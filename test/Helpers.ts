export class Helpers {
	static pullFrom(array: number[]) {
		return function(length: number) {
			return Uint8Array.from(
				array.splice(0, length)
			);
		}
	}
	
	static pushTo(array: number[]) {
		return function(bytes: Uint8Array) {
			for (const byte of bytes) {
				array.push(byte);
			}
		}
	}
}

export function concat(...arrays: number[][]): number[] {
	return (<number[]>[]).concat(...arrays);
}
