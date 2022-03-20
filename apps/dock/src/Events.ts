export default {
	emit(type: string) {
		window.dispatchEvent(new Event(type));
	},

	on(type: string, callback: (ev: Event) => void) {
		window.addEventListener(type, callback);
	},

	RTMPLowBitrateDetected: 'rtmp-low-bitrate-detected',
	RTMPConnectionRestored: 'rtmp-connection-restored',
	RTMPConnectionLost: 'rtmp-connection-lost',
	TwitchLoginSuccess: 'twitch-login-success'
};
