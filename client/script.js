console.log("Script loaded. Three.js version:", THREE.REVISION);

const startButton = document.getElementById('start-button');
const accelerometerDataEl = document.getElementById('accelerometer-data');
const gyroscopeDataEl = document.getElementById('gyroscope-data');

// --- Plotting UI Elements ---
const angVelBars = {
    x: document.getElementById('ang-vel-x'),
    y: document.getElementById('ang-vel-y'),
    z: document.getElementById('ang-vel-z')
};
const linVelBars = {
    x: document.getElementById('lin-vel-x'),
    y: document.getElementById('lin-vel-y'),
    z: document.getElementById('lin-vel-z')
};

// --- State Variables ---
let linVel = { x: 0, y: 0, z: 0 };
let angVel = { x: 0, y: 0, z: 0 };
let lastTimestamp = null;

// --- Three.js Setup ---
const sceneContainer = document.getElementById('scene-container');
let scene, camera, renderer, device;

function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    camera = new THREE.PerspectiveCamera(50, sceneContainer.clientWidth / sceneContainer.clientHeight, 0.1, 1000);
    camera.position.z = 4;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 2, 3);
    scene.add(directionalLight);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(sceneContainer.clientWidth, sceneContainer.clientHeight);
    sceneContainer.appendChild(renderer.domElement);

    const geometry = new THREE.BoxGeometry(1, 2, 0.15);
    const material = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6, metalness: 0.2 });
    device = new THREE.Mesh(geometry, material);
    scene.add(device);

    window.addEventListener('resize', onWindowResize, false);
    animate();
}

function onWindowResize() {
    if (!renderer || !camera || !sceneContainer) return;
    camera.aspect = sceneContainer.clientWidth / sceneContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(sceneContainer.clientWidth, sceneContainer.clientHeight);
}

function updateBar(barElement, value, maxVal) {
    if (!barElement) return;
    const percentage = Math.min(Math.abs(value) / maxVal, 1) * 50; // Max 50% width from center
    barElement.style.width = `${percentage}%`;

    if (value < 0) {
        barElement.style.transform = 'translateX(-100%)';
        barElement.style.backgroundColor = '#dc3545'; // Red for negative
    } else {
        barElement.style.transform = 'translateX(0%)';
        barElement.style.backgroundColor = '#007bff'; // Blue for positive
    }
}

function animate() {
    requestAnimationFrame(animate);
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
    // Update plots continuously
    updateBar(angVelBars.x, angVel.x, 10); // Max angular velocity of 10 rad/s for plotting
    updateBar(angVelBars.y, angVel.y, 10);
    updateBar(angVelBars.z, angVel.z, 10);

    updateBar(linVelBars.x, linVel.x, 5); // Max linear velocity of 5 m/s for plotting
    updateBar(linVelBars.y, linVel.y, 5);
    updateBar(linVelBars.z, linVel.z, 5);
}

// --- Sensor Logic ---
startButton.addEventListener('click', () => {
    startButton.disabled = true;

    // 1. Orientation Sensor (for 3D model)
    try {
        if ('RelativeOrientationSensor' in window) {
            const sensor = new RelativeOrientationSensor({ frequency: 60, referenceFrame: 'device' });
            sensor.addEventListener('reading', () => device.quaternion.fromArray(sensor.quaternion));
            sensor.start();
            gyroscopeDataEl.textContent = 'Status: Active (Fused Sensor)';
            accelerometerDataEl.textContent = 'This sensor provides the final orientation.';
        } else {
            // Fallback for orientation if RelativeOrientationSensor is not available
            gyroscopeDataEl.textContent = 'Status: Using Gyroscope fallback for orientation.';
        }
    } catch (error) {
        console.error("Orientation Sensor Error:", error);
        gyroscopeDataEl.textContent = `Error: ${error.message}`;
    }

    // 2. Gyroscope (for Angular Velocity Plot)
    try {
        if ('Gyroscope' in window) {
            const gyroscope = new Gyroscope({ frequency: 60 });
            gyroscope.addEventListener('reading', () => {
                angVel = { x: gyroscope.x, y: gyroscope.y, z: gyroscope.z };
            });
            gyroscope.start();
        } else {
            console.error("Gyroscope API not supported.");
        }
    } catch(e) { console.error("Gyroscope plot error:", e)}

    // 3. Linear Acceleration Sensor (for Linear Velocity Plot)
    try {
        if ('LinearAccelerationSensor' in window) {
            const accelerometer = new LinearAccelerationSensor({ frequency: 60 });
            accelerometer.addEventListener('reading', () => {
                if (lastTimestamp) {
                    const dt = (accelerometer.timestamp - lastTimestamp) / 1000;
                    linVel.x += accelerometer.x * dt;
                    linVel.y += accelerometer.y * dt;
                    linVel.z += accelerometer.z * dt;
                }
                lastTimestamp = accelerometer.timestamp;
            });
            accelerometer.start();
        } else {
            console.error("LinearAccelerationSensor API not supported.");
        }
    } catch(e) { console.error("Linear Acceleration plot error:", e)}
});

// Initialize the Three.js scene when the script loads
initThree();
