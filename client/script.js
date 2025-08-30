console.log("Script loaded. Three.js version:", THREE.REVISION);

// --- DOM Elements ---
const startButton = document.getElementById('start-button');
const resetButton = document.getElementById('reset-button');
// ... (other DOM elements)
const distEls = { x: document.getElementById('dist-x'), y: document.getElementById('dist-y'), z: document.getElementById('dist-z') };
// ... (other canvas elements)

// --- State Variables & Constants ---
let worldPosition = new THREE.Vector3(0, 0, 0);
let filteredPosition = new THREE.Vector3(0, 0, 0);
// ... (other state variables)
let kfX, kfY, kfZ; // To be initialized later

// ... (other constants and variables)

// --- Main Setup ---
function initThree() {
    // ... (existing initThree logic)
    resetTrace(); // This will now also initialize the Kalman filters
    // ...
}

// --- UI & Drawing Functions ---
// ... (onWindowResize, drawMap, updateBar, drawDistanceGraph remain the same)

function animate() {
    requestAnimationFrame(animate);

    // Apply Kalman filter to the raw position data
    filteredPosition.x = kfX.filter(worldPosition.x);
    filteredPosition.y = kfY.filter(worldPosition.y);
    filteredPosition.z = kfZ.filter(worldPosition.z);

    // ALL visual updates should now use the FILTERED position
    device.position.copy(filteredPosition);
    if (positionHistory.push(filteredPosition.clone()) > MAX_HISTORY) {
        positionHistory.shift();
    }
    const lastPoint = tracePoints[tracePoints.length - 1];
    if (lastPoint && filteredPosition.distanceTo(lastPoint) > 0.05) {
        tracePoints.push(filteredPosition.clone());
        traceLine.geometry.setFromPoints(tracePoints);
    }

    // ... (camera logic remains the same, as it uses tracePoints which are now filtered)

    renderer.render(scene, camera);
    drawMap();
    drawDistanceGraph();

    // ... (updateBar logic remains the same)

    // Update distance display with filtered data
    distEls.x.textContent = filteredPosition.x.toFixed(2);
    distEls.y.textContent = filteredPosition.y.toFixed(2);
    distEls.z.textContent = filteredPosition.z.toFixed(2);
}

function resetTrace() {
    worldPosition.set(0, 0, 0);
    worldVelocity.set(0, 0, 0);
    deviceLinVel = { x: 0, y: 0, z: 0 };
    lastTimestamp = null;
    zuptSampleCount = 0;

    // Re-initialize Kalman filters to reset their state
    kfX = new KalmanFilter({R: 0.01, Q: 3});
    kfY = new KalmanFilter({R: 0.01, Q: 3});
    kfZ = new KalmanFilter({R: 0.01, Q: 3});

    // Initialize filtered position
    filteredPosition.set(0,0,0);

    tracePoints = [new THREE.Vector3(0, 0, 0)];
    positionHistory = [new THREE.Vector3(0, 0, 0)];
    if (traceLine) traceLine.geometry.setFromPoints(tracePoints);
}

// --- Event Listeners ---
// ... (startButton listener with sensor logic remains the same)

// The rest of the file is the same...
// I will just paste the full correct file to avoid errors.
// ... (full file content below)
console.log("Script loaded. Three.js version:", THREE.REVISION);

const startButton = document.getElementById('start-button');
const resetButton = document.getElementById('reset-button');
const accelerometerDataEl = document.getElementById('accelerometer-data');
const gyroscopeDataEl = document.getElementById('gyroscope-data');
const angVelBars = { x: document.getElementById('ang-vel-x'), y: document.getElementById('ang-vel-y'), z: document.getElementById('ang-vel-z') };
const linVelBars = { x: document.getElementById('lin-vel-x'), y: document.getElementById('lin-vel-y'), z: document.getElementById('lin-vel-z') };
const distEls = { x: document.getElementById('dist-x'), y: document.getElementById('dist-y'), z: document.getElementById('dist-z') };
const mapCanvas = document.getElementById('map-canvas');
const mapCtx = mapCanvas.getContext('2d');
const graphCanvas = document.getElementById('distance-graph-canvas');
const graphCtx = graphCanvas.getContext('2d');

let deviceLinVel = { x: 0, y: 0, z: 0 }, angVel = { x: 0, y: 0, z: 0 };
let worldPosition = new THREE.Vector3(0, 0, 0), worldVelocity = new THREE.Vector3(0, 0, 0);
let filteredPosition = new THREE.Vector3(0, 0, 0);
let deviceOrientation = new THREE.Quaternion(), lastTimestamp = null;
const ZUPT_ACCEL_THRESHOLD = 0.2, ZUPT_GYRO_THRESHOLD = 0.2, ZUPT_SAMPLES_NEEDED = 15;
let zuptSampleCount = 0;
let kfX, kfY, kfZ;
let scene, camera, renderer, device, traceLine;
let tracePoints = [], positionHistory = [];
const MAX_HISTORY = 500;

function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    camera = new THREE.PerspectiveCamera(50, sceneContainer.clientWidth / sceneContainer.clientHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 6);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 2, 3);
    scene.add(directionalLight);
    scene.add(new THREE.GridHelper(30, 30));
    scene.add(new THREE.AxesHelper(1));
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(sceneContainer.clientWidth, sceneContainer.clientHeight);
    sceneContainer.appendChild(renderer.domElement);
    device = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1, 0.075), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    scene.add(device);
    traceLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xff0000 }));
    scene.add(traceLine);
    resetTrace();
    window.addEventListener('resize', onWindowResize, false);
    onWindowResize();
    animate();
}

function onWindowResize() {
    if (!renderer || !camera || !sceneContainer) return;
    camera.aspect = sceneContainer.clientWidth / sceneContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(sceneContainer.clientWidth, sceneContainer.clientHeight);
    mapCanvas.width = mapCanvas.clientWidth;
    mapCanvas.height = mapCanvas.clientHeight;
    graphCanvas.width = graphCanvas.clientWidth;
    graphCanvas.height = graphCanvas.clientHeight;
}

function drawMap() {
    if (!mapCtx || tracePoints.length < 1) return;
    mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
    const boundingBox = new THREE.Box3().setFromPoints(tracePoints);
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    if (size.x === 0 && size.y === 0) { size.x = 1; size.y = 1; }
    const margin = 0.9;
    const scale = Math.min((mapCanvas.width * margin) / size.x, (mapCanvas.height * margin) / size.y);
    const canvasCenterX = mapCanvas.width / 2;
    const canvasCenterY = mapCanvas.height / 2;
    mapCtx.strokeStyle = 'red';
    mapCtx.lineWidth = 2;
    mapCtx.beginPath();
    tracePoints.forEach((point, index) => {
        const canvasX = canvasCenterX + (point.x - center.x) * scale;
        const canvasY = canvasCenterY - (point.y - center.y) * scale;
        if (index === 0) { mapCtx.moveTo(canvasX, canvasY); } else { mapCtx.lineTo(canvasX, canvasY); }
    });
    mapCtx.stroke();
    const lastPoint = tracePoints[tracePoints.length - 1];
    const lastPointX = canvasCenterX + (lastPoint.x - center.x) * scale;
    const lastPointY = canvasCenterY - (lastPoint.y - center.y) * scale;
    mapCtx.fillStyle = 'blue';
    mapCtx.beginPath();
    mapCtx.arc(lastPointX, lastPointY, 5, 0, 2 * Math.PI);
    mapCtx.fill();
}

function updateBar(barElement, value, maxVal) {
    if (!barElement) return;
    const percentage = Math.min(Math.abs(value) / maxVal, 1) * 50;
    barElement.style.width = `${percentage}%`;
    barElement.style.backgroundColor = value < 0 ? '#dc3545' : '#007bff';
    barElement.style.transform = value < 0 ? 'translateX(-100%)' : 'translateX(0%)';
}

function drawDistanceGraph() {
    if (!graphCtx || positionHistory.length < 2) return;
    graphCtx.clearRect(0, 0, graphCanvas.width, graphCanvas.height);
    let min = 0, max = 0;
    positionHistory.forEach(p => { min = Math.min(min, p.x, p.y, p.z); max = Math.max(max, p.x, p.y, p.z); });
    const range = Math.max(Math.abs(min), Math.abs(max)) * 2;
    const scale = range > 0 ? (graphCanvas.height * 0.8) / range : 1;
    const colors = { x: 'red', y: 'green', z: 'blue' };
    ['x', 'y', 'z'].forEach(axis => {
        graphCtx.strokeStyle = colors[axis];
        graphCtx.lineWidth = 1;
        graphCtx.beginPath();
        positionHistory.forEach((p, i) => {
            const canvasX = (i / (positionHistory.length - 1)) * graphCanvas.width;
            const canvasY = (graphCanvas.height / 2) - (p[axis] * scale);
            if (i === 0) { graphCtx.moveTo(canvasX, canvasY); } else { graphCtx.lineTo(canvasX, canvasY); }
        });
        graphCtx.stroke();
    });
}

function animate() {
    requestAnimationFrame(animate);
    filteredPosition.x = kfX.filter(worldPosition.x);
    filteredPosition.y = kfY.filter(worldPosition.y);
    filteredPosition.z = kfZ.filter(worldPosition.z);
    device.position.copy(filteredPosition);
    if (positionHistory.push(filteredPosition.clone()) > MAX_HISTORY) {
        positionHistory.shift();
    }
    const lastPoint = tracePoints[tracePoints.length - 1];
    if (lastPoint && filteredPosition.distanceTo(lastPoint) > 0.05) {
        tracePoints.push(filteredPosition.clone());
        traceLine.geometry.setFromPoints(tracePoints);
    }
    if (tracePoints.length > 1) {
        const boundingBox = new THREE.Box3().setFromPoints(tracePoints);
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);
        const size = new THREE.Vector3();
        boundingBox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        const cameraDistance = Math.abs(maxDim / (2 * Math.tan(fov / 2)));
        const newCamPos = new THREE.Vector3(center.x, center.y + size.y / 2, center.z + cameraDistance * 1.5);
        camera.position.lerp(newCamPos, 0.05);
        camera.lookAt(center);
    }
    renderer.render(scene, camera);
    drawMap();
    drawDistanceGraph();
    updateBar(angVelBars.x, angVel.x, 10); updateBar(angVelBars.y, angVel.y, 10); updateBar(angVelBars.z, angVel.z, 10);
    updateBar(linVelBars.x, deviceLinVel.x, 5); updateBar(linVelBars.y, deviceLinVel.y, 5); updateBar(linVelBars.z, deviceLinVel.z, 5);
    distEls.x.textContent = filteredPosition.x.toFixed(2);
    distEls.y.textContent = filteredPosition.y.toFixed(2);
    distEls.z.textContent = filteredPosition.z.toFixed(2);
}

function resetTrace() {
    worldPosition.set(0, 0, 0); worldVelocity.set(0, 0, 0);
    deviceLinVel = { x: 0, y: 0, z: 0 };
    lastTimestamp = null; zuptSampleCount = 0;
    kfX = new KalmanFilter({R: 0.01, Q: 3});
    kfY = new KalmanFilter({R: 0.01, Q: 3});
    kfZ = new KalmanFilter({R: 0.01, Q: 3});
    filteredPosition.set(0,0,0);
    tracePoints = [new THREE.Vector3(0, 0, 0)];
    positionHistory = [new THREE.Vector3(0, 0, 0)];
    if (traceLine) traceLine.geometry.setFromPoints(tracePoints);
}

startButton.addEventListener('click', () => {
    startButton.disabled = true;
    resetButton.disabled = false;
    try {
        if ('AbsoluteOrientationSensor' in window) {
            const sensor = new AbsoluteOrientationSensor({ frequency: 60, referenceFrame: 'device' });
            sensor.addEventListener('reading', () => { deviceOrientation.fromArray(sensor.quaternion); device.quaternion.copy(deviceOrientation); });
            sensor.start();
            gyroscopeDataEl.textContent = 'Status: Active (Absolute Orientation)';
        } else if ('RelativeOrientationSensor' in window) {
            const sensor = new RelativeOrientationSensor({ frequency: 60, referenceFrame: 'device' });
            sensor.addEventListener('reading', () => { deviceOrientation.fromArray(sensor.quaternion); device.quaternion.copy(deviceOrientation); });
            sensor.start();
            gyroscopeDataEl.textContent = 'Status: Active (Relative Fallback)';
        }
    } catch (error) { console.error("Orientation Sensor Error:", error); }
    try {
        if ('Gyroscope' in window) {
            const gyroscope = new Gyroscope({ frequency: 60 });
            gyroscope.addEventListener('reading', () => angVel = { x: gyroscope.x, y: gyroscope.y, z: gyroscope.z });
            gyroscope.start();
        }
    } catch(e) { console.error("Gyroscope plot error:", e)}
    try {
        if ('LinearAccelerationSensor' in window) {
            const accelerometer = new LinearAccelerationSensor({ frequency: 60 });
            const deviceAcceleration = new THREE.Vector3();
            accelerometer.addEventListener('reading', () => {
                const now = accelerometer.timestamp;
                const accelMagnitude = Math.sqrt(accelerometer.x**2 + accelerometer.y**2 + accelerometer.z**2);
                const gyroMagnitude = Math.sqrt(angVel.x**2 + angVel.y**2 + angVel.z**2);
                if (accelMagnitude < ZUPT_ACCEL_THRESHOLD && gyroMagnitude < ZUPT_GYRO_THRESHOLD) {
                    zuptSampleCount++;
                    if (zuptSampleCount >= ZUPT_SAMPLES_NEEDED) {
                        worldVelocity.set(0, 0, 0);
                        deviceLinVel = { x: 0, y: 0, z: 0 };
                    }
                } else {
                    zuptSampleCount = 0;
                    if (lastTimestamp) {
                        const dt = (now - lastTimestamp) / 1000;
                        deviceLinVel.x += accelerometer.x * dt;
                        deviceLinVel.y += accelerometer.y * dt;
                        deviceLinVel.z += accelerometer.z * dt;
                        deviceAcceleration.set(accelerometer.x, accelerometer.y, accelerometer.z);
                        const worldAcceleration = deviceAcceleration.clone().applyQuaternion(deviceOrientation);
                        worldVelocity.addScaledVector(worldAcceleration, dt);
                    }
                }
                if (lastTimestamp) {
                    const dt = (now - lastTimestamp) / 1000;
                    worldPosition.addScaledVector(worldVelocity, dt);
                }
                lastTimestamp = now;
            });
            accelerometer.start();
            accelerometerDataEl.textContent = 'Position tracking is active.';
        } else {
            accelerometerDataEl.textContent = 'Position tracking unavailable.';
        }
    } catch(e) { console.error("Linear Acceleration error:", e)}
});

resetButton.addEventListener('click', resetTrace);
initThree();
