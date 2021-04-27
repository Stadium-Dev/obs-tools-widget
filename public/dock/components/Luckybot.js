import { css, html } from 'https://cdn.pika.dev/lit-element';
import Config from '../Config.js';
import DockTab from './DockTab.js';

const ttsBc = new BroadcastChannel('1b-tts-overlay-com');

export default class Luckybot extends DockTab {

    static get styles() {
        return css`
            ${super.styles}
            iframe {
                border: none;
            }
        `;
    }

    render() {
        return html`
            <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
            
            <obs-dock-tab-section section-title="TTS">
                <iframe src="https://1uckybot.luckydye.de/overlay/control-panel.html" />
            </obs-dock-tab-section>
        `;
    }
}

customElements.define('obs-1uckybot-tab', Luckybot);
