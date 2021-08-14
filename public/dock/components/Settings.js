import { css, html } from 'https://cdn.skypack.dev/lit-element@2.4.0';
import Config from '../Config.js';
import DockTab from './DockTab.js';
import Twitch from '../services/Twitch.js';

export default class Settings extends DockTab {

    static get styles() {
        return css`
            ${super.styles}
            input.full {
                width: calc(100% - 80px);
            }
            .label {
                display: inline-block;
                width: 80px;
                font-size: 14px;
                opacity: 0.75;
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
            
            <obs-dock-tab-section section-title="Settings">
                <div>
                    <label>Streamlabs Websocket Token</label>
                    <input value="${Config.get('streamlabs-websocket-token') || ""}" 
                        id="streamlabsWebsocketToken"
                        @change="${e => Config.set('streamlabs-websocket-token', e.target.value)}" 
                        class="full"
                        type="password" 
                        placeholder="Websocket Token"/>
                    <button @click="${e => this.showToken("streamlabsWebsocketToken", e.target)}">show</button>
                </div>
                <br/>
                <div>
                    <label>1uckybot Access Token</label>
                    <input value="${Config.get('1uckybot-websocket-token') || ""}" 
                        id="luckybotWebsocketToken"
                        @change="${e => Config.set('1uckybot-websocket-token', e.target.value)}" 
                        class="full"
                        type="password" 
                        placeholder="1uckybot Token"/>
                    <button @click="${e => this.showToken("luckybotWebsocketToken", e.target)}">show</button>
                </div>
                <br/>
                <div>
                    <label>OBS WebSocket</label>
                    <span class="label">IP:Port</span><input value="${obsWebSocketPort}" 
                        @change="${e => {
                            Config.set('obs-websocket-port', e.target.value);
                        }}" 
                        placeholder="Port"/><br/>
                    <span class="label">Password</span><input value="${obsWebSocketPassword}" 
                        type="password"
                        @change="${e => {
                            Config.set('obs-websocket-password', e.target.value);
                        }}" 
                        placeholder="Password"/>
                </div>
                <div style="margin: 10px 0;">
                    <span class="label" style="width: auto;">
                        Install obs-websocket plugin for automation features.
                    </span>
                </div>
                <div style="margin: 10px 0;">
                    <span class="label" style="width: auto;">
                        Use the flag "--use-fake-ui-for-media-stream" for Video Assist features.
                    </span>
                </div>
            
            </obs-dock-tab-section>

            <obs-dock-tab-section section-title="Connect to Twitch">
                ${Twitch.isAuthenticated ? 
                    html`
                        <span>Logged in as ${Twitch.userInfo.preferred_username}</span>
                    ` : 
                    html`
                        <button @click="${e => Twitch.authenticate().then(async params => {
                            if(params) {
                                this.update();
                            }
                        })}">
                            Login with Twitch
                        </button>
                    `
                }
            </obs-dock-tab-section>

            <obs-dock-tab-section section-title="Panic Button">
                <button @click="${e => location.reload()}">
                    Reload Tool
                </button>
            </obs-dock-tab-section>
        `;
    }
}

customElements.define('obs-tools-settings', Settings);