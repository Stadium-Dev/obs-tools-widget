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
    presets.push(sceneTransforms);
    Config.set('layout-presets', presets);
    
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
            :host {
                display: grid;
                height: 100%;
                grid-template-rows: auto auto auto auto 1fr auto;
            }
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
        `;
    }

    render() {

        return html`
            <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">

            <obs-dock-tab-section section-title="Scene Layout Presets">

                <div class="row">
                    <label>Transition Time</label>
                    ${this.transitionLengthInput}
                </div>
                
                <div class="row">
                    <label>Transition Curve</label>
                    ${this.easingSelect}
                </div>
                <br/>

                ${presets.map((preset, i) => {
                    return html`
                        <button @click="${async () => {
                            const easingFunc = Easing[this.easingSelect.value.value];
                            const length = this.transitionLengthInput.value;

                            for(let source of preset) {
                                const state = await Transitions.getState(source.name);
                                Transitions.transitionSource(source.scene, source.name, state, source, easingFunc, length);
                            }
                        }}">Load preset ${i}</button>
                    `;
                })}

                <br/>
                <br/>

                <button @click="${async () => {
                    await saveNewPreset();
                    this.update();
                }}">Save current layout</button>
            </obs-dock-tab-section>
        `;
    }
}

customElements.define('obs-scene-presets', ScenePresets);
