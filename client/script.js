document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const startStopButton = document.getElementById('start-stop-button');
    const coarseKnob = document.getElementById('coarse-knob');
    const fineKnob = document.getElementById('fine-knob');
    const bandButtons = document.querySelectorAll('.band-button');
    const frequencyDisplay = document.getElementById('frequency-display');
    const absoluteFrequencyInput = document.getElementById('absolute-frequency-input');
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
    let currentBand = 'khz';

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
    function formatFrequency(hz) {
        if (hz >= 1000000000) return `${(hz / 1000000000).toFixed(2)} GHz`;
        if (hz >= 1000000) return `${(hz / 1000000).toFixed(2)} MHz`;
        if (hz >= 1000) return `${(hz / 1000).toFixed(2)} kHz`;
        return `${hz.toFixed(2)} Hz`;
    }

    function updateFrequencyFromKnobs() {
        const coarseValue = parseFloat(coarseKnob.value);
        const fineValue = parseFloat(fineKnob.value);
        let multiplier = 1;

        switch(currentBand) {
            case 'hz': multiplier = 1; break;
            case 'khz': multiplier = 1000; break;
            case 'mhz': multiplier = 1000000; break;
            case 'ghz': multiplier = 1000000000; break;
        }

        const totalFrequency = (coarseValue * multiplier) + fineValue;

        absoluteFrequencyInput.value = totalFrequency.toFixed(0);
        frequencyDisplay.textContent = formatFrequency(totalFrequency);

        if (filterNode) {
            const maxFreq = audioCtx.sampleRate / 2;
            const clampedFreq = Math.max(20, Math.min(totalFrequency, maxFreq));
            filterNode.frequency.setValueAtTime(clampedFreq, audioCtx.currentTime);
        }
    }

    function updateKnobsFromAbsolute() {
        const totalFrequency = parseFloat(absoluteFrequencyInput.value);
        if (isNaN(totalFrequency) || totalFrequency < 0) return;

        let band, coarse, fine, multiplier;

        if (totalFrequency >= 1000000000) {
            band = 'ghz';
            multiplier = 1000000000;
        } else if (totalFrequency >= 1000000) {
            band = 'mhz';
            multiplier = 1000000;
        } else if (totalFrequency >= 1000) {
            band = 'khz';
            multiplier = 1000;
        } else {
            band = 'hz';
            multiplier = 1;
        }

        const step = coarseKnob.step;
        const decimals = step.includes('.') ? step.split('.')[1].length : 0;

        coarse = parseFloat((totalFrequency / multiplier).toFixed(decimals));
        fine = totalFrequency - (coarse * multiplier);

        // Update UI
        bandButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.band === band);
        });
        currentBand = band;

        updateBandRanges();
        coarseKnob.value = coarse;
        fineKnob.value = fine;

        if(coarseKnob.refresh) coarseKnob.refresh();
        if(fineKnob.refresh) fineKnob.refresh();

        // Directly update display and filter, do not recall updateFrequencyFromKnobs
        frequencyDisplay.textContent = formatFrequency(totalFrequency);
        if (filterNode) {
            const maxFreq = audioCtx.sampleRate / 2;
            const clampedFreq = Math.max(20, Math.min(totalFrequency, maxFreq));
            filterNode.frequency.setValueAtTime(clampedFreq, audioCtx.currentTime);
        }
    }

    function updateBandRanges() {
        let coarseMax, fineMax, coarseStep;
        switch(currentBand) {
            case 'ghz': coarseMax = 5; coarseStep = 0.01; fineMax = 999999999; break;
            case 'mhz': coarseMax = 5000; coarseStep = 0.01; fineMax = 999999; break;
            case 'khz': coarseMax = 22000; coarseStep = 0.01; fineMax = 999; break; // Allow up to 22MHz, in kHz units
            case 'hz':
            default: coarseMax = 22050; coarseStep = 1; fineMax = 0; break; // Audible range
        }
        coarseKnob.max = coarseMax;
        coarseKnob.step = coarseStep;
        fineKnob.max = fineMax;
        if(coarseKnob.refresh) coarseKnob.refresh();
        if(fineKnob.refresh) fineKnob.refresh();
    }

    // --- Audio Control ---
    async function startAudio() {
        if (isRunning) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            micSource = audioCtx.createMediaStreamSource(stream);
            filterNode = audioCtx.createBiquadFilter();
            filterNode.type = 'peaking';
            filterNode.gain.value = parseFloat(gainSlider.value);
            filterNode.Q.value = 50; // Higher Q for more precision
            gainNode = audioCtx.createGain();
            gainNode.gain.value = 1.0;
            analyserNode = audioCtx.createAnalyser();
            analyserNode.fftSize = 2048;
            micSource.connect(filterNode);
            filterNode.connect(gainNode);
            gainNode.connect(analyserNode);
            analyserNode.connect(audioCtx.destination);

            updateBandRanges();
            updateFrequencyFromKnobs();

            isRunning = true;
            startStopButton.textContent = 'Stop Listening';
            startStopButton.classList.add('running');
            statusMessage.textContent = "Listening...";
            visualize();
        } catch (err) {
            statusMessage.textContent = `Error: ${err.message}`;
        }
    }

    function stopAudio() {
        if (!isRunning) return;
        if (audioCtx) {
            audioCtx.close().then(() => {
                micSource.mediaStream.getTracks().forEach(track => track.stop());
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
        isRunning ? stopAudio() : startAudio();
    });

    coarseKnob.addEventListener('input', updateFrequencyFromKnobs);
    fineKnob.addEventListener('input', updateFrequencyFromKnobs);
    absoluteFrequencyInput.addEventListener('change', updateKnobsFromAbsolute);

    bandButtons.forEach(button => {
        button.addEventListener('click', () => {
            // 1. Set the new band
            currentBand = button.dataset.band;
            bandButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // 2. Update knob ranges
            updateBandRanges();

            // 3. Recalculate knob values from the absolute frequency
            const totalFrequency = parseFloat(absoluteFrequencyInput.value);
            if (isNaN(totalFrequency)) return;

            const step = coarseKnob.step;
            const decimals = step.includes('.') ? step.split('.')[1].length : 0;
            let multiplier = 1;
            let displayUnit = 'Hz';
            switch(currentBand) {
                case 'hz': multiplier = 1; displayUnit = 'Hz'; break;
                case 'khz': multiplier = 1000; displayUnit = 'kHz'; break;
                case 'mhz': multiplier = 1000000; displayUnit = 'MHz'; break;
                case 'ghz': multiplier = 1000000000; displayUnit = 'GHz'; break;
            }

            const coarseValue = parseFloat((totalFrequency / multiplier).toFixed(decimals));
            const fineValue = Math.round(totalFrequency - (coarseValue * multiplier));

            coarseKnob.value = coarseValue;
            fineKnob.value = fineValue;

            if(coarseKnob.refresh) coarseKnob.refresh();
            if(fineKnob.refresh) fineKnob.refresh();

            // 4. Manually update the display text
            frequencyDisplay.textContent = `${coarseValue.toFixed(2)} ${displayUnit}`;

            // 5. Manually update the audio filter
            if (filterNode) {
                const maxFreq = audioCtx.sampleRate / 2;
                const clampedFreq = Math.max(20, Math.min(totalFrequency, maxFreq));
                filterNode.frequency.setValueAtTime(clampedFreq, audioCtx.currentTime);
            }
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
        if (container) {
            const style = window.getComputedStyle(container);
            const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
            const newWidth = container.clientWidth - padding;
            waveformCanvas.width = newWidth;
            spectrumCanvas.width = newWidth;
            waveformCanvas.height = 200;
            spectrumCanvas.height = 200;
        }
        gainDisplay.textContent = `${gainSlider.value} dB`;
        updateBandRanges();
        updateFrequencyFromKnobs();
    }

    init();
    window.addEventListener('resize', init);
});
