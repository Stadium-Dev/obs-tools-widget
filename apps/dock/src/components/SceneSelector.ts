import DropdownButton from './DropdownButton';
import { customElement } from 'lit/decorators.js';
import { OBS } from 'obs';

@customElement('scene-selector')
export default class SceneSelector extends DropdownButton {
	getScenes() {
		const scenes = [{ name: 'None', value: 'None' }];

		const obsScenes = OBS.getState().scenes;

		if (obsScenes) {
			for (let scene of obsScenes) {
				scenes.push({ name: scene.name, value: scene.name });
			}
		}

		return scenes;
	}

	async onOpenDropdown(): Promise<void> {
		this.options = this.getScenes();
	}
}
