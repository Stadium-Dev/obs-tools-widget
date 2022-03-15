import { html, css, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('text-display')
export default class TextDisplay extends LitElement {
	static get styles() {
		return css`
			:host {
				display: inline-block;
			}
		`;
	}

	input: string = '';

	render() {
		return html`
			<span>
				${Array.isArray(this.value)
					? this.value.map((data) => {
							return html`<div>${data.name}: ${data.bitrate} kb/s</div>`;
					  })
					: JSON.stringify(this.value)}
			</span>
		`;
	}

	get value() {
		return this.input;
	}
	set value(val) {
		this.input = val;
		this.requestUpdate();
	}
}
