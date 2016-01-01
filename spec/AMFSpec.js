"use strict";

var AMF = require("../lib/AMF");

describe("AMF.Packet", function() {
	it("can write null", function() {
		var value = {
			"leet": 1337
		};
		var header = new AMF.Header("name", "value");
		var message = new AMF.Message("targetUri", "responseUri", value);
		var packet = new AMF.Packet([header], [message]);
		// expect(packet.encode()).toEqual([]);
	});
});
