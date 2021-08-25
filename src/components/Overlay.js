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
                border-radius: 3px;
                background: #333;
                color: white;
                display: flex;
                justify-content: center;
                align-items: center;
                margin-bottom: 10px;
                text-decoration: none;
                height: 50px;
                font-size: 16px;
                border: 1px solid #373737;
            }
            .drag-and-button:hover {
                background: #363636;
            }
            .drag-and-button:active {
                background: #272727;
            }
        `;
    }

    render() {
        return html`
            <div class="section" section-title="Overlay Drag & Drop">
                <div class="section-content">
                    <a class="drag-and-button" href="../overlay/timer.html?layer-name=Timer%20Overlay&layer-width=1920&layer-height=1080">
                        Timer Overlay
                    </a>
                    <a class="drag-and-button" href="../overlay/subathon.html?layer-name=Subathon%20Overlay&layer-width=1920&layer-height=1080">
                        Subathon Overlay
                    </a>
                </div>
            </div>
        `;
    }
}

customElements.define('obs-tools-overlay', Timer);