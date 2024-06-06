const socket = io();

const HIDDEN_CLASS = 'hidden';
const BLOCK_DISPLAY = 'block';
const NONE_DISPLAY = 'none';

const title = document.getElementById('title');
const button = document.getElementById('button');

const addHiddenClass = element => element.classList.add(HIDDEN_CLASS);
const removeHiddenClass = element => element.classList.remove(HIDDEN_CLASS);
const setDisplay = (element, value) => element.style.display = value;

const themeSound = new Howl({
    src: ['./musics/western-theme.mp3'],
    autoplay: true,
    loop: true,
    volume: 1
});

const duelSound = new Howl({
    src: ['./musics/western-duel.mp3'],
    volume: 0.5
});

const clickedSound = new Howl({
    src: ['./musics/buttonClicked.mp3'],
    volume: 1
});

const fireSound = new Howl({
    src: ['./musics/fire.mp3'],
    volume: 2
});

const clickHandler = (sound, buttonAction, state) => () => {
    console.log(currentState, ' - ', state)
    sound.play();
    addHiddenClass(button);
    buttonAction();
};

const loadClickHandler = clickHandler(clickedSound, () => setState(states.LOADING), 'waitingView');
const loadResetHandler = clickHandler(clickedSound, resetGame, 'resetGame');
const playClickHandler = clickHandler(clickedSound, () => {
    setDisplay(button, NONE_DISPLAY);
    setDisplay(title, NONE_DISPLAY);
    socket.emit('startGame');
    setState(states.PLAYING);
}, 'loadingView2');


function isMobileDevice() {
    return (typeof window.navigator !== "undefined" && /Mobi/.test(window.navigator.userAgent));
};

if (isMobileDevice()) {
    window.location.href = '/mobile';
}

const states = {
    WAITING: 'waiting',
    LOADING: 'loading',
    PLAYING: 'playing',
    RESULT: 'result'
};

let currentState = states.WAITING;
let fireTimestamp
let players = [];
let winner = null;

const views = {
    [states.WAITING]: waitingView,
    [states.LOADING]: loadingView,
    [states.PLAYING]: playingView,
    [states.RESULT]: resultView
};

// Functions
function loadView(state) {
    views[state]();
}

function update() {
    loadView(currentState);
}

update()


function setState(state) {
    currentState = state;
    update();
}

function resetGame() {
    socket.emit('resetGame');
    players = [];
    winner = null;

    themeSound.stop();
    duelSound.stop();
    fireSound.stop();

    themeSound.play();

    setState(states.WAITING);
}


function waitingView() {
    button.style.display = 'block';
    title.style.display = 'block';
    title.textContent = `Waiting for players: ${players.length}/2`;
    button.textContent = 'Start Game';

    if (players.length === 2) { // TODO: change to 2
        button.classList.remove('hidden');
    } else {
        button.classList.add('hidden');
    }
    button.removeEventListener('click', loadResetHandler)
    button.addEventListener('click', loadClickHandler);
}

function loadingView() {
    console.log(currentState, ' - loadingView')
    title.style.display = "block"
    title.textContent = 'The first one who shoots when the "FIRE !" sound is played wins the duel !';
    themeSound.fade(1, 0, 5000);
    setTimeout(() => {
        button.textContent = 'Ready ?';
        button.classList.remove('hidden');

        button.removeEventListener('click', loadClickHandler);
        button.addEventListener('click', playClickHandler);
    }, 5000);
}

function playingView() {
    console.log(currentState, ' - playingView')
    const randomTime = Math.floor(Math.random() * 50000) + 3000;
    const randomTimeBetween3AndMax = Math.floor(Math.random() * (randomTime - 3000)) + 3000;
    const maxDuration = randomTime - randomTimeBetween3AndMax;
    console.log("maxDuration - ", maxDuration, "randomTimeBetween3AndMax - ", randomTimeBetween3AndMax, "randomTime - ", randomTime)
    socket.emit('soundByTime', maxDuration, (soundPath) => {
        const sound = new Howl({
            src: [soundPath],
            volume: 1
        });
        setTimeout(() => {
            sound.play();
        }, randomTimeBetween3AndMax);
    });


    console.log(randomTime);
    duelSound.play();
    setTimeout(() => {
        fireSound.play();
        fireTimestamp = Date.now();
    }, randomTime);
}

socket.on('updatePlayers', (playersData) => {
    console.log('updatePlayers', playersData);
    if (currentState === states.WAITING) {
        players = playersData;
        update();
    } else {
        players = playersData;
        resetGame()
    }
});

socket.on('playerShooted', (player) => {
    const playerFound = players.find(p => p.id === player.id);
    playerFound.shotTimestamp = player.shotTimestamp;
    console.log("tmstp - ", playerFound.shotTimestamp)
    if (players.every(player => player.shotTimestamp)) {
        duelSound.fade(0.5, 0, 1000);
        winner = players
            .filter(player => player.shotTimestamp > fireTimestamp)
            .sort((a, b) => a.shotTimestamp - b.shotTimestamp)[0];
        setState(states.RESULT);
    }
})

function resultView() {
    tsParticles.load({
        id: "tsparticles",
        options: {
            preset: "confetti",
        },
    });
    console.log(fireTimestamp)

    const timestampDifferences = players.map(player => ({
        id: player.id,
        username: player.username,
        shotTimestamp: player.shotTimestamp,
        fireTimestamp: fireTimestamp,
        diff: player.shotTimestamp - fireTimestamp
    }));
    console.log(timestampDifferences)

    title.style.display = 'block';
    if (winner) {
        title.textContent = `Winner: ${winner?.username} (${timestampDifferences.find(diff => diff.id === winner.id)?.diff}ms vs ${timestampDifferences.find(diff => diff.id !== winner.id)?.diff}ms)`;
    } else {
        title.textContent = `No winner ! Both players shot before the "FIRE !" sound was played.`;
    }

    socket.emit('sound', (soundPath) => {
        const sound = new Howl({
            src: [soundPath],
            volume: 1
        });
        sound.play();
    })

    // make the button appear
    button.textContent = 'Play again';
    button.classList.remove('hidden');
    button.removeEventListener('click', playClickHandler);
    button.addEventListener('click', loadResetHandler);

}



document.addEventListener('mousemove', () => {
    if (screenfull.isEnabled) {
        screenfull.request();
    }
});