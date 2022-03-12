### Overlay Properties Example for custom overlays

```typescript
import { Provider, PropertyStorage } from 'https://obs-tools-widget.web.app/overlay/libs/property-provider.js';

// declare properites in this format

/**
 *  Currently available types:
 *  - string
 *  - color
 *  - boolean
 *  - number
 * */

const props = {
    prefix: {
        name: "Prefix",
        type: "string",
        default: "T-",
        value: "T-",
    },
    textColor: {
        name: "Text Color",
        type: "color",
        default: "#eee",
        value: "#eee",
    },
    showSubs: {
        name: "Show sub count",
        type: "boolean",
        default: 0,
        value: 0,
    },
    showDonos: {
        name: "Show donated amount",
        type: "boolean",
        default: 0,
        value: 0,
    },
}

// Useing the PropertyStorage is optional. You can save changes to properties anywhere else.
const propSaveId = "subathon-overlay-properties-v1";
const store = new PropertyStorage(propSaveId, props);

// give a callback to the "onPropertyUpdate" function of the Provider and update any UI using the properties.
Provider.onPropertyUpdate(e => {
    // update ui
    updateUI();
})

// just updates element of the overlays to the new property changes
function updateUI() {
    const ele = document.querySelector('obs-overlay-hud');
    ele.style.setProperty('--text-color', props.textColor.value);
    ele.style.setProperty('--display-left', props.showSubs.value === 1 ? "block" : "none");
    ele.style.setProperty('--display-right', props.showDonos.value === 1 ? "block" : "none");
    ele.prefixString = props.prefix.value;
    ele.update();
}

// update initial overlay state from saved properties
updateUI();
```

With this any Browser Source will be able to talk to my OBS Tool Dock and you will be able to change the declared properties outside of the browser source in OBS.
