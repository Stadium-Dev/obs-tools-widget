let properties = {};

const source = location.origin + location.pathname;

function handlePropertyChange(prop, value) {
    properties[prop].value = value;
    eventTarget.dispatchEvent(new PropertyEvent(prop, value))
}

function broadcastProperties() {
    toolCom.postMessage({
        type: "properties",
        data: {
            source: source,
            properties: properties
        }
    });
}

const toolCom = new BroadcastChannel('obs-tool-com');
toolCom.onmessage = ({ data }) => {
    if (data.type == "getProperties" && data.data.source == source) {
        broadcastProperties();
    }
    if (data.type == "property.change") {
        handlePropertyChange(data.data.property, data.data.value);
    }
}

const eventTarget = new EventTarget();

class PropertyEvent extends Event {
    constructor(propId, value) {
        super('update');
        this.data = {
            property: propId,
            value: value,
        }
    }
}

export default class Provider {
    
    static setProperties(props) {
        properties = props;
    }

    static onPropertyUpdate(callback) {
        eventTarget.addEventListener('update', e => callback(e));
    }

}