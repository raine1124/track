import * as THREE from "three"
import { generateHeartPoints } from "./generateHeartPoints.js"
import * as TWEEN from "https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.esm.js"

let scene, camera, renderer, pointCloud
let isRotating = true
let animationFrame

// Camera controller variables
let currentPosition = new THREE.Vector3()
let target = new THREE.Vector3()
let initialPosition = new THREE.Vector3(0, 0, 5)
let initialTarget = new THREE.Vector3(0, 0, 0)
let pitch = 0
let yaw = 0
let isMouseDown = false
let mouseButton = -1
let mousePosition = new THREE.Vector2()
let previousMousePosition = new THREE.Vector2()
let moveSpeed = 0.025
let rotateSpeed = 0.002
let dragSpeed = 0.25
let verticalSpeed = 0.025
let minDistance = 0.5
let maxDistance = 20
let keys = {
  KeyW: false,
  KeyS: false,
  KeyA: false,
  KeyD: false,
  KeyQ: false,
  KeyE: false,
  Space: false,
  ShiftLeft: false,
}

function animate() {
  requestAnimationFrame(animate)

  if (isRotating) {
    pointCloud.rotation.y += 0.00
  }

  // Update camera using the camera controller logic
  updateCamera()

  TWEEN.update()
  renderer.render(scene, camera)
}

function createCircularText() {
  const circle = document.getElementById("textCircle")
  const text = "Homara ".repeat(8)
  const radius = 33
  const textElement = document.createElement("div")
  textElement.className = "menu-text"

  const characters = text.split("")
  const totalAngle = 360
  const anglePerChar = totalAngle / characters.length

  characters.forEach((char, i) => {
    const span = document.createElement("span")
    span.textContent = char
    const angle = (i * anglePerChar - 90) * (Math.PI / 180)

    span.style.transform = `
      rotate(${i * anglePerChar}deg)
      translate(${radius}px)
      rotate(90deg)
    `

    textElement.appendChild(span)
  })

  circle.appendChild(textElement)
}

function startRotation() {
  let rotation = 0
  const rotateSpeed = 0.0

  const animate = () => {
    if (!isRotating) return
    rotation += rotateSpeed
    document.getElementById("textCircle").style.transform = `rotate(${rotation}deg)`
    requestAnimationFrame(animate)
  }

  animate()
}

function setupMenu() {
  const toggleMenu = (event) => {
    event.stopPropagation()
    const menu = document.getElementById("radialMenu")
    const textCircle = document.getElementById("textCircle")
    const isActive = !menu.classList.contains("active")

    if (isActive) {
      textCircle.style.transform = "rotate(90deg)"
      isRotating = false

      setTimeout(() => {
        menu.classList.add("active")
        document.querySelectorAll(".menu-option").forEach((option, index) => {
          option.style.transform = "translateY(0)"
          option.style.opacity = "1"
          option.style.transitionDelay = `${index * 0.1}s`
        })
      }, 300)
    } else {
      menu.classList.remove("active")
      document.querySelectorAll(".menu-option").forEach((option) => {
        option.style.transform = "translateY(-10px)"
        option.style.opacity = "0"
        option.style.transitionDelay = "0s"
      })

      textCircle.style.transform = "rotate(0deg)"
      isRotating = true
      startRotation()
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

  document.getElementById("radialMenu").addEventListener("click", toggleMenu)

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

  document.addEventListener("click", (e) => {
    const menu = document.getElementById("radialMenu")
    if (menu.classList.contains("active")) {
      menu.classList.remove("active")
      isRotating = true
      startRotation()
    }
  })
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

function onWheel(event) {
  event.preventDefault();

  // Simple fixed zoom rate - INVERTED (negative becomes positive and vice versa)
  const zoomStep = event.deltaY > 0 ? -0.5 : 0.5;

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
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)

  camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.set(0, 0, 8)
  
  // Initialize camera controller variables
  currentPosition.copy(camera.position)
  calculateInitialRotation()
  updateCameraDirection()

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  document.body.appendChild(renderer.domElement)

  const points = generateHeartPoints(200000)
  const geometry = new THREE.BufferGeometry()

  const positions = new Float32Array(points.length * 3)
  const colors = new Float32Array(points.length * 3)
  const sizes = new Float32Array(points.length)

  points.forEach((point, i) => {
    positions[i * 3] = point.position.x
    positions[i * 3 + 1] = point.position.y
    positions[i * 3 + 2] = point.position.z

    colors[i * 3] = point.color.r
    colors[i * 3 + 1] = point.color.g
    colors[i * 3 + 2] = point.color.b

    sizes[i] = point.size
  })

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1))

  const material = new THREE.ShaderMaterial({
    vertexShader: `
      attribute float size;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        float dist = length(gl_PointCoord - vec2(0.5, 0.5));
        if (dist > 0.5) discard;
        gl_FragColor = vec4(vColor, 1.0);
      }
    `,
    vertexColors: true,
  })

  pointCloud = new THREE.Points(geometry, material)
  scene.add(pointCloud)

  // Set up camera controller event listeners
  document.addEventListener('mousedown', onMouseDown)
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  document.addEventListener('wheel', onWheel, { passive: false })
  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('keyup', onKeyUp)
  document.addEventListener('contextmenu', (e) => e.preventDefault())

  window.addEventListener('resize', onWindowResize)

  createCircularText()
  setupMenu()
  startRotation()
  animate()
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

// Initialize the scene
init()
