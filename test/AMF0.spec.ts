import { expect } from "chai";
import { describe, it } from "node:test";

import * as AMF0 from "../src/AMF0.js";

describe("AMF0", () => {
	it("has Marker", () => {
		expect(AMF0.Marker).to.not.be.undefined;
	});
	
	it("has Reader", () => {
		expect(AMF0.Reader).to.not.be.undefined;
	});
	
	it("has Writer", () => {
		expect(AMF0.Writer).to.not.be.undefined;
	});
});
