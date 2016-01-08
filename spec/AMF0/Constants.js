"use strict";

module.exports = {
	EMPTY:    [0, 0].concat([]), // ""
	NAME:     [0, 4].concat([78, 97, 109, 101]), // "Name"
	PROPERTY: [0, 8].concat([112, 114, 111, 112, 101, 114, 116, 121]),
	EURO:     [0, 3].concat([0xE2, 0x82, 0xAC]), // "€"
	ONE:      [0x3f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00] // 1.0
};
