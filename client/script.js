console.log("Script loaded.");

const startButton = document.getElementById('start-button');
const accelerometerDataEl = document.getElementById('accelerometer-data');
const gyroscopeDataEl = document.getElementById('gyroscope-data');

startButton.addEventListener('click', () => {
    console.log('Start button clicked.');
    startButton.disabled = true;

    // Use RelativeOrientationSensor for stable orientation
    try {
        if ('RelativeOrientationSensor' in window) {
            const options = { frequency: 60, referenceFrame: 'device' };
            const sensor = new RelativeOrientationSensor(options);

            sensor.addEventListener('reading', () => {
                // sensor.quaternion is an array [x, y, z, w]
                // Three.js Quaternion is (x, y, z, w)
                if (device && sensor.quaternion) {
                    device.quaternion.fromArray(sensor.quaternion);
                }
            });

            sensor.addEventListener('error', (event) => {
                if (event.error.name === 'NotReadableError') {
                    console.error("Sensor is not available.");
                }
            });
            sensor.start();
        } else {
             // Fallback for browsers that do not support RelativeOrientationSensor
             // This part will use the raw gyroscope data, which is less stable and will drift.
            if ('Gyroscope' in window) {
                const gyroscope = new Gyroscope({ frequency: 60 });
                gyroscope.addEventListener('reading', () => {
                    // This is a simplified integration and will drift over time.
                    // For a more robust solution, a sensor fusion algorithm is needed.
                    if(device) {
                        // Assuming 60Hz frequency, dt is approx 1/60
                        const dt = 1/60;
                        device.rotation.x += gyroscope.x * dt;
                        device.rotation.y += gyroscope.y * dt;
                        device.rotation.z += gyroscope.z * dt;
                    }
                });
                gyroscope.start();
            } else {
                 console.error("Gyroscope API not supported.");
            }
        }
    } catch (error) {
        console.error(error);
    }
});

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
    const geometry = new THREE.BoxGeometry(1, 2, 0.15); // Phone-like proportions
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

    // The cube's rotation is now controlled by the orientation sensor.
    // No need to add any manual rotation here.

    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// Initialize the Three.js scene when the script loads
initThree();
