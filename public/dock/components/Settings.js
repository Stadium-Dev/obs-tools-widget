import { css, html } from 'https://cdn.pika.dev/lit-element';
import Config from '../Config.js';
import DockTab from './DockTab.js';

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

    }

    connectedCallback() {
        super.connectedCallback();
    }

    socketTokenChange(input) {
        Config.set('streamlabs-websocket-token', input.value);
    }

    showToken(btn) {
        const input = this.shadowRoot.querySelector('input');
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
                    <input value="${Config.get('streamlabs-websocket-token')}" 
                        @change="${e => this.socketTokenChange(e.target)}" 
                        class="full"
                        type="password" 
                        placeholder="Websocket Token"/>
                    <button @click="${e => this.showToken(e.target)}">show</button>
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