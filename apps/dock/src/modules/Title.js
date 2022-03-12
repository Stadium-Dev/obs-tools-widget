import { css, html } from 'lit-element';
import Config from '../Config.js';
import DockTab from '../components/DockTab.js';

if(!Config.get('stream-title')) {
    Config.set('stream-title', "Title");
}

const bc = new BroadcastChannel('obs-tools-widget-com');

export default class Title extends DockTab {

    static get styles() {
        return css`
            ${super.styles}
            :host {
                display: grid;
                height: 100%;
                grid-template-rows: auto auto auto auto 1fr auto;
            }
            input, textarea {
                font-size: 16px;
                display: inline-block;
                width: 100%;
                box-sizing: border-box;
                text-align: left;
            }
            textarea {
                min-height: 100px;
                font-size: 14px;
            }
            .section {
                margin: 0 0 10px 0;
            }
            p {
                opacity: 0.75;
                margin-top: 0;
                font-size: 12px;
            }
        `;
    }

    render() {
        const currentTitle = Config.get('stream-title');

        const updateTitle = title => {
            Config.set('stream-title', title);
            bc.postMessage({ 
                type: 'title', 
                title: title,
            });
        }

        return html`
            <div class="section" section-title="Title (HTML + custom formating)">
                <div class="section-content">
                    <p>
                        %[formating_keys]%<br/>
                        formating_keys:<br/>
                            s: small<br/>
                            f: alt font<br/>
                            b: big
                    </p>
                    <textarea @change="${e => updateTitle(e.target.value)}" type="text">${currentTitle}</textarea>
                </div>
            </div>
        `;
    }
}

customElements.define('obs-tools-title', Title);
