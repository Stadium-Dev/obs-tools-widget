import { css, html } from 'lit-element';
import DockTab from './DockTab.js';
import Overlays from '../Overlays.js';
import PropertySender from '../PropertySender.js';
import './ColorPicker';

const propSender = new PropertySender();


export default class Overlay extends DockTab {

    static get styles() {
        return css`
            ${super.styles}
            :host {
                height: 100%;
            }
            .drag-and-button {
                color: #eee;
                display: flex;
                justify-content: flex-start;
                align-items: center;
                text-decoration: none;
                padding: 8px 4px;
                font-size: 12.5px;
                cursor: grab;
                border-radius: 4px;
            }
            .drag-and-button:not(:last-child) {
                border-bottom: 1px solid #1a1a1a;
            }
            .drag-and-button:hover {
                background: #363636;
            }
            .drag-and-button:active {
                background: #272727;
                cursor: grabbing;
            }
            i.material-icons {
                font-size: 14px;
                margin: 0 8px 0 4px;
            }
            .container {
                padding: 5px;
            }
            .overlay-section {
                min-height: 150px;
            }
            .properties {
                
            }
            .placeholder {
                text-align: center;
                width: 100%;
                opacity: 0.5;
                margin: 8px 0;
            }
            gyro-fluid-input {
                width: 150px;
            }
            button.reset-property-btn {
                overflow: visible;
                line-height: 100%;
                border: none;
                padding: 0;
                text-align: right;
                width: 28px;
                min-width: 0;
                height: 28px;
                background: transparent;
                margin-left: 10px;
                margin-right: -10px;
                border-radius: 4px;
                border: 1px solid transparent;
            }
            button.reset-property-btn:hover {
                background: #313131;
                border: 1px solid #3f3f3f;
            }
            button.reset-property-btn:active {
                background: #1b1b1b;
            }
            .reset-property-btn i.material-icons {
                font-size: 16px;
            }
        `;
    }

    constructor() {
        super();

        propSender.onUpdate(() => this.update());
    }

    resetProperty(propId, prop) {
        propSender.postProperty(propId, prop.default);
        prop.value = prop.default;
        this.update();
    }

    renderProperty(propId, prop) {
        switch(prop.type) {
            case "boolean":
                return html`
                    <div class="row">
                        <label>${prop.name}</label>
                        <div>
                            <input-switch .checked="${prop.value === 1 ? true : false}" @change="${e => {
                                propSender.postProperty(propId, e.target.checked ? 1 : 0);
                            }}"></input-switch>
                            <button class="reset-property-btn" @click="${e => this.resetProperty(propId, prop)}">
                                <i class="material-icons">restart_alt</i>
                            </button>
                        </div>
                    </div>
                `;
            case "number":
                return html`
                    <div class="row">
                        <label>${prop.name}</label>
                        <div>
                            <gyro-fluid-input min="0" max="100" .value="${prop.value}" @input="${e => {
                                propSender.postProperty(propId, e.target.value);
                            }}"></gyro-fluid-input>
                            <button class="reset-property-btn" @click="${e => this.resetProperty(propId, prop)}">
                                <i class="material-icons">restart_alt</i>
                            </button>
                        </div>
                    </div>
                `;
            case "color":
                return html`
                    <div class="row">
                        <label>${prop.name}</label>
                        <button class="reset-property-btn" @click="${e => this.resetProperty(propId, prop)}">
                            <i class="material-icons">restart_alt</i>
                        </button>
                        <div>
                            <color-picker .hex="${prop.value}" @input="${e => {
                                propSender.postProperty(propId, e.target.hex);
                            }}"></color-picker>
                        </div>
                    </div>
                `;
            default:
                return html`
                    <div class="row">
                        <label>${prop.name}</label>
                        <div>
                            <input value="${prop.value}" @input="${e => {
                                propSender.postProperty(propId, e.target.value);
                            }}"/>
                            <button class="reset-property-btn" @click="${e => this.resetProperty(propId, prop)}">
                                <i class="material-icons">restart_alt</i>
                            </button>
                        </div>
                    </div>
                `;
        }
    }

    render() {
        const selection = propSender.selection;
        const overlays = Overlays.getOverlayList();

        return html`
            <link href="./material-icons.css" rel="stylesheet">
            
            <obs-dock-tab-section section-title="Overlay Drag & Drop" class="overlay-section">
                ${overlays.map(overlay => {
                    return html`
                        <a class="drag-and-button" @click="${e => e.preventDefault()}" href="${overlay.url}">
                            <i class="material-icons">layers</i> 
                            <span>${overlay.name}</span>
                        </a>
                    `;
                })}
            </obs-dock-tab-section>

            <obs-dock-tab-section section-title="Overlay Properties">
                <div class="properties">
                    ${selection.map(item => {
                        if(item.props) {
                            return html`
                                <div>${item.itemName}</div>
                                ${Object.keys(item.props).map(key => this.renderProperty(key, item.props[key]))}
                            `;
                        } else {
                            return html`
                                <div>${item.itemName}</div>
                                <div class="placeholder">No custom properties</div>
                            `;
                        }
                    })}

                    ${selection.length == 0 ? html`
                        <div class="placeholder">
                                Nothing Selected
                        </div>
                    ` : ""}
                </div>
            </obs-dock-tab-section>
        `;
    }
}

customElements.define('obs-tools-overlay', Overlay);