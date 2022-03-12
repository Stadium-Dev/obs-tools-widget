import { css, html } from 'lit';
import Config from '../services/Config.js';
import Overlays from '../services/Overlays.js';
import DockTab from '../components/DockTab.js';
import { OBS } from 'obs';

function setStatus(str) {
	const tabEle = document.querySelector('obs-1uckybot-tab');
	const ele = tabEle.shadowRoot.querySelector('#connStatus');
	ele.innerText = str;
}

let mediaServerWs;
function disbleMediaServerControl() {
	if (mediaServerWs) {
		mediaServerWs.close();
	}
}
function enableMediaServerControl() {
	const host = Config.get('stream-server-url') || 'ws://localhost:8000';

	mediaServerWs = new WebSocket(host);

	mediaServerWs.addEventListener('message', (msg) => {
		const data = JSON.parse(msg.data);
		let scene = null;
		console.log(data);
		switch (data.type) {
			case 'stream-connected':
				scene = getSelectedRemoteScene();
				break;
			case 'stream-disconnected':
				scene = getSelectedStandbyScene();
				break;
		}
		if (scene) {
			OBS.setCurrentScene(scene);
		}
	});

	mediaServerWs.addEventListener('open', (msg) => {
		console.log('connected to media server websocket');
		setStatus('connected');
	});
	mediaServerWs.addEventListener('close', (msg) => {
		console.log('disconnected from media server websocket');
		setStatus('disconnected');
	});
}

let getSelectedRemoteScene = () => {
	const ele = document.querySelector('obs-1uckybot-tab');
	const select = ele.shadowRoot.querySelector('#remoteStreamScene');
	return select.value;
};
let getSelectedStandbyScene = () => {
	const ele = document.querySelector('obs-1uckybot-tab');
	const select = ele.shadowRoot.querySelector('#standByScene');
	return select.value;
};

function updateToken(token) {
	if (token != null) {
		Config.set('1uckybot-websocket-token', token);

		// tts overlay entry
		const ttsUrl = `https://1uckybot.luckydye.de/overlay/?token=${token}&voice=Marlene&layer-name=1uckybot%20TTS%20overlay&layer-width=1920&layer-height=1080`;
		Overlays.addOverlay('TTS', ttsUrl);
	}
}

updateToken(Config.get('1uckybot-websocket-token'));

export default class Luckybot extends DockTab {
	static get styles() {
		return css`
			${super.styles}
			iframe {
				border: none;
			}
		`;
	}

	constructor() {
		super();

		this.obsScenes = [];
		OBS.onReady(() => {
			OBS.getScenes().then((scenes) => {
				this.obsScenes = scenes;
				this.update();
			});
		});
	}

	connectedCallback() {
		super.connectedCallback();

		if (Config.get('section-remote-stream controls-enabled')) {
			enableMediaServerControl();
		}
	}

	showToken(id, btn) {
		const input = this.shadowRoot.querySelector('#' + id);
		input.type = 'text';
		let timer = 5;
		btn.innerHTML = timer;
		btn.disabled = true;
		const int = setInterval(() => {
			timer--;
			btn.innerHTML = timer;
			if (timer == 0) {
				btn.innerHTML = 'show';
				input.type = 'password';
				clearInterval(int);
				btn.disabled = false;
			}
		}, 1000);
	}

	render() {
		const mediaServerUrl = Config.get('stream-server-url') || 'ws://localhost:8000';

		return html`
			<link href="./material-icons.css" rel="stylesheet" />

			<obs-dock-tab-section section-title="Token">
				<label>1uckybot Access Token</label>
				<input
					value="${Config.get('1uckybot-websocket-token') || ''}"
					id="luckybotWebsocketToken"
					@change="${(e) => updateToken(e.target.value)}"
					class="full"
					type="password"
					placeholder="1uckybot Token"
				/>
				<button @click="${(e) => this.showToken('luckybotWebsocketToken', e.target)}">show</button>
			</obs-dock-tab-section>

			<obs-dock-tab-section
				optional
				section-title="Remote Stream Controls"
				@setion-change="${(e) => {
					if (e.target.enabled) {
						enableMediaServerControl();
					} else {
						disbleMediaServerControl();
					}
				}}"
			>
				<div class="row">
					<label>WebSocket URL</label>
					<input
						value="${mediaServerUrl}"
						@change="${(e) => {
							Config.set('stream-server-url', e.target.value);
						}}"
						placeholder="IP:Port"
					/>
				</div>

				<div class="row">
					<button
						@click="${() => {
							setStatus('reconnecting...');
							disbleMediaServerControl();
							setTimeout(() => {
								enableMediaServerControl();
							}, 2000);
						}}"
					>
						Reconnect
					</button>

					<span id="connStatus">evaluating...</span>
				</div>

				<br />
				<div class="row">
					<label>Remote Scene</label>
					<select id="remoteStreamScene" ?disabled="${this.obsScenes.length == 0}">
						${this.obsScenes.length
							? this.obsScenes.map(({ name }) => {
									return html`<option value="${name}">${name}</option>`;
							  })
							: html`<option value="none">No Scenes Available</option>`}
					</select>
				</div>
				<div class="row">
					<label>Standby Scene</label>
					<select id="standByScene" ?disabled="${this.obsScenes.length == 0}">
						${this.obsScenes.length
							? this.obsScenes.map(({ name }) => {
									return html`<option value="${name}">${name}</option>`;
							  })
							: html`<option value="none">No Scenes Available</option>`}
					</select>
				</div>
			</obs-dock-tab-section>

			<obs-dock-tab-section section-title="TTS">
				<iframe src="https://1uckybot.luckydye.de/overlay/control-panel.html" />
			</obs-dock-tab-section>
		`;
	}
}

customElements.define('obs-1uckybot-tab', Luckybot);
