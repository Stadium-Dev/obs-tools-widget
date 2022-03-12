import Config from '../../../apps/dock/src/services/Config.js';
import { Easing } from './Easing';
import { OBS } from './OBS';
import { Transitions } from './Transitions';

let presets = Config.get('layout-presets') || [];

export class LayoutPresets {

	static getPresets() {
		return presets;
	}

	static async playPreset(preset, easing, length) {
		const easingFunc = Easing[easing];

		for(let source of preset.slice(1)) {
			Transitions.getState(source.name).then(state => {
				Transitions.transitionSource(state.currentScene, source.name, state, source, easingFunc, length);
			}).catch(err => {
				console.log('Error transitioning source, ', err);
			});
		}
	}

	static async getSceneSourcesStates() {
		const state = OBS.getState();
		const currentScene = state.currentScene;
		const scene = state.scenes.find(s => s.name == currentScene);
		const sources = scene.sources;
		const transforms = sources.map(({ name }) => {
			return Transitions.getState(name).then(source => {
				source.scene = scene.name;
				return source;
			});
		});
		return Promise.all(transforms);
	}
    
	static async saveNewPreset() {
		const sceneTransforms = await this.getSceneSourcesStates();
		sceneTransforms.unshift('Layout Preset ' + (presets.length + 1));
		presets.push(sceneTransforms);
		this.savePresets();
	}
    
	static savePresets() {
		Config.set('layout-presets', presets);
	}
    
	static deletePreset(index) {
		presets.splice(index, 1);
		this.savePresets();
	}

}
