import * as THREE from 'three';
import { generateBrainPoints, generateRedPoints } from './generateBrainPoints.js';
import * as TWEEN from 'https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.esm.js';

let scene, camera, renderer, pointCloud;
let isRotating = true;
let animationFrame;
const rotationSpeed = 0.00;
let raycaster, mouse;
let activePointIndex = -1;
const redPointIndices = [];

// Camera controller variables
let currentPosition = new THREE.Vector3();
let target = new THREE.Vector3();
let initialPosition = new THREE.Vector3(0, 0, 10);
let initialTarget = new THREE.Vector3(0, 0, 0);
let pitch = 0;
let yaw = 0;
let isMouseDown = false;
let mouseButton = -1;
let mousePosition = new THREE.Vector2();
let previousMousePosition = new THREE.Vector2();
let moveSpeed = 0.025;
let rotateSpeed = 0.002;
let dragSpeed = 0.25;
let verticalSpeed = 0.025;
let minDistance = 5;
let maxDistance = 200;
let keys = {
  KeyW: false,
  KeyS: false,
  KeyA: false,
  KeyD: false,
  KeyQ: false,
  KeyE: false,
  Space: false,
  ShiftLeft: false,
};

function createCircularText() {
    const circle = document.getElementById('textCircle');
    const text = 'Homara '.repeat(8);
    const radius = 33;
    const textElement = document.createElement('div');
    textElement.className = 'menu-text';

    const characters = text.split('');
    const totalAngle = 360;
    const anglePerChar = totalAngle / characters.length;

    characters.forEach((char, i) => {
        const span = document.createElement('span');
        span.textContent = char;
        const angle = (i * anglePerChar - 90) * (Math.PI / 180);

        span.style.transform = `
            rotate(${i * anglePerChar}deg)
            translate(${radius}px)
            rotate(90deg)
        `;

        textElement.appendChild(span);
    });

    circle.appendChild(textElement);
}

function startRotation() {
    let rotation = 0;
    const rotateSpeed = 0;

    function animate() {
        if (!isRotating) return;
        rotation += rotateSpeed;
        document.getElementById('textCircle').style.transform = `rotate(${rotation}deg)`;
        animationFrame = requestAnimationFrame(animate);
    }

    animate();
}

function toggleMenu(event) {
    event.stopPropagation();
    const menu = document.getElementById('radialMenu');
    const textCircle = document.getElementById('textCircle');
    const isActive = !menu.classList.contains('active');

    if (isActive) {
        textCircle.style.transform = 'rotate(90deg)';
        isRotating = false;
        cancelAnimationFrame(animationFrame);

        setTimeout(() => {
            menu.classList.add('active');
            document.querySelectorAll('.menu-option').forEach((option, index) => {
                option.style.transform = 'translateY(0)';
                option.style.opacity = '1';
                option.style.transitionDelay = `${index * 0.1}s`;
            });
        }, 300);
    } else {
        menu.classList.remove('active');
        document.querySelectorAll('.menu-option').forEach((option) => {
            option.style.transform = 'translateY(-10px)';
            option.style.opacity = '0';
            option.style.transitionDelay = '0s';
        });

        textCircle.style.transform = 'rotate(0deg)';
        isRotating = true;
        startRotation();
    }
}

function resetToMainScreen() {
    console.log("Home button clicked, attempting navigation");
    
    // Try multiple approaches to navigate
    try {
        // Option 1: Direct window location change
        window.location.href = "../../index.html";
        
        // Option 2: If option 1 fails, try absolute path
        setTimeout(() => {
            console.log("Trying absolute path...");
            window.location = "file:///D:/HomaraDemoTrack/index.html";
        }, 500);
    } catch (error) {
        console.error("Navigation error:", error);
        alert("Could not navigate to home page. Check console for details.");
    }
}

// Camera controller functions
function calculateInitialRotation() {
    // Calculate initial direction vector from origin to camera
    const direction = currentPosition.clone().normalize().negate();

    // Calculate initial yaw (horizontal rotation)
    yaw = Math.atan2(direction.x, direction.z);

    // Calculate initial pitch (vertical rotation)
    const horizontalDistance = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
    pitch = Math.atan2(direction.y, horizontalDistance);
}

function updateCameraDirection() {
    // Calculate the new look direction based on pitch and yaw
    const direction = new THREE.Vector3();
    direction.x = Math.sin(yaw) * Math.cos(pitch);
    direction.y = Math.sin(pitch);
    direction.z = Math.cos(yaw) * Math.cos(pitch);

    // Get current distance to target
    const distanceToTarget = currentPosition.distanceTo(target);

    // Update the target position based on the camera position and direction
    target.copy(currentPosition).add(direction.multiplyScalar(distanceToTarget));

    // Update the camera to look at the target
    camera.lookAt(target);
}

function onMouseDown(event) {
    // If another button is already pressed, ignore new button presses
    if (isMouseDown) return;

    // Only track left click (0) or middle click (1), ignore right click (2)
    if (event.button === 0 || event.button === 1) {
        isMouseDown = true;
        mouseButton = event.button;
        mousePosition.set(event.clientX, event.clientY);
    }
}

function onMouseMove(event) {
    // Get mouse movement delta
    const newMousePosition = new THREE.Vector2(event.clientX, event.clientY);
    const delta = new THREE.Vector2().subVectors(newMousePosition, mousePosition);
    mousePosition.copy(newMousePosition);

    // Update for ray casting (point hover detection)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    checkRedPointHover();

    if (!isMouseDown) return;

    // Use delta magnitude to prevent large jumps
    const maxDelta = 20; // Max pixels of movement to consider per frame
    if (delta.length() > maxDelta) {
        delta.normalize().multiplyScalar(maxDelta);
    }

    if (mouseButton === 0 || mouseButton === 1) {
        // Left click or middle click - First-person camera rotation
        // Update yaw (left/right rotation)
        yaw -= delta.x * rotateSpeed;

        // Update pitch (up/down rotation) with limits to prevent flipping
        pitch -= delta.y * rotateSpeed;
        pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch));

        // Update camera direction based on pitch and yaw
        updateCameraDirection();
    }
}

function onMouseUp(event) {
    // Only clear mouse state if the released button matches the tracked button
    if (event.button === mouseButton) {
        isMouseDown = false;
        mouseButton = -1;
    }
}

function onMouseWheel(event) {
    event.preventDefault();

    // Simple fixed zoom rate - INVERTED (negative becomes positive and vice versa)
    const zoomStep = event.deltaY > 0 ? -2.0 : 2.0;

    // Get direction from camera to target
    const directionToTarget = new THREE.Vector3().subVectors(target, currentPosition).normalize();

    // Move camera along the view direction
    const newPosition = currentPosition.clone().addScaledVector(directionToTarget, zoomStep);

    // Calculate new distance
    const newDistance = newPosition.distanceTo(target);

    // Apply zoom only if within limits
    if (newDistance >= minDistance && newDistance <= maxDistance) {
        currentPosition.copy(newPosition);
        camera.position.copy(currentPosition);
    }
}

function onKeyDown(event) {
    if (keys.hasOwnProperty(event.code)) {
        keys[event.code] = true;
    }
}

function onKeyUp(event) {
    if (keys.hasOwnProperty(event.code)) {
        keys[event.code] = false;
    }
}

function updateCamera() {
    // Handle WASD movement (relative to camera orientation)
    const movement = new THREE.Vector3();

    if (keys.KeyW) movement.z -= moveSpeed;
    if (keys.KeyS) movement.z += moveSpeed;
    if (keys.KeyA) movement.x -= moveSpeed;
    if (keys.KeyD) movement.x += moveSpeed;

    // Apply WASD movement in camera's local space
    if (movement.lengthSq() > 0) {
        // Create a quaternion based on the camera's current rotation
        const quaternion = new THREE.Quaternion();
        quaternion.setFromEuler(camera.rotation);

        // Apply the quaternion to the movement vector
        movement.applyQuaternion(quaternion);

        // Apply the movement to the camera position
        currentPosition.add(movement);
        target.add(movement);
    }

    // Handle Space/Shift for global Y-axis movement (independent of camera orientation)
    const verticalMovement = new THREE.Vector3(0, 0, 0);

    if (keys.Space) verticalMovement.y += verticalSpeed;
    if (keys.ShiftLeft) verticalMovement.y -= verticalSpeed;

    // Apply vertical movement directly (global Y-axis)
    if (verticalMovement.lengthSq() > 0) {
        currentPosition.add(verticalMovement);
        target.add(verticalMovement);
    }

    // Update camera position if any movement occurred
    if (movement.lengthSq() > 0 || verticalMovement.lengthSq() > 0) {
        camera.position.copy(currentPosition);
    }

    // Handle Q/E rotation around Y axis
    if (keys.KeyQ) {
        yaw += 0.01;
        updateCameraDirection();
    }
    if (keys.KeyE) {
        yaw -= 0.01;
        updateCameraDirection();
    }

    // Ensure camera is looking at target
    camera.lookAt(target);
}

function resetCamera() {
    // Reset camera position and target to initial values
    camera.position.copy(initialPosition);
    currentPosition.copy(initialPosition);
    target.copy(initialTarget);

    // Reset rotation values
    calculateInitialRotation();

    // Update camera direction based on reset pitch and yaw
    updateCameraDirection();

    console.log("Camera reset to position:", initialPosition);
}

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 10;
    
    // Initialize camera controller variables
    currentPosition.copy(camera.position);
    calculateInitialRotation();
    updateCameraDirection();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const { positions, colors } = generateBrainPoints(340000); // Increased point count
    const redPoints = generateRedPoints(3, positions);

    const geometry = new THREE.BufferGeometry();
    const positionArray = new Float32Array(positions.length * 3 + redPoints.length * 3);
    const colorArray = new Float32Array(positions.length * 3 + redPoints.length * 3);
    const sizeArray = new Float32Array(positions.length + redPoints.length);
    const customData = new Float32Array(positions.length * 3 + redPoints.length * 3);

    positions.forEach((point, i) => {
        positionArray[i * 3] = point.x;
        positionArray[i * 3 + 1] = point.y;
        positionArray[i * 3 + 2] = point.z;

        colorArray[i * 3] = colors[i].r;
        colorArray[i * 3 + 1] = colors[i].g;
        colorArray[i * 3 + 2] = colors[i].b;

        sizeArray[i] = colors[i].g > 0.5 ? 0.03 : 0.02; // Larger size for neuron pathways

        // Flag neuron pathways
        customData[i * 3] = colors[i].g > 0.5 ? 1.0 : 0.0;
    });

    redPoints.forEach((point, i) => {
        const index = positions.length + i;
        positionArray[index * 3] = point.position.x;
        positionArray[index * 3 + 1] = point.position.y;
        positionArray[index * 3 + 2] = point.position.z;

        colorArray[index * 3] = point.color.r;
        colorArray[index * 3 + 1] = point.color.g;
        colorArray[index * 3 + 2] = point.color.b;

        sizeArray[index] = point.size;
        customData[index * 3] = 2.0; // Flag for red points

        redPointIndices.push(index);
    });

    geometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizeArray, 1));
    geometry.setAttribute('customData', new THREE.BufferAttribute(customData, 3));

    const material = new THREE.ShaderMaterial({
        vertexShader: `
            attribute float size;
            attribute vec3 customData;
            varying vec3 vColor;
            varying float vType;
            
            void main() {
                vColor = color;
                vType = customData.x;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vType;
            
            void main() {
                vec2 center = gl_PointCoord - vec2(0.5);
                float dist = length(center);
                
                if (vType == 2.0) {
                    // Red points
                    if (dist > 0.5) discard;
                    gl_FragColor = vec4(vColor, 1.0);
                } else if (vType == 1.0) {
                    // Neuron pathways
                    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
                    float glow = exp(-2.0 * dist);
                    vec3 finalColor = mix(vColor, vec3(1.0), glow * 0.3);
                    gl_FragColor = vec4(finalColor, alpha * 0.7);
                } else {
                    // Brain structure
                    if (dist > 0.5) discard;
                    gl_FragColor = vec4(vColor, 0.5);
                }
            }
        `,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        depthTest: true
    });

    pointCloud = new THREE.Points(geometry, material);
    scene.add(pointCloud);

    raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 0.1;
    mouse = new THREE.Vector2();

    // Set up camera controller event listeners
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('wheel', onMouseWheel, { passive: false });
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Keep the point click event
    renderer.domElement.addEventListener('click', onPointClick);

    createCircularText();
    startRotation();

    document.getElementById('radialMenu').addEventListener('click', toggleMenu);

    document.querySelectorAll('.menu-option').forEach((option) => {
        option.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const action = e.target.dataset.action;
            console.log('Selected action:', action);
    
            if (action === 'reset') {
                resetCamera();
    
                new TWEEN.Tween(pointCloud.rotation)
                    .to({ x: 0, y: 0, z: 0 }, 1000)
                    .easing(TWEEN.Easing.Quadratic.InOut)
                    .start();
                } else if (action === 'home') {
                    console.log('Home action detected'); // Debug log
                    resetToMainScreen(); // Call the function to reset to the main screen
                }
                
                toggleMenu(e);
            });
        });

    window.addEventListener('resize', onWindowResize);

    animate();
}

function onPointClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(pointCloud);

    const redPointIntersect = redPointIndices.find(index => intersects.some(intersect => intersect.index === index));

    if (redPointIntersect !== undefined) {
        console.log('Clicked on red point:', redPointIntersect);
        navigateToWhiteboard(redPointIntersect);
    }
}

function checkRedPointHover() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(pointCloud);

    const redPointIntersect = redPointIndices.find(index => intersects.some(intersect => intersect.index === index));

    if (redPointIntersect !== undefined) {
        activePointIndex = redPointIntersect;
        document.body.style.cursor = 'pointer';
    } else {
        activePointIndex = -1;
        document.body.style.cursor = 'default';
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    
    // Update camera using the camera controller logic
    updateCamera();
    
    // Only apply rotation to the point cloud, not the camera
    pointCloud.rotation.y += rotationSpeed;
    
    renderer.render(scene, camera);
}

function navigateToWhiteboard(index) {
    // Remove event listeners
    document.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.removeEventListener('wheel', onMouseWheel);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    document.removeEventListener('contextmenu', (e) => e.preventDefault());
    
    // Clear the existing scene
    while (scene.children.length > 0) {
        scene.remove(scene.children[0]);
    }

    // Remove existing canvas
    renderer.domElement.remove();

    // Create whiteboard container
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.backgroundColor = '#f0f0f0';
    document.body.appendChild(container);

    // Create toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';
    container.appendChild(toolbar);

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.id = 'whiteboard';
    container.appendChild(canvas);

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        body {
            margin: 0;
            overflow: hidden;
            font-family: Arial, sans-serif;
        }

        #whiteboard {
            width: 100%;
            height: 100%;
            background-image: radial-gradient(circle at 1px 1px, #c0c0c0 1px, transparent 1px);
            background-size: 20px 20px;
        }

        .toolbar {
            position: fixed;
            left: 20px;
            top: 50%;
            transform: translateY(-50%);
            display: flex;
            flex-direction: column;
            gap: 8px;
            background: white;
            padding: 8px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
        }

        .tool {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            cursor: pointer;
            background: white;
            border: 1px solid black;
            transition: background-color 0.2s;
        }

        .tool:hover {
            background-color: #f5f5f5;
        }

        .tool.active {
            background-color: #edf2ff;
        }

        .tool svg {
            width: 20px;
            height: 20px;
            color: #666;
        }

        .tool.active svg {
            color: #4666ff;
        }

        #fileUpload {
            display: none;
        }

        .file-upload-label {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            cursor: pointer;
            background: white;
            border: 1px solid black;
            transition: background-color 0.2s;
        }

        .file-upload-label:hover {
            background-color: #f5f5f5;
        }
    `;
    document.head.appendChild(style);

    // Add toolbar HTML
    toolbar.innerHTML = `
        <button class="tool active" id="dragTool" title="Move Tool">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>
        </button>
        <button class="tool" id="polygonTool" title="Polygon Tool">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l8.5 5v10L12 22l-8.5-5V7L12 2z"/></svg>
        </button>
        <button class="tool" id="textTool" title="Text Tool">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>
        </button>
        <button class="tool" id="penTool" title="Pen Tool">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
        </button>
        <label class="file-upload-label" title="Upload File">
            <input type="file" id="fileUpload" accept="image/*,video/*">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        </label>
        <button class="tool" id="zoomIn" title="Zoom In">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
        </button>
        <button class="tool" id="zoomOut" title="Zoom Out">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
        </button>
    `;

    // Window resize handler
    window.addEventListener("resize", () => {
        // Handle resize if needed
    });
}

window.addEventListener('load', init);
