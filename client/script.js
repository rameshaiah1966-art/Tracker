console.log("Script loaded. Three.js version:", THREE.REVISION);

const startButton = document.getElementById('start-button');
const resetButton = document.getElementById('reset-button');
const accelerometerDataEl = document.getElementById('accelerometer-data');
const gyroscopeDataEl = document.getElementById('gyroscope-data');

// --- UI Elements ---
const angVelBars = { x: document.getElementById('ang-vel-x'), y: document.getElementById('ang-vel-y'), z: document.getElementById('ang-vel-z') };
const linVelBars = { x: document.getElementById('lin-vel-x'), y: document.getElementById('lin-vel-y'), z: document.getElementById('lin-vel-z') };
const distEls = { x: document.getElementById('dist-x'), y: document.getElementById('dist-y'), z: document.getElementById('dist-z') };

// --- State Variables ---
let deviceLinVel = { x: 0, y: 0, z: 0 };
let angVel = { x: 0, y: 0, z: 0 };
let worldPosition = new THREE.Vector3(0, 0, 0);
let worldVelocity = new THREE.Vector3(0, 0, 0);
let deviceOrientation = new THREE.Quaternion();
let lastTimestamp = null;

// --- Three.js Setup ---
const sceneContainer = document.getElementById('scene-container');
let scene, camera, renderer, device, traceLine;
let tracePoints = [];

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

    const gridHelper = new THREE.GridHelper(30, 30);
    scene.add(gridHelper);
    const axesHelper = new THREE.AxesHelper(1);
    scene.add(axesHelper);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(sceneContainer.clientWidth, sceneContainer.clientHeight);
    sceneContainer.appendChild(renderer.domElement);

    const geometry = new THREE.BoxGeometry(0.5, 1, 0.075);
    const material = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6, metalness: 0.2 });
    device = new THREE.Mesh(geometry, material);
    scene.add(device);

    const traceMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const traceGeometry = new THREE.BufferGeometry();
    traceLine = new THREE.Line(traceGeometry, traceMaterial);
    scene.add(traceLine);
    resetTrace();

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
    const percentage = Math.min(Math.abs(value) / maxVal, 1) * 50;
    barElement.style.width = `${percentage}%`;
    barElement.style.backgroundColor = value < 0 ? '#dc3545' : '#007bff';
    barElement.style.transform = value < 0 ? 'translateX(-100%)' : 'translateX(0%)';
}

function animate() {
    requestAnimationFrame(animate);
    device.position.copy(worldPosition);

    const lastPoint = tracePoints[tracePoints.length - 1];
    if (lastPoint && device.position.distanceTo(lastPoint) > 0.05) {
        tracePoints.push(device.position.clone());
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
        const margin = 1.5;
        const newCamPos = new THREE.Vector3(center.x, center.y + size.y / 2, center.z + cameraDistance * margin);
        camera.position.lerp(newCamPos, 0.05);
        camera.lookAt(center);
    }

    renderer.render(scene, camera);

    // Update UI text
    updateBar(angVelBars.x, angVel.x, 10);
    updateBar(angVelBars.y, angVel.y, 10);
    updateBar(angVelBars.z, angVel.z, 10);
    updateBar(linVelBars.x, deviceLinVel.x, 5);
    updateBar(linVelBars.y, deviceLinVel.y, 5);
    updateBar(linVelBars.z, deviceLinVel.z, 5);
    distEls.x.textContent = worldPosition.x.toFixed(2);
    distEls.y.textContent = worldPosition.y.toFixed(2);
    distEls.z.textContent = worldPosition.z.toFixed(2);
}

function resetTrace() {
    worldPosition.set(0, 0, 0);
    worldVelocity.set(0, 0, 0);
    deviceLinVel = { x: 0, y: 0, z: 0 };
    lastTimestamp = null;
    tracePoints = [new THREE.Vector3(0, 0, 0)];
    if (traceLine) {
        traceLine.geometry.setFromPoints(tracePoints);
    }
}

// --- Event Listeners ---
startButton.addEventListener('click', () => {
    startButton.disabled = true;
    resetButton.disabled = false;
    try {
        if ('AbsoluteOrientationSensor' in window) {
            const sensor = new AbsoluteOrientationSensor({ frequency: 60, referenceFrame: 'device' });
            sensor.addEventListener('reading', () => {
                deviceOrientation.fromArray(sensor.quaternion);
                device.quaternion.copy(deviceOrientation);
            });
            sensor.start();
            gyroscopeDataEl.textContent = 'Status: Active (Absolute Orientation)';
        } else if ('RelativeOrientationSensor' in window) {
            const sensor = new RelativeOrientationSensor({ frequency: 60, referenceFrame: 'device' });
            sensor.addEventListener('reading', () => {
                deviceOrientation.fromArray(sensor.quaternion);
                device.quaternion.copy(deviceOrientation);
            });
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
                if (lastTimestamp) {
                    const dt = (now - lastTimestamp) / 1000;
                    deviceLinVel.x += accelerometer.x * dt;
                    deviceLinVel.y += accelerometer.y * dt;
                    deviceLinVel.z += accelerometer.z * dt;
                    deviceAcceleration.set(accelerometer.x, accelerometer.y, accelerometer.z);
                    const worldAcceleration = deviceAcceleration.clone().applyQuaternion(deviceOrientation);
                    worldVelocity.addScaledVector(worldAcceleration, dt);
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
