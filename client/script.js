document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const startStopButton = document.getElementById('start-stop-button');
    const frequencyKnob = document.getElementById('frequency-knob');
    const frequencyDisplay = document.getElementById('frequency-display');
    const bandButtons = document.querySelectorAll('.band-button');
    const gainSlider = document.getElementById('gain-slider');
    const gainDisplay = document.getElementById('gain-display');
    const waveformCanvas = document.getElementById('waveform-canvas');
    const spectrumCanvas = document.getElementById('spectrum-canvas');
    const statusMessage = document.getElementById('status-message');
    const waveformCtx = waveformCanvas.getContext('2d');
    const spectrumCtx = spectrumCanvas.getContext('2d');

    // --- Audio State ---
    let audioCtx;
    let micSource;
    let filterNode;
    let gainNode;
    let analyserNode;
    let isRunning = false;
    let animationFrameId;
    let currentBand = 'hz';

    // --- Visualization ---
    function visualize() {
        const waveformBufferLength = analyserNode.fftSize;
        const waveformDataArray = new Uint8Array(waveformBufferLength);
        const spectrumBufferLength = analyserNode.frequencyBinCount;
        const spectrumDataArray = new Uint8Array(spectrumBufferLength);

        function draw() {
            if (!isRunning) return;
            animationFrameId = requestAnimationFrame(draw);
            analyserNode.getByteTimeDomainData(waveformDataArray);
            waveformCtx.fillStyle = '#000';
            waveformCtx.fillRect(0, 0, waveformCanvas.width, waveformCanvas.height);
            waveformCtx.lineWidth = 2;
            waveformCtx.strokeStyle = '#00aaff';
            waveformCtx.beginPath();
            let sliceWidth = waveformCanvas.width * 1.0 / waveformBufferLength;
            let x = 0;
            for (let i = 0; i < waveformBufferLength; i++) {
                const v = waveformDataArray[i] / 128.0;
                const y = v * waveformCanvas.height / 2;
                if (i === 0) waveformCtx.moveTo(x, y);
                else waveformCtx.lineTo(x, y);
                x += sliceWidth;
            }
            waveformCtx.lineTo(waveformCanvas.width, waveformCanvas.height / 2);
            waveformCtx.stroke();

            analyserNode.getByteFrequencyData(spectrumDataArray);
            spectrumCtx.fillStyle = '#000';
            spectrumCtx.fillRect(0, 0, spectrumCanvas.width, spectrumCanvas.height);
            const barWidth = (spectrumCanvas.width / spectrumBufferLength) * 2.5;
            let barHeight;
            x = 0;
            for (let i = 0; i < spectrumBufferLength; i++) {
                barHeight = spectrumDataArray[i];
                const percent = barHeight / 255;
                const height = spectrumCanvas.height * percent;
                const y = spectrumCanvas.height - height;
                spectrumCtx.fillStyle = `rgb(0, ${Math.floor(255 - percent * 100)}, ${Math.floor(255 * percent)})`;
                spectrumCtx.fillRect(x, y, barWidth, height);
                x += barWidth + 1;
            }
        }
        draw();
    }

    // --- Update Functions ---
    function updateFrequency() {
        if (!audioCtx) return;
        const knobValue = parseFloat(frequencyKnob.value);
        let multiplier = 1;
        let displayUnit = 'Hz';

        switch(currentBand) {
            case 'khz':
                multiplier = 1000;
                displayUnit = 'kHz';
                break;
            case 'mhz':
                multiplier = 1000000;
                displayUnit = 'MHz';
                break;
        }

        const targetFrequency = knobValue * multiplier;

        if (filterNode) {
            // Clamp frequency to the valid range for an AudioContext
            const maxFreq = audioCtx.sampleRate / 2;
            const clampedFreq = Math.max(20, Math.min(targetFrequency, maxFreq));
            filterNode.frequency.setValueAtTime(clampedFreq, audioCtx.currentTime);
        }

        frequencyDisplay.textContent = `${knobValue.toFixed(0)} ${displayUnit}`;
    }

    function updateBand() {
        let min, max, value;
        switch(currentBand) {
            case 'khz':
                min = 1; max = 20; value = 1; // 1-20 kHz
                break;
            case 'mhz':
                min = 1; max = 5000; value = 1; // 1-5000 MHz (conceptual)
                break;
            case 'hz':
            default:
                min = 20; max = 2000; value = 440; // 20-2000 Hz
                break;
        }
        frequencyKnob.min = min;
        frequencyKnob.max = max;
        frequencyKnob.value = value;

        // The `input-knobs` library needs a manual refresh after attribute changes
        if(frequencyKnob.refresh) {
            frequencyKnob.refresh();
        }

        updateFrequency();
    }

    // --- Audio Control ---
    async function startAudio() {
        // ... (startAudio function remains the same as before)
         if (isRunning) return;
        try {
            statusMessage.textContent = "Requesting microphone permission...";
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            micSource = audioCtx.createMediaStreamSource(stream);

            filterNode = audioCtx.createBiquadFilter();
            filterNode.type = 'peaking';
            filterNode.gain.value = parseFloat(gainSlider.value);
            filterNode.Q.value = 10;

            gainNode = audioCtx.createGain();
            gainNode.gain.value = 1.0;

            analyserNode = audioCtx.createAnalyser();
            analyserNode.fftSize = 2048;

            micSource.connect(filterNode);
            filterNode.connect(gainNode);
            gainNode.connect(analyserNode);
            analyserNode.connect(audioCtx.destination);

            updateBand(); // Set initial frequency based on default band

            isRunning = true;
            startStopButton.textContent = 'Stop Listening';
            startStopButton.classList.add('running');
            statusMessage.textContent = "Listening... Adjust frequency and amplification.";

            visualize();

        } catch (err) {
            console.error('Error accessing microphone:', err);
            statusMessage.textContent = `Error: ${err.message}. Please grant microphone permission.`;
        }
    }

    function stopAudio() {
        // ... (stopAudio function remains the same as before)
        if (!isRunning) return;
        if (audioCtx) {
            audioCtx.close().then(() => {
                micSource.mediaStream.getTracks().forEach(track => track.stop());
                audioCtx = null;
            });
        }
        cancelAnimationFrame(animationFrameId);
        waveformCtx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
        spectrumCtx.clearRect(0, 0, spectrumCanvas.width, spectrumCanvas.height);
        isRunning = false;
        startStopButton.textContent = 'Start Listening';
        startStopButton.classList.remove('running');
        statusMessage.textContent = 'Click "Start Listening" to begin.';
    }

    // --- Event Listeners ---
    startStopButton.addEventListener('click', () => {
        if (isRunning) stopAudio();
        else startAudio();
    });

    frequencyKnob.addEventListener('input', updateFrequency);

    bandButtons.forEach(button => {
        button.addEventListener('click', () => {
            bandButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentBand = button.dataset.band;
            updateBand();
        });
    });

    gainSlider.addEventListener('input', (e) => {
        const gainValue = parseFloat(e.target.value);
        if (filterNode) {
            filterNode.gain.setValueAtTime(gainValue, audioCtx.currentTime);
        }
        gainDisplay.textContent = `${gainValue.toFixed(0)} dB`;
    });

    // --- Initial State ---
    function init() {
        const container = document.querySelector('.canvas-container');
        const style = window.getComputedStyle(container);
        const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
        const newWidth = container.clientWidth - padding;

        waveformCanvas.width = newWidth;
        spectrumCanvas.width = newWidth;
        waveformCanvas.height = 200;
        spectrumCanvas.height = 200;

        gainDisplay.textContent = `${gainSlider.value} dB`;
        updateBand(); // Set initial knob range and display
    }

    init();
    window.addEventListener('resize', init);
});
