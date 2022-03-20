export class TwitchChat {
	authenticated: boolean = false;
	ws!: WebSocket;

	async connect(login: string, token: string): Promise<void> {
		return new Promise((resolve, reject) => {
			this.ws = new WebSocket('wss://irc-ws.chat.twitch.tv/');

			this.ws.onerror = (err) => {
				console.error(err);
				reject();
			};

			this.ws.onopen = () => {
				console.log('Chat Connection Open');

				if (!this.authenticated) {
					this.ws.send(`PASS oauth:${token}`);
					this.ws.send(`NICK ${login}`);
				}

				resolve();
			};

			this.ws.onmessage = (msg) => {
				const ircMessage = msg.data;
				console.log('Chat Message', ircMessage);
			};
		});
	}

	join(channel: string): void {
		this.ws.send(`JOIN #${channel}`);
	}
}
