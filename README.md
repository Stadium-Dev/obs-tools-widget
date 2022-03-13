# Multi Tool Dock for OBS Studio

Several Tools and simple browsing and configuration of custom overlays.

## OBS Custom Dock URL:
- Github Pages (Latest): https://stadium-dev.github.io/obs-tools-widget/dock/public/

## Features:
- [x] Timer
- [x] Subathon timer tools
- [x] Video Assist features (with OBS flag "--use-fake-ui-for-media-stream")
- [x] Source Layout Presets
- [x] Overlay properties (with https://github.com/Palakis/obs-websocket/blob/4.x-current/docs/generated/protocol.md#sceneitemselected)
- [ ] Midi Scene Switching and trigger layout presets
- [ ] Scene/Source Presets like the overlay. creating sources with socket.
- [ ] Add third party overlays
- [ ] Add some default overlays
    - Last Follower etc.
    - Follower/Sub Alerts


## Custom Overlays Integration

1. Add Third Party Links of Overlay file (JS).
2. When adding the Overlay to OBS, its loaded inside a iframe of a base overlay in the same Origin of the Dock.
3. Send Properties to the Base Overlay Context, wich can propegate Data to the Iframe using postMessage.
