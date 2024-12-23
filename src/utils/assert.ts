export function assert(expression: boolean, message?: string): void {
	if (!expression) {
		throw new Error(message);
	}
}
