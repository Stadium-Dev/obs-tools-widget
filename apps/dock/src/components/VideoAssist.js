import { css, html } from 'lit-element';
import DockTab from './DockTab.js';

export default class VideoAssist extends DockTab {

    static get styles() {
        return css`
            ${super.styles}
            :host {
                display: grid;
                height: 100%;
                grid-template-rows: auto auto auto 1fr;
            }
            canvas, video {
                width: 100%;
                heigth: auto;
                display: block;
                max-width: 640px;
            }
            obs-dock-tab-section {
                --content-padding: 0;
            }
        `;
    }

    constructor() {
        super();

        this.histogram = document.createElement('canvas');
        this.histogram.width = 640;
        this.histogram.height = 200;
        this.histogramContext = this.histogram.getContext("2d");

        this.waveform = document.createElement('canvas');
        this.waveform.width = 640;
        this.waveform.height = 264;
        this.waveformContext = this.waveform.getContext("2d");

        this.scope = document.createElement('canvas');
        this.scope.width = 640;
        this.scope.height = 360;
        this.scopeContext = this.scope.getContext("2d");

        this.source = document.createElement('video');
        this.source.oncanplay = () => {
            this.source.play();
        };

        getMediaDevies().then(async devices => {
            const obsDevice = getInputDeviceByLabel(devices, 'OBS Virtual Camera');
            let error = false;
            const obsFeed = await navigator.mediaDevices.getUserMedia({
                video: {
                    deviceId: obsDevice.deviceId,
                }
            }).catch(err => {
                console.error('Error getting input device stream');
                error = err;
            });
            if (!error) {
                this.hidden = false;
                this.source.srcObject = obsFeed;
            }
        }).catch(err => {
            console.error('Error getting video feed.', err);
        })

        setInterval(async () => {
            if (this.active) {
                this.calculate();
            }
        }, 1000 / 12);
    }

    calculate() {
        const source = this.source;

        const canvas = document.createElement('canvas');
        canvas.width = 640 / 2;
        canvas.height = 360 / 2;
        const ctxt = canvas.getContext("2d");

        ctxt.drawImage(source, 0, 0, canvas.width, canvas.height);

        const imageD = ctxt.getImageData(0, 0, canvas.width, canvas.height);
        const imageData = imageD.data;
        const lumReg = new Array(255).fill(0);

        // waveform
        const wave = this.waveformContext;
        wave.fillStyle = "#0c0c0c";
        wave.fillRect(0, 0, wave.canvas.width, wave.canvas.height);
        const waveImgData = wave.getImageData(0, 0, wave.canvas.width, wave.canvas.height);

        wave.fillStyle = "#eee";
        wave.fillRect(0, waveImgData.height - 20, waveImgData.width, 1);

        // vector scope
        const scope = this.scopeContext;
        scope.fillStyle = "#0c0c0c";
        scope.fillRect(0, 0, scope.canvas.width, scope.canvas.height);
        const scopeImgData = scope.getImageData(0, 0, scope.canvas.width, scope.canvas.height);

        scope.fillStyle = "#eee";
        scope.fillRect(0, scopeImgData.height - 20, scopeImgData.width, 1);

        const h = waveImgData.height;
        const w = waveImgData.width;
        const sw = canvas.width;
        const sh = canvas.height;

        const scopeWidth = scopeImgData.width;
        const scopeHeight = scopeImgData.height;

        for (let p = 0; p < imageData.length; p += 4) {
            const sx = (p / 4) % sw;
            const sy = (p / 4) / sw;

            const r = imageData[p + 0];
            const g = imageData[p + 1];
            const b = imageData[p + 2];
            const a = imageData[p + 3];
            const l = lum(r, g, b);

            // histogram
            lumReg[Math.floor(l)] = lumReg[Math.floor(l)] + 1 || 1;

            // waveform
            const padding = 20;

            const columns = 3;
            const waveWidth = w / columns;

            const redy = (h - ((r / 255) * h)) * (1 - ((padding / 2) / h)) - padding;
            const greeny = (h - ((g / 255) * h)) * (1 - ((padding / 2) / h)) - padding;
            const bluey = (h - ((b / 255) * h)) * (1 - ((padding / 2) / h)) - padding;

            const dx = (sx / sw) * w;

            const redindecies = getColorIndicesForCoord(dx / columns, redy, w);
            const greenindecies = getColorIndicesForCoord(dx / columns + waveWidth, greeny, w);
            const blueindecies = getColorIndicesForCoord(dx / columns + (waveWidth * 2), bluey, w);

            const scopeBrightnes = 2;

            waveImgData.data[redindecies + 0] += r / scopeBrightnes; // r
            waveImgData.data[redindecies + 3] = 255; // a

            waveImgData.data[greenindecies + 1] += g / scopeBrightnes; // g
            waveImgData.data[greenindecies + 3] = 255; // a

            waveImgData.data[blueindecies + 2] += b / scopeBrightnes; // b
            waveImgData.data[blueindecies + 3] = 255; // a

            // vector scope
            const hsl = rgbToHsl(r, g, b);
            const hue = hsl[0];
            const sat = hsl[1];

            const center = [scopeWidth / 2, scopeHeight / 2];
            
            const angel = (hue * Math.PI * 2) * (Math.PI * 2) + (Math.PI / 2);
            const radius = Math.pow(sat, 5) * 40;

            const vx = center[0] + ((radius * Math.cos(angel)) * (scopeWidth / 2 - 20));
            const vy = center[1] + ((radius * Math.sin(angel)) * (scopeWidth / 2 - 20));

            const vectorindeciesR = getColorIndicesForCoord(vx, vy, w);
            
            scopeImgData.data[vectorindeciesR + 0] += r / scopeBrightnes; // r
            scopeImgData.data[vectorindeciesR + 1] += g / scopeBrightnes; // r
            scopeImgData.data[vectorindeciesR + 2] += b / scopeBrightnes; // r
            scopeImgData.data[vectorindeciesR + 3] = 255; // a
        }

        wave.putImageData(waveImgData, 0, 0);
        scope.putImageData(scopeImgData, 0, 0);

        // histogram
        let index = 0;
        const histo = this.histogramContext;
        histo.fillStyle = "#0c0c0c";
        histo.fillRect(0, 0, histo.canvas.width, histo.canvas.height);
        const scalar = histo.canvas.width / 255;
        const maxValue = (canvas.width * canvas.height) / 25;

        for (let reg in lumReg) {
            histo.fillStyle = "#eee";
            const v = (lumReg[reg] / maxValue) * histo.canvas.height;
            const x = (index / 255) * histo.canvas.width;
            histo.fillRect(x, histo.canvas.height, scalar + 1, -v);
            index++;
        }
    }

    //     <obs-dock-tab-section section-title="Source Feed">
    //          ${this.source}
    //     </obs-dock-tab-section>
    render() {
        return html`
            <obs-dock-tab-section section-title="Histogram">
                ${this.histogram}
            </obs-dock-tab-section>
            <obs-dock-tab-section section-title="Waveform">
                ${this.waveform}
            </obs-dock-tab-section>
            <obs-dock-tab-section section-title="Vector Scope">
                ${this.scope}
            </obs-dock-tab-section>
        `;
    }
}

customElements.define('obs-video-assist', VideoAssist);

// util functions

function rgbToHsl(r, g, b) {
    r /= 255, g /= 255, b /= 255;

    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if (max == min) {
        h = s = 0; // achromatic
    } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }

        h /= 6;
    }

    return [h, s, l];
}

function lum(r, g, b) {
    return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

function getColorIndicesForCoord(x, y, width) {
    return Math.floor(y) * (width * 4) + Math.floor(x) * 4;
}

function getInputDeviceByLabel(devices, label) {
    return devices.find(dev => dev.label == label);
}

async function getMediaDevies(deviceType = "videoinput") {
    const devices = [];
    return navigator.mediaDevices.getUserMedia({ audio: true }).then(() => {
        return navigator.mediaDevices.enumerateDevices().then(d => {
            for (let device of d) {
                if (device.kind == deviceType) {
                    devices.push(device);
                }
            }
            return devices;
        }).catch(console.error);
    }).catch(console.error);
}
