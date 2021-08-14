import { css, html } from 'https://cdn.skypack.dev/lit-element@2.4.0';
import Config from '../Config.js';
import DockTab from './DockTab.js';
import OBS from '../OBS.js';

let mediaServerWs;
function disbleMediaServerControl() {
    if(mediaServerWs) {
        mediaServerWs.close();
    }
}
function enableMediaServerControl() {
    const host = Config.get('media-server-url') || "ws://localhost:8000";

    mediaServerWs = new WebSocket(host);

    mediaServerWs.addEventListener('message', msg => {
        const data = JSON.parse(msg.data);
        let scene = null;
        console.log(data);
        switch(data.type) {
            case "stream-connected":
                scene = getSelectedRemoteScene();
                break;
            case "stream-disconnected":
                scene = getSelectedStandbyScene();
                break;
        }
        if(scene) {
            OBS.setCurrentScene(scene);
        }
    });

    mediaServerWs.addEventListener('open', msg => {
        console.log("connected to media server websocket");
    })
    mediaServerWs.addEventListener('close', msg => {
        console.log("disconnected from media server websocket");
    })
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
            OBS.getScenes().then(scenes => {
                this.obsScenes = scenes;
                this.update();
            })
        })
    }

    connectedCallback() {
        super.connectedCallback();
        
        if(Config.get("section-remote-stream controls-enabled")) {
            enableMediaServerControl(); 
        }
    }

    render() {
        const mediaServerUrl = Config.get('media-server-url') || "localhost:8000";

        return html`
            <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
            
            <obs-dock-tab-section optional section-title="Remote Stream Controls" @setion-change="${e => {
                if(e.target.enabled) {
                    enableMediaServerControl()
                } else {
                    disbleMediaServerControl();
                }
            }}">
                <label>Media Server URL</label>
                <span class="label">IP:Port</span><input value="${mediaServerUrl}" 
                    @change="${e => {
                        Config.set('media-server-url', e.target.value);
                    }}" 
                    placeholder="IP:Port"/><br/>

                <br/>
                <br/>
                <span>Remote Scene: </span>
                <select id="remoteStreamScene" ?disabled="${this.obsScenes.length == 0}">
                    ${this.obsScenes.length ? this.obsScenes.map(({ name }) => {
                        return html`<option value="${name}">${name}</option>`;
                    }) : html`<option value="none">No Scenes Available</option>`}
                </select>
                <br/>
                <span>Standby Scene: </span>
                <select id="standByScene" ?disabled="${this.obsScenes.length == 0}">
                    ${this.obsScenes.length ? this.obsScenes.map(({ name }) => {
                        return html`<option value="${name}">${name}</option>`;
                    }) : html`<option value="none">No Scenes Available</option>`}
                </select>
                <br/>
                <br/>

                <div>
                    <button @click="${() => {
                         disbleMediaServerControl();
                         setTimeout(() => {
                            enableMediaServerControl();
                         }, 2000);
                    }}">Reconnect</button>
                </div>
            </obs-dock-tab-section>

            <obs-dock-tab-section section-title="TTS">
                <iframe src="https://1uckybot.luckydye.de/overlay/control-panel.html" />
            </obs-dock-tab-section>
        `;
    }
}

customElements.define('obs-1uckybot-tab', Luckybot);
