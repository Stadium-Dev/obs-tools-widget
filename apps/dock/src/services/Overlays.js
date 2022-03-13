const overlays = [
	{
		name: 'Timer Overlay',
		url: './overlay.html?layer-name=Timer%20Overlay&layer-width=1920&layer-height=1080#/apps/overlays/public/timer.html'
	},
	{
		name: 'Subathon Overlay',
		url: './overlay.html?layer-name=Subathon%20Overlay&layer-width=1920&layer-height=1080#/apps/overlays/public/subathon.html'
	},
	{
		name: 'Labels Overlay',
		url: './overlay.html?layer-name=Labels%20Overlay&layer-width=1920&layer-height=1080#/apps/overlays/public/labels.html'
	},
	{
		name: 'Title',
		url: './overlay.html?layer-name=Title%20Overlay&layer-width=1920&layer-height=1080#/apps/overlays/public/title.html'
	}
];

export default class Overlays {
	static getOverlayList() {
		return overlays;
	}

	static addOverlay(name, url) {
		overlays.push({ name, url });
	}

	static removeOverlay(name) {
		let i = 0;
		for (let overlay of overlays) {
			if (overlay.name == name) {
				overlays.splice(i, 1);
				break;
			}
			i++;
		}
	}
}
