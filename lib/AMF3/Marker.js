"use strict";

const Marker = {
	UNDEFINED:     0x00,
	NULL:          0x01,
	FALSE:         0x02,
	TRUE:          0x03,
	INTEGER:       0x04,
	DOUBLE:        0x05,
	STRING:        0x06,
	XML_DOC:       0x07, // not supported
	DATE:          0x08,
	ARRAY:         0x09,
	OBJECT:        0x0A,
	XML:           0x0B, // not supported
	BYTE_ARRAY:    0x0C, // not supported
	VECTOR_INT:    0x0D, // not supported
	VECTOR_UINT:   0x0E, // not supported
	VECTOR_DOUBLE: 0x0F, // not supported
	VECTOR_OBJECT: 0x10, // not supported
	DICTIONARY:    0x11  // not supported
};

module.exports = Marker;
