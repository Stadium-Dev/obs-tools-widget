import { css, html, LitElement } from 'https://cdn.skypack.dev/lit-element@2.4.0';
import Config from '../../dock/Config.js';

export default class OverlayHud extends LitElement {

    static get styles() {
        return css`
            :host {
                display: block;
                position: fixed;
                bottom: 80px;
                left: 80px;
                display: flex;
                justify-content: center;
                align-items: flex-end;
                color: #eee;
                font-family: 'Lato';
                font-size: 48px;
            }
            .timer {
                letter-spacing: 2px;
                display: flex;
                align-items: center;
            }
            .timer .prefix {
                margin-top: 2px;
                font-size: 32px;
                margin-right: 20px;
            }
            .timer .seperator {
                margin: 0 4px;
            }
            .sub-counter {
                
            }
        `;
    }

    constructor() {
        super();

        this.time = 60 * 60 * 12;
        this.timerPlaying = true;

        if(Config.get('timer')) {
            this.time = Config.get('timer');
        }

        let lastTick = null;
        const updateTimer = ms => {
            if(ms && lastTick) {
                const delta = ms - lastTick;

                this.time -= delta / 1000;
                if(this.time < 0) {
                    this.time = 0;
                }
                this.update();
            }
            
            if(this.timerPlaying) {
                setTimeout(() => {
                    updateTimer(Date.now());
                }, 1000 / 12);
            }

            lastTick = ms;
        }
        updateTimer();
        
        this.playTimer = () => {
            if(!this.timerPlaying) {
                this.timerPlaying = true;
                updateTimer();
            }
        }
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
            if(this.timerPlaying) {
                this.time = newTime - ((Date.now() - timeFix) / 1000);
            } else {
                this.time = newTime;
            }
            this.update();
        })
        return deltaTime;
    }

    async showTimerAction(deltaTime) {
        if(Math.round(deltaTime / 60) === 0) return;

        return new Promise((resolve) => {
            const ele = document.createElement('div');
            ele.innerHTML = `<span>${deltaTime > 0 ? '+' : ''}${Math.round(deltaTime / 60)} minutes</span>`;
            ele.className = "timer-action";
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
        })
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
            <link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400&display=swap" rel="stylesheet">
            <div class="timer">
                <span class="prefix">Startet in</span>
                <span>${hours.toFixed(0).padStart(2, "0")}</span>
                <span class="seperator">:</span>
                <span>${minutes.toFixed(0).padStart(2, "0")}</span>
                <span class="seperator">:</span>
                <span>${seconds.toFixed(0).padStart(2, "0")}</span>
            </div>
            <slot></slot>
        `;
    }
}

customElements.define('obs-overlay-hud', OverlayHud);