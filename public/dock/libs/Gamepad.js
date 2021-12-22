
function getGamepads() {
    return navigator.getGamepads();
}

class GamepadButtonDownEvent extends GamepadEvent {
    constructor(gamepad, button) {
        super("buttondown", { gamepad });

        this.button = button;
    }
}

class GamepadButtonUpEvent extends GamepadEvent {
    constructor(gamepad, button) {
        super("buttonup", { gamepad });
        
        this.button = button;
    }
}

function init() {

    window.addEventListener("gamepadconnected", e => {
        const pad = e.gamepad;
        poll(pad);
    });

    let lastState = [];

    const poll = (gamepad) => {
        const buttons = gamepad.buttons;

        const currentState = {
            buttons: buttons
        }

        if(lastState[gamepad.index]) {
            for(let i = 0; i < currentState.buttons.length; i++) {
                const btn = currentState.buttons[i];
                btn.id = i;
                
                const value = btn.value;
                const lastValue = lastState[gamepad.index].buttons[i].value;
                
                if(value !== lastValue) {
                    if(value > 0) {
                        window.dispatchEvent(new GamepadButtonDownEvent(gamepad, btn));
                    } else {
                        window.dispatchEvent(new GamepadButtonUpEvent(gamepad, btn));
                    }
                }
            }
        }

        lastState[gamepad.index] = currentState;
    };

    const pollLoop = () => {
        for (let gamepad of getGamepads()) {
            if(gamepad != null) {
                poll(gamepad);
            }
        }
        requestAnimationFrame(pollLoop);
    };

    pollLoop();
}

init();
