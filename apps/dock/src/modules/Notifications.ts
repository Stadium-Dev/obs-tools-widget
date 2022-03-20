import { css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import DockTab from '../components/DockTab.js';
import { TwitchApi, authClientUser, checLogin } from 'twitch';
import Events from '../Events';
import { OBS } from 'obs';

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
				const user_id = '47736855';
				pubsub.listen([
					`community-points-channel-v1.${user_id}`,
					`hype-train-events-v1.${user_id}`,
					`predictions-channel-v1.${user_id}`,
					`chat_moderator_actions.${user_id}.${user_id}`,
					`polls.${user_id}`,
					`raid.${user_id}`
				]);

				pubsub.onRedemtion((data) => {
					console.log(data);
				});
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
