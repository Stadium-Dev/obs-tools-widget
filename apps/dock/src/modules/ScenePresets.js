import { css, html } from 'lit-element';
import Config from '../services/Config.js';
import DockTab from '../components/DockTab.js';
import { Easing, LayoutPresets } from 'obs';

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
        const presets = LayoutPresets.getPresets();

        return html`
            <link href="./material-icons.css" rel="stylesheet">

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
                                <div class="item-button" @click="${() => {
                                    LayoutPresets.playPreset(preset, this.easingSelect.value.value, this.transitionLengthInput.value);
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
                                        LayoutPresets.savePresets();
                                    }}" @keydown="${e => {
                                        if(e.key == "Enter") {
                                            e.target.setAttribute('disabled', '');
                                            window.getSelection().empty();
                                        }
                                    }}"/>
                                </div>
                                <div class="item-button" @click="${e => {
                                    LayoutPresets.deletePreset(i);
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
                        await LayoutPresets.saveNewPreset();
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
