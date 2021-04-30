import { css, html, LitElement } from 'https://cdn.skypack.dev/lit-element@2.4.0';
import Config from '../Config.js';

export default class DockTabSection extends LitElement {

    static get styles() {
        return css`
            :host {
                margin: 0px;
                position: relative;
                display: block;
                --content-padding: 10px;
            }
            .title {
                line-height: 100%;
            }
            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                width: 100%;
                text-align: left;
                font-size: 12px;
                color: rgb(152 152 152);
                font-weight: 400;
                background: rgb(41, 41, 41);
                padding: 5px 7px 5px 7px;
                box-sizing: border-box;
                margin-bottom: 1px;
            }
            .switch input {
                margin: 0;
            }
            .content {
                display: block;
                padding: var(--content-padding);
            }
            .content:not([enabled]) {
                display: none;
            }
        `;
    }

    constructor() {
        super();

        
        this._enbaled = this.optional ? (Config.get(this.configKey) || false) : true;
    }

    connectedCallback() {
        super.connectedCallback();
        
        this.dispatchEvent(new Event('change'));
    }

    get enabled() {
        return this._enbaled;
    }

    set enabled(bool) {
        this._enbaled = bool;
        Config.set(this.configKey, bool);
        this.update();
        this.dispatchEvent(new Event('setion-change'));
    }

    get sectionTitle() {
        return this.getAttribute("section-title") || "";
    }

    get sectionId() {
        return this.getAttribute("section-title").toLocaleLowerCase().replace(" ", '-');
    }

    get configKey() {
        return 'section-' + this.sectionId + '-enabled';
    }

    get optional() {
        return this.hasAttribute("optional") || false;
    }

    render() {
        const updateEnabled = enabled => {
            this.enabled = enabled;
        }

        return html`
            <div class="header">
                <div class="title">${this.sectionTitle}</div>
                ${!this.optional ? '' : html`
                    <div class="switch">
                        <input ?checked="${this.enabled}" type="checkbox" @change="${e => updateEnabled(e.target.checked)}"/>
                    </div>
                `}
            </div>
            <slot class="content" ?enabled="${this.enabled}"></slot>
        `;
    }
}

customElements.define('obs-dock-tab-section', DockTabSection);
