import { css, html } from 'https://cdn.skypack.dev/lit-element@2.4.0';
import DockTab from './DockTab.js';



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
        `;
    }

    constructor() {
        super();

        
    }

    render() {
        const overlays = [
            { name: "Timer Overlay", url: "../overlay/timer.html?layer-name=Timer%20Overlay&layer-width=1920&layer-height=1080" },
            { name: "Subathon Overlay", url: "../overlay/subathon.html?layer-name=Subathon%20Overlay&layer-width=1920&layer-height=1080" }
        ];

        return html`
            <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
            
            <obs-dock-tab-section section-title="Overlay Drag & Drop">
                ${overlays.map(overlay => {
                    return html`
                        <a class="drag-and-button" @click="${e => e.preventDefault()}" href="${overlay.url}">
                            <i class="material-icons">layers</i> 
                            <span>${overlay.name}</span>
                        </a>
                    `;
                })}
            </obs-dock-tab-section>
        `;
    }
}

customElements.define('obs-tools-overlay', Timer);