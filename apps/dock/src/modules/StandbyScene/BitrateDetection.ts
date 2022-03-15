import Config from '../../services/Config.js';
import { State } from 'app-state';
import { OBS } from 'obs';

(async () => {
	setInterval(async () => {
		const statUrl = Config.get('obs-bitrate-detection-stat-url');

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
								console.log('OhOh');

								const standByScene = State.getState('bitrate-detection')['standby-scene'];
								if (standByScene) {
									OBS.setCurrentScene(standByScene.name);
								}
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
