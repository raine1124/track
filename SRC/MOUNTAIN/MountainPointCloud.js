// Make sure fabric.js is properly installed and linked in your HTML file
import * as THREE from "three"
import { generateMountainPoints } from "./generateMountainPoints.js"
import * as TWEEN from "https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.esm.js"

class MountainPointCloud {
  constructor() {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" })
    this.pointCloud = null
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    this.isRotating = false
    this.rotationSpeed = 0.001
    this.activePointIndex = -1
    this.redPointIndices = []
    
    // Camera controller variables
    this.currentPosition = new THREE.Vector3()
    this.target = new THREE.Vector3(0, 0, 0)
    this.initialPosition = new THREE.Vector3(0, 50, 150)
    this.initialTarget = new THREE.Vector3(0, 0, 0)
    this.pitch = 0
    this.yaw = 0
    this.isMouseDown = false
    this.mouseButton = -1
    this.mousePosition = new THREE.Vector2()
    this.previousMousePosition = new THREE.Vector2()
    this.moveSpeed = 0.525
    this.rotateSpeed = 0.002
    this.dragSpeed = 0.25
    this.verticalSpeed = 0.525
    this.minDistance = 5
    this.maxDistance = 200
    this.keys = {
      KeyW: false,
      KeyS: false,
      KeyA: false,
      KeyD: false,
      KeyQ: false,
      KeyE: false,
      Space: false,
      ShiftLeft: false,
    }
    
    // Throttling variables for performance
    this.lastRenderTime = 0
    this.renderInterval = 1000 / 60 // Target 60 FPS
    this.lastCameraUpdateTime = 0
    this.cameraUpdateInterval = 16 // ~60 FPS for camera updates
    
    // Bind event handlers to preserve context
    this._boundMouseDown = this.onMouseDown.bind(this)
    this._boundMouseMove = this.onMouseMove.bind(this)
    this._boundMouseUp = this.onMouseUp.bind(this)
    this._boundWheel = this.onWheel.bind(this)
    this._boundKeyDown = this.onKeyDown.bind(this)
    this._boundKeyUp = this.onKeyUp.bind(this)
    this._boundPointClick = this.onPointClick.bind(this)
    this._boundWindowResize = this.onWindowResize.bind(this)
    this._boundContextMenu = (e) => e.preventDefault()
  }

  init() {
    // Set renderer properties for better performance
    this.renderer.setPixelRatio(window.devicePixelRatio > 1 ? 2 : 1); // Limit pixel ratio
    this.scene.background = new THREE.Color(0x000000)
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(this.renderer.domElement)

    this.camera.position.set(0, 50, 150)
    this.currentPosition.copy(this.camera.position)
    this.calculateInitialRotation()
    this.updateCameraDirection()

    // Generate points with optimized settings
    const points = generateMountainPoints(600000, 50, 200, 200, 0.3)
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

      if (point.color.r === 1 && point.color.g === 0 && point.color.b === 0) {
        this.redPointIndices.push(i)
      }
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
          gl_PointSize = size * (1400.0 / -mvPosition.z);
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
      transparent: false,
      depthTest: true,
      depthWrite: true,
    })

    this.pointCloud = new THREE.Points(geometry, material)
    this.scene.add(this.pointCloud)

    // Set up camera controller event listeners with proper binding
    document.addEventListener('mousedown', this._boundMouseDown, { passive: true })
    document.addEventListener('mousemove', this._boundMouseMove, { passive: true })
    document.addEventListener('mouseup', this._boundMouseUp, { passive: true })
    document.addEventListener('wheel', this._boundWheel, { passive: false })
    document.addEventListener('keydown', this._boundKeyDown, { passive: true })
    document.addEventListener('keyup', this._boundKeyUp, { passive: true })
    document.addEventListener('contextmenu', this._boundContextMenu)
    
    window.addEventListener("resize", this._boundWindowResize, { passive: true })
    this.renderer.domElement.addEventListener("click", this._boundPointClick, { passive: true })

    this.createCircularText()
    this.startRotation()
    this.setupMenu()

    // Start animation loop
    this.animate()
  }

  // Camera controller functions
  calculateInitialRotation() {
    // Calculate initial direction vector from origin to camera
    const direction = this.currentPosition.clone().normalize().negate();

    // Calculate initial yaw (horizontal rotation)
    this.yaw = Math.atan2(direction.x, direction.z);

    // Calculate initial pitch (vertical rotation)
    const horizontalDistance = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
    this.pitch = Math.atan2(direction.y, horizontalDistance);
  }

  updateCameraDirection() {
    // Calculate the new look direction based on pitch and yaw
    const direction = new THREE.Vector3();
    direction.x = Math.sin(this.yaw) * Math.cos(this.pitch);
    direction.y = Math.sin(this.pitch);
    direction.z = Math.cos(this.yaw) * Math.cos(this.pitch);

    // Get current distance to target
    const distanceToTarget = this.currentPosition.distanceTo(this.target);

    // Update the target position based on the camera position and direction
    this.target.copy(this.currentPosition).add(direction.multiplyScalar(distanceToTarget));

    // Update the camera to look at the target
    this.camera.lookAt(this.target);
  }

  updateCamera() {
    // Throttle camera updates for better performance
    const now = performance.now();
    if (now - this.lastCameraUpdateTime < this.cameraUpdateInterval) {
      return;
    }
    this.lastCameraUpdateTime = now;
    
    // Check if any movement keys are pressed
    const hasMovement = Object.values(this.keys).some(key => key);
    if (!hasMovement && !this.isMouseDown) return; // Skip update if no input
    
    // Handle WASD movement (relative to camera orientation)
    const movement = new THREE.Vector3();

    // Apply the exact moveSpeed value (0.125)
    if (this.keys.KeyW) movement.z -= this.moveSpeed;
    if (this.keys.KeyS) movement.z += this.moveSpeed;
    if (this.keys.KeyA) movement.x -= this.moveSpeed;
    if (this.keys.KeyD) movement.x += this.moveSpeed;

    // Apply WASD movement in camera's local space
    if (movement.lengthSq() > 0) {
      // Create a quaternion based on the camera's current rotation
      const quaternion = new THREE.Quaternion();
      quaternion.setFromEuler(this.camera.rotation);

      // Apply the quaternion to the movement vector
      movement.applyQuaternion(quaternion);

      // Apply the movement to the camera position
      this.currentPosition.add(movement);
      this.target.add(movement);
    }

    // Handle Space/Shift for global Y-axis movement (independent of camera orientation)
    const verticalMovement = new THREE.Vector3(0, 0, 0);

    if (this.keys.Space) verticalMovement.y += this.verticalSpeed;
    if (this.keys.ShiftLeft) verticalMovement.y -= this.verticalSpeed;

    // Apply vertical movement directly (global Y-axis)
    if (verticalMovement.lengthSq() > 0) {
      this.currentPosition.add(verticalMovement);
      this.target.add(verticalMovement);
    }

    // Update camera position if any movement occurred
    if (movement.lengthSq() > 0 || verticalMovement.lengthSq() > 0) {
      this.camera.position.copy(this.currentPosition);
    }

    // Handle Q/E rotation around Y axis
    if (this.keys.KeyQ) {
      this.yaw += 0.01;
      this.updateCameraDirection();
    }
    if (this.keys.KeyE) {
      this.yaw -= 0.01;
      this.updateCameraDirection();
    }

    // Ensure camera is looking at target
    this.camera.lookAt(this.target);
  }

  createCircularText() {
    const circle = document.getElementById("textCircle")
    if (!circle) return; // Guard clause to prevent errors
    
    const text = "Homara".repeat(8)
    const radius = 33
    const textElement = document.createElement("div")
    textElement.className = "menu-text"

    const characters = text.split("")
    const totalAngle = 360
    const anglePerChar = totalAngle / characters.length

    // Create document fragment for better performance
    const fragment = document.createDocumentFragment();
    
    characters.forEach((char, i) => {
      const span = document.createElement("span")
      span.textContent = char
      const angle = (i * anglePerChar - 90) * (Math.PI / 180)

      span.style.transform = `
        rotate(${i * anglePerChar}deg)
        translate(${radius}px)
        rotate(90deg)
      `

      fragment.appendChild(span)
    })

    textElement.appendChild(fragment)
    circle.appendChild(textElement)
  }

  startRotation() {
    let rotation = 0
    const rotateSpeed = 0.0
    const textCircle = document.getElementById("textCircle")
    if (!textCircle) return; // Guard clause

    const animate = () => {
      if (!this.isRotating) return
      rotation += rotateSpeed
      textCircle.style.transform = `rotate(${rotation}deg)`
      requestAnimationFrame(animate)
    }

    animate()
  }

  setupMenu() {
    const menu = document.getElementById("radialMenu")
    const textCircle = document.getElementById("textCircle")
    if (!menu || !textCircle) return; // Guard clause
    
    const toggleMenu = (event) => {
      event.stopPropagation()
      const isActive = !menu.classList.contains("active")

      if (isActive) {
        textCircle.style.transform = "rotate(90deg)"
        this.isRotating = false

        // Use requestAnimationFrame for smoother transitions
        requestAnimationFrame(() => {
          menu.classList.add("active")
          document.querySelectorAll(".menu-option").forEach((option, index) => {
            option.style.transform = "translateY(0)"
            option.style.opacity = "1"
            option.style.transitionDelay = `${index * 0.1}s`
          })
        })
      } else {
        menu.classList.remove("active")
        document.querySelectorAll(".menu-option").forEach((option) => {
          option.style.transform = "translateY(-10px)"
          option.style.opacity = "0"
          option.style.transitionDelay = "0s"
        })

        textCircle.style.transform = "rotate(0deg)"
        this.isRotating = true
        this.startRotation()
      }
    }

    function resetToMainScreen() {
      // Simplified navigation with fewer console logs
      try {
          window.location.href = "../../index.html";
      } catch (error) {
          console.error("Navigation error:", error);
      }
    }

    menu.addEventListener("click", toggleMenu)

    document.querySelectorAll('.menu-option').forEach((option) => {
      option.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const action = e.target.dataset.action;

        if (action === 'reset') {
          this.resetCamera();
          
          new TWEEN.Tween(this.pointCloud.rotation)
            .to({ x: 0, y: 0, z: 0 }, 1000)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .start();
        } else if (action === 'home') {
          resetToMainScreen();
        }
        
        toggleMenu(e);
      });
    });

    document.addEventListener("click", (e) => {
      if (menu.classList.contains("active")) {
        menu.classList.remove("active")
        this.isRotating = true
        this.startRotation()
      }
    })
  }

  resetCamera() {
    // Reset camera position and target to initial values
    this.camera.position.copy(this.initialPosition);
    this.currentPosition.copy(this.initialPosition);
    this.target.copy(this.initialTarget);

    // Reset rotation values
    this.calculateInitialRotation();

    // Update camera direction based on reset pitch and yaw
    this.updateCameraDirection();
  }

  onMouseDown(event) {
    // If another button is already pressed, ignore new button presses
    if (this.isMouseDown) return;

    // Only track left click (0) or middle click (1), ignore right click (2)
    if (event.button === 0 || event.button === 1) {
      this.isMouseDown = true;
      this.mouseButton = event.button;
      this.mousePosition.set(event.clientX, event.clientY);
    }
  }

  onMouseUp(event) {
    // Only clear mouse state if the released button matches the tracked button
    if (event.button === this.mouseButton) {
      this.isMouseDown = false;
      this.mouseButton = -1;
    }
  }

  onMouseMove(event) {
    // Get mouse movement delta
    const newMousePosition = new THREE.Vector2(event.clientX, event.clientY);
    const delta = new THREE.Vector2().subVectors(newMousePosition, this.mousePosition);
    this.mousePosition.copy(newMousePosition);

    // Update for ray casting (point hover detection) - only when not moving camera
    if (!this.isMouseDown) {
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      this.checkRedPointHover();
    }

    if (!this.isMouseDown) return;

    // Use delta magnitude to prevent large jumps
    const maxDelta = 20; // Max pixels of movement to consider per frame
    if (delta.length() > maxDelta) {
      delta.normalize().multiplyScalar(maxDelta);
    }

    if (this.mouseButton === 0 || this.mouseButton === 1) {
      // Left click or middle click - First-person camera rotation
      // Update yaw (left/right rotation)
      this.yaw -= delta.x * this.rotateSpeed;

      // Update pitch (up/down rotation) with limits to prevent flipping
      this.pitch -= delta.y * this.rotateSpeed;
      this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));

      // Update camera direction based on pitch and yaw
      this.updateCameraDirection();
    }
  }

  onWheel(event) {
    event.preventDefault();

    // Simple fixed zoom rate - INVERTED (negative becomes positive and vice versa)
    const zoomStep = event.deltaY > 0 ? -2.0 : 2.0;

    // Get direction from camera to target
    const directionToTarget = new THREE.Vector3().subVectors(this.target, this.currentPosition).normalize();

    // Move camera along the view direction
    const newPosition = this.currentPosition.clone().addScaledVector(directionToTarget, zoomStep);

    // Calculate new distance
    const newDistance = newPosition.distanceTo(this.target);

    // Apply zoom only if within limits
    if (newDistance >= this.minDistance && newDistance <= this.maxDistance) {
      this.currentPosition.copy(newPosition);
      this.camera.position.copy(this.currentPosition);
    }
  }

  onKeyDown(event) {
    if (this.keys.hasOwnProperty(event.code)) {
      this.keys[event.code] = true;
    }
  }

  onKeyUp(event) {
    if (this.keys.hasOwnProperty(event.code)) {
      this.keys[event.code] = false;
    }
  }

  onPointClick(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersects = this.raycaster.intersectObject(this.pointCloud)

    const redPointIntersect = this.redPointIndices.find((index) =>
      intersects.some((intersect) => intersect.index === index),
    )

    if (redPointIntersect !== undefined) {
      this.navigateToWhiteboard(redPointIntersect)
    }
  }

  checkRedPointHover() {
    // Throttle hover checks for better performance
    const now = performance.now();
    if (now - this.lastHoverCheckTime < 100) { // Check every 100ms
      return;
    }
    this.lastHoverCheckTime = now;
    
    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersects = this.raycaster.intersectObject(this.pointCloud)

    const redPointIntersect = this.redPointIndices.find((index) =>
      intersects.some((intersect) => intersect.index === index),
    )

    if (redPointIntersect !== undefined) {
      if (this.activePointIndex !== redPointIntersect) {
        this.activePointIndex = redPointIntersect
        document.body.style.cursor = "pointer"
      }
    } else if (this.activePointIndex !== -1) {
      this.activePointIndex = -1
      document.body.style.cursor = "default"
    }
  }

  navigateToWhiteboard(index) {
    // Remove event listeners with proper references
    document.removeEventListener('mousedown', this._boundMouseDown);
    document.removeEventListener('mousemove', this._boundMouseMove);
    document.removeEventListener('mouseup', this._boundMouseUp);
    document.removeEventListener('wheel', this._boundWheel);
    document.removeEventListener('keydown', this._boundKeyDown);
    document.removeEventListener('keyup', this._boundKeyUp);
    document.removeEventListener('contextmenu', this._boundContextMenu);
    window.removeEventListener('resize', this._boundWindowResize);
    this.renderer.domElement.removeEventListener('click', this._boundPointClick);
    
    // Dispose of Three.js resources to free memory
    this.pointCloud.geometry.dispose();
    this.pointCloud.material.dispose();
    this.scene.remove(this.pointCloud);
    this.pointCloud = null;
    
    // Clear the existing scene
    while (this.scene.children.length > 0) {
      const object = this.scene.children[0];
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
      this.scene.remove(object);
    }

    // Dispose of renderer
    this.renderer.dispose();
    
    // Remove existing canvas
    this.renderer.domElement.remove();

    // Create whiteboard container
    const container = document.createElement("div")
    container.style.position = "fixed"
    container.style.top = "0"
    container.style.left = "0"
    container.style.width = "100%"
    container.style.height = "100%"
    container.style.backgroundColor = "#f0f0f0"
    document.body.appendChild(container)

    // Create toolbar
    const toolbar = document.createElement("div")
    toolbar.className = "toolbar"
    container.appendChild(toolbar)

    // Create canvas
    const canvas = document.createElement("canvas")
    canvas.id = "whiteboard"
    container.appendChild(canvas)

    // Add styles
    const style = document.createElement("style")
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
    `
    document.head.appendChild(style)

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
    `

    // Initialize Fabric.js canvas if available
    if (window.fabric) {
      const fabricCanvas = new window.fabric.Canvas("whiteboard", {
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: "transparent",
        enableRetinaScaling: false, // Disable retina scaling for better performance
        renderOnAddRemove: false, // Disable automatic rendering for better performance
      })
      this.initializeWhiteboard(fabricCanvas)
    }

    // Window resize handler with debounce
    let resizeTimeout;
    window.addEventListener("resize", () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (window.fabric && fabricCanvas) {
          fabricCanvas.setWidth(window.innerWidth)
          fabricCanvas.setHeight(window.innerHeight)
          fabricCanvas.renderAll()
        }
      }, 250); // Debounce resize events
    })
  }

  initializeWhiteboard(fabricCanvas) {
    let currentTool = "dragTool"
    let isDrawingPolygon = false
    let polygonPoints = []
    let zoom = 1
    let isPanning = false
    let lastPosX, lastPosY
    
    // Optimize fabric canvas
    fabricCanvas.selection = true;
    fabricCanvas.skipTargetFind = false;
    fabricCanvas.targetFindTolerance = 5;

    function setActiveTool(toolId) {
      document.querySelectorAll(".tool").forEach((el) => el.classList.remove("active"))
      document.getElementById(toolId).classList.add("active")
      currentTool = toolId
      fabricCanvas.isDrawingMode = toolId === "penTool"

      if (toolId === "dragTool") {
        fabricCanvas.selection = true
        fabricCanvas.forEachObject((obj) => {
          obj.selectable = true
          obj.evented = true
        })
      } else {
        fabricCanvas.selection = false
        fabricCanvas.forEachObject((obj) => {
          obj.selectable = false
          obj.evented = false
        })
      }

      if (toolId !== "polygonTool") {
        isDrawingPolygon = false
        polygonPoints = []
      }
      
      // Optimize rendering after tool change
      fabricCanvas.renderAll()
    }

    // Tool click handlers with optimized event handling
    const toolButtons = {
      dragTool: document.getElementById("dragTool"),
      polygonTool: document.getElementById("polygonTool"),
      textTool: document.getElementById("textTool"),
      penTool: document.getElementById("penTool"),
      zoomIn: document.getElementById("zoomIn"),
      zoomOut: document.getElementById("zoomOut")
    };
    
    // Use event delegation for better performance
    const toolbar = document.querySelector(".toolbar");
    toolbar.addEventListener("click", (e) => {
      const toolButton = e.target.closest(".tool");
      if (!toolButton) return;
      
      const toolId = toolButton.id;
      if (toolId === "zoomIn") {
        zoom = Math.min(zoom * 1.1, 10); // Limit max zoom
        fabricCanvas.setZoom(zoom);
        fabricCanvas.renderAll();
      } else if (toolId === "zoomOut") {
        zoom = Math.max(zoom / 1.1, 0.1); // Limit min zoom
        fabricCanvas.setZoom(zoom);
        fabricCanvas.renderAll();
      } else if (toolButtons[toolId]) {
        setActiveTool(toolId);
      }
    });

    // Mouse wheel zoom - Fixed and optimized
    fabricCanvas.on("mouse:wheel", (opt) => {
      opt.e.preventDefault();
      opt.e.stopPropagation();
      
      // Throttle wheel events for smoother zooming
      if (this._wheelThrottleTimeout) return;
      this._wheelThrottleTimeout = setTimeout(() => {
        this._wheelThrottleTimeout = null;
      }, 16); // ~60fps
      
      const delta = opt.e.deltaY;
      let newZoom = zoom;

      if (delta > 0) {
        newZoom = zoom * 0.95;
      } else {
        newZoom = zoom * 1.05;
      }

      // Limit zoom range
      newZoom = Math.min(Math.max(0.1, newZoom), 10);

      // Calculate zoom point
      const point = new window.fabric.Point(opt.e.offsetX, opt.e.offsetY);
      fabricCanvas.zoomToPoint(point, newZoom);

      zoom = newZoom;
    });

    // Optimized canvas event handlers
    fabricCanvas.on("mouse:down", (opt) => {
      const pointer = fabricCanvas.getPointer(opt.e);

      if (currentTool === "polygonTool") {
        if (!isDrawingPolygon) {
          isDrawingPolygon = true;
          polygonPoints = [];
        }

        polygonPoints.push({
          x: pointer.x,
          y: pointer.y,
        });

        // Remove previous preview polygon if it exists
        if (fabricCanvas._objects.length > 0 && fabricCanvas._objects[fabricCanvas._objects.length - 1]._polyPoints) {
          fabricCanvas.remove(fabricCanvas._objects[fabricCanvas._objects.length - 1]);
        }

        // Draw the polygon with current points
        if (polygonPoints.length > 1) {
          const polygon = new window.fabric.Polygon(polygonPoints, {
            fill: "rgba(0,0,0,0.1)",
            stroke: "black",
            strokeWidth: 2,
            selectable: false,
            evented: false,
            _polyPoints: true, // Mark as preview polygon
          });
          fabricCanvas.add(polygon);
          fabricCanvas.requestRenderAll(); // Use requestRenderAll for better performance
        }
      } else if (currentTool === "textTool") {
        const text = new window.fabric.IText("Type here", {
          left: pointer.x,
          top: pointer.y,
          fontSize: 20,
          selectable: true,
        });
        fabricCanvas.add(text);
        fabricCanvas.setActiveObject(text);
        text.enterEditing();
        fabricCanvas.requestRenderAll();
      } else if (currentTool === "dragTool" && !opt.target) {
        isPanning = true;
        fabricCanvas.selection = false;
        lastPosX = opt.e.clientX;
        lastPosY = opt.e.clientY;
      }
    });

    // Double click to finish polygon - optimized
    fabricCanvas.on("mouse:dblclick", () => {
      if (currentTool === "polygonTool" && isDrawingPolygon && polygonPoints.length > 2) {
        isDrawingPolygon = false;

        // Remove the preview polygon
        if (fabricCanvas._objects.length > 0 && fabricCanvas._objects[fabricCanvas._objects.length - 1]._polyPoints) {
          fabricCanvas.remove(fabricCanvas._objects[fabricCanvas._objects.length - 1]);
        }

        // Create the final polygon
        const polygon = new window.fabric.Polygon(polygonPoints, {
          fill: "rgba(0,0,0,0.1)",
          stroke: "black",
          strokeWidth: 2,
          selectable: true,
          evented: true,
        });
        fabricCanvas.add(polygon);
        fabricCanvas.requestRenderAll();
        polygonPoints = [];
      }
    });

    // Optimized mouse move handler with throttling
    let lastMoveTime = 0;
    fabricCanvas.on("mouse:move", (opt) => {
      const now = performance.now();
      if (now - lastMoveTime < 16) return; // Limit to ~60fps
      lastMoveTime = now;
      
      if (isPanning && currentTool === "dragTool") {
        const deltaX = opt.e.clientX - lastPosX;
        const deltaY = opt.e.clientY - lastPosY;

        // Limit pan speed for smoother movement
        const maxDelta = 20;
        const limitedDeltaX = Math.min(Math.max(-maxDelta, deltaX), maxDelta);
        const limitedDeltaY = Math.min(Math.max(-maxDelta, deltaY), maxDelta);

        fabricCanvas.relativePan(new window.fabric.Point(limitedDeltaX, limitedDeltaY));

        lastPosX = opt.e.clientX;
        lastPosY = opt.e.clientY;
      }
    });

    fabricCanvas.on("mouse:up", () => {
      isPanning = false;
      if (currentTool === "dragTool") {
        fabricCanvas.selection = true;
      }
    });

    // File upload handler - optimized
    const fileUpload = document.getElementById("fileUpload");
    if (fileUpload) {
      fileUpload.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
          const imgObj = new Image();
          imgObj.src = event.target.result;
          imgObj.onload = () => {
            // Scale image down if it's too large
            let scale = 1;
            const maxDimension = 1000;
            if (imgObj.width > maxDimension || imgObj.height > maxDimension) {
              scale = maxDimension / Math.max(imgObj.width, imgObj.height);
            }
            
            const image = new window.fabric.Image(imgObj, {
              left: 100,
              top: 100,
              scaleX: scale * 0.5,
              scaleY: scale * 0.5,
            });
            fabricCanvas.add(image);
            fabricCanvas.requestRenderAll();
          };
        };
        reader.readAsDataURL(file);
      };
    }

    // Pen tool (freehand drawing) - optimized
    fabricCanvas.freeDrawingBrush.width = 2;
    fabricCanvas.freeDrawingBrush.color = "#000000";
    fabricCanvas.freeDrawingBrush.limitedToCanvasSize = true;
  }

  onWindowResize() {
    // Throttle resize events for better performance
    if (this._resizeThrottleTimeout) return;
    this._resizeThrottleTimeout = setTimeout(() => {
      this._resizeThrottleTimeout = null;
      
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }, 100);
  }

  animate() {
    // Use requestAnimationFrame for smooth animation
    requestAnimationFrame(() => this.animate());
    
    // Throttle rendering for better performance
    const now = performance.now();
    const elapsed = now - this.lastRenderTime;
    
    if (elapsed > this.renderInterval) {
      this.lastRenderTime = now - (elapsed % this.renderInterval);
      
      // Update TWEEN animations
      TWEEN.update();
      
      // Update camera using the camera controller logic
      this.updateCamera();
      
      // Apply rotation to the point cloud
      if (this.isRotating && this.pointCloud) {
        this.pointCloud.rotation.y += this.rotationSpeed;
      }
      
      // Render the scene
      this.renderer.render(this.scene, this.camera);
    }
  }
}

const mountainPointCloud = new MountainPointCloud();
mountainPointCloud.init();
