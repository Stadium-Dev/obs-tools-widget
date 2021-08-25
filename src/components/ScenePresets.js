import { css, html } from 'https://cdn.skypack.dev/lit-element@2.4.0';
import Config from '../Config.js';
import DockTab from './DockTab.js';
import Transitions from '../obs/Transitions';
import OBS from '../obs/OBS';

let presets = [];

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

export default class ScenePresets extends DockTab {

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
        `;
    }

    render() {

        return html`
            <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">

            <obs-dock-tab-section section-title="Scene Layout Presets">
                Button to save a Scene Preset. 
                And Nameable List of presets to switch to that layout.

                <br/>
                <label>Transition Time:</label>
                <input value="1" type="number" />
                <br/>
                <label>Transition Curve:</label>
                <select>
                    <option>Ease</option>
                </select>
                <br/>

                ${presets.map((preset, i) => {
                    return html`
                        <button @click="${async () => {
                            for(let source of preset) {
                                const state = await Transitions.getState(source.name);
                                Transitions.transitionSource(source.scene, source.name, state, source);
                            }
                        }}">Load preset ${i}</button>
                    `;
                })}

                <br/>
                <br/>

                <button @click="${async () => {
                    const sceneTransforms = await getSceneSourcesStates();
                    presets.push(sceneTransforms);
                    this.update();
                }}">Save current layout</button>
            </obs-dock-tab-section>
        `;
    }
}

customElements.define('obs-scene-presets', ScenePresets);
