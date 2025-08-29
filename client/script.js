console.log("Script loaded. Three.js version:", THREE.REVISION);

const startButton = document.getElementById('start-button');
const accelerometerDataEl = document.getElementById('accelerometer-data');
const gyroscopeDataEl = document.getElementById('gyroscope-data');

// --- Three.js Setup ---
const sceneContainer = document.getElementById('scene-container');
let scene, camera, renderer, device;

function initThree() {
    console.log("Initializing Three.js scene...");
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
    console.log("Three.js scene initialized and animation loop started.");
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
        console.log("Checking for RelativeOrientationSensor...");
        if ('RelativeOrientationSensor' in window) {
            console.log("RelativeOrientationSensor found. Trying to instantiate...");
            const options = { frequency: 60, referenceFrame: 'device' };
            const sensor = new RelativeOrientationSensor(options);
            console.log("RelativeOrientationSensor instantiated.");

            sensor.addEventListener('reading', () => {
                if (device && sensor.quaternion) {
                    device.quaternion.fromArray(sensor.quaternion);
                }
            });

            sensor.addEventListener('error', (event) => {
                console.error("RelativeOrientationSensor error:", event.error.name, event.error.message);
            });
            sensor.start();
            console.log("RelativeOrientationSensor started.");
        } else {
            console.log("RelativeOrientationSensor not found. Falling back to Gyroscope.");
            if ('Gyroscope' in window) {
                console.log("Gyroscope found. Trying to instantiate...");
                const gyroscope = new Gyroscope({ frequency: 60 });
                console.log("Gyroscope instantiated.");
                gyroscope.addEventListener('reading', () => {
                    if(device) {
                        const dt = 1/60;
                        device.rotation.x += gyroscope.x * dt;
                        device.rotation.y += gyroscope.y * dt;
                        device.rotation.z += gyroscope.z * dt;
                    }
                });
                gyroscope.start();
                console.log("Gyroscope started.");
            } else {
                 console.error("Fallback failed: Gyroscope API not supported.");
            }
        }
    } catch (error) {
        console.error("An error occurred during sensor initialization:", error.name, error.message);
        if (error.name === 'SecurityError') {
             console.error("This can happen if the page is not served over HTTPS.");
        }
    }
});

// Initialize the Three.js scene when the script loads
initThree();
