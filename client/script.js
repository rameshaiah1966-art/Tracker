document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const startStopButton = document.getElementById('start-stop-button');
    const frequencyInput = document.getElementById('frequency-input');
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

    // --- Visualization ---
    function visualize() {
        // Setup for Time Domain (Waveform)
        const waveformBufferLength = analyserNode.fftSize;
        const waveformDataArray = new Uint8Array(waveformBufferLength);

        // Setup for Frequency Domain (Spectrum)
        const spectrumBufferLength = analyserNode.frequencyBinCount;
        const spectrumDataArray = new Uint8Array(spectrumBufferLength);

        function draw() {
            if (!isRunning) return;

            animationFrameId = requestAnimationFrame(draw);

            // --- Draw Waveform ---
            analyserNode.getByteTimeDomainData(waveformDataArray);
            waveformCtx.fillStyle = '#000';
            waveformCtx.fillRect(0, 0, waveformCanvas.width, waveformCanvas.height);
            waveformCtx.lineWidth = 2;
            waveformCtx.strokeStyle = '#00aaff';
            waveformCtx.beginPath();
            const sliceWidth = waveformCanvas.width * 1.0 / waveformBufferLength;
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

            // --- Draw Spectrum ---
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

    // --- Audio Control ---
    async function startAudio() {
        if (isRunning) return;
        try {
            statusMessage.textContent = "Requesting microphone permission...";
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            micSource = audioCtx.createMediaStreamSource(stream);

            filterNode = audioCtx.createBiquadFilter();
            filterNode.type = 'peaking';
            filterNode.frequency.value = parseFloat(frequencyInput.value);
            filterNode.gain.value = parseFloat(gainSlider.value);
            filterNode.Q.value = 10; // Quality factor

            gainNode = audioCtx.createGain();
            gainNode.gain.value = 1.0; // Master volume, keep it fixed for now

            analyserNode = audioCtx.createAnalyser();
            analyserNode.fftSize = 2048;

            // Connect graph: Mic -> Filter -> Gain -> Analyser -> Speakers
            micSource.connect(filterNode);
            filterNode.connect(gainNode);
            gainNode.connect(analyserNode);
            analyserNode.connect(audioCtx.destination);

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
        if (!isRunning) return;

        // Gracefully shut down the audio context and tracks
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
        if (isRunning) {
            stopAudio();
        } else {
            startAudio();
        }
    });

    frequencyInput.addEventListener('input', (e) => {
        if (filterNode) {
            const freq = parseFloat(e.target.value);
            if (freq > 0) {
                 filterNode.frequency.setValueAtTime(freq, audioCtx.currentTime);
            }
        }
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
        // Set canvas sizes based on container
        const container = document.querySelector('.canvas-container');
        const style = window.getComputedStyle(container);
        const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
        const newWidth = container.clientWidth - padding;

        waveformCanvas.width = newWidth;
        spectrumCanvas.width = newWidth;
        waveformCanvas.height = 200;
        spectrumCanvas.height = 200;

        gainDisplay.textContent = `${gainSlider.value} dB`;
    }

    init();
    window.addEventListener('resize', init);
});
