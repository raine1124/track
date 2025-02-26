import * as THREE from 'three';
import { generateBrainPoints, generateRedPoints } from './generateBrainPoints.js';
import * as TWEEN from 'https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.esm.js';
// import fabric from 'fabric'; // Import fabric - Removed as per update 1

let scene, camera, renderer, pointCloud;
let isRotating = true;
let animationFrame;
let isLeftMouseDown = false;
let isRightMouseDown = false;
let prevMouseX = 0, prevMouseY = 0;
const rotationSpeed = 0.00;
const cameraTarget = new THREE.Vector3(0, 0, 0);
let raycaster, mouse;
let activePointIndex = -1;
const redPointIndices = [];

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

function init() {
    // await loadFabric(); // Removed as per update 3
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 10;
    camera.lookAt(cameraTarget);

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

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('wheel', onWheel);
    document.addEventListener('contextmenu', (e) => e.preventDefault());
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
                new TWEEN.Tween(camera.position)
                    .to({ x: 0, y: 0, z: 10 }, 1000)
                    .easing(TWEEN.Easing.Quadratic.InOut)
                    .start();
    
                new TWEEN.Tween(cameraTarget)
                    .to({ x: 0, y: 0, z: 0 }, 1000)
                    .easing(TWEEN.Easing.Quadratic.InOut)
                    .onUpdate(() => camera.lookAt(cameraTarget))
                    .start();
    
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


function onMouseDown(event) {
    if (event.button === 0) {
        isLeftMouseDown = true;
    } else if (event.button === 2) {
        isRightMouseDown = true;
    }
    prevMouseX = event.clientX;
    prevMouseY = event.clientY;
}

function onMouseUp(event) {
    if (event.button === 0) {
        isLeftMouseDown = false;
    } else if (event.button === 2) {
        isRightMouseDown = false;
    }
}

function onMouseMove(event) {
    if (isLeftMouseDown) {
        const deltaX = (event.clientX - prevMouseX) * 0.01;
        const deltaY = (event.clientY - prevMouseY) * 0.01;

        pointCloud.rotation.y += deltaX;
        pointCloud.rotation.x += deltaY;
    }

    if (isRightMouseDown) {
        const deltaX = (event.clientX - prevMouseX) * 0.01;
        const deltaY = (event.clientY - prevMouseY) * 0.01;

        camera.position.x -= deltaX;
        camera.position.y += deltaY;
        cameraTarget.x -= deltaX;
        cameraTarget.y += deltaY;
        camera.lookAt(cameraTarget);
    }

    prevMouseX = event.clientX;
    prevMouseY = event.clientY;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    checkRedPointHover();
}

function onWheel(event) {
    event.preventDefault();
    const zoomSpeed = 0.001;
    camera.position.z += event.deltaY * zoomSpeed;
    camera.position.z = Math.max(1, Math.min(20, camera.position.z));
}

function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    pointCloud.rotation.y += rotationSpeed;
    renderer.render(scene, camera);
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

function navigateToWhiteboard(index) {
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
        // fabricCanvas.setWidth(window.innerWidth);
        // fabricCanvas.setHeight(window.innerHeight);
        // fabricCanvas.renderAll();
    });
}

window.addEventListener('load', init);
