// http://wwwimages.adobe.com/content/dam/Adobe/en/devnet/amf/pdf/amf0-file-format-specification.pdf

var AMF0 = {};

AMF0.MARKER = {
	NUMBER:         0x00,
	BOOLEAN:        0x01,
	STRING:         0x02,
	OBJECT:         0x03,
	MOVIECLIP:      0x04, // reserved, not supported
	NULL:           0x05,
	UNDEFINED:      0x06,
	REFERENCE:      0x07,
	ECMA_ARRAY:     0x08,
	OBJECT_END:     0x09,
	STRICT_ARRAY:   0x0A,
	DATE:           0x0B,
	LONG_STRING:    0x0C,
	UNSUPPORTED:    0x0D,
	RECORDSET:      0x0E, // reserved, not supported
	XML_DOCUMENT:   0x0F,
	TYPED_OBJECT:   0x10,
	AVMPLUS_OBJECT: 0x11
};

// ?
AMF0.ANNOTATION = {
	CLASS_ALIAS: "_class",
};

AFM0.Writer = function(array) {
	// bind array
	if (!Array.isArray(array)) {
		throw "IllegalArgumentException";
	}
	this.array = array;
	this.index = array.length;
	// setup properties
	this.aliases = new Map();
	this.traits = new Array();
};

AFM0.Writer.prototype.registerAlias = function(name, type) {
	this.aliases.set(name, type);
};

AFM0.Writer.prototype.writeBytes = function(bytes) {
	if (bytes instanceof Uint8Array) {
		throw "IllegalArgumentException";
	}
	for (var byte of bytes) {
		this.array[this.index++] = byte;
	}
};


AFM0.Writer.prototype.writeByte = function(byte) {
	var bytes = new Uint8Array([byte]);
	this.writeBytes(bytes);
};

AFM0.Writer.prototype.writeNumber = function(number) {
	var floats = new Float64Array([number]);
	var buffer = floats.buffer;
	var bytes = new Uint8Array(buffer);
	this.writeBytes(bytes);
};
