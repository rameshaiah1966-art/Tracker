document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const startStopButton = document.getElementById('start-stop-button');
    const frequencySlider = document.getElementById('frequency-slider');
    const frequencyDisplay = document.getElementById('frequency-display');
    const bandButtons = document.querySelectorAll('.band-button');
    const gainSlider = document.getElementById('gain-slider');
    const gainDisplay = document.getElementById('gain-display');
    const canvas = document.getElementById('waveform-canvas');
    const canvasCtx = canvas.getContext('2d');

    // --- Audio Context ---
    let audioCtx;
    let oscillator;
    let gainNode;
    let analyser;
    let isRunning = false;
    let currentBand = 'hz';
    let baseFrequency = 440;
    let dataArray; // Make dataArray accessible in a wider scope

    // --- Web Audio API Setup ---
    function setupAudio() {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        oscillator = audioCtx.createOscillator();
        gainNode = audioCtx.createGain();
        analyser = audioCtx.createAnalyser();

        oscillator.type = 'sine';
        updateFrequency();
        gainNode.gain.value = gainSlider.value;

        oscillator.connect(gainNode);
        gainNode.connect(analyser);
        analyser.connect(audioCtx.destination);

        oscillator.start();

        // Prepare for visualization
        analyser.fftSize = 2048;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        visualize();
    }

    // --- Visualization ---
    function visualize() {
        function draw() {
            if (!isRunning) {
                canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
                return;
            }

            requestAnimationFrame(draw);

            analyser.getByteTimeDomainData(dataArray);

            canvasCtx.fillStyle = '#000';
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
            canvasCtx.lineWidth = 2;
            canvasCtx.strokeStyle = '#00aaff';
            canvasCtx.beginPath();

            const sliceWidth = canvas.width * 1.0 / dataArray.length;
            let x = 0;

            for (let i = 0; i < dataArray.length; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * canvas.height / 2;

                if (i === 0) {
                    canvasCtx.moveTo(x, y);
                } else {
                    canvasCtx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            canvasCtx.lineTo(canvas.width, canvas.height / 2);
            canvasCtx.stroke();
        }

        draw();
    }

    // --- Update Functions ---
    function updateFrequency() {
        if (!audioCtx) return;

        const sliderValue = parseFloat(frequencySlider.value);
        let multiplier = 1;
        if (currentBand === 'khz') multiplier = 1000;
        if (currentBand === 'mhz') multiplier = 1000000;

        const displayFreq = sliderValue;
        baseFrequency = sliderValue;

        let actualFreq = baseFrequency * multiplier;
        if (actualFreq > audioCtx.sampleRate / 2) {
            actualFreq = audioCtx.sampleRate / 2;
        }
        if (actualFreq < 20) {
            actualFreq = 20;
        }

        if (oscillator) {
            oscillator.frequency.setValueAtTime(actualFreq, audioCtx.currentTime);
        }

        frequencyDisplay.textContent = `${displayFreq.toFixed(0)} ${currentBand.toUpperCase()}`;
    }

    function updateBand() {
        let min, max, value;
        switch(currentBand) {
            case 'khz':
                min = 1; max = 20; value = 1;
                break;
            case 'mhz':
                min = 1; max = 5000; value = 1;
                break;
            case 'hz':
            default:
                min = 20; max = 2000; value = 440;
                break;
        }
        frequencySlider.min = min;
        frequencySlider.max = max;
        frequencySlider.value = value;
        updateFrequency();
    }

    // --- Event Listeners ---
    startStopButton.addEventListener('click', () => {
        if (isRunning) {
            audioCtx.close().then(() => {
                isRunning = false;
                startStopButton.textContent = 'Start';
                startStopButton.classList.remove('running');
                // Explicitly clear canvas on stop
                canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            });
        } else {
            isRunning = true; // Set the flag *before* starting audio
            setupAudio();
            startStopButton.textContent = 'Stop';
            startStopButton.classList.add('running');
        }
    });

    frequencySlider.addEventListener('input', updateFrequency);

    gainSlider.addEventListener('input', (e) => {
        const gainValue = parseFloat(e.target.value);
        if (gainNode) {
            gainNode.gain.setValueAtTime(gainValue, audioCtx.currentTime);
        }
        gainDisplay.textContent = gainValue.toFixed(2);
    });

    bandButtons.forEach(button => {
        button.addEventListener('click', () => {
            bandButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentBand = button.dataset.band;
            updateBand();
        });
    });

    // --- Initial State ---
    function init() {
        const container = document.getElementById('app-container');
        const style = window.getComputedStyle(container);
        const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
        canvas.width = container.clientWidth - padding;
        canvas.height = 250;

        gainDisplay.textContent = gainSlider.value;
        updateBand();
    }

    init();
    window.addEventListener('resize', init);
});
