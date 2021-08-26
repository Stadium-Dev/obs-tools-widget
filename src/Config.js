const eventTarget = new EventTarget();

class ConfigChangeEvent extends Event {

    constructor(key, oldValue, newValue) {
        super('change');
        this.key = key;
        this.newValue = newValue;
        this.oldValue = oldValue;
    }

}

const store = JSON.parse(localStorage.getItem('obs-tools-store') || "{}");

export default class Config {

    static on(key, callback) {
        eventTarget.addEventListener('change', e => {
            if(e.key == key) {
                callback(e);
            }
        });
    }

    static set(key, value) {
        const oldValue = this.get(key);
        store[key] = value;
        const event = new ConfigChangeEvent(key, oldValue, value);
        eventTarget.dispatchEvent(event);
        localStorage.setItem('obs-tools-store', JSON.stringify(store));
    }

    static get(key) {
        return store[key];
    }

    static serialize() {
        return localStorage.getItem('obs-tools-store');
    }

    static copySaveToClipboard() {
        navigator.clipboard.writeText(this.serialize());
    }

}
