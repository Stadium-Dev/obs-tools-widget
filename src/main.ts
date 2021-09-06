import "./components/Timer.js";
import "./components/Settings.js";
import "./components/Overlay.js";
// import "./components/Luckybot.js";
import "./components/ScenePresets.js";
// import "./components/MidiSceneSwitcher.js";
import "./components/OverlayProperties.js";
import "./Streamlabs.js";
import "./Labels.js";

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

window.addEventListener('contextmenu', e => e.preventDefault());

const uid = localStorage.getItem('unique-client-id');
if (!uid) {
    localStorage.setItem('unique-client-id', uuidv4());
}
