import { css, html } from 'lit-element';
import DockTab from './DockTab.js';
import OBS from '../obs/OBS';
import './ColorPicker';

const overlays = [
    { name: "Timer Overlay", url: "../overlay/timer.html?layer-name=Timer%20Overlay&layer-width=1920&layer-height=1080" },
    { name: "Subathon Overlay", url: "../overlay/subathon.html?layer-name=Subathon%20Overlay&layer-width=1920&layer-height=1080" }
    { name: "Labels Overlay", url: "../overlay/labels.html?layer-name=Subathon%20Overlay&layer-width=1920&layer-height=1080" }
];

const bc = new BroadcastChannel('obs-tool-com');


export default class Timer extends DockTab {

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
            }
            gyro-fluid-input {
                width: 150px;
            }
        `;
    }

    constructor() {
        super();

        this.selection = [];

        OBS.on('selection', e => {
            switch (e.updateType) {
                case "SceneItemDeselected":
                    let index = 0;
                    for(let item of this.selection) {
                        if(item.itemId == e.itemId) {
                            this.selection.splice(index, 1);
                            break;
                        }
                        index++;
                    }
                    this.update();
                    break;
                case "SceneItemSelected":
                    this.selection.push({
                        itemId: e.itemId,
                        itemName: e.itemName,
                    });
                    break;
            }
            requestAnimationFrame(() => {
                this.handleSelection(this.selection);
                this.update();
            })
        })

        bc.onmessage = ({ data }) => {
            if(data.type == "properties") {
                this.handleProperties(data.data);
            }
        }
    }

    handleProperties(data) {
        const props = data.properties;

        for(let selected of this.selection) {
            if(selected.source == data.source) {
                selected.props = props;
            }
        }

        this.update();
    }

    handleSelection(selection) {
        for(let item of selection) {
            item.name = item.itemName;

            const source = item;

            OBS.getSourceSettings(source).then(settings => {
                if(settings.url) {
                    bc.postMessage({ type:'getProperties', data: {
                        source: settings.url
                    } });

                    source.source = settings.url;
                }
            });
        }
    }

    sendPropertyUpdate(propId, value) {
        bc.postMessage({ type: "property.change", data: { property: propId, value } });
    }

    renderProperty(propId, prop) {
        switch(prop.type) {
            case "number":
                return html`
                    <div class="row">
                        <label>${prop.name}</label>
                        <div>
                            <gyro-fluid-input min="0" max="100" .value="${prop.value}" @input="${e => {
                                this.sendPropertyUpdate(propId, e.target.value);
                            }}"></gyro-fluid-input>
                        </div>
                    </div>
                `;
            case "color":
                return html`
                    <div class="row">
                        <label>${prop.name}</label>
                        <div>
                            <color-picker .hex="${prop.value}" @input="${e => {
                                this.sendPropertyUpdate(propId, e.target.hex);
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
                                this.sendPropertyUpdate(propId, e.target.value);
                            }}"/>
                        </div>
                    </div>
                `;
        }
    }

    render() {
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
                <!-- <div>
                    ${this.selection.map(item => {
                        return html`<div>${JSON.stringify(item)}</div>`;
                    })}
                </div> -->
                <div class="properties">
                    ${this.selection.map(item => {
                        if(item.props) {
                            return html`
                                <div>${item.itemName}</div>
                                ${Object.keys(item.props).map(key => this.renderProperty(key, item.props[key]))}
                            `;
                        }
                    })}

                    ${this.selection.length == 0 ? html`
                        <div class="placeholder">
                                Nothing Selected
                        </div>
                    ` : ""}
                </div>
            </obs-dock-tab-section>
        `;
    }
}

customElements.define('obs-tools-overlay', Timer);