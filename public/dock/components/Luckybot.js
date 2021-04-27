import { css, html } from 'https://cdn.pika.dev/lit-element';
import Config from '../Config.js';
import DockTab from './DockTab.js';

const ttsBc = new BroadcastChannel('1b-tts-overlay-com');

export default class Luckybot extends DockTab {

    static get styles() {
        return css`
            ${super.styles}
        `;
    }

    skipTTS() {
        ttsBc.postMessage({ 
            type: 'tts', 
            skip: true,
        });
    }

    render() {
        return html`
            <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
            
            <obs-dock-tab-section section-title="TTS">
                <button @click="${e => this.skipTTS()}">Skip Current TTS</button>
            </obs-dock-tab-section>
        `;
    }
}

customElements.define('obs-1uckybot-tab', Luckybot);
