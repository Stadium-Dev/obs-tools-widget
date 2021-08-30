import OBS from './obs/OBS';

const updateCallbacks = [];

export default class PropertySender {

    constructor() {
        this.channel = new BroadcastChannel('obs-tool-com');
        
        this.selection = [];

        OBS.on('selection', e => {
            switch (e.updateType) {
                case "SceneItemDeselected":
                    let index = 0;
                    for(let item of this.selection) {
                        if(item.itemId == e.itemId) {
                            this.selection.splice(index, 1);
                            break;
                        }
                        index++;
                    }
                    this.update();
                    break;
                case "SceneItemSelected":
                    this.selection.push({
                        itemId: e.itemId,
                        itemName: e.itemName,
                    });
                    break;
            }

            requestAnimationFrame(() => {
                for(let item of this.selection) {
                    item.name = item.itemName;
                    this.requestPropertiesBySource(item);
                }

                this.update();
            })
        })

        this.channel.onmessage = ({ data }) => {
            if(data.type == "properties") {
                this.handleProperties(data.data);
            }
        }
    }

    handleProperties(data) {
        const props = data.properties;

        for(let selected of this.selection) {
            if(selected.source == data.source) {
                selected.props = props;
            }
        }

        this.update();
    }

    requestProperties(source) {
        this.channel.postMessage({ type:'getProperties', data: { source } });
    }

    postProperty(propId, value) {
        this.channel.postMessage({ type: "property.change", data: { property: propId, value } });
    }

    requestPropertiesBySource(source) {
        OBS.getSourceSettings(source).then(settings => {
            if(settings.url) {
                this.requestProperties(settings.url);
                source.source = settings.url;
            }
        });
    }

    update() {
        for(let callback of updateCallbacks) {
            callback();
        }
    }

    onUpdate(callback) {
        updateCallbacks.push(callback);
    }

}
