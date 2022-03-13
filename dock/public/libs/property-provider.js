let properties = {};

const source = location.href;

function handlePropertyChange(prop, value) {
	properties[prop].value = value;
	eventTarget.dispatchEvent(new PropertyEvent(prop, value));
}

function broadcastProperties() {
	toolCom.postMessage({
		type: 'properties',
		data: {
			source: source,
			properties: properties
		}
	});
}

const toolCom = new BroadcastChannel('obs-tool-com');
toolCom.onmessage = ({ data }) => {
	if (data.type == 'getProperties' && data.data.source == source) {
		broadcastProperties();
	}
	if (data.type == 'property.change') {
		handlePropertyChange(data.data.property, data.data.value);
	}
};

const eventTarget = new EventTarget();

class PropertyEvent extends Event {
	constructor(propId, value) {
		super('update');
		this.data = {
			property: propId,
			value: value
		};
	}
}

export class Provider {
	static setProperties(props) {
		properties = props;
	}

	static onPropertyUpdate(callback) {
		eventTarget.addEventListener('update', (e) => callback(e));
	}
}

export class PropertyStorage {
	constructor(propSaveId, props) {
		this.propSaveId = propSaveId;

		if (localStorage.getItem(propSaveId)) {
			const save = JSON.parse(localStorage.getItem(propSaveId));
			for (let key in props) {
				if (save[key]) {
					props[key].value = save[key].value;
				}
			}
		}

		Provider.setProperties(props);

		Provider.onPropertyUpdate((e) => {
			localStorage.setItem(propSaveId, JSON.stringify(props));
		});
	}

	getStore() {
		return JSON.parse(localStorage.getItem(this.propSaveId));
	}

	get(key) {
		const save = JSON.parse(localStorage.getItem(this.propSaveId));
		return save && save[key];
	}
}
