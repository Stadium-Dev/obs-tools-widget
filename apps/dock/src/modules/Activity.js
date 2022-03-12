import { css, html } from 'lit-element';
import Config from '../Config.js';
import Streamlabs from '../Streamlabs.js';
import DockTab from '../components/DockTab.js';

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

if(!Config.get('donation-counter')) {
    Config.set('donation-counter', donated);
}

if(!Config.get('sub-counter')) {
    Config.set('sub-counter', subs);
}

if(!Config.get('event-history')) {
    Config.set('event-history', []);
}

export default class Counter extends DockTab {

    static get styles() {
        return css`
            ${super.styles}
            :host {
                height: 100%;
            }
            obs-dock-tab-section.full {
                height: 300px;
            }
            .history {
                margin-top: 15px;
                width: calc(100% - 20px);
                position: absolute;
                top: 20px;
                bottom: 10px;
                overflow: auto;
                border: 1px solid rgb(54, 54, 54);
                background: rgb(26, 26, 26);
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
                display: grid;
                grid-template-columns: auto auto;
                justify-content: flex-start;
                grid-gap: 20px;
            }
            input {
                width: 50px;
            }
        `;
    }

    constructor() {
        super();

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

    connectedCallback() {
        super.connectedCallback();
    }

    removeHistoryEntry(entry) {
        const history = Config.get('event-history');
        history.splice(history.indexOf(entry), 1);
        Config.set('event-history', history);
    }

    render() {
        const history = Config.get('event-history');
        return html`
            <obs-dock-tab-section section-title="Subathon Counters">
                <div class="inputs">
                    <div>
                        <label>Subs</label>
                        <input type="number" value="${subs}" disabled="true"/>
                    </div>
                    <div>
                        <label>Donations</label>
                        <input type="number" value="${donated}" disabled="true"/>€
                    </div>
                </div>
            </obs-dock-tab-section>
            <obs-dock-tab-section class="full" section-title="Activity">
                <div class="history">
                    ${history.map(entry => {
                        if(entry.type == "resub" || entry.type == "subscription") {
                            return html`
                                <div class="history-entry">
                                    <div>${entry.name} subbed.</div>
                                    <button @click="${e => this.removeHistoryEntry(entry)}">X</button>
                                </div>
                            `;
                        }
                        if(entry.type == "donation") {
                            return html`
                                <div class="history-entry">
                                    <div>${entry.name} donated ${entry.formatted_amount}.</div>
                                    <button @click="${e => this.removeHistoryEntry(entry)}">X</button>
                                </div>
                            `;
                        }
                    })}
                </div>
            </obs-dock-tab-section>
        `;
    }
}

customElements.define('obs-streamlabs-activity', Counter);
