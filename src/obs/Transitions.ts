import OBS from "./OBS";
import Easing from './Easing';

const lerp = (x, y, a) => x * (1 - a) + y * a;

function interpolateState(a, state1, state2) {
    return {
        crop: {
            bottom: lerp(state1.crop.bottom, state2.crop.bottom, a),
            left: lerp(state1.crop.left, state2.crop.left, a),
            right: lerp(state1.crop.right, state2.crop.right, a),
            top: lerp(state1.crop.top, state2.crop.top, a)
        },
        position: {
            alignment: 5,
            x: lerp(state1.position.x, state2.position.x, a),
            y: lerp(state1.position.y, state2.position.y, a)
        },
        rotation: lerp(state1.rotation, state2.rotation, a),
        scale: {
            x: lerp(state1.scale.y, state2.scale.y, a),
            y: lerp(state1.scale.y, state2.scale.y, a)
        },
        width: lerp(state1.width, state2.width, a),
        height: lerp(state1.height, state2.height, a),
    }
}

async function transitionState(source, fromState, toState) {
    const state = await OBS.getState();
    const scenes = state.scenes;

    const oldState = fromState;
    const newState = toState;

    OBS.setSceneItemProperties(scenes[0].name, source, oldState);

    let lastTick = 0;
    let t = 0;

    const int = setInterval(() => {
        const delta = Date.now() - lastTick;

        if (lastTick && t < 1) {
            t += delta / (1000 / 1);

            const v = Easing.easeInOutQuart(t);

            const interpState = interpolateState(v, oldState, newState);
            OBS.setSceneItemProperties(scenes[0].name, source, interpState);
        } else if(lastTick) {
            clearInterval(int);
        }

        lastTick = Date.now();
    }, 1000 / 30);
}

export default class Transitions {

    static async getState(sourceName) {
        const state = await OBS.getState();
        const scenes = state.scenes;
        const props = await OBS.getSceneItemProperties({ name: sourceName });
        console.log(JSON.stringify(props));
        return props;
    }

    static async transitionSource(sourceName, fromState, toState) {
        transitionState(sourceName, fromState, toState);
    }

}