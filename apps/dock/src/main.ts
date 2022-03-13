import './components';

import './modules/Timer.js';
import './modules/Settings.js';
import './modules/overlay/Overlay.js';
import './modules/overlay/OverlayProperties.js';
import './modules/Luckybot.js';
import './modules/ScenePresets.js';
import './modules/Controler.js';
import './modules/MidiSceneSwitcher.js';
import './modules/Labels.js';
import './modules/BitrateDetection';
import './services/Streamlabs.js';

function uuidv4() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		var r = (Math.random() * 16) | 0,
			v = c == 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

window.addEventListener('contextmenu', (e) => e.preventDefault());

const uid = localStorage.getItem('unique-client-id');
if (!uid) {
	localStorage.setItem('unique-client-id', uuidv4());
}
