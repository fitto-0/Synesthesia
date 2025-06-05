const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');
let audioContext, analyser, dataArray;

// Initialize canvas size
function initCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
initCanvas();

window.addEventListener('resize', () => {
    initCanvas();
    drawVisualizer();
});

// Audio processing setup
function setupAudioContext(audioElement) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaElementSource(audioElement);

    source.connect(analyser);
    analyser.connect(audioContext.destination);
    analyser.fftSize = 256;

    dataArray = new Uint8Array(analyser.frequencyBinCount);
}

// Visualization drawing logic
function drawVisualizer() {
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00FF85';
    ctx.beginPath();

    const sliceWidth = canvas.width / dataArray.length;
    let x = 0;

    for(let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;

        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        x += sliceWidth;
    }

    ctx.stroke();
}

// Visualization render loop
function animate() {
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    analyser.getByteFrequencyData(dataArray);
    drawVisualizer();
    requestAnimationFrame(animate);
}

// File input handling
document.getElementById('file-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const audio = new Audio(e.target.result);
        setupAudioContext(audio);
        audio.play();
        animate();
    };
    reader.readAsDataURL(file);
});
