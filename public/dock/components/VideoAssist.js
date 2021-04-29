import { css, html } from 'https://cdn.pika.dev/lit-element';
import DockTab from './DockTab.js';

function lum(r, g, b) {
    return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

function getInputDeviceByLabel(devices, label) {
    return devices.find(dev => dev.label == label);
}

async function getMediaDevies(deviceType = "videoinput") {
    const devices = [];
    return navigator.mediaDevices.getUserMedia({ audio: true }).then(() => {
        return navigator.mediaDevices.enumerateDevices().then(d => {
            for(let device of d) {
                if(device.kind == deviceType) {
                    devices.push(device);
                }
            }
            return devices;
        }).catch(console.error);
    }).catch(console.error);    
}

function getColorIndicesForCoord(x, y, width) {
    var red = Math.floor(y) * (width * 4) + Math.floor(x) * 4;
    return [
        red + 0, 
        red + 1, 
        red + 2, 
        red + 3
    ];
}

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

        this.source = document.createElement('video');
        this.source.oncanplay = () => {
            this.source.play();
        };

        getMediaDevies().then(async devices => {
            const obsDevice = getInputDeviceByLabel(devices, 'OBS Virtual Camera');
            const obsFeed = await navigator.mediaDevices.getUserMedia({
                video: {
                    deviceId: obsDevice.deviceId,
                }
            }).catch(err => {
                console.error('Error getting input device stream');
            });
            this.source.srcObject = obsFeed;
        })
            
        setInterval(async () => {
            if(this.clientWidth > 0) {
                this.calculate();
            }
        }, 1000 / 10);
    }

    calculate() {
        const source = this.source;

        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
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

        for(let p = 0; p < imageData.length; p += 4) {
            const sx = (p / 4) % canvas.width;
            const sy = (p / 4) / canvas.width;

            const r = imageData[p+0];
            const g = imageData[p+1];
            const b = imageData[p+2];
            const a = imageData[p+3];
            const l = lum(r, g, b);

            lumReg[Math.floor(l)] = lumReg[Math.floor(l)] + 1 || 1;

            // waveform
            const padding = 20;

            const columns = 3;
            const waveWidth = waveImgData.width / columns;

            const redy = (waveImgData.height - ((r / 255) * waveImgData.height)) * (1 - ((padding / 2) / waveImgData.height)) - padding;
            const greeny = (waveImgData.height - ((g / 255) * waveImgData.height)) * (1 - ((padding / 2) / waveImgData.height)) - padding;
            const bluey = (waveImgData.height - ((b / 255) * waveImgData.height)) * (1 - ((padding / 2) / waveImgData.height)) - padding;

            const dx = (sx / canvas.width) * waveImgData.width;

            const redindecies = getColorIndicesForCoord(dx / columns, redy, waveImgData.width);
            const greenindecies = getColorIndicesForCoord(dx / columns + waveWidth, greeny, waveImgData.width);
            const blueindecies = getColorIndicesForCoord(dx / columns + (waveWidth * 2), bluey, waveImgData.width);

            waveImgData.data[redindecies[0]] += r / 10; // r
            waveImgData.data[redindecies[1]] += 0; // g
            waveImgData.data[redindecies[2]] += 0; // b
            waveImgData.data[redindecies[3]] = 255; // a

            waveImgData.data[greenindecies[0]] += 0; // r
            waveImgData.data[greenindecies[1]] += g / 10; // g
            waveImgData.data[greenindecies[2]] += 0; // b
            waveImgData.data[greenindecies[3]] = 255; // a

            waveImgData.data[blueindecies[0]] += 0; // r
            waveImgData.data[blueindecies[1]] += 0; // g
            waveImgData.data[blueindecies[2]] += b / 10; // b
            waveImgData.data[blueindecies[3]] = 255; // a
        }

        wave.putImageData(waveImgData, 0, 0);

        // histogram
        let index = 0;
        const histo = this.histogramContext;
        histo.fillStyle = "#0c0c0c";
        histo.fillRect(0, 0, histo.canvas.width, histo.canvas.height);
        const scalar = histo.canvas.width / 255;
        const maxValue = (canvas.width * canvas.height) / 25;

        for(let reg in lumReg) {
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
            <obs-dock-tab-section section-title="Histogram RGB">
                ${this.histogram}
            </obs-dock-tab-section>
            <obs-dock-tab-section section-title="Waveform">
                ${this.waveform}
            </obs-dock-tab-section>
        `;
    }
}

customElements.define('obs-video-assist', VideoAssist);
