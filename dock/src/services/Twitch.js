const API_CLIENT_ID = 'tnjjsvaj7qyuem2as13e4gjsxwftcd';
const API_REDIRECT_URI = 'http://localhost:5500/public/dock/authenticated.html';

let api_credentials = null;

function parseHash(str) {
	const res = {};
	str
		.substring(1)
		.split('&')
		.map((item) => item.split('='))
		.forEach((item) => {
			res[item[0]] = unescape(item[1]);
		});
	return res;
}

function log(...strs) {
	console.log('[TwitchAPI]', ...strs);
}

export default class Twitch {
	static get userInfo() {
		return api_credentials.userInfo;
	}

	static get isAuthenticated() {
		return api_credentials !== null;
	}

	static async refreshAccessToken(refresh_token) {
		const url = `https://id.twitch.tv/oauth2/token?grant_type=refresh_token&refresh_token=${refresh_token}&client_id=${API_CLIENT_ID}&client_secret=${config.TWITCH_CLIENT_SECRET}`;
		return fetch(url, { method: 'POST' }).then((res) => res.json());
	}

	static async revokeAccessToken(access_token) {
		const url = `https://id.twitch.tv/oauth2/revoke?client_id=${API_CLIENT_ID}&token=${access_token}`;
		return fetch(url, { method: 'POST' }).then((res) => res.json());
	}

	static requestAccessToken(code) {
		const url =
			`https://id.twitch.tv/oauth2/token` +
			`?client_id=${API_CLIENT_ID}` +
			`&client_secret=${config.TWITCH_CLIENT_SECRET}` +
			`&code=${code}` +
			`&grant_type=authorization_code` +
			`&redirect_uri=${API_REDIRECT_URI}`;

		return fetch(url, { method: 'POST' })
			.then((res) => res.json())
			.then((json) => {
				if (json.status) {
					throw new Error(json.message);
				}
				return json;
			})
			.catch((err) => {
				console.error('Error requesting twitch access token');
			});
	}

	static async getUserInfo() {
		const url = `https://id.twitch.tv/oauth2/userinfo`;

		if (api_credentials && api_credentials.access_token) {
			return fetch(url, {
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${api_credentials.access_token}`
				}
			}).then((res) => res.json());
		}
		return null;
	}

	static loadAuthentication() {
		const stored = localStorage.getItem('twitch_auth');
		if (stored) {
			const creds = JSON.parse(stored);
			api_credentials = creds;
			return true;
		}
		return false;
	}

	static async authenticate() {
		return new Promise((resolve, reject) => {
			log('authorizing...');

			const api_scopes = [
				'openid',
				'bits:read',
				'channel:manage:broadcast',
				'channel:read:hype_train',
				'channel:read:polls',
				'channel:read:predictions',
				'channel:read:redemptions',
				'channel:read:subscriptions',
				'chat:read'
			];
			const claims = {
				id_token: {
					picture: null,
					preferred_username: null
				}
			};
			const url = `https://id.twitch.tv/oauth2/authorize?client_id=${API_CLIENT_ID}&redirect_uri=${API_REDIRECT_URI}&response_type=token+id_token&scope=${api_scopes.join(
				' '
			)}&claims=${JSON.stringify(claims)}`;

			const authWin = window.open(url);

			const int = setInterval(async () => {
				console.log('auth loaded');
				const params = parseHash(authWin.location.hash);
				if (params.access_token) {
					api_credentials = params;

					const userInfo = await Twitch.getUserInfo();
					api_credentials.userInfo = userInfo;

					localStorage.setItem('twitch_auth', JSON.stringify(api_credentials));

					authWin.close();
					resolve(params);
					clearInterval(int);
				}
			}, 200);
		});
	}

	static async fetch(endpoint, args, access_token) {
		// form args object to url search string
		const searchParams = Object.keys(args).map((key) => `${key}=${args[key]}`);

		// fetch endpoint
		return fetch(`https://api.twitch.tv/helix/${endpoint}?${searchParams.join('&')}`, {
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${access_token}`,
				'Client-ID': API_CLIENT_ID
			}
		})
			.then(async (res) => {
				const json = await res.json();
				if (json.data) {
					json.data.pagination = json.pagination;
				}
				return json.data;
			})
			.catch((err) => {
				throw err;
			});
	}

	static fetchClips(options) {
		return Twitch.fetch('clips', options, api_credentials.access_token);
	}

	static fetchVideos(options) {
		return Twitch.fetch('videos', options, api_credentials.access_token);
	}

	static fetchStreams(options) {
		return Twitch.fetch('streams', options, api_credentials.access_token);
	}

	static fetchUsers(options) {
		return Twitch.fetch('users', options, api_credentials.access_token);
	}

	static async getUserByLogin(login) {
		if (!api_credentials) {
			throw new Error('Not authenticated');
		}
		const users = await Twitch.fetch('users', { login }, api_credentials.access_token);
		return users[0];
	}

	static async getStreamByLogin(login) {
		if (!api_credentials) {
			throw new Error('Not authenticated');
		}
		const users = await Twitch.fetch('streams', { user_login: login }, api_credentials.access_token);
		return users[0];
	}

	static async getUserFollowers(userName) {
		const userInfo = await getUserByLogin(userName);

		const user = userInfo.data[0];

		async function getFollowerChunk(cursor) {
			const opts = {
				from_id: user.id,
				first: 100
			};

			if (cursor) {
				opts.after = cursor;
			}

			return await Twitch.fetch('users/follows', opts, api_credentials.access_token);
		}

		const followersTotal = [];

		async function getAllFollowers(cursor) {
			const followers = await getFollowerChunk(cursor);

			followersTotal.push(...followers.data);

			if (followers.pagination.cursor) {
				await getAllFollowers(followers.pagination.cursor);
			}
		}

		await getAllFollowers();

		log(`${user.display_name} is following (${followersTotal.length}):`);

		for (let user of followersTotal) {
			log(`${user.followed_at}, ${user.to_name}`);
		}
	}

	static async getChannelFollowers(channel) {
		const userInfo = await getUserByLogin(channel);

		const user = userInfo.data[0];

		async function getFollowerChunk(cursor) {
			const opts = {
				to_id: user.id,
				first: 100
			};

			if (cursor) {
				opts.after = cursor;
			}

			return await Twitch.fetch('users/follows', opts, api_credentials.access_token);
		}

		const followersTotal = [];

		async function getAllFollowers(cursor) {
			const followers = await getFollowerChunk(cursor);

			log(`${followersTotal.length} / ${followers.total}`);

			followersTotal.push(...followers.data);

			if (followers.pagination.cursor) {
				await getAllFollowers(followers.pagination.cursor);
			}
		}

		await getAllFollowers();

		return followersTotal;
	}

	static async getChannelViewerOverlap(channel1, channel2) {
		log('Getting channel followers...');

		const followers1 = await getChannelFollowers(channel1);
		const followers2 = await getChannelFollowers(channel2);

		const hashmap = {};
		let overlap = 0;

		for (let follower of followers1) {
			hashmap[follower.from_id] = 0;
		}
		for (let follower of followers2) {
			if (hashmap[follower.from_id] != null) {
				overlap++;
				hashmap[follower.from_id] = 1;
			}
			hashmap[follower.from_id] = 0;
		}

		log(
			`${overlap} of ${channel1}(${followers1.length}) [${((overlap / followers1.length) * 100).toFixed(
				3
			)}%] are also in ${channel2}`
		);
	}

	static async getChannelAllFollowers(channel) {
		log('Getting channel followers...');

		const followers = await getChannelFollowers(channel);

		for (let user of followers) {
			log(`${user.followed_at}, ${user.from_name}`);
		}
	}
}
