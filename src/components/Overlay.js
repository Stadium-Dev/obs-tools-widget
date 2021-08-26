import { css, html } from 'https://cdn.skypack.dev/lit-element@2.4.0';
import DockTab from './DockTab.js';

function elementUsed(id) {
    const ele = document.querySelector(`${id}`);
    return ele != null && ele.style.display !== "none";
}

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
                font-size: 13px;
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

    render() {
        return html`
            <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
            
            <obs-dock-tab-section section-title="Overlay Drag & Drop">
                <a class="drag-and-button" @click="${e => e.preventDefault()}" href="../overlay/timer.html?layer-name=Timer%20Overlay&layer-width=1920&layer-height=1080">
                    <i class="material-icons">layers</i> <span>Timer Overlay</span>
                </a>
                <a class="drag-and-button" @click="${e => e.preventDefault()}" href="../overlay/subathon.html?layer-name=Subathon%20Overlay&layer-width=1920&layer-height=1080">
                    <i class="material-icons">layers</i> <span>Subathon Overlay</span>
                </a>
            </obs-dock-tab-section>
        `;
    }
}

customElements.define('obs-tools-overlay', Timer);