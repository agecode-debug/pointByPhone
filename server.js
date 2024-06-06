// Modules
const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const getMP3Duration = require('get-mp3-duration')
const httpsLocalhost = require("https-localhost")();
const { uniqueNamesGenerator, names } = require('unique-names-generator');
const { Server } = require('socket.io');

let players = [];

async function startServer() {
    const certs = await httpsLocalhost.getCerts();
    const app = express();
    const server = https.createServer(certs, app);
    const io = new Server(server);

    app.use(express.static('public'));
    app.use('/fonts', express.static(__dirname + '/fonts'));
    app.use('/musics', express.static(__dirname + '/musics'));
    app.use('/pictures', express.static(__dirname + '/pictures'));

    app.get('/pc', (req, res) => {
        res.sendFile(__dirname + '/index.html');
    });

    app.get('/mobile', (req, res) => {
        console.log("mobile connected")
        res.sendFile(__dirname + '/phone.html');
    });

    io.on('connection', (socket) => {
        handleStartGame(socket, io);
        handlePlayerConnected(socket, io);
        handlePlayerDisconnected(socket, io);
        handleShoot(socket, io);
        handleResetGame(socket, io);
        handleSound(socket, io)
    });

    server.listen(443, () => {
        console.log('Server started on https://localhost:443');
    });
}

function handlePlayerConnected(socket, io) {
    socket.on('playerConnected', () => {
        const username = uniqueNamesGenerator({ dictionaries: [names] });
        players.push({
            id: socket.id,
            username: username
        });
        socket.emit('playerUsername', username);
        io.emit('updatePlayers', players);
    });
}

function handleStartGame(socket, io) {
    socket.on('startGame', () => {
        io.emit('reload');
    });
}

function handlePlayerDisconnected(socket, io) {
    socket.on('disconnect', () => {
        players = players.filter(player => player.id !== socket.id);
        io.emit('updatePlayers', players);
    });
}

function handleShoot(socket, io) {
    socket.on('shoot', () => {
        const player = players.find(player => player.id === socket.id);
        player.shotTimestamp = Date.now()
        io.emit('playerShooted', player);
    });
}
function handleResetGame(socket, io) {
    socket.on('resetGame', () => {
        io.emit('resetGame');
    });
}

function handleSound(socket, io) {
    socket.on('sound', (callback) => {
        // get random sound from ./musics/meme/all
        const soundPath = './musics/meme/all';
        const sounds = fs.readdirSync(soundPath);
        const randomSound = sounds[Math.floor(Math.random() * sounds.length)];
        callback(path.join(soundPath, randomSound));
    });
    socket.on('soundByTime', async (time, callback) => {
        // find a sound that is at max `time` long
        const soundPath = './musics/meme/all';
        const sounds = fs.readdirSync(soundPath);
        const soundDurations = await Promise.all(sounds.map(async sound => {
            const buffer = fs.readFileSync(path.join(soundPath, sound));
            const duration = getMP3Duration(buffer);
            return { sound, duration };
        }));
        const filteredSounds = soundDurations.filter(({ duration }) => duration <= time);
        const randomSound = filteredSounds[Math.floor(Math.random() * filteredSounds.length)].sound;
        const buffer = fs.readFileSync(path.join(soundPath, randomSound));
        const duration = getMP3Duration(buffer);
        console.log(duration);
        callback(path.join(soundPath, randomSound));
    });
}

startServer();