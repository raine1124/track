import * as THREE from 'three';
import { generateBrainPoints, generateRedPoints } from './generateBrainPoints.js';
import * as TWEEN from 'https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.esm.js';

let scene, camera, renderer, pointCloud;
let isRotating = true;
let animationFrame;
let isLeftMouseDown = false;
let isRightMouseDown = false;
let prevMouseX = 0, prevMouseY = 0;
const rotationSpeed = 0;
const cameraTarget = new THREE.Vector3(0, 0, 0);
let raycaster, mouse;
let activePointIndex = -1;
const redPointIndices = [];

function createCircularText() {
    const circle = document.getElementById('textCircle');
    const text = 'Brain '.repeat(8);
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

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 10;
    camera.lookAt(cameraTarget);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const { positions, colors } = generateBrainPoints(200000); // Increased from 150000
    const redPoints = generateRedPoints(3, positions);

    const geometry = new THREE.BufferGeometry();
    const positionArray = new Float32Array(positions.length * 3 + redPoints.length * 3);
    const colorArray = new Float32Array(positions.length * 3 + redPoints.length * 3);
    const sizeArray = new Float32Array(positions.length + redPoints.length);

    positions.forEach((point, i) => {
        positionArray[i * 3] = point.x;
        positionArray[i * 3 + 1] = point.y;
        positionArray[i * 3 + 2] = point.z;

        colorArray[i * 3] = colors[i].r;
        colorArray[i * 3 + 1] = colors[i].g;
        colorArray[i * 3 + 2] = colors[i].b;

        sizeArray[i] = 0.05; // Smaller base point size for more detail
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

        redPointIndices.push(index);
    });

    geometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizeArray, 1));

    const material = new THREE.ShaderMaterial({
        vertexShader: `
            attribute float size;
            varying vec3 vColor;
            varying float vDepth;
            
            void main() {
                vColor = color;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
                vDepth = (-mvPosition.z / 20.0); // Normalize depth
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vDepth;
            
            void main() {
                vec2 center = gl_PointCoord - vec2(0.5);
                float dist = length(center);
                
                // Smoother point rendering
                float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
                
                // Add glow effect for non-red points
                if (vColor.r != 1.0 || vColor.g != 0.0 || vColor.b != 0.0) {
                    float glow = exp(-2.0 * dist);
                    vec3 finalColor = mix(vColor, vec3(1.0), glow * 0.3);
                    alpha *= mix(0.4, 1.0, vDepth);
                    gl_FragColor = vec4(finalColor, alpha);
                } else {
                    // Red points remain unchanged
                    if (dist > 0.5) discard;
                    gl_FragColor = vec4(vColor, 1.0);
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
        // Add your desired action for clicking on a red point here
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

window.addEventListener('load', init);