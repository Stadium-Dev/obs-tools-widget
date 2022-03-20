// localStorage.debug = 'obs-websocket-js:*';
import OBSWebSocket from 'obs-websocket-js';

const lokalStatus = {
	currentScene: ''
};

globalThis.lokalStatus = lokalStatus;

const obs = new OBSWebSocket();

obs.connect('ws://127.0.0.1:4455').then((ev) => {
	connectionOpende(ev);
});

function log(...args) {
	console.log('[OBS]', ...args);
}

function connectionClosed(aa) {
	log('Connection closed');
}

async function connectionOpende(ev) {
	log('Connection opened');

	OBS.emit('ready');

	obs.on('ConnectionClosed', connectionClosed);

	obs.on('CurrentProgramSceneChanged', (data) => {
		lokalStatus.currentScene = data.sceneName;
	});

	obs.call('GetCurrentProgramScene').then((data) => {
		lokalStatus.currentScene = data.currentProgramSceneName;
	});
}

const listeners = {};

export class OBS {
	static getState() {
		return lokalStatus;
	}

	static setCurrentScene(scaneName) {
		return obs.call('SetCurrentProgramScene', {
			sceneName: scaneName
		});
	}

	static getCurrentScene() {
		return lokalStatus.currentScene;
	}

	static async getScenes() {
		return obs.call('GetSceneList').then((data) => {
			return data.scenes;
		});
	}

	static async getStreamService() {
		return obs.call('GetStreamServiceSettings').then((data) => data);
	}

	static on(event, callback) {
		listeners[event] = listeners[event] || [];
		const listenrIndex = listeners[event].push(callback);
		const cancel = () => {
			listeners[event].splice(listenrIndex, 1);
		};
		return cancel;
	}

	static emit(event, data?) {
		listeners[event] = listeners[event] || [];
		for (const callback of listeners[event]) {
			callback(data);
		}
	}
}
