import { css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import Config from '../services/Config.js';
import DockTab from '../components/DockTab.js';

import { State } from 'app-state';

(async () => {
	setInterval(async () => {
		const statUrl = Config.get('obs-bitrate-detection-stat-url');

		if (statUrl) {
			const data = await fetch(statUrl).then((res) => res.text());

			const parser = new DOMParser();
			const xmlDoc = parser.parseFromString(data, 'text/xml');

			const apps = xmlDoc.querySelectorAll('application');

			const live = [...apps].find((app) => app.querySelector('name')?.textContent == 'stream');
			const streams = live?.querySelectorAll('live stream');

			const bitrates = [];

			if (streams) {
				for (let stream of streams) {
					const name = stream.querySelector('name');
					if (name) {
						const bw_video = stream.querySelector('bw_video')?.textContent;
						if (bw_video) {
							const video_bitrate = Math.floor(+bw_video / 1024);
							bitrates.push({ name: name.textContent, bitrate: video_bitrate });
						}
					}
				}
			}

			State.setState('rtmp-stats', { bitrate: bitrates });
		}
	}, 1000);
})();

@customElement('obs-bitrate-detection')
export default class BitrateDetection extends DockTab {
	static get styles() {
		return css`
			${super.styles}
			:host {
				position: relative;
			}
		`;
	}

	render() {
		const statUrl = Config.get('obs-bitrate-detection-stat-url');

		return html`
			<link href="./material-icons.css" rel="stylesheet" />

			<obs-dock-tab-section section-title="Configuration">
				<div style="margin: 5px 0 15px 0;">
					<label>URL to the nginx stat.xsl</label>
				</div>
				<div class="row">
					<label>URL</label>
					<input
						value="${statUrl}"
						type="text"
						@change="${(e) => {
							Config.set('obs-bitrate-detection-stat-url', e.target.value);
						}}"
						placeholder="http://localhost/stat"
					/>
				</div>
			</obs-dock-tab-section>

			<obs-dock-tab-section section-title="NGINX rtmp statistics">
				<div class="row">
					<app-state scope="rtmp-stats">
						<text-display state-key="bitrate"></text-display>
					</app-state>
				</div>
			</obs-dock-tab-section>
		`;
	}
}
