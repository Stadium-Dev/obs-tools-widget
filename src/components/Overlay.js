import { css, html } from 'lit-element';
import DockTab from './DockTab.js';
import OBS from '../obs/OBS';


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
                margin-top: 20px;
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
                    this.properties = null;
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
    }

    handleSelection(selection) {
        for(let item of selection) {
            item.name = item.itemName;

            const bc = new BroadcastChannel('obs-tool-com');

            OBS.getSourceSettings(item).then(settings => {
                if(settings.url) {
                    bc.postMessage({ type:'getProperties', data: {
                        source: settings.url
                    } });
                }
            });

            bc.onmessage = ({ data }) => {
                if(data.type == "properties") {
                    const source = data.data.source;
                    const props = data.data;
                    
                    this.properties = {
                        item: item.itemName,
                        source,
                        props
                    }

                    this.update();
                }
                // console.log(ev);
                // get properties
                // render ui
                // send changes to overlay
            }
        }
    }

    render() {
        const overlays = [
            { name: "Timer Overlay", url: "../overlay/timer.html?layer-name=Timer%20Overlay&layer-width=1920&layer-height=1080" },
            { name: "Subathon Overlay", url: "../overlay/subathon.html?layer-name=Subathon%20Overlay&layer-width=1920&layer-height=1080" }
        ];

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
                <div>
                    ${this.selection.map(item => {
                        return html`
                            <div>
                                ${JSON.stringify(item)}
                            </div>
                        `;
                    })}
                </div>
                <div class="properties">
                    ${JSON.stringify(this.properties, null, '  ')}
                </div>
            </obs-dock-tab-section>
        `;
    }
}

customElements.define('obs-tools-overlay', Timer);