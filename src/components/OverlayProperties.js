import { css, html } from 'lit-element';
import DockTab from './DockTab.js';
import OBS from '../obs/OBS';

export default class OverlayProperties extends DockTab {

    static get styles() {
        return css`
            ${super.styles}
            
        `;
    }

    constructor() {
        super();

        this.selection = [];

        OBS.on('selection', e => {
            console.log(e);
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
                    break;
                case "SceneItemSelected":
                    console.log(e);
                    this.selection.push({
                        itemId: e.itemId,
                        itemName: e.itemName,
                    });
                    this.handleSelection(this.selection);
                    break;
            }
            requestAnimationFrame(() => {
                this.update();
            })
        })
    }

    handleSelection(selection) {
        for(let item of selection) {
            console.log(item);
            OBS.getSourceSettings(item).then(settings => {
                console.log(settings);
            })

            const bc = new BroadcastChannel('obs-tool-com');
            bc.postMessage({ type:'getProperties' });

            bc.onmessage = ev => {
                console.log(ev);
                // get properties
                // render ui
                // send changes to overlay
            }
        }
    }

    render() {
        return html`
            <link href="./material-icons.css" rel="stylesheet">

            <obs-dock-tab-section section-title="Overlay Properties">
                <div>
                    ${this.selection.map(item => {
                        return html`
                            <div>
                                ${JSON.stringify(item)}
                            </div>
                        `;
                    })}
                </div>
            </obs-dock-tab-section>
        `;
    }
}

customElements.define('overlay-properties', OverlayProperties);
