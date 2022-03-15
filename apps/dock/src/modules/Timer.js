import { css, html } from 'lit';
import Config from '../services/Config.js';
import { OBS } from 'obs';
import Streamlabs from '../services/Streamlabs.js';
import DockTab from '../components/DockTab.js';

// Streamlabs stuff

let subs = Config.get('sub-counter') || 0;
let donated = Config.get('donation-counter') || 0;

Streamlabs.on('subscription', handleSub);
Streamlabs.on('resub', handleSub);
Streamlabs.on('donation', handleDonation);

function handleDonation(e) {
	const amount = +e.formatted_amount.replace(/[\€|\$]/g, '');
	donated += amount;
	Config.set('donation-counter', donated);

	const history = Config.get('event-history');
	history.unshift(e);
	Config.set('event-history', history);
}

function handleSub(e) {
	subs++;
	Config.set('sub-counter', subs);

	const history = Config.get('event-history');
	history.unshift(e);
	Config.set('event-history', history);
}

if (!Config.get('donation-counter')) {
	Config.set('donation-counter', donated);
}

if (!Config.get('sub-counter')) {
	Config.set('sub-counter', subs);
}

if (!Config.get('event-history')) {
	Config.set('event-history', []);
}

// end

if (!Config.get('start-time')) {
	Config.set('start-time', 60 * 60 * 12); // seconds
}

if (!Config.get('sub-add-time')) {
	Config.set('sub-add-time', 60 * 5); // seconds
}

if (!Config.get('donation-add-time')) {
	Config.set('donation-add-time', 60 * 1); // seconds
}

const bc = new BroadcastChannel('obs-tools-widget-com');

export default class Timer extends DockTab {
	static get styles() {
		return css`
			${super.styles}
			:host {
				height: 100%;
			}
			input {
				display: inline-block;
				width: 40px;
				text-align: center;
			}
			.timer-controls {
				margin: 10px 0px;
				display: grid;
				grid-auto-flow: column;
				justify-items: center;
				justify-content: center;
				grid-gap: 5px;
			}
			.timer-clock {
				display: grid;
				grid-auto-flow: row;
				justify-items: center;
				justify-content: center;
				margin-top: 5px;
			}
			.timer {
				font-size: 28px;
			}
			.sub-timer {
				margin-top: 5px;
				opacity: 0.75;
			}
			.material-icons.inline {
				font-size: 18px;
				vertical-align: middle;
				margin-top: -4px;
				margin-right: 2px;
			}
			select {
				margin-left: 5px;
			}
			.history {
				width: 100%;
				overflow: auto;
				height: 120px;
				border: 1px solid rgb(54, 54, 54);
				background: rgb(26, 26, 26);
				grid-column: 1 / span 2;
			}
			.history-entry {
				font-size: 12px;
				padding: 7px 10px;
				margin: 5px 5px 0px 5px;
				background: #363636;
				border-radius: 3px;
				display: flex;
				justify-content: space-between;
				align-items: center;
			}
			.inputs {
				width: 100%;
				display: grid;
				grid-template-columns: auto auto;
				grid-template-rows: auto 1fr;
				grid-gap: 10px;
			}
			.inputs input {
				background: transparent;
				border: none;
			}
			.inputs label {
				display: inline;
			}
			.timer-autoreset {
				margin-top: 10px;
				display: flex;
				justify-content: center;
				align-items: center;
			}
		`;
	}

	constructor() {
		super();

		this.time = 60 * 60 * 12;
		this.elapsedTime = 0;
		this.autoSceneSwitchEnabled = false;
		this.subathonFeaturesEnabled = false;

		if (Config.get('elapsed-time') != null) {
			this.elapsedTime = Config.get('elapsed-time');
		}
		if (Config.get('timer') != null) {
			this.time = Config.get('timer');
		}

		this.timerPlaying = false;

		let lastTick = null;
		const updateTimer = (ms) => {
			if (ms && lastTick) {
				const delta = ms - lastTick;
				const deltaSecs = delta / 1000;

				if (this.time - deltaSecs > 0) {
					this.time -= deltaSecs;
					this.elapsedTime += deltaSecs;
				} else {
					this.time = 0;
					this.timerPlaying = false;
					this.onTimerEnd();
				}
				this.update();
			}
			if (this.timerPlaying) {
				setTimeout(() => {
					updateTimer(Date.now());
				}, 1000 / 12);
			}
			lastTick = ms;
		};
		updateTimer();

		this.pausePlayTimer = () => {
			this.timerPlaying = !this.timerPlaying;

			if (this.time === 0) {
				this.timerPlaying = true;
				this.resetTimer();
			}

			if (this.timerPlaying === true) {
				updateTimer();
			}

			this.updateOverlayTimer();
			this.update();
		};

		setInterval(() => {
			Config.set('elapsed-time', this.elapsedTime);
			Config.set('timer', this.time);
		}, 2000);

		this.updateOverlayTimer();

		this.obsScenes = [];
		OBS.on('ready', () => {
			OBS.getScenes().then((scenes) => {
				this.obsScenes = scenes;
				this.update();
			});
		});

		// subathon features
		const handleDonation = (e) => {
			if (this.subathonFeaturesEnabled) {
				const amount = +e.formatted_amount.replace(/[\€|\$]/g, '');
				const donoAddTime = Config.get('donation-add-time') * amount;
				this.time += donoAddTime;
				if (this.timerPlaying) {
					this.updateOverlayTimer();
				}
			}
		};

		const handleSub = (e) => {
			if (this.subathonFeaturesEnabled) {
				const subAddTime = Config.get('sub-add-time');
				this.time += subAddTime;
				if (this.timerPlaying) {
					this.updateOverlayTimer();
				}
			}
		};

		Streamlabs.on('subscription', handleSub);
		Streamlabs.on('resub', handleSub);
		Streamlabs.on('donation', handleDonation);

		Config.on('sub-counter', () => {
			subs = Config.get('sub-counter');
			this.update();
		});
		Config.on('dono-counter', () => {
			donated = Config.get('donation-counter');
			this.update();
		});
		Config.on('event-history', () => this.update());
	}

	removeHistoryEntry(entry) {
		const history = Config.get('event-history');
		history.splice(history.indexOf(entry), 1);
		Config.set('event-history', history);
	}

	updateOverlayTimer() {
		bc.postMessage({
			subs: subs,
			donated: donated,
			type: 'timer',
			time: this.time,
			playstate: this.timerPlaying
		});
	}

	resetTimer() {
		if (confirm('Reset timer to start time?')) {
			this.forceReset();
		}
	}

	forceReset() {
		const startTime = Config.get('start-time');
		this.time = startTime;
		this.elapsedTime = 0;
		this.updateOverlayTimer();
		this.update();

		Config.set('sub-counter', 0);
		Config.set('donation-counter', 0);
	}

	onTimerEnd() {
		if (this.autoSceneSwitchEnabled) {
			const selectEle = this.shadowRoot.querySelector('#autoSwitchSceneSelect');
			const sceneToSwitchTo = selectEle.value;
			if (sceneToSwitchTo && sceneToSwitchTo !== 'none') {
				OBS.setCurrentScene(sceneToSwitchTo);
			}
		}
		if (this.shadowRoot.querySelector('#autoreset').checked) {
			this.forceReset();
			setTimeout(() => this.pausePlayTimer(), 1000);
		}
	}

	pausePlayTimer() {}

	addMinute() {
		this.time += 60;
		this.update();
		this.updateOverlayTimer();
	}

	subtractMinute() {
		this.time -= 60;
		this.update();
		this.updateOverlayTimer();
	}

	render() {
		const startTime = Config.get('start-time');
		const hours = Math.floor(startTime / 60 / 60);
		const minutes = Math.floor(startTime / 60) % 60;
		const seconds = Math.floor(startTime) % 60;

		const elapsedHours = Math.round((this.elapsedTime + 0.5) / 60 / 60);
		const elapsedMinutes = Math.round((this.elapsedTime + 0.5) / 60) % 60;
		const elapsedSeconds = Math.round(this.elapsedTime + 0.5) % 60;

		const timerHours = Math.floor(this.time / 60 / 60);
		const timerMinutes = Math.floor(this.time / 60) % 60;
		const timerSeconds = Math.floor(this.time) % 60;

		const subAddTime = Config.get('sub-add-time');
		const subMinutes = Math.floor(subAddTime / 60) % 60;
		const subSeconds = Math.floor(subAddTime) % 60;

		const donoAddTime = Config.get('donation-add-time');
		const donoMinutes = Math.floor(donoAddTime / 60) % 60;
		const donoSeconds = Math.floor(donoAddTime) % 60;

		const updateStartTime = () => {
			const h = this.shadowRoot.querySelector('#startTimeH').value,
				m = this.shadowRoot.querySelector('#startTimeM').value;

			const time = h * 60 * 60 + m * 60;
			Config.set('start-time', time);
		};

		const updateSubTime = () => {
			const m = this.shadowRoot.querySelector('#subTimeM').value,
				s = this.shadowRoot.querySelector('#subTimeS').value;

			const time = m * 60 + s;
			Config.set('sub-add-time', time);
		};

		const updateDonoTime = () => {
			const m = this.shadowRoot.querySelector('#donoTimeM').value,
				s = this.shadowRoot.querySelector('#donoTimeS').value;

			const time = m * 60 + s;
			Config.set('donation-add-time', time);
		};

		const history = Config.get('event-history');

		return html`
			<link href="./material-icons.css" rel="stylesheet" />

			<obs-dock-tab-section section-title="Timer">
				<div class="timer-clock">
					<div class="timer">
						${timerHours.toFixed(0).padStart(2, '0')} : ${timerMinutes.toFixed(0).padStart(2, '0')} :
						${timerSeconds.toFixed(0).padStart(2, '0')}
					</div>
					<div class="sub-timer">
						<span class="material-icons inline">timer</span>
						${elapsedHours.toFixed(0).padStart(2, '0')} : ${elapsedMinutes.toFixed(0).padStart(2, '0')} :
						${elapsedSeconds.toFixed(0).padStart(2, '0')}
					</div>
				</div>
				<div class="timer-controls">
					<button class="icon-button" @click="${() => this.pausePlayTimer()}">
						<span class="material-icons"> ${this.timerPlaying ? 'pause' : 'play_arrow'} </span>
					</button>
					<button @click="${() => this.resetTimer()}" class="secondary icon-button">
						<span class="material-icons">replay</span>
					</button>
					<button @click="${() => this.addMinute()}" class="secondary">+1 m</button>
					<button @click="${() => this.subtractMinute()}" class="secondary">-1 m</button>
				</div>
			</obs-dock-tab-section>

			<obs-dock-tab-section section-title="Timer Settings">
				<div class="timer-settings">
					<div class="row">
						<label>Start</label>
						<div>
							<fluid-input
								id="startTimeH"
								min="0"
								max="999"
								steps="1"
								@change="${(e) => updateStartTime()}"
								value="${hours}"
								suffix="h"
							></fluid-input>
							<fluid-input
								id="startTimeM"
								min="0"
								max="59"
								steps="1"
								@change="${(e) => updateStartTime()}"
								value="${minutes}"
								suffix="m"
							></fluid-input>
						</div>
					</div>
				</div>
			</obs-dock-tab-section>

			<obs-dock-tab-section
				optional
				section-title="Subathon Features"
				@setion-change="${(e) => {
					this.subathonFeaturesEnabled = e.target.enabled;
				}}"
			>
				<label>Time added by events:</label>
				<div class="row">
					<label>Sub</label>
					<div>
						<fluid-input
							id="subTimeM"
							min="0"
							max="60"
							steps="1"
							@change="${(e) => updateSubTime()}"
							value="${subMinutes}"
							suffix="m"
						></fluid-input>
						<fluid-input
							id="subTimeS"
							min="0"
							max="59"
							steps="1"
							@change="${(e) => updateSubTime()}"
							value="${subSeconds}"
							suffix="s"
						></fluid-input>
					</div>
				</div>
				<div class="row">
					<label>Donation / 1</label>
					<div>
						<fluid-input
							id="donoTimeM"
							min="0"
							max="60"
							steps="1"
							@change="${(e) => updateDonoTime()}"
							value="${donoMinutes}"
							suffix="m"
						></fluid-input>
						<fluid-input
							id="donoTimeS"
							min="0"
							max="59"
							steps="1"
							@change="${(e) => updateDonoTime()}"
							value="${donoSeconds}"
							suffix="s"
						></fluid-input>
					</div>
				</div>
				<br />
				<label>Counters:</label>
				<div class="row">
					<div class="inputs">
						<div>
							<label>Subs</label>
							<input type="number" value="${subs}" disabled="true" />
						</div>
						<div>
							<label>Donated</label>
							<input type="number" value="${donated}" disabled="true" />
						</div>
						<div class="history">
							${history.map((entry) => {
								if (entry.type == 'resub' || entry.type == 'subscription') {
									return html`
										<div class="history-entry">
											<div>${entry.name} subbed.</div>
											<button @click="${(e) => this.removeHistoryEntry(entry)}">X</button>
										</div>
									`;
								}
								if (entry.type == 'donation') {
									return html`
										<div class="history-entry">
											<div>${entry.name} donated ${entry.formatted_amount}.</div>
											<button @click="${(e) => this.removeHistoryEntry(entry)}">X</button>
										</div>
									`;
								}
							})}
						</div>
					</div>
				</div>
			</obs-dock-tab-section>

			<obs-dock-tab-section
				optional
				section-title="Timed scene switch"
				@setion-change="${(e) => {
					this.autoSceneSwitchEnabled = e.target.enabled;
				}}"
			>
				<div class="row">
					<label>Scene</label>
					<select id="autoSwitchSceneSelect" ?disabled="${this.obsScenes.length == 0}">
						${this.obsScenes.length
							? this.obsScenes.map(({ name }) => {
									return html`<option value="${name}">${name}</option>`;
							  })
							: html`<option value="none">No Scenes Available</option>`}
					</select>
				</div>
			</obs-dock-tab-section>
		`;
	}
}

customElements.define('obs-tools-timer', Timer);
