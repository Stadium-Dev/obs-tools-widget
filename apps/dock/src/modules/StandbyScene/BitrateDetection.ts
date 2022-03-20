import Config from '../../services/Config.js';
import { State } from 'app-state';
import { OBS } from 'obs';
import Events from '../../Events';

(async () => {
	let previousScene: string | null = null;

	setInterval(async () => {
		const statUrl = State.getState('bitrate-detection')['nginx-stat-url'];

		if (statUrl) {
			const data = await fetch(statUrl).then((res) => res.text());

			const parser = new DOMParser();
			const xmlDoc = parser.parseFromString(data, 'text/xml');

			const apps = xmlDoc.querySelectorAll('application');

			const live = [...apps].find((app) => app.querySelector('name')?.textContent == 'stream');
			const streams = live?.querySelectorAll('live stream');

			const bitrates = [];

			if (streams) {
				for (let stream of streams) {
					const name = stream.querySelector('name');
					if (name) {
						const bw_video = stream.querySelector('bw_video')?.textContent;
						if (bw_video) {
							const video_bitrate = Math.floor(+bw_video / 1024);

							if (video_bitrate < 500) {
								Events.emit(Events.RTMPLowBitrateDetected);
								const standByScene = State.getState('bitrate-detection')['standby-scene'];
								if (standByScene) {
									previousScene = OBS.getState().currentScene;
									OBS.setCurrentScene(standByScene.name);
								}
							} else {
								Events.emit(Events.RTMPConnectionRestored);
								if (previousScene) {
									OBS.setCurrentScene(previousScene);
								}
							}

							if (video_bitrate < 10) {
								Events.emit(Events.RTMPConnectionLost);
							}

							bitrates.push({ name: name.textContent, bitrate: video_bitrate });
						}
					}
				}
			}

			State.setState('rtmp-stats', { bitrate: bitrates });
		}
	}, 1000);
})();
