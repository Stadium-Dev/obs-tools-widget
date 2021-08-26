import { css, html } from 'https://cdn.skypack.dev/lit-element@2.4.0';
import Config from '../Config.js';
import DockTab from './DockTab.js';
import Twitch from '../services/Twitch.js';

export default class Settings extends DockTab {

    static get styles() {
        return css`
            ${super.styles}
            :host {
                position: relative;
            }
            input.full {
                width: calc(100% - 80px);
            }
            .label {
                display: inline-block;
                width: 80px;
                font-size: 14px;
                opacity: 0.75;
            }
            .client-id {
                font-size: 12px;
                position: absolute;
                bottom: 8px;
                left: 50%;
                transform: translate(-50%, 0);
                opacity: 0.25;
                user-select: all;
                width: 240px;
            }
        `;  
    }

    constructor() {
        super();
        Twitch.loadAuthentication();
    }

    showToken(id, btn) {
        const input = this.shadowRoot.querySelector('#' + id);
        input.type = "text";
        let timer = 5;
        btn.innerHTML = timer;
        btn.disabled = true;
        const int = setInterval(() => {
            timer--;
            btn.innerHTML = timer;
            if(timer == 0) {
                btn.innerHTML = "show";
                input.type = "password";
                clearInterval(int);
                btn.disabled = false;
            }
        }, 1000);
    }

    render() {
        const obsWebSocketPort = Config.get('obs-websocket-port') || "localhost:4444";
        const obsWebSocketPassword = Config.get('obs-websocket-password') || "password";

        return html`
            <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">

            <obs-dock-tab-section section-title="Streamlabs Integration">
                <label>Streamlabs Websocket Token</label>
                <input value="${Config.get('streamlabs-websocket-token') || ""}" 
                    id="streamlabsWebsocketToken"
                    @change="${e => Config.set('streamlabs-websocket-token', e.target.value)}" 
                    class="full"
                    type="password" 
                    placeholder="Websocket Token"/>
                <button @click="${e => this.showToken("streamlabsWebsocketToken", e.target)}">show</button>
            </obs-dock-tab-section>

            <obs-dock-tab-section section-title="OBS WebSocket Integration">
                <div style="margin: 5px 0 15px 0;">
                    <label>
                        Install obs-websocket plugin for automation features.
                    </label>
                </div>
                <div class="row">
                    <label>WebSocket URL</label>
                    <input value="${obsWebSocketPort}" 
                        @change="${e => {
                            Config.set('obs-websocket-port', e.target.value);
                        }}" 
                        placeholder="Port"/>
                </div>
                <div class="row">
                    <label>Password</label>
                    <input value="${obsWebSocketPassword}" 
                        type="password"
                        @change="${e => {
                            Config.set('obs-websocket-password', e.target.value);
                        }}" 
                        placeholder="Password"/>
                </div>
            
            </obs-dock-tab-section>

            <obs-dock-tab-section section-title="Advanced">
                <button @click="${e => location.reload()}">
                    Reload Tool
                </button>
                <button @click="${e => {
                    Config.fullReset();
                }}">
                    Reset Tool
                </button>
            </obs-dock-tab-section>

            <div class="client-id">
                <span>${localStorage.getItem('unique-client-id')}</span>
            </div>
        `;
    }
}

customElements.define('obs-tools-settings', Settings);