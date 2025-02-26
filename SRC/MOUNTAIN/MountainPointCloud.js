// Make sure fabric.js is properly installed and linked in your HTML file
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { generateMountainPoints } from "./generateMountainPoints.js"
import * as TWEEN from "https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.esm.js"

class MountainPointCloud {
  constructor() {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.controls = null
    this.pointCloud = null
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    this.isRotating = true
    this.isLeftMouseDown = false
    this.isRightMouseDown = false
    this.prevMouseX = 0
    this.prevMouseY = 0
    this.rotationSpeed = 0.001
    this.cameraTarget = new THREE.Vector3(0, 0, 0)
    this.activePointIndex = -1
    this.redPointIndices = []
  }

  init() {
    this.scene.background = new THREE.Color(0x000000)
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(this.renderer.domElement)

    this.camera.position.set(0, 50, 150)
    this.camera.lookAt(this.cameraTarget)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.screenSpacePanning = false
    this.controls.minDistance = 0
    this.controls.maxDistance = 150
    this.controls.maxPolarAngle = Math.PI / 2

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
    })

    this.pointCloud = new THREE.Points(geometry, material)
    this.scene.add(this.pointCloud)

    window.addEventListener("resize", () => this.onWindowResize(), false)
    document.addEventListener("mousedown", (e) => this.onMouseDown(e))
    document.addEventListener("mousemove", (e) => this.onMouseMove(e))
    document.addEventListener("mouseup", (e) => this.onMouseUp(e))
    document.addEventListener("wheel", (e) => this.onWheel(e))
    document.addEventListener("contextmenu", (e) => e.preventDefault())
    this.renderer.domElement.addEventListener("click", (e) => this.onPointClick(e))

    this.createCircularText()
    this.startRotation()
    this.setupMenu()

    this.animate()
  }

  createCircularText() {
    const circle = document.getElementById("textCircle")
    const text = "Homara".repeat(8)
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

  startRotation() {
    let rotation = 0
    const rotateSpeed = 0.0

    const animate = () => {
      if (!this.isRotating) return
      rotation += rotateSpeed
      document.getElementById("textCircle").style.transform = `rotate(${rotation}deg)`
      requestAnimationFrame(animate)
    }

    animate()
  }

  setupMenu() {
    const toggleMenu = (event) => {
      event.stopPropagation()
      const menu = document.getElementById("radialMenu")
      const textCircle = document.getElementById("textCircle")
      const isActive = !menu.classList.contains("active")

      if (isActive) {
        textCircle.style.transform = "rotate(90deg)"
        this.isRotating = false

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
        this.isRotating = true
        this.startRotation()
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
        this.isRotating = true
        this.startRotation()
      }
    })
  }

  resetCamera() {
    new TWEEN.Tween(this.camera.position).to({ x: 0, y: 50, z: 150 }, 1000).easing(TWEEN.Easing.Quadratic.InOut).start()

    new TWEEN.Tween(this.cameraTarget)
      .to({ x: 100, y: 0, z: 0 }, 1000)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate(() => this.camera.lookAt(this.cameraTarget))
      .start()

    new TWEEN.Tween(this.pointCloud.rotation)
      .to({ x: 0, y: 0, z: 0 }, 1000)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start()
  }

  onMouseDown(event) {
    if (event.button === 0) {
      this.isLeftMouseDown = true
    } else if (event.button === 2) {
      this.isRightMouseDown = true
    }
    this.prevMouseX = event.clientX
    this.prevMouseY = event.clientY
  }

  onMouseUp(event) {
    if (event.button === 0) {
      this.isLeftMouseDown = false
    } else if (event.button === 2) {
      this.isRightMouseDown = false
    }
  }



  onMouseMove(event) {
    if (this.isLeftMouseDown) {
      const deltaX = (event.clientX - this.prevMouseX) * 0.0009
      const deltaY = (event.clientY - this.prevMouseY) * 0.0009

      this.pointCloud.rotation.y += deltaX
      this.pointCloud.rotation.x += deltaY
    }

    if (this.isRightMouseDown) {
      const deltaX = (event.clientX - this.prevMouseX) * 0.01
      const deltaY = (event.clientY - this.prevMouseY) * 0.01

      this.pointCloud.position.x += deltaX
      this.pointCloud.position.y -= deltaY
    }

    this.prevMouseX = event.clientX
    this.prevMouseY = event.clientY

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    this.checkRedPointHover()
  }

  onWheel(event) {
    event.preventDefault()
    const zoomSpeed = 0.001
    this.camera.position.z += event.deltaY * zoomSpeed
    this.camera.position.z = Math.max(
      this.controls.minDistance,
      Math.min(this.controls.maxDistance, this.camera.position.z),
    )
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
    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersects = this.raycaster.intersectObject(this.pointCloud)

    const redPointIntersect = this.redPointIndices.find((index) =>
      intersects.some((intersect) => intersect.index === index),
    )

    if (redPointIntersect !== undefined) {
      this.activePointIndex = redPointIntersect
      document.body.style.cursor = "pointer"
    } else {
      this.activePointIndex = -1
      document.body.style.cursor = "default"
    }
  }

  navigateToWhiteboard(index) {
    // Clear the existing scene
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0])
    }

    // Remove existing canvas
    this.renderer.domElement.remove()

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

    // Initialize Fabric.js canvas
    const fabricCanvas = new window.fabric.Canvas("whiteboard", {
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: "transparent",
    })

    this.initializeWhiteboard(fabricCanvas)
  }

  initializeWhiteboard(fabricCanvas) {
    let currentTool = "dragTool"
    let isDrawingPolygon = false
    let polygonPoints = []
    let zoom = 1

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
    }

    // Tool click handlers
    document.getElementById("dragTool").onclick = () => setActiveTool("dragTool")
    document.getElementById("polygonTool").onclick = () => setActiveTool("polygonTool")
    document.getElementById("textTool").onclick = () => setActiveTool("textTool")
    document.getElementById("penTool").onclick = () => setActiveTool("penTool")

    // Zoom handlers
    document.getElementById("zoomIn").onclick = () => {
      zoom *= 1.1
      fabricCanvas.setZoom(zoom)
      fabricCanvas.renderAll()
    }

    document.getElementById("zoomOut").onclick = () => {
      zoom /= 1.1
      fabricCanvas.setZoom(zoom)
      fabricCanvas.renderAll()
    }

    // Mouse wheel zoom
    fabricCanvas.on("mouse:wheel", (opt) => {
      const delta = opt.e.deltaY
      let newZoom = zoom

      if (delta > 0) {
        newZoom = zoom * 0.95
      } else {
        newZoom = zoom * 1.05
      }

      // Limit zoom range
      newZoom = Math.min(Math.max(-10, newZoom), 10)

      // Calculate zoom point
      const point = new window.fabric.Point(opt.e.offsetX, opt.e.offsetY)
      fabricCanvas.zoomToPoint(point, newZoom)

      zoom = newZoom
      opt.e.preventDefault()
      opt.e.stopPropagation()
    })

    // Canvas click handler
    fabricCanvas.on("mouse:down", (opt) => {
      const pointer = fabricCanvas.getPointer(opt.e)

      if (currentTool === "polygonTool") {
        if (!isDrawingPolygon) {
          isDrawingPolygon = true
          polygonPoints = []
        }

        polygonPoints.push({
          x: pointer.x,
          y: pointer.y,
        })

        // Remove previous preview polygon if it exists
        if (fabricCanvas._objects.length > 0 && fabricCanvas._objects[fabricCanvas._objects.length - 1]._polyPoints) {
          fabricCanvas.remove(fabricCanvas._objects[fabricCanvas._objects.length - 1])
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
          })
          fabricCanvas.add(polygon)
          fabricCanvas.renderAll()
        }
      } else if (currentTool === "textTool") {
        const text = new window.fabric.IText("Type here", {
          left: pointer.x,
          top: pointer.y,
          fontSize: 20,
          selectable: true,
        })
        fabricCanvas.add(text)
        fabricCanvas.setActiveObject(text)
        text.enterEditing()
      }
    })

    // Double click to finish polygon
    fabricCanvas.on("mouse:dblclick", () => {
      if (currentTool === "polygonTool" && isDrawingPolygon && polygonPoints.length > 2) {
        isDrawingPolygon = false

        // Remove the preview polygon
        if (fabricCanvas._objects.length > 0 && fabricCanvas._objects[fabricCanvas._objects.length - 1]._polyPoints) {
          fabricCanvas.remove(fabricCanvas._objects[fabricCanvas._objects.length - 1])
        }

        // Create the final polygon
        const polygon = new window.fabric.Polygon(polygonPoints, {
          fill: "rgba(0,0,0,0.1)",
          stroke: "black",
          strokeWidth: 2,
          selectable: true,
          evented: true,
        })
        fabricCanvas.add(polygon)
        fabricCanvas.renderAll()
        polygonPoints = []
      }
    })

    // File upload handler
    document.getElementById("fileUpload").onchange = (e) => {
      const file = e.target.files[0]
      const reader = new FileReader()

      reader.onload = (event) => {
        const imgObj = new Image()
        imgObj.src = event.target.result
        imgObj.onload = () => {
          const image = new window.fabric.Image(imgObj, {
            left: 100,
            top: 100,
            scaleX: 0.5,
            scaleY: 0.5,
          })
          fabricCanvas.add(image)
          fabricCanvas.renderAll()
        }
      }
      reader.readAsDataURL(file)
    }

    // Pan handling
    let isPanning = false
    let lastPosX
    let lastPosY

    fabricCanvas.on("mouse:down", (opt) => {
      if (currentTool === "dragTool" && !opt.target) {
        isPanning = true
        fabricCanvas.selection = false
        lastPosX = opt.e.clientX
        lastPosY = opt.e.clientY
      }
    })

    fabricCanvas.on("mouse:move", (opt) => {
      if (isPanning && currentTool === "dragTool") {
        const deltaX = opt.e.clientX - lastPosX
        const deltaY = opt.e.clientY - lastPosY

        fabricCanvas.relativePan(new window.fabric.Point(deltaX, deltaY))

        lastPosX = opt.e.clientX
        lastPosY = opt.e.clientY
      }
    })

    fabricCanvas.on("mouse:up", () => {
      isPanning = false
      if (currentTool === "dragTool") {
        fabricCanvas.selection = true
      }
    })

    // Pen tool (freehand drawing)
    fabricCanvas.freeDrawingBrush.width = 2
    fabricCanvas.freeDrawingBrush.color = "#000000"

    // Window resize handler
    window.addEventListener("resize", () => {
      fabricCanvas.setWidth(window.innerWidth)
      fabricCanvas.setHeight(window.innerHeight)
      fabricCanvas.renderAll()
    })
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  animate() {
    requestAnimationFrame(() => this.animate())
    TWEEN.update()
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }
}

const mountainPointCloud = new MountainPointCloud()
mountainPointCloud.init()

