// obs-controler
import { css, html } from 'lit-element';
import { OBS } from 'obs';
import DockTab from './DockTab.js';
import { Mapping } from 'gamepad';

export default class Controler extends DockTab {

    static get styles() {
        return css`
            ${super.styles}

            @keyframes slide-in {
                from { transform: translateY(-10px); opacity: 0; }
            }
            
            .gamepad, .no-gamepad {
                margin: 8px;
                padding: 8px;
                border-radius: 3px;
                background: #333;
                font-size: 12px;
                animation: slide-in .5s ease;
            }

            .no-gamepad {
                opacity: 0.5;
            }

            .gamepad-id {
                max-width: calc(100% - 70px);
                white-space: nowrap;
                display: inline-block;
                margin-right: 5px;
                text-overflow: ellipsis;
            }

            span {
                display: inline-block;
                overflow: hidden;
                vertical-align: middle;
            }

            .mapping {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
            }
        `;
    }

    history = [];
    gamepad = null;
    mapping = Mapping.JoyConR;
    buttonMap = {
        "A": {
            setCurrentScene: "Szene"
        },
        "B": {
            setCurrentScene: "Scene 2"
        },
    };

    constructor() {
        super();

        window.addEventListener("gamepadconnected", ({ gamepad }) => {
            this.gamepad = gamepad;
            this.update();
        });
        window.addEventListener("gamepaddisconnected", ({ gamepad }) => {
            if(this.gamepad.id == gamepad.id) {
                this.gamepad = null;
                this.update();
            }
        });
        
        window.addEventListener("buttondown", async e => {
            for(let label in this.mapping) {
                if(this.mapping[label] == e.button.id) {
                    const mappedTo = this.buttonMap[label];

                    for(let fn in mappedTo) {
                        OBS[fn](mappedTo[fn]);
                    }

                    this.update();
                    break;
                }
            }
        });
    }

    render() {
        return html`
            <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">

            ${this.gamepad != null ? html`
                <div class="gamepad">
                    <span class="gamepad-id">${this.gamepad.id}</span>
                    <span>connected</span>
                </div>
            ` : html`
                <div class="no-gamepad">
                    <span>No controller connected</span>
                </div>
            `}

            <obs-dock-tab-section section-title="Button Mapping">
                ${Object.keys(this.buttonMap).map(btn => {
                    return html`
                        <div class="mapping">
                            <div>
                                <span>
                                    ${btn}
                                </span>
                                <span>
                                    ---->
                                </span>
                                <span>
                                    ${JSON.stringify(this.buttonMap[btn])}
                                </span>
                            </div>

                            <button @click="${e => {
                                delete this.buttonMap[btn];
                                this.update();
                            }}">X</button>
                        </div>
                    `;
                })}
            </obs-dock-tab-section>
        `;
    }
}

customElements.define('obs-controler', Controler);