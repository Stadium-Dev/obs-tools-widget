import { css, html } from 'https://cdn.pika.dev/lit-element';
import Config from '../Config.js';
import OBS from '../OBS.js';
import DockTab from './DockTab.js';

if(!Config.get('start-time')) {
    Config.set('start-time', 60 * 60 * 12); // seconds
}

const bc = new BroadcastChannel('obs-tools-widget-com');

export default class Timer extends DockTab {

    static get styles() {
        return css`
            ${super.styles}
            :host {
                display: grid;
                height: 100%;
                grid-template-rows: auto auto auto auto 1fr auto;
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
            input[type="checkbox"] {
                width: auto;
                margin-right: 10px;
            }
            .row {
                display: flex;
            }
            .material-icons.inline {
                font-size: 18px;
                vertical-align: middle;
                margin-top: -4px;
                margin-right: 2px;
            }
        `;
    }

    constructor() {
        super();

        this.time = 60 * 60 * 12;
        this.elapsedTime = 0;
        this.autoSceneSwitchEnabled = Config.get('timer-scene-switch') || false;

        if(Config.get('elapsed-time') != null) {
            this.elapsedTime = Config.get('elapsed-time');
        }
        if(Config.get('timer') != null) {
            this.time = Config.get('timer');
        }

        this.timerPlaying = true;

        let lastTick = null;
        const updateTimer = ms => {
            if(ms && lastTick) {
                const delta = ms - lastTick;
                const deltaSecs = delta / 1000;
        
                if(this.time - deltaSecs > 0) {
                    this.time -= deltaSecs;
                    this.elapsedTime += deltaSecs;
                } else {
                    this.time = 0;
                    this.timerPlaying = false;
                    this.onTimerEnd();
                }
                this.update();
            }
            if(this.timerPlaying) {
                setTimeout(() => {
                    updateTimer(Date.now());
                }, 1000 / 12)
            }
            lastTick = ms;
        }
        updateTimer();

        this.pausePlayTimer = () => {
            this.timerPlaying = !this.timerPlaying;

            if(this.time === 0) {
                this.timerPlaying = true;
                this.resetTimer();
            }
    
            if(this.timerPlaying === true) {
                updateTimer();
            }
    
            this.updateOverlayTimer();
            this.update();
        }

        setInterval(() => {
            Config.set('elapsed-time', this.elapsedTime);
            Config.set('timer', this.time);
        }, 2000);

        this.updateOverlayTimer();

        this.obsScenes = [];
        OBS.onReady(() => {
            OBS.getScenes().then(scenes => {
                this.obsScenes = scenes;
                this.update();
            })
        })
    }

    updateOverlayTimer() {
        bc.postMessage({ 
            type:'timer', 
            time: this.time,
            playstate: this.timerPlaying
        });
    }

    resetTimer() {
        if(confirm('Reset timer to start time?')) {
            const startTime = Config.get('start-time');
            this.time = startTime;
            this.elapsedTime = 0;
            this.updateOverlayTimer();
            this.update();
        }
    }

    onTimerEnd() {
        if(Config.get('timer-scene-switch')) {
            const selectEle = this.shadowRoot.querySelector('#autoSwitchSceneSelect');
            const sceneToSwitchTo = selectEle.value;
            if(sceneToSwitchTo && sceneToSwitchTo !== "none") {
                OBS.setCurrentScene(sceneToSwitchTo);
            }
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
        const hours = Math.round(startTime / 60 / 60);
        const minutes = Math.round(startTime / 60) % 60;
        const seconds = Math.round(startTime) % 60;

        const elapsedHours = Math.round(this.elapsedTime / 60 / 60);
        const elapsedMinutes = Math.round(this.elapsedTime / 60) % 60;
        const elapsedSeconds = Math.round(this.elapsedTime) % 60;

        const timerHours = Math.round(this.time / 60 / 60);
        const timerMinutes = Math.round(this.time / 60) % 60;
        const timerSeconds = Math.round(this.time) % 60;

        const updateStartTime = () => {
            const h = this.shadowRoot.querySelector('#startTimeH').valueAsNumber, 
                  m = this.shadowRoot.querySelector('#startTimeM').valueAsNumber, 
                  s = this.shadowRoot.querySelector('#startTimeS').valueAsNumber;

            const time = (h * 60 * 60) + (m * 60) + (s);
            Config.set('start-time', time);
        }

        return html`
            <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">

            <div class="section" section-title="Start Time">
                <div class="section-content">
                    <input id="startTimeH" @change="${e => updateStartTime()}" type="number" value="${hours}"/>h
                    <input id="startTimeM" @change="${e => updateStartTime()}" type="number" value="${minutes}"/>m
                    <input id="startTimeS" @change="${e => updateStartTime()}" type="number" value="${seconds}"/>s
                </div>
            </div>
            <div class="section" section-title="Timer">
                <div class="section-content">
                    <div class="timer-clock">
                        <div class="timer">
                            ${timerHours.toFixed(0).padStart(2, "0")}
                            :
                            ${timerMinutes.toFixed(0).padStart(2, "0")}
                            :
                            ${timerSeconds.toFixed(0).padStart(2, "0")}
                        </div>
                        <div class="sub-timer">
                            <span class="material-icons inline">timer</span>
                            ${elapsedHours.toFixed(0).padStart(2, "0")}
                            :
                            ${elapsedMinutes.toFixed(0).padStart(2, "0")}
                            :
                            ${elapsedSeconds.toFixed(0).padStart(2, "0")}
                        </div>
                    </div>
                    <div class="timer-controls">
                        <button class="icon-button" @click="${() => this.pausePlayTimer()}">
                            <span class="material-icons">
                                ${this.timerPlaying ? "pause" : "play_arrow"}
                            </span>
                        </button>
                        <button @click="${() => this.resetTimer()}" class="secondary icon-button">
                            <span class="material-icons">replay</span>
                        </button>
                        <button @click="${() => this.addMinute()}" class="secondary">+1 m</button>
                        <button @click="${() => this.subtractMinute()}" class="secondary">-1 m</button>
                    </div> 
                </div>
            </div>
            <div class="section" section-title="Automatic scene switch">
                <div class="section-content">
                    <div class="row">  
                        <input @change="${(e) => {
                            this.autoSceneSwitchEnabled = e.target.checked;
                            Config.set('timer-scene-switch', e.target.checked);
                        }}" 
                            id="autoSceneSwitch" 
                            type="checkbox" 
                            ?checked="${this.autoSceneSwitchEnabled}"/>

                        <label for="autoSceneSwitch">Enable</label>  
                    </div>
                    <span>Scene:</span>
                    <select id="autoSwitchSceneSelect" ?disabled="${this.obsScenes.length == 0 || !this.autoSceneSwitchEnabled}">
                        ${this.obsScenes.length ? this.obsScenes.map(({ name }) => {
                            return html`<option value="${name}">${name}</option>`;
                        }) : html`<option value="none">No Scenes Available</option>`}
                    </select>
                </div>
            </div>
        `;
    }
}

customElements.define('obs-tools-timer', Timer);