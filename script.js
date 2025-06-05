const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');
const playBtn = document.getElementById('play-btn');
const pauseBtn = document.getElementById('pause-btn');

let audioContext, analyser, dataArray, audio;
let isPlaying = false;

function initCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
initCanvas();

window.addEventListener('resize', () => {
    initCanvas();
});

function setupAudioContext(audioElement) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaElementSource(audioElement);

    source.connect(analyser);
    analyser.connect(audioContext.destination);

    analyser.fftSize = 128;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
}

function drawBars() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    analyser.getByteFrequencyData(dataArray);

    const barWidth = canvas.width / dataArray.length;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
        const barHeight = dataArray[i];
        const r = 50 + barHeight * 2;
        const g = 255;
        const b = 133;

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.shadowBlur = 20;
        ctx.shadowColor = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
        x += barWidth;
    }
}

function animate() {
    if (!isPlaying) return;
    drawBars();
    requestAnimationFrame(animate);
}

document.getElementById('file-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        if (audio) audio.pause();

        audio = new Audio(e.target.result);
        setupAudioContext(audio);
    };
    reader.readAsDataURL(file);
});

playBtn.addEventListener('click', () => {
    if (!audio) return;
    audio.play();
    isPlaying = true;
    animate();
});

pauseBtn.addEventListener('click', () => {
    if (!audio) return;
    audio.pause();
    isPlaying = false;
});
