import {APGBox} from '../box.js'

export class Spinner extends APGBox {
	constructor () {
		super()
		this.newOutputPlug('value')
		this.state = {value: 0}
		this.scheduleProcessing(() => this.output.value.write(0))
	}

	render (node) {
		if (node.getElementsByTagName('input').length === 0) {
			let new_input = document.createElement('input')
			new_input.type = 'number'
			new_input.addEventListener('input', (e) => {
				let value = parseInt(e.target.value)
				this.scheduleProcessing(() => {
					this.state.value = value
					this.output.value.write(value)
				})
			})
			node.appendChild(new_input)
		}

		node.getElementsByTagName('input')[0].value = this.state.value
	}
}
