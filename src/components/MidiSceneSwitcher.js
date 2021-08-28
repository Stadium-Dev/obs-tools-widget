import { css, html } from 'lit-element';
import Config from '../Config.js';
import DockTab from './DockTab.js';
import LayoutPresets from '../LayoutPresets.js';
import OBS from '../obs/OBS';

const Action = {
    SCENE_SWITCH: 0,
    TRIGGER_PRESET: 1,
}

const binds = Config.get('midi-binds') || [
    // { midi: 156, action: Action.SCENE_SWITCH, itemId: 0 },
    { midi: 157, action: Action.TRIGGER_PRESET, itemId: 0 },
];

function createBind() {
    binds.push({ midi: 157, action: Action.SCENE_SWITCH, itemId: 0 });
    saveBinds();
}

function saveBinds() {
    Config.set('midi-binds', binds);
}

function deleteBind(bind) {
    binds.splice(binds.indexOf(bind), 1);
    saveBinds();
}

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
                grid-template-columns: 1fr 1.2fr 1fr auto;
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
            .binding.header:hover { 
                background: transparent;
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

    constructor() {
        super();

        OBS.on('ready', e => {
            this.update();
        })
    }

    createBind() {
        createBind();
        this.update();
    }

    render() {
        const scenes = OBS.getState().scenes.map(scene => {
            return { name: scene.name, value: scene.name }
        }) || [];
        const presets = LayoutPresets.getPresets().map(preset => {
            return { name: preset[0], value: preset[0] }
        }) || [];
        const actions = [
            { name: "Switch Scene", value: Action.SCENE_SWITCH },
            { name: "Trigger Preset", value: Action.TRIGGER_PRESET }
        ];

        return html`
            <link href="./material-icons.css" rel="stylesheet">

            <obs-dock-tab-section section-title="Midi Scene Switcher">
                <div class="list">
                    <div class="binding header">
                        <div>Midi</div>
                        <div>Action</div>
                        <div>Item</div>
                    </div>

                    ${binds.map(bind => {
                        return html`
                            <div class="binding">
                                <div class="midi-button">${bind.midi}</div>

                                <dropdown-button class="Action" .options="${actions}" .value="${bind.action}" @change="${e => {
                                    bind.action = e.target.value.value;
                                    // this.update();
                                }}"></dropdown-button>

                                ${( bind.action == Action.SCENE_SWITCH ? (
                                    html`
                                        <dropdown-button class="Action" .options="${scenes}" .value="${bind.itemId}" @change="${e => {
                                            bind.itemId = e.target.value;
                                            saveBinds();
                                        }}"></dropdown-button>
                                    `
                                ) : "")}
                                ${( bind.action == Action.TRIGGER_PRESET ? (
                                    html`
                                        <dropdown-button class="Action" .options="${presets}" .value="${bind.itemId}" @change="${e => {
                                            bind.itemId = e.target.value;
                                            saveBinds();
                                        }}"></dropdown-button>
                                    `
                                ) : "")}

                                <div class="del-button">
                                    <i class="material-icons" style="opacity: 0.5;" @click="${e => {
                                        deleteBind(bind);
                                        this.update();
                                    }}">delete</i>
                                </div>
                            </div>
                        `;
                    })}

                    <button class="create-btn" @click="${() => this.createBind()}">Create Bind</button>
                </div>
            </obs-dock-tab-section>
        `;
    }
}

customElements.define('obs-midi-switcher', MidiSceneSwitcher);
