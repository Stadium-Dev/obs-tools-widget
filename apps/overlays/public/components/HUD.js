import { css, html, LitElement } from lit;
import Config from '../../dock/Config.js';

export default class OverlayHud extends LitElement {
	static get styles() {
		return css`
			:host {
				--text-color: #eee;

				display: block;
				position: fixed;
				top: 0;
				left: 50%;
				transform: translate(-50%, 0);
				width: 400px;
				height: 45px;
				display: flex;
				justify-content: center;
				align-items: flex-end;
				font-family: 'Lato';
				font-size: 28px;
				color: var(--text-color);
			}
			.container::after,
			.container::before {
				content: '';
				z-index: 100;
				display: block;
				position: absolute;
				top: 0px;
				left: 0px;
				height: 150%;
				width: 1px;
				background: #eee;
				transform-origin: 0 0;
				transform: rotate(-41deg) translateX(-0.5px);
				opacity: 0.9;
			}
			.container::after {
				left: auto;
				right: 0px;
				transform: rotate(41deg);
			}
			.background {
				position: absolute;
				top: 0;
				left: 0;
				width: 100%;
				height: 105%;
				clip-path: polygon(0 0, 100% 0, calc(100% - 40px) 100%, 40px 100%);
				background: linear-gradient(180deg, hsl(0deg 0% 0% / 75%), hsl(0deg 0% 0% / 0%));
				z-index: -1;
			}
			.timer {
				letter-spacing: 2px;
				display: flex;
			}
			.timer .prefix {
				margin-right: 15px;
			}
			.timer .seperator {
				margin: 0 4px;
			}
			.sub-counter {
			}
			.left {
				position: absolute;
				right: calc(50% - 300px);
				text-align: right;
				display: var(--display-left, block);
			}
			.right {
				position: absolute;
				left: calc(50% - 300px);
				text-align: left;
				display: var(--display-right, block);
			}
			.left,
			.right {
				font-size: 24px;
				white-space: nowrap;
			}
		`;
	}

	constructor() {
		super();

		this.prefixString = 'T-';

		this.subs = 0;
		this.donated = 0;

		this.time = 60 * 60 * 12;
		this.timerPlaying = false;

		if (Config.get('timer')) {
			this.time = Config.get('timer');
		}

		let lastTick = null;
		const updateTimer = (ms) => {
			if (ms && lastTick) {
				const delta = ms - lastTick;

				this.time -= delta / 1000;
				if (this.time < 0) {
					this.time = 0;
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

		this.playTimer = () => {
			if (!this.timerPlaying) {
				this.timerPlaying = true;
				updateTimer();
			}
		};
	}

	playTimer() {}

	pauseTimer() {
		this.timerPlaying = false;
	}

	connectedCallback() {
		super.connectedCallback();
	}

	setTime(newTime) {
		const deltaTime = newTime - this.time;
		const timeFix = Date.now();
		this.showTimerAction(deltaTime).then(() => {
			if (this.timerPlaying) {
				this.time = newTime - (Date.now() - timeFix) / 1000;
			} else {
				this.time = newTime;
			}
			this.update();
		});
		return deltaTime;
	}

	async showTimerAction(deltaTime) {
		if (Math.round(deltaTime / 60) === 0) return;

		return new Promise((resolve) => {
			const ele = document.createElement('div');
			ele.innerHTML = `<span>${deltaTime > 0 ? '+' : ''}${Math.round(deltaTime / 60)} minutes</span>`;
			ele.className = 'timer-action';
			ele.classList.add('show-animation');
			this.appendChild(ele);
			setTimeout(() => {
				ele.classList.remove('show-animation');
				ele.classList.add('hide-animation');
				setTimeout(() => {
					resolve();
					ele.remove();
				}, 400);
			}, 1000 * 3);
		});
	}

	render() {
		const hours = Math.floor(this.time / 60 / 60);
		const minutes = Math.floor(this.time / 60) % 60;
		const seconds = Math.floor(this.time) % 60;

		// const subCounter = Config.get('sub-counter');
		// <div class="sub-counter">
		//     ${subCounter}
		// </div>

		return html`
			<link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400&display=swap" rel="stylesheet" />
			<div class="left">${this.subs}</div>
			<div class="container">
				<div class="background"></div>
			</div>
			<div class="timer">
				<span class="prefix">${this.prefixString}</span>
				<span>${hours.toFixed(0).padStart(2, '0')}</span>
				<span class="seperator">:</span>
				<span>${minutes.toFixed(0).padStart(2, '0')}</span>
				<span class="seperator">:</span>
				<span>${seconds.toFixed(0).padStart(2, '0')}</span>
			</div>
			<div class="right">${this.donated} ???</div>
			<slot></slot>
		`;
	}
}

customElements.define('obs-overlay-hud', OverlayHud);
