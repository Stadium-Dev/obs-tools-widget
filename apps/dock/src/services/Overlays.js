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

let cusromOverlays = [];

function save() {
	localStorage.setItem('overlay-store', JSON.stringify(cusromOverlays));
}

function load() {
	return JSON.parse(localStorage.getItem('overlay-store'));
}

export default class Overlays {
	static getOverlayList() {
		cusromOverlays = load();
		return [...overlays, ...cusromOverlays];
	}

	static addOverlay(name, url) {
		cusromOverlays.push({ name, url });
		save();
	}

	static removeOverlay(name) {
		let i = 0;
		for (let overlay of cusromOverlays) {
			if (overlay.name == name) {
				cusromOverlays.splice(i, 1);
				break;
			}
			i++;
		}

		save();
	}
}
