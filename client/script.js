const pushButton = document.getElementById('pushButton');
const audioPlayer = document.getElementById('audioPlayer');
const statusEl = document.getElementById('status');

let localStream;
let peerConnection;
let ws;

const pc_config = {
    'iceServers': [
        { 'urls': 'stun:stun.l.google.com:19302' }
    ]
};

// --- WebSocket Signaling ---
function connectWebSocket() {
    // Adjust host for different environments if needed
    const wsHost = window.location.host;
    ws = new WebSocket('ws://' + wsHost);

    ws.onopen = () => {
        statusEl.textContent = 'Connected to signaling server. Waiting for peer...';
    };

    ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        console.log('Received message:', message.type);

        if (!peerConnection && message.type !== 'initiate') {
            createPeerConnection(); // Create PC if we are the callee
        }

        if (message.type === 'initiate') {
            console.log('Initiating call');
            if (!peerConnection) createPeerConnection();
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            ws.send(JSON.stringify({ type: 'offer', sdp: peerConnection.localDescription }));
        } else if (message.type === 'offer') {
            console.log('Received offer');
            await peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            ws.send(JSON.stringify({ type: 'answer', sdp: peerConnection.localDescription }));
        } else if (message.type === 'answer') {
            console.log('Received answer');
            await peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp));
        } else if (message.type === 'ice-candidate') {
            console.log('Received ICE candidate');
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
            } catch (e) {
                console.error('Error adding received ice candidate', e);
            }
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket Error:', error);
        statusEl.textContent = 'Connection error. Please refresh.';
    };

    ws.onclose = () => {
        statusEl.textContent = 'Disconnected from server. Please refresh.';
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
    }
}

// --- WebRTC Logic ---
function createPeerConnection() {
    if (peerConnection) return;

    peerConnection = new RTCPeerConnection(pc_config);

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            ws.send(JSON.stringify({ type: 'ice-candidate', candidate: event.candidate }));
        }
    };

    peerConnection.ontrack = (event) => {
        console.log('Received remote track');
        if (audioPlayer.srcObject !== event.streams[0]) {
            audioPlayer.srcObject = event.streams[0];
            statusEl.textContent = 'Connected to peer!';
        }
    };

    peerConnection.onconnectionstatechange = () => {
        if (peerConnection) {
            console.log('Peer Connection State:', peerConnection.connectionState);
            if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed') {
                 statusEl.textContent = 'Peer disconnected. Waiting for new peer...';
                 peerConnection.close();
                 peerConnection = null;
            }
        }
    }

    // Add local stream tracks to the connection if stream is ready
    if (localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
    }
}

// --- User Media & Button Logic ---
async function start() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        // Initially, the audio track is disabled. It will be enabled by Push-to-Talk.
        localStream.getTracks().forEach(track => track.enabled = false);
        statusEl.textContent = 'Microphone access granted.';
        connectWebSocket();
    } catch (e) {
        console.error('getUserMedia error:', e);
        statusEl.textContent = 'Could not get microphone access. Please allow it and refresh.';
        alert('This application requires microphone access to work. Please grant permission and refresh the page.');
    }
}

function setTalking(isTalking) {
    if (localStream) {
        localStream.getTracks().forEach(track => track.enabled = isTalking);
    }
    pushButton.textContent = isTalking ? 'Talking...' : 'Push to Talk';
    if (isTalking) {
        pushButton.classList.add('active');
    } else {
        pushButton.classList.remove('active');
    }
    console.log(isTalking ? 'Transmitting' : 'Transmission ended');
}


pushButton.addEventListener('mousedown', () => setTalking(true));
pushButton.addEventListener('touchstart', (e) => {
    e.preventDefault(); // prevent mouse events from firing
    setTalking(true);
});

pushButton.addEventListener('mouseup', () => setTalking(false));
pushButton.addEventListener('touchend', (e) => {
    e.preventDefault();
    setTalking(false);
});

// Also handle leaving the button area
pushButton.addEventListener('mouseleave', () => {
    if (pushButton.classList.contains('active')) {
        setTalking(false);
    }
});

// Start the application
start();
