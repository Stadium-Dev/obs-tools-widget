import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import DockTab from '../../components/DockTab.js';

@customElement('obs-bitrate-detection')
export default class BitrateDetection extends DockTab {
	render() {
		return html`
			<obs-dock-tab-section section-title="Configuration">
				<div class="row">
					<label>URL to stat.xsl</label>
					<app-state scope="bitrate-detection">
						<input spellcheck="false" type="text" state-key="nginx-stat-url" placeholder="http://localhost/stat" />
					</app-state>
				</div>
				<div class="row">
					<label>Standby scene</label>
					<app-state scope="bitrate-detection">
						<scene-selector state-key="standby-scene"></scene-selector>
					</app-state>
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
