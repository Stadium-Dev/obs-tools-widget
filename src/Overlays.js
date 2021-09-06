const overlays = [
    { name: "Timer Overlay", url: "../overlay/timer.html?layer-name=Timer%20Overlay&layer-width=1920&layer-height=1080" },
    { name: "Subathon Overlay", url: "../overlay/subathon.html?layer-name=Subathon%20Overlay&layer-width=1920&layer-height=1080" },
    { name: "Labels Overlay", url: "../overlay/labels.html?layer-name=Labels%20Overlay&layer-width=1920&layer-height=1080" }
];

export default class Overlays {

    static getOverlayList() {
        return overlays;
    }

    static addOverlay(name, url) {
        overlays.push({ name, url });
    }

    static removeOverlay(name) {
        let i = 0;
        for(let overlay of overlays) {
            if(overlay.name == name) {
                overlays.splice(i, 1);
                break;
            }
            i++;
        }
    }

}
