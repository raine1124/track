import * as THREE from "three"
import { generateHeartPoints } from "./generateHeartPoints.js"
import * as TWEEN from "https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.esm.js"

let scene, camera, renderer, pointCloud
let isRotating = true
let isLeftMouseDown = false
let isRightMouseDown = false
let prevMouseX = 0, prevMouseY = 0
const rotationSpeed = 0.00
const cameraTarget = new THREE.Vector3(0, 0, 0)
let initialCameraPosition

function animate() {
  requestAnimationFrame(animate)

  if (isRotating) {
    pointCloud.rotation.y += rotationSpeed
  }

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

  document.addEventListener("click", (e) => {
    const menu = document.getElementById("radialMenu")
    if (menu.classList.contains("active")) {
      menu.classList.remove("active")
      isRotating = true
      startRotation()
    }
  })
}

function resetView() {
  new TWEEN.Tween(camera.position)
    .to({ x: initialCameraPosition.x, y: initialCameraPosition.y, z: initialCameraPosition.z }, 1000)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .start()

  new TWEEN.Tween(cameraTarget)
    .to({ x: 0, y: 0, z: 0 }, 1000)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .onUpdate(() => camera.lookAt(cameraTarget))
    .start()

  new TWEEN.Tween(pointCloud.rotation)
    .to({ x: 0, y: 0, z: 0 }, 1000)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .start()
}

function init() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)

  camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.set(0, 0, 8)
  initialCameraPosition = camera.position.clone()
  camera.lookAt(cameraTarget)

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

  setupEventListeners()
  createCircularText()
  setupMenu()
  startRotation()
  animate()
}

function setupEventListeners() {
  document.addEventListener("mousedown", onMouseDown)
  document.addEventListener("mousemove", onMouseMove)
  document.addEventListener("mouseup", onMouseUp)
  document.addEventListener("wheel", onWheel)
  document.addEventListener("contextmenu", (e) => e.preventDefault())
  window.addEventListener("resize", onWindowResize)
}

function onMouseDown(event) {
  if (event.button === 0) {
    isLeftMouseDown = true
  } else if (event.button === 2) {
    isRightMouseDown = true
  }
  prevMouseX = event.clientX
  prevMouseY = event.clientY
}

function onMouseUp(event) {
  if (event.button === 0) {
    isLeftMouseDown = false
  } else if (event.button === 2) {
    isRightMouseDown = false
  }
}

function onMouseMove(event) {
  if (isLeftMouseDown) {
    const deltaX = (event.clientX - prevMouseX) * 0.005
    const deltaY = (event.clientY - prevMouseY) * 0.005
    pointCloud.rotation.y += deltaX
    pointCloud.rotation.x += deltaY
  }

  prevMouseX = event.clientX
  prevMouseY = event.clientY
}

function onWheel(event) {
  event.preventDefault()
  const zoomSpeed = 0.003
  camera.position.z += event.deltaY * zoomSpeed
  camera.position.z = Math.max(0.5, Math.min(8, camera.position.z))
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

// Initialize the scene
init()
