console.log("Script loaded. Three.js version:", THREE.REVISION);

const startButton = document.getElementById('start-button');
const accelerometerDataEl = document.getElementById('accelerometer-data');
const gyroscopeDataEl = document.getElementById('gyroscope-data');

// --- Three.js Setup ---
const sceneContainer = document.getElementById('scene-container');
let scene, camera, renderer, device;

function initThree() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // Camera
    const fov = 50;
    const aspect = sceneContainer.clientWidth / sceneContainer.clientHeight;
    const near = 0.1;
    const far = 1000;
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.z = 4;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 2, 3);
    scene.add(directionalLight);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(sceneContainer.clientWidth, sceneContainer.clientHeight);
    sceneContainer.appendChild(renderer.domElement);

    // Device model
    const geometry = new THREE.BoxGeometry(1, 2, 0.15);
    const material = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.6,
        metalness: 0.2
    });
    device = new THREE.Mesh(geometry, material);
    scene.add(device);

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    // Start animation loop
    animate();
}

function onWindowResize() {
    if (!renderer || !camera || !sceneContainer) return;
    camera.aspect = sceneContainer.clientWidth / sceneContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(sceneContainer.clientWidth, sceneContainer.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}


// --- Sensor Logic ---
startButton.addEventListener('click', () => {
    console.log("Start button clicked. Attempting to initialize sensors.");
    startButton.disabled = true;

    try {
        if ('RelativeOrientationSensor' in window) {
            const options = { frequency: 60, referenceFrame: 'device' };
            const sensor = new RelativeOrientationSensor(options);

            sensor.addEventListener('reading', () => {
                if (device && sensor.quaternion) {
                    device.quaternion.fromArray(sensor.quaternion);
                }
            });

            sensor.addEventListener('error', (event) => {
                console.error("Sensor error:", event.error.name, event.error.message);
                gyroscopeDataEl.textContent = `Error: ${event.error.message}`;
                accelerometerDataEl.textContent = 'Trying to use Gyroscope fallback...';
            });
            sensor.start();
            gyroscopeDataEl.textContent = 'Status: Active (using Fused Sensor)';
            accelerometerDataEl.textContent = 'This sensor provides the final orientation.';

        } else {
            if ('Gyroscope' in window) {
                const gyroscope = new Gyroscope({ frequency: 60 });
                gyroscope.addEventListener('reading', () => {
                    if(device) {
                        const dt = 1/60;
                        device.rotation.x += gyroscope.x * dt;
                        device.rotation.y += gyroscope.y * dt;
                        device.rotation.z += gyroscope.z * dt;
                    }
                });
                gyroscope.start();
                gyroscopeDataEl.textContent = 'Status: Active (using Gyroscope fallback)';
                accelerometerDataEl.textContent = '—';
            } else {
                 const errorMsg = "Error: Gyroscope API not supported.";
                 gyroscopeDataEl.textContent = errorMsg;
                 accelerometerDataEl.textContent = errorMsg;
            }
        }
    } catch (error) {
        console.error("An error occurred during sensor initialization:", error.name, error.message);
        gyroscopeDataEl.textContent = `Error: ${error.message}`;
        accelerometerDataEl.textContent = 'Please see console for details.';
    }
});

// Initialize the Three.js scene when the script loads
initThree();
