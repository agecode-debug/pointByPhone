const socket = io();
const usernameText = document.getElementById('usernameText');

let canShoot = false;
let username
let shooting = false;

// Sounds
const shootSound = new Howl({
    src: ['./musics/shoot.mp3'],
    volume: 1
});

const reloadSound = new Howl({
    src: ['./musics/reload.mp3'],
    volume: 1,
    onend: () => {
        canShoot = true;
        console.log(canShoot, " | canShoot")
    }
});

socket.on('playerUsername', (playerUsername) => {
    username = playerUsername;
    update();
});


socket.on('resetGame', () => {
    canShoot = false;
});

socket.on('reload', () => {
    console.log('reload')
    reloadSound.play();
})

// Event listeners
window.addEventListener('devicemotion', handleDeviceMotion);
window.addEventListener('deviceorientation', handleDeviceOrientation);
document.addEventListener('mousemove', handleMouseMove);
window.addEventListener('resize', update);

window.screen.orientation.addEventListener('change', update);

function init() {
    if (window.screen.orientation.type.startsWith('landscape')) {
        socket.emit('playerConnected');
    } else {
        socket.emit('playerDisconnected');
        usernameText.textContent = "Please switch to landscape mode.";
        return;
    }
}

socket.emit('playerConnected');

// Functions
function update() {
    if (!window.screen.orientation.type.startsWith('landscape')) {
        usernameText.textContent = "Please switch to landscape mode.";
        return;
    }
    usernameText.textContent = username;
}

function handleDeviceMotion(event) {
    console.log(canShoot, shooting, " | shooting")
    if (canShoot) {
        const acceleration = event.acceleration;
        const accelerationThreshold = 15; // Ajuster selon les tests

        if (acceleration.x > accelerationThreshold || acceleration.y > accelerationThreshold || acceleration.z > accelerationThreshold) {
            shooting = true;
            detectShot();
        }
    }
}

function handleDeviceOrientation(event) {
    if (canShoot) {
        const alpha = event.alpha;
        const beta = event.beta;
        const gamma = event.gamma;

        const rotationThreshold = 20; // Ajuster selon les tests

        if (shooting && (Math.abs(beta) > rotationThreshold || Math.abs(gamma) > rotationThreshold)) {
            // Envoyer l'événement de tir au serveur
            // socket.emit('shoot', { timestamp: Date.now() });
            socket.emit('shoot');
            shootSound.play();
            shooting = false;
            canShoot = false;
        }
    }
}

function handleMouseMove() {
    if (screenfull.isEnabled) {
        screenfull.request();
    }
}

function detectShot() {
    if (!shooting) return;
    // La détection de mouvement a commencé
    setTimeout(() => {
        shooting = false; // Réinitialiser l'état après un court laps de temps
    }, 500);
}
update();