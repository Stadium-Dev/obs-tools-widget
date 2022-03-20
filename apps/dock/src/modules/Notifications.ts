import { css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import DockTab from '../components/DockTab.js';
import { TwitchApi, authClientUser, checLogin } from 'twitch';
import Events from '../Events';
import UINotification from '../components/Notification';
import { TwitchChat } from 'twitch';

@customElement('obs-tools-notifications')
export default class Settings extends DockTab {
	static get styles() {
		return css`
			${super.styles}
			:host {
				position: relative;
			}
		`;
	}

	logged_in: boolean = false;

	constructor() {
		super();

		Events.on(Events.TwitchLoginSuccess, async (ev: any) => {
			this.logged_in = true;

			const token = ev.data.token;
			TwitchApi.connectToPubSub(token).then((pubsub) => {
				const user_id = '732086957';
				pubsub.listen([
					`community-points-channel-v1.${user_id}`,
					`hype-train-events-v1.${user_id}`,
					`predictions-channel-v1.${user_id}`,
					`polls.${user_id}`,
					`raid.${user_id}`,
					// `follows.${user_id}`
					// `stream-chat-room-v1.${user_id}`
					// `chatrooms-user-v1.${user_id}`
					// `leaderboard-events-v1.bits-usage-by-channel-v1-${user_id}-MONTH`
					// `leaderboard-events-v1.sub-gifts-sent-${user_id}-MONTH`
					// `user-subscribe-events-v1.${user_id}`,
					`channel-sub-gifts-v1.${user_id}`,
					`channel-cheer-events-public-v1.${user_id}`
				]);

				pubsub.onRedemtion((data) => {
					console.log(data);
				});

				pubsub.onUnhandled((data) => {
					new UINotification({ text: JSON.stringify(data.message) }).show();
				});
			});

			const chat = new TwitchChat();
			chat.connect('luckydye', token).then(() => {
				console.log('Chat logged in.');

				chat.join('nidalida');
			});

			chat.onMessage((msg) => {
				new UINotification({ text: msg.detail.text }).show();
			});

			this.requestUpdate();
		});
	}

	render() {
		return html`
			<obs-dock-tab-section section-title="Twitch Login">
				<div class="row">
					<button @click="${() => authClientUser()}">Login with Twitch</button>
					<span>Logged in: ${this.logged_in}</span>
				</div>
			</obs-dock-tab-section>
		`;
	}
}
