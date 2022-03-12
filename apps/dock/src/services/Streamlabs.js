import Config from "./Config.js";

export default class Streamlabs {

    static get connected() {
        return this.socket ? this.socket.connected : false;
    }

    static on(event, callback) {
        const listeners = this.listeners;
        listeners[event] = listeners[event] ? listeners[event] : [];
        listeners[event].push(callback);
    }

    static emit(event, msg) {
        const listeners = this.listeners;
        if(listeners[event]) {
            for(let callback of listeners[event]) callback(msg);
        }
    }

    static disconnect() {
        this.socket.disconnect();
    }

    static async connect() {
        return new Promise(async (resolve, reject) => {
            if(!this.socket) {
                const access_token = Config.get('streamlabs-websocket-token');
                const service = `https://sockets.streamlabs.com?token=${access_token}`;

                this.socket = io(service, { transports: ['websocket'] });
    
                this.socket.on('event', (event) => {
                    const events = ['raid', 'follow', 'donation', 'host', 'subscription', 'resub'];

                    if(events.includes(event.type)) {
                        for(let message of event.message) {
                            message.type = event.type;
                            this.emit(event.type, message);
                        }
                    }
                });

                this.socket.on('connect', () => {
                    console.log('connected');
                    resolve(this.connected);
                });

            } else {
                reject();
            }
        }).catch(err => {
            if(err) console.error(err);
        })
    }

}

Config.on('streamlabs-websocket-token', e => {
    console.log(e);
    Streamlabs.connect();
});

Streamlabs.connect();

Streamlabs.socket = null;
Streamlabs.listeners = {};
