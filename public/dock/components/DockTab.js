import { css, html, LitElement } from 'https://cdn.pika.dev/lit-element';

export default class DockTab extends LitElement {

    static get styles() {
        return css`
            :host {
                display: block;
                box-sizing: border-box;
                overflow: auto;
                user-select: none;
            }
            input, textarea, select {
                user-select: all;
                border: 1px solid #363636;
                border-radius: 3px;
                background: hsl(0, 0%, 10%);
                outline: none;
                color: #eee;
                padding: 5px 8px;
            }
            [disabled] {
                opacity: 0.75;
            }
            button {
                border: 1px solid rgb(64 64 64);
                border-radius: 3px;
                background: #363636;
                outline: none;
                color: #eee;
                padding: 6px 8px;
                cursor: pointer;
                min-width: 40px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }
            button.secondary {
                background: #272727;
                color: #ccc;
                letter-spacing: -1px;
            }
            button:hover {
                background: rgb(60 60 60);
            }
            button:active {
                background: rgb(47 47 47);
            }
            button[disabled] {
                cursor: default;
                background: rgb(47 47 47);
            }
            button.icon-button {
                height: 29px;
                width: 29px;
                min-width: auto;
                vertical-align: bottom;
            }
            button .material-icons {
                font-size: 18px;
            }
            label {
                font-size: 14px;
                opacity: 0.75;
                color: #eee;
                margin: 0 0 5px 0;
                display: block;
            }

            ::-webkit-scrollbar {
                width: 8px;
                margin: 0 4px;
                margin-left: 2px;
            }
            ::-webkit-scrollbar-button {
                display: none;
            }
            ::-webkit-scrollbar-track-piece  {
                background: #1c1c1c;
            }
            ::-webkit-scrollbar-thumb {
                background: #333;
                border-radius: 5px;
                border: none;
            }
            ::-webkit-scrollbar-thumb:hover {
                background: #444;
            }
            .section {
                margin: 0px;
                border: 1px solid rgb(41, 41, 41);
                position: relative;
            }
            .section-content {
                padding: 10px;
            }
            .section[section-title]::before {
                content: attr(section-title);
                display: block;
                width: 100%;
                text-align: left;
                font-size: 12px;
                color: rgb(152 152 152);
                font-weight: 400;
                background: rgb(41, 41, 41);
                padding: 4px 7px 5px 7px;
                box-sizing: border-box;
            }
        `;
    }

    constructor() {
        super();
    }

    connectedCallback() {
        super.connectedCallback();
    }

    render() {
        return html`
            <div>obs-dock-tab</div>
        `;
    }
}

customElements.define('obs-dock-tab', DockTab);