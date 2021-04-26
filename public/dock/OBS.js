// localStorage.debug = 'obs-websocket-js:*';

import Config from "./Config.js";

const tickrate = 1000 / 12;
const lokalStatus = {};
let sourceTypeList = [];
let sourceTypeMap = {};

window.obsState = lokalStatus;

const obs = new OBSWebSocket();
const obsWebSocketPort = Config.get('obs-websocket-port') || "localhost:4444";
const obsWebSocketPassword = Config.get('obs-websocket-password') || null;
obs.connect({
    address: obsWebSocketPort,
    password: obsWebSocketPassword
});

obs.on('ConnectionClosed', connectionClosed);
obs.on('ConnectionOpened', connectionOpende);
obs.on('AuthenticationSuccess', authSuccess);
obs.on('AuthenticationFailure', authFailed);

function log(...args) {
    console.log('[OBS]', ...args);
}

function authFailed() {
    log('Connection auth failed');
}

function authSuccess() {
    log('Connection auth success');
}

function connectionClosed() {
    log('Connection closed');
}

let statusInterval;

function connectionOpende() {
    log('Connection opened');

    const reqUpdate = () => {
        Promise.all([
            obs.send('GetStats').then(data => {
                lokalStatus.stats = data.stats;
            }),
            obs.send('GetVideoInfo').then(data => {
                lokalStatus.video = data;
            }),
            obs.send('GetStreamingStatus').then(data => {
                lokalStatus.stream = data;
            })
        ])
    }
    
    statusInterval = setInterval(reqUpdate, tickrate);
    reqUpdate();

    OBS.getSourceTypesList().then(data => {
        sourceTypeList = data.types;

        for(let type of sourceTypeList) {
            sourceTypeMap[type.typeId] = type;
        }
    })

    eventTarget.dispatchEvent(new Event('ready'));
}

const eventTarget = new EventTarget();

export default class OBS {

    static getState() {
        return lokalStatus;
    }

    static on(event, callback) {
        return obs.on(event, callback);
    }

    static onReady(callback) {
        eventTarget.addEventListener('ready', callback);
        return function remove() {
            eventTarget.removeEventListener('ready', callback);
        }
    }

    static async getScenes() {
        return obs.send('GetSceneList').then(data => data.scenes);
    }

    static async getCurrentScene() {
        return obs.send('GetCurrentScene').then(data => data.name);
    }

    static async getSourcesList() {
        return obs.send('GetSourcesList').then(data => data.sources.map(source => new Source(source)));
    }

    static async getSceneItemList(sceneName) {
        return obs.send('GetSceneItemList').then(data => {
            return data.sceneItems.map(item => new Source(item));
        });
    }

    static async getSourceTypesList() {
        return obs.send('GetSourceTypesList').then(data => data);
    }

    static async setVolume(sourceName, vol) {
        return obs.send('SetVolume', { 'source': sourceName, volume: Math.pow(vol, 2) });
    }

    static async getVolume(sourceName) {
        return obs.send('GetVolume', { 'source': sourceName }).then(data => data);
    }

    static async getAudioMonitorType(sourceName) {
        return obs.send('GetAudioMonitorType', { 'sourceName': sourceName }).then(data => data);
    }

    static async getAudioActive(sourceName) {
        return obs.send('GetAudioActive', { 'sourceName': sourceName }).then(data => data);
    }

    static setCurrentScene(sceneName) {
        return obs.send('SetCurrentScene', { 'scene-name': sceneName });
    }

}

class Source {

    constructor(sourceJson) {
        this.data = sourceJson;
        this.kind = sourceTypeMap[this.data.sourceKind || this.data.typeId];
    }

    get name() {
        return this.data.sourceName || this.data.name;
    }

    get hasAudio() {
        return this.kind.caps.hasAudio;
    }

    get hasVideo() {
        return this.kind.caps.hasVideo;
    }

}
