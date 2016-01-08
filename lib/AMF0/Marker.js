"use strict";

var Marker = {
	NUMBER:         0x00,
	BOOLEAN:        0x01,
	STRING:         0x02,
	OBJECT:         0x03,
	MOVIECLIP:      0x04, // not supported
	NULL:           0x05,
	UNDEFINED:      0x06,
	REFERENCE:      0x07,
	ECMA_ARRAY:     0x08, // not supported
	OBJECT_END:     0x09,
	STRICT_ARRAY:   0x0A,
	DATE:           0x0B,
	LONG_STRING:    0x0C,
	UNSUPPORTED:    0x0D, // not supported
	RECORDSET:      0x0E, // not supported
	XML_DOCUMENT:   0x0F, // not supported
	TYPED_OBJECT:   0x10,
	AVMPLUS_OBJECT: 0x11
};

module.exports = Marker;
