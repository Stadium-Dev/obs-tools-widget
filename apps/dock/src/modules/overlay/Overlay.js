import { css, html } from 'lit';
import DockTab from '../../components/DockTab.js';
import Overlays from '../../services/Overlays.js';
import PropertySender from './PropertySender.js';

const propSender = new PropertySender();

export default class Overlay extends DockTab {
	static get styles() {
		return css`
			${super.styles}
			:host {
				height: 100%;
			}
			.drag-and-button {
				color: #eee;
				display: flex;
				justify-content: flex-start;
				align-items: center;
				text-decoration: none;
				padding: 8px 4px;
				font-size: 12.5px;
				cursor: grab;
				border-radius: 4px;
			}
			.drag-and-button:not(:last-child) {
				border-bottom: 1px solid #1a1a1a;
			}
			.drag-and-button:hover {
				background: #363636;
			}
			.drag-and-button:active {
				background: #272727;
				cursor: grabbing;
			}
			i.material-icons {
				font-size: 14px;
				margin: 0 8px 0 4px;
			}
			.container {
				padding: 5px;
			}
			.overlay-section {
				height: auto;
			}
			.properties {
			}
			.placeholder {
				text-align: center;
				width: 100%;
				opacity: 0.5;
				margin: 8px 0;
			}
			fluid-input {
				width: 150px;
			}
			button.reset-property-btn {
				overflow: visible;
				line-height: 100%;
				border: none;
				padding: 0;
				text-align: right;
				width: 28px;
				min-width: 0;
				height: 28px;
				background: transparent;
				margin-left: 10px;
				margin-right: -10px;
				border-radius: 4px;
				border: 1px solid transparent;
			}
			button.reset-property-btn:hover {
				background: #313131;
				border: 1px solid #3f3f3f;
			}
			button.reset-property-btn:active {
				background: #1b1b1b;
			}
			.reset-property-btn i.material-icons {
				font-size: 16px;
			}
		`;
	}

	constructor() {
		super();

		this.selection = propSender.selection;

		propSender.onUpdate(() => this.update());
	}

	resetProperty(propId, prop) {
		propSender.postProperty(propId, prop.default);
		prop.value = prop.default;

		// have to update empty selection because it wouldnt update values on reset property :/
		this.selection = [];
		this.update();
		requestAnimationFrame(() => {
			this.selection = propSender.selection;
			this.update();
		});
	}

	renderProperty(propId, propObj) {
		const id = propId;
		const prop = propObj;

		switch (prop.type) {
			case 'boolean':
				return html`
					<label>${prop.name}</label>
					<div>
						<input-switch
							?checked="${prop.value}"
							@change="${(e) => {
								propSender.postProperty(id, e.target.checked ? 1 : 0);
							}}"
						></input-switch>
						<button class="reset-property-btn" @click="${(e) => this.resetProperty(id, prop)}">
							<i class="material-icons">restart_alt</i>
						</button>
					</div>
				`;
			case 'number':
				return html`
					<label>${prop.name}</label>
					<div>
						<fluid-input
							min="0"
							max="100"
							.value="${prop.value}"
							@input="${(e) => {
								propSender.postProperty(id, e.target.value);
							}}"
						></fluid-input>
						<button class="reset-property-btn" @click="${(e) => this.resetProperty(id, prop)}">
							<i class="material-icons">restart_alt</i>
						</button>
					</div>
				`;
			case 'color':
				return html`
					<label>${prop.name}</label>
					<button class="reset-property-btn" @click="${(e) => this.resetProperty(id, prop)}">
						<i class="material-icons">restart_alt</i>
					</button>
					<div>
						<color-picker
							.hex="${prop.value}"
							@input="${(e) => {
								propSender.postProperty(id, e.target.hex);
							}}"
						></color-picker>
					</div>
				`;
			default:
				return html`
					<label>${prop.name}</label>
					<div>
						<input
							value="${prop.value}"
							@input="${(e) => {
								propSender.postProperty(id, e.target.value);
							}}"
						/>
						<button class="reset-property-btn" @click="${(e) => this.resetProperty(id, prop)}">
							<i class="material-icons">restart_alt</i>
						</button>
					</div>
				`;
		}
	}

	render() {
		const overlays = Overlays.getOverlayList();

		return html`
			<link href="./material-icons.css" rel="stylesheet" />

			<obs-dock-tab-section .enabled="${true}" optional section-title="Overlay Drag & Drop" class="overlay-section">
				${overlays.map((overlay) => {
					return html`
						<a class="drag-and-button" @click="${(e) => e.preventDefault()}" href="${overlay.url}">
							<i class="material-icons">layers</i>
							<span>${overlay.name}</span>
						</a>
					`;
				})}
			</obs-dock-tab-section>

			<obs-dock-tab-section section-title="Overlay Properties">
				<div class="properties">
					${this.selection.map((item) => {
						if (item.props) {
							return html`
								<div>${item.itemName}</div>
								${Object.keys(item.props).map(
									(key) => html` <div class="row">${this.renderProperty(key, item.props[key])}</div> `
								)}
							`;
						} else {
							return html`
								<div>${item.itemName}</div>
								<div class="placeholder">No custom properties</div>
							`;
						}
					})}
					${this.selection.length == 0 ? html` <div class="placeholder">Nothing Selected</div> ` : ''}
				</div>
			</obs-dock-tab-section>
		`;
	}
}

customElements.define('obs-tools-overlay', Overlay);
