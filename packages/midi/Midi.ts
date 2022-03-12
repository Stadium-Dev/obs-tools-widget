const ON_VALUE = 127;
const OFF_VALUE = 0;
const MIDI_CHANNEL_VALUE = 176;

const devices = [];
const readyCallbacks = [];

let inputs = null;
let outputs = null;

async function openDevice(inputDevice, outputDevice) {
	if (inputDevice) {
		for (const [id, input] of inputs) {
			if (input.name == inputDevice) {
				console.log('Found input:', input);
				await useInput(input);
				break;
			}
		}
		if (!inputDevice) {
			console.log('Could not find input device.');
		}
	}

	if (outputDevice) {
		for (const [id, output] of outputs) {
			if (output.name == outputDevice) {
				console.log('Found output:', output);
				await useOutput(output);
				break;
			}
		}
		if (!outputDevice) {
			console.log('Could not find output device.');
		}
	}
}

async function onMIDISuccess(midiAccess) {
	inputs = midiAccess.inputs;
	outputs = midiAccess.outputs;

	devices.push(...inputs);

	for (const callback of readyCallbacks) {
		callback();
	}
}

function onMIDIFailure() {
	console.log('Could not access your MIDI devices.');
}

function useInput(input) {
	return input.open().then(() => {
		console.log('input port opened');
		input.onmidimessage = onMidiMessage;
	});
}

function useOutput(output) {
	return output.open().then(() => {
		console.log('output port opened');
		setOutput(output);
	});
}

function setOutput(output) {
	sendMidi = (data) => {
		output.send(data);
	};
	onOutputReady();
}

function sendMidi() {
	console.warn('Output not connected.');
}

function onOutputReady() {
	// turn all off first
	for (const key in MEDIA_KEYS) {
		sendMidi(new Uint8Array([176, MEDIA_KEYS[key], OFF_VALUE]));
	}
	for (const channel of CHANNELS) {
		for (const btn of channel) {
			sendMidi(new Uint8Array([176, btn, OFF_VALUE]));
		}
	}

	// animate();
}

function onMidiMessage(msg) {
	midiEventTarget.dispatchEvent(new MidiMessageEvent(msg.data));
}

class MidiMessageEvent extends Event {
	get status() {
		return this.data[0];
	}

	get cc() {
		return this.data[1];
	}

	get value() {
		return this.data[2];
	}

	constructor(midiData) {
		super('message');
		this.data = midiData;
	}
}

const midiEventTarget = new EventTarget();

const CHANNEL_ORDER = ['Knob', 'Solo', 'Mute', 'Rec', 'Fader'];

const MEDIA_KEYS = {
	back: 43,
	next: 44,
	stop: 42,
	play: 41,
	rec: 45,
	left: 61,
	right: 62,
	set: 60,
	cycle: 46,
	track_left: 58,
	track_right: 59
};

const CHANNELS = [
	// [Knob, Solo, Mute, Rec, Fader],

	// [0, 58, 46, 43, 0],
	// [0, 59, 0, 44, 0],
	// [0, 0, 60, 42, 0],
	// [0, 0, 61, 41, 0],
	// [0, 0, 61, 41, 0],
	// [0, 0, 62, 45, 0],

	[16, 32, 48, 64, 0], // Channel 0
	[17, 33, 49, 65, 1], // Channel 1
	[18, 34, 50, 66, 2], // Channel 2
	[19, 35, 51, 67, 3], // Channel 3
	[20, 36, 52, 68, 4], // Channel 4
	[21, 37, 53, 69, 5], // Channel 5
	[22, 38, 54, 70, 6], // Channel 6
	[23, 39, 55, 71, 7] // Channel 7
];

function animate() {
	console.log('animating...');

	let frame = 0;

	const draw = () => {
		setTimeout(() => draw(), 1000 / 30);

		let index = 0;

		for (const channel of CHANNELS) {
			const t = frame / 3 + index * 1.25;

			Midi.send(176, channel[1], Midi.OFF);
			Midi.send(176, channel[2], Midi.OFF);
			Midi.send(176, channel[3], Midi.OFF);

			if (Math.sin(t) > 0.75) {
				Midi.send(176, channel[1], Midi.ON);
			}
			if (Math.sin(t) < 0.75 && Math.sin(t) > 0.25) {
				Midi.send(176, channel[2], Midi.ON);
			}
			if (Math.sin(t) < 0.25) {
				Midi.send(176, channel[3], Midi.ON);
			}

			index++;
		}

		frame++;
	};

	draw();
}

export class Midi {
	static onRedy(callback) {
		readyCallbacks.push(callback);
	}

	static getDevices() {
		return devices;
	}

	static get channels() {
		return CHANNELS.map((channel, i) => {
			return {
				channel: i,
				knob: channel[0],
				solo: channel[1],
				mute: channel[2],
				rec: channel[3],
				fader: channel[4]
			};
		});
	}

	static getChannelByCC(cc) {
		for (const channel of CHANNELS) {
			if (channel.indexOf(cc) !== -1) {
				return {
					channel: CHANNELS.indexOf(channel),
					knob: channel[0],
					solo: channel[1],
					mute: channel[2],
					rec: channel[3],
					fader: channel[4]
				};
			}
		}
	}

	static get MediaKeys() {
		return MEDIA_KEYS;
	}

	static get ON() {
		return 127;
	}

	static get OFF() {
		return 0;
	}

	static open(deviceName) {
		openDevice(deviceName, deviceName);
	}

	static onMessage(callback) {
		midiEventTarget.addEventListener('message', callback);
		return function remove() {
			midiEventTarget.removeEventListener('message', callback);
		};
	}

	static send(status, cc, value) {
		sendMidi(new Uint8Array([status, cc, value]));
	}
}

navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
