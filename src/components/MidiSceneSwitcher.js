import { css, html } from 'https://cdn.skypack.dev/lit-element@2.4.0';
import Config from '../Config.js';
import DockTab from './DockTab.js';

export default class MidiSceneSwitcher extends DockTab {

    static get styles() {
        return css`
            ${super.styles}
            .section {
                margin: 0 0 10px 0;
            }
            p {
                opacity: 0.75;
                margin-top: 0;
                font-size: 12px;
            }

            .list {
                margin-bottom: 20px;
                min-height: 200px;
                border-radius: 4px;
                padding: 1px;
                width: 100%;
            }
            .binding {
                display: grid;
                grid-template-columns: 1.2fr 0.75fr auto;
                grid-auto-rows: 32px;
                grid-gap: 4px;
                align-items: center;
                height: auto;
                position: relative;
                border-radius: 4px;
                margin-bottom: 8px;
            }
            .binding:hover {
                background: rgba(255, 255, 255, 0.025);
            }
            .binding:not(:last-child) {
                border-bottom: 1px solid #1a1a1a;
            }
            .binding.header {
                font-size: 13px;
                opacity: 0.5;
                height: auto;
                margin-bottom: 8px;
            }
            dropdown-button {
                min-width: 100%;
                width: 100%;
                box-sizing: border-box;
            }
            .midi-button {
                width: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            
            i.material-icons {
                font-size: 16px;
            }
            .del-button {
                cursor: pointer;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 35px;
                border-radius: 4px;
            }
            .del-button:hover {
                background: #363636;
                box-shadow: 1px 2px 8px rgba(0, 0, 0, 0.2);
            }
            .del-button:active {
                background: #272727;
                box-shadow: none;
            }
            .create-btn {
                margin-top: 10px;
            }
        `;
    }

    render() {
        const binds = [
            1,
            2
        ];

        return html`
            <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">

            <obs-dock-tab-section section-title="Midi Scene Switcher">
                <div class="list">
                    <div class="binding header">
                        <div>Action</div>
                        <div>Item</div>
                        <div>Midi</div>
                    </div>

                    ${binds.map(bind => {
                        return html`
                            <div class="binding">
                                <dropdown-button class="Action" .options="${[
                                    { name: "Midi", value: 0 },
                                    { name: "Scene Switched", value: 0 },
                                    { name: "Timer Finished", value: 0 },
                                ]}"></dropdown-button>

                                <dropdown-button class="Action" .options="${[
                                    { name: "Switch Scene", value: 0 },
                                    { name: "Trigger Preset", value: 0 }
                                ]}"></dropdown-button>

                                <dropdown-button class="Action" .options="${[
                                    { name: "Display 1", value: 0 },
                                    { name: "Display 2", value: 0 }
                                ]}"></dropdown-button>

                                <div class="midi-button">156</div>

                                <div class="del-button">
                                    <i class="material-icons" style="opacity: 0.5;">delete</i>
                                </div>
                            </div>
                        `;
                    })}

                    <button class="create-btn">Create Bind</button>
                </div>
            </obs-dock-tab-section>
        `;
    }
}

customElements.define('obs-midi-switcher', MidiSceneSwitcher);
