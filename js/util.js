export function generateUnusedKey(dict, prefix) {
	// is there a fast way to get the number of keys in an object?
	// Object.keys(dict).length appears to be linear-time, so there's no
	// use in trying to use it to make this faster.
	for (let i = 0; ; i++) {
		if (!dict.hasOwnProperty(`${prefix}_${i}`)) {
			return `${prefix}_${i}`
		}
	}
}
