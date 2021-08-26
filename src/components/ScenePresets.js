import { css, html } from 'https://cdn.skypack.dev/lit-element@2.4.0';
import Config from '../Config.js';
import DockTab from './DockTab.js';
import Transitions from '../obs/Transitions';
import Easing from '../obs/Easing';
import OBS from '../obs/OBS';
import './FluidInput';
import './DropdownButton.js';

let presets = Config.get('layout-presets') || [];

async function getSceneSourcesStates() {
    const state = OBS.getState();
    const currentScene = state.currentScene;
    const scene = state.scenes.find(s => s.name == currentScene);
    const sources = scene.sources;
    const transforms = sources.map(({ name }) => {
        return Transitions.getState(name).then(source => {
            source.scene = scene.name;
            return source;
        });
    })
    return Promise.all(transforms);
}

async function saveNewPreset() {
    const sceneTransforms = await getSceneSourcesStates();
    sceneTransforms.unshift("Layout Preset " + (presets.length + 1));
    presets.push(sceneTransforms);
    savePresets();
}

function savePresets() {
    Config.set('layout-presets', presets);
}

function deletePreset(index) {
    presets.splice(index, 1);
    savePresets();
}

export default class ScenePresets extends DockTab {

    constructor() {
        super();

        this.easingSelect = document.createElement('dropdown-button');
        this.easingSelect.options = Object.keys(Easing).reverse().map(key => {
            return { name: key, value: key }
        });
        const savedValue = Config.get('preset-easing-curve');
        if(savedValue) {
            this.easingSelect.value = savedValue;
        }
        this.easingSelect.addEventListener('change', e => {
            Config.set('preset-easing-curve', this.easingSelect.value);
        })

        this.transitionLengthInput = document.createElement('gyro-fluid-input');
        this.transitionLengthInput.suffix = "s";
        this.transitionLengthInput.value = Config.get('preset-transition-length') || 1;
        this.transitionLengthInput.min = 0;
        this.transitionLengthInput.max = 10;
        this.transitionLengthInput.steps = 0.1;
        this.transitionLengthInput.onchange = () => {
            Config.set('preset-transition-length', this.transitionLengthInput.value);
        }
    }

    static get styles() {
        return css`
            ${super.styles}
            input, textarea {
                font-size: 16px;
                display: inline-block;
                width: 100%;
                box-sizing: border-box;
                text-align: left;
            }
            textarea {
                min-height: 100px;
                font-size: 14px;
            }
            .section {
                margin: 0 0 10px 0;
            }
            p {
                opacity: 0.75;
                margin-top: 0;
                font-size: 12px;
            }
            gyro-fluid-input {
                min-width: 130px;
            }
            dropdown-button {
                min-width: 130px;
                box-sizing: border-box;
            }
            .layout-preset-list {
                margin-bottom: 20px;
                border-radius: 4px;
                padding: 1px;
            }
            .layout-preset-item {
                display: grid;
                grid-template-columns: auto 1fr auto;
                align-items: center;
                height: 32px;
                position: relative;
            }
            .layout-preset-item:hover {
                background: rgba(255, 255, 255, 0.025);
            }
            .layout-preset-item:not(:last-child) {
                border-bottom: 1px solid #1a1a1a;
            }
            i.material-icons {
                font-size: 16px;
            }
            .item-button {
                cursor: pointer;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 35px;
                border-radius: 4px;
            }
            .item-button:hover {
                background: #363636;
                box-shadow: 1px 2px 8px rgba(0, 0, 0, 0.2);
            }
            .item-button:active {
                background: #272727;
                box-shadow: none;
            }
            .preset-name {
                opacity: 0.75;
                margin-left: 12px;
            }
            input {
                font-size: inherit;
            }
            input[disabled] {
                border: 1px solid transparent;
                background: transparent;
            }
            obs-dock-tab-section {
                display: grid;
                grid-template-rows: auto 1fr;
            }
        `;
    }

    render() {

        return html`
            <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">

            <obs-dock-tab-section section-title="Controls">
                <div class="row">
                    <label>Transition Time</label>
                    ${this.transitionLengthInput}
                </div>
                
                <div class="row">
                    <label>Transition Curve</label>
                    ${this.easingSelect}
                </div>
            </obs-dock-tab-section>

            <obs-dock-tab-section section-title="Scene Layout Presets">
                
                <div class="layout-preset-list">
                    ${presets.map((preset, i) => {
                        return html`
                            <div class="layout-preset-item">
                                <div class="item-button" @click="${async () => {
                                    const easingFunc = Easing[this.easingSelect.value.value];
                                    const length = this.transitionLengthInput.value;

                                    for(let source of preset.slice(1)) {
                                        const state = await Transitions.getState(source.name);
                                        Transitions.transitionSource(state.currentScene, source.name, state, source, easingFunc, length);
                                    }
                                }}">
                                    <i class="material-icons">play_arrow</i>
                                </div>
                                <div class="preset-name" @dblclick="${e => {
                                        const target = e.target;
                                        target.removeAttribute('disabled');
                                        target.focus();
                                        target.select();
                                    }}">
                                    <input value="${preset[0]}" disabled @blur="${e => {
                                        e.target.setAttribute('disabled', '');
                                        window.getSelection().empty();
                                    }}" @input="${e => {
                                        preset[0] = e.target.value;
                                        savePresets();
                                    }}" @keydown="${e => {
                                        if(e.key == "Enter") {
                                            e.target.setAttribute('disabled', '');
                                            window.getSelection().empty();
                                        }
                                    }}"/>
                                </div>
                                <div class="item-button" @click="${e => {
                                    deletePreset(i);
                                    this.update();
                                }}">
                                    <i class="material-icons" style="opacity: 0.5;">delete</i>
                                </div>
                            </div>
                        `;
                    })}
                </div>

                <button @click="${async () => {
                    try {
                        await saveNewPreset();
                    } catch(err) {
                        console.error(err);
                    }
                    this.update();
                }}">Create new Preset</button>
            </obs-dock-tab-section>
        `;
    }
}

customElements.define('obs-scene-presets', ScenePresets);
