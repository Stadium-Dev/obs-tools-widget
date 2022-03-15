import { html, css, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('dropdown-button')
export default class DropdownButton extends LitElement {
	static get properties() {
		return {
			value: {}
		};
	}

	static get styles() {
		return css`
			:host {
				display: block;
				position: relative;
				outline: none;
				color: white;
				font-family: sans-serif;
				font-size: 12px;
				text-transform: capitalize;
				min-width: 120px;
				box-sizing: border-box;
			}

			:host(:focus) {
				background: rgba(52, 52, 52, 0.75);
			}

			:host {
				width: auto;
				line-height: 15px;
				cursor: pointer;
				padding: 6px 12px;
				border-radius: 4px;
				box-sizing: content-box;
				background: rgba(15, 15, 15, 0.5);
				border: 1px solid #373737;
			}

			:host(:hover) {
				background: rgba(52, 52, 52, 0.75);
			}

			:host([active]) {
				z-index: 1000;
			}

			:host([active]) .options {
				display: block;
				animation: show 0.06s ease-out;
			}

			.options {
				display: none;
				position: absolute;
				top: 100%;
				margin-top: 2px;
				right: 0;
				background: rgba(25, 25, 25, 1);
				border-radius: 4px;
				overflow: hidden;
				min-width: 100%;
				width: max-content;
				animation: hide 0.06s ease-out both;
			}

			.options span {
				padding: 5px 8px;
				display: block;
				cursor: pointer;
			}

			.options span:hover {
				background: rgba(100, 100, 100, 0.75);
			}

			.options span:active {
				filter: brightness(0.9);
			}

			.value {
				max-width: 100px;
				white-space: nowrap;
				text-overflow: ellipsis;
				overflow: hidden;
			}

			.value::after {
				content: url("data:image/svg+xml,%3C!-- Generator: Adobe Illustrator 22.0.1, SVG Export Plug-In --%3E%3Csvg version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' xmlns:a='http://ns.adobe.com/AdobeSVGViewerExtensions/3.0/' x='0px' y='0px' width='7px' height='5.8px' viewBox='0 0 7 5.8' style='enable-background:new 0 0 7 5.8;' xml:space='preserve'%3E%3Cstyle type='text/css'%3E .st0%7Bfill:%23FFFFFF;%7D%0A%3C/style%3E%3Cdefs%3E%3C/defs%3E%3Cpolygon class='st0' points='0,0 3.5,5.8 7,0 '/%3E%3C/svg%3E%0A");
				position: absolute;
				right: 10px;
				top: 50%;
				transform: translateY(-55%);
			}

			:host([active]) .value::after {
				transform: translateY(-50%) rotate(180deg);
			}

			@keyframes show {
				from {
					clip-path: polygon(100% 0, 0 0, 0 0, 100% 0);
				}
				to {
					clip-path: polygon(100% 0, 0 0, 0 100%, 100% 100%);
				}
			}
			@keyframes hide {
				from {
					clip-path: polygon(100% 0, 0 0, 0 100%, 100% 100%);
				}
				to {
					clip-path: polygon(100% 0, 0 0, 0 0, 100% 0);
				}
			}
		`;
	}

	props: { value: any; options: {}[] } = {
		value: null,
		options: []
	};

	get value() {
		return this.props.value;
	}

	set value(val) {
		this.props.value = val;

		for (let option of this.options) {
			if (option.value == val) {
				this.props.value = option;
			}
		}

		this.requestUpdate();
	}

	get options() {
		return this.props.options || [];
	}

	set options(arr) {
		this.props.options = arr;
		this.requestUpdate();
	}

	async onOpenDropdown(): Promise<void> {
		// request updated options if needed
	}

	async openDropdown() {
		await this.onOpenDropdown();
		this.setAttribute('active', '');
	}

	async closeDropdown() {
		this.removeAttribute('active');
	}

	connectedCallback() {
		super.connectedCallback();
		this.tabIndex = 0;

		this.addEventListener('focus', (e) => {
			this.openDropdown();
		});

		this.addEventListener('blur', (e) => {
			this.closeDropdown();
		});

		// render children as options if provided
		if (this.options && this.options.length < 1) {
			const childOptions = [];
			for (let child of this.children) {
				childOptions.push({
					name: child.getAttribute('name'),
					value: child.getAttribute('value')
				});
			}
			this.options = childOptions;
		}
	}

	onSelect(opt) {
		this.value = opt;
		this.dispatchEvent(new Event('change', { bubbles: true }));
		this.requestUpdate();
		this.blur();
	}

	render() {
		const options = this.props.options || [];
		const value = this.props.value != null ? this.props.value.name || this.props.value || 'none' : 'none';

		return html`
			<div class="value">${value}</div>
			<div class="options">
				${options.map((opt) => {
					return html`<span @click=${() => this.onSelect(opt)}>${opt.name}</span>`;
				})}
			</div>
		`;
	}
}
