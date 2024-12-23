export default Object.freeze({
	HALF: [0x3f, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // 0.5
	ONE: [0x3f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // 1.0

	INTEGER_MIN: -Math.pow(2, 28),
	INTEGER_MAX: +Math.pow(2, 28) - 1,

	NAME: [78, 97, 109, 101], // "Name"
	PROPERTY: [112, 114, 111, 112, 101, 114, 116, 121], // "property"
	EURO: [0xE2, 0x82, 0xAC], // "€"
});
