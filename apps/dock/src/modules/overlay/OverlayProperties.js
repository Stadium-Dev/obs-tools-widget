import { css, html } from 'lit';
import DockTab from '../../components/DockTab.js';
import { OBS } from 'obs';

export default class OverlayProperties extends DockTab {
	static get styles() {
		return css`
			${super.styles}
		`;
	}

	constructor() {
		super();

		this.selection = [];

		OBS.on('selection', (e) => {
			switch (e.updateType) {
				case 'SceneItemDeselected':
					let index = 0;
					for (let item of this.selection) {
						if (item.itemId == e.itemId) {
							this.selection.splice(index, 1);
							break;
						}
						index++;
					}
					break;
				case 'SceneItemSelected':
					this.selection.push({
						itemId: e.itemId,
						itemName: e.itemName
					});
					break;
			}
			this.update();
			this.handleSelection(this.selection);
		});
	}

	handleSelection(selection) {
		console.log(selection);
		for (let item of selection) {
			OBS.getSourceSettings(item).then((settings) => {
				console.log(settings);
			});

			const bc = new BroadcastChannel('obs-tool-com');
			bc.postMessage({ type: 'getProperties' });

			bc.onmessage = (ev) => {
				console.log(ev);
				// get properties
				// render ui
				// send changes to overlay
			};
		}
	}

	render() {
		return html`
			<link href="./material-icons.css" rel="stylesheet" />

			<obs-dock-tab-section section-title="Overlay Properties">
				<div>
					${this.selection.map((item) => {
						return html` <div>${JSON.stringify(item)}</div> `;
					})}
				</div>
			</obs-dock-tab-section>
		`;
	}
}

customElements.define('overlay-properties', OverlayProperties);
