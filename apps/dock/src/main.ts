import { State } from 'app-state';

// components
import './components';

// modules
import './modules/Timer.js';
import './modules/Settings.js';
import './modules/overlay/Overlay';
import './modules/overlay/OverlayProperties.js';
import './modules/ScenePresets.js';
import './modules/Controler.js';
import './modules/StandbyScene';
import './modules/Notifications';

// services
import './services/Streamlabs.js';

window.addEventListener('load', () => {
	// load last state
	const saveState = localStorage.getItem('app-state');
	if (saveState) {
		const state = JSON.parse(saveState);
		// dont rstore realtime bitrates
		// State.setState('rtmp-stats', state['rtmp-stats']);
		State.setState('bitrate-detection', state['bitrate-detection']);
	}
});

// uids for client targeting
function uuidv4() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		var r = (Math.random() * 16) | 0,
			v = c == 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

const uid = localStorage.getItem('unique-client-id');
if (!uid) {
	localStorage.setItem('unique-client-id', uuidv4());
}
