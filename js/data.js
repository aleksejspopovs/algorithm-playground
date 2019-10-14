// this is an abstract class that all user-defined classes must subclass from
// if you want their instances to be APG-compatible (i.e. allowed to be
// written into plugs)

export class APGData {
	constructor () {
		if (new.target === APGData) {
			throw new Error('cannot instantiate abstract APGData class')
		}

		if (new.target.prototype.equals === APGData.prototype.equals) {
			throw new Error('subclass of APGData must implement method equals')
		}

		if (new.target.prototype.clone === APGData.prototype.clone) {
			throw new Error('subclass of APGData must implement method clone')
		}

		if (new.target.prototype.freeze === APGData.prototype.freeze) {
			throw new Error('subclass of APGData must implement method freeze')
		}
	}

	equals (other) {}
	clone () {}
	freeze () {}
}
