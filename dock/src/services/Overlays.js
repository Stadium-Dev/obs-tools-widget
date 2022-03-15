const overlays = [
	{
		name: 'Timer Overlay',
		url: '/apps/overlays/public/timer.html'
	},
	{
		name: 'Subathon Overlay',
		url: '/apps/overlays/public/subathon.html'
	},
	{
		name: 'Labels Overlay',
		url: '/apps/overlays/public/labels.html'
	},
	{
		name: 'Title',
		url: '/apps/overlays/public/title.html'
	}
];

let customOverlays = [];

function save() {
	localStorage.setItem('overlay-store', JSON.stringify(customOverlays));
}

function load() {
	return JSON.parse(localStorage.getItem('overlay-store'));
}

export default class Overlays {
	static getOverlayList() {
		const saved = load();
		if (saved) {
			customOverlays = saved;
		}
		return [...overlays, ...customOverlays];
	}

	static addOverlay(name, url) {
		customOverlays.push({ name, url });
		save();
	}

	static removeOverlay(name) {
		let i = 0;
		for (let overlay of customOverlays) {
			if (overlay.name == name) {
				customOverlays.splice(i, 1);
				break;
			}
			i++;
		}

		save();
	}
}
