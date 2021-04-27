import { css, html } from 'https://cdn.pika.dev/lit-element';
import Config from '../Config.js';
import DockTab from './DockTab.js';

const actionTypeMap = {
    "chat.timeout": "Twitch | Timeout User",
    "chat.test": "Twitch | Bot Test Message",
    "discord.notification": "Discord | Send Dicord Message",
    "reward.emoterain": "Twitch | Reward Emoterain",
    "rewards.message": "Twitch | Reward Text Message",
    "discord.eth": "Discord | ETH Notification"
}

export function getActionDescriptionByType(type) {
    return actionTypeMap[type] || type;
}

function connectToSocket(token) {
    const origin = `ws${location.protocol == "https:" ? "s" : ""}://${location.host}/`;
    const ws = new WebSocket(`${origin}?token=${token}`, '1uckybot-protocol');

    ws.onopen = () => {
        log('Connection Open');

        setInterval(() => {
            ws.send(JSON.stringify({ type: 'ping' }));
        }, 1000 * 60 * 5);
    }

    ws.onerror = () => {
        log('Connection Error');
    }

    ws.onclose = () => {
        log('Connection Closed');
        setTimeout(() => connect(), 2000);
    }

    return ws;
}

export default class Luckybot extends DockTab {

    static get styles() {
        return css`
            ${super.styles}
            :host {
                position: relative;
            }
    
            .title {
                font-size: 14px;
                opacity: 0.5;
                margin-bottom: 10px;
            }
    
            .message-log {
                overflow: auto;
            }
    
            .action-type {
                padding: 3px 5px;
                background: grey;
                border-radius: 4px;
                margin-right: 4px;
                opacity: 0.75;
            }
    
            .action-author {
                font-weight: 500;
                margin-right: 4px;
            }
    
            .action-msg {
    
            }
    
            .log-message {
                padding: 6px 0px;
                position: relative;
                border-radius: 4px;
                padding: 15px;
                background: #2c2c30;
                margin-bottom: 4px;
                box-shadow: rgba(0, 0, 0, 0.125) 1px 2px 6px;
            }
    
            .log-message .details {
                background: rgb(44, 44, 48);
                margin-top: 20px;
            }
    
            .action-replay-btn {
                float: right;
                padding: 4px;
                cursor: pointer;
                position: relative;
                margin-top: -4px;
                border-radius: 4px;
            }
    
            .action-replay-btn:hover {
                background: grey;
            }
            .action-replay-btn:active {
                background: #333;
            }
    
            .action-timestamp {
                margin-right: 5px;
                opacity: 0.5;
            }
    
            .placeholder {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                margin: 50px 0;
                opacity: 0.25;
                font-size: 18px;
            }
        `;
    }

    constructor() {
        super();
        this.messageLog = [];
    }

    _requestLog() {
        const accessToken = Config.get('1uckybot-websocket-token');
        return fetch('https://1uckybot.luckydye.de/api/history', {
            mode: 'cors',
            headers: {
                'Authentication': accessToken
            }
        })
            .then(res => res.json())
            .then(json => {
                if (json.status == 200) {
                    return json.data.log;
                }
            })
    }

    connectedCallback() {
        const accessToken = Config.get('1uckybot-websocket-token');

        if (!this.socket && accessToken) {
            this.socket = connectToSocket(accessToken);

            this.socket.onmessage = msg => {
                const data = JSON.parse(msg.data);
                this.handleNewMessage(data);
            }

            this._requestLog().then(log => {
                for (let msg of log) {
                    this.messageLog.unshift(msg);
                }
                this.update();
            });
        } else if (!accessToken) {
            setTimeout(() => {
                this.connectedCallback();
            }, 250);
        }

        this.update();
    }

    handleNewMessage(data) {
        this.messageLog.unshift(data);
        this.update();
    }

    async _replayAction(actionData) {
        console.log(actionData);

        return fetch('https://1uckybot.luckydye.de/api/actions/replay', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authentication': sessionStorage.twitchOAuthCode
            },
            body: JSON.stringify(actionData)
        })
            .then(res => res.json())
            .then(json => {
                if (json.status == 200) {
                    console.log('replay ok');
                } else {
                    console.log('replay failed');
                }
            })
    }

    render() {
        const renderLog = () => {
            return this.messageLog.map(actionData => {
                const type = actionData.type;
                const action = actionData.action;
                const message = actionData.data.message;
                const from = actionData.data.from || { display_name: "unkown" };
                const ts = new Date(actionData.timestamp);
                const timestamp = `${ts.toLocaleDateString()}`;
                const timestampLong = `${ts.toLocaleDateString()} ${ts.toLocaleTimeString()}`;

                return html`
                    <div class="log-message">
                    <span class="action-timestamp" title="${timestampLong}">${timestamp}</span>
                    <span class="action-type">${getActionDescriptionByType(action)}</span>
                    <span class="action-author">${from.display_name}:</span>
                    <span class="action-msg">${message}</span>
                    <button title="Replay" class="action-replay-btn" @click="${() => this._replayAction(actionData)}">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#eee" width="18px" height="18px"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
                    </button>
                    </div>
              `;
            })
        }

        return html`
            <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
            
            <obs-dock-tab-section section-title="Action Log">
                <div class="message-log">
                    ${this.messageLog.length == 0 ? html`
                    <div class="placeholder">No Activity</div>
                    ` : renderLog()}
                </div>
            </obs-dock-tab-section>
        `;
    }
}

customElements.define('obs-1uckybot-tab', Luckybot);