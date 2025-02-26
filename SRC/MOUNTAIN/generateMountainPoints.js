import * as THREE from "three"

function generateMountainPoints(numPoints, maxHeight, width, depth, roughness) {
  const points = []
  const peakLocation = { x: 0, z: 0, height: maxHeight }

  // Generate base plane
  const basePoints = generateBasePlane(width, depth, numPoints / 10)
  points.push(...basePoints)

  // Generate main mountain structure (including interior points)
  for (let i = 0; i < numPoints; i++) {
    const r = (Math.random() * width) / 2
    const theta = Math.random() * 2 * Math.PI
    const x = r * Math.cos(theta)
    const z = r * Math.sin(theta)

    // Calculate maximum possible height at this (x, z) coordinate
    const distanceToPeak = Math.sqrt(x * x + z * z)
    const maxPossibleHeight = peakLocation.height * Math.pow(1 - distanceToPeak / (width / 2), 1.5)

    // Generate a random height from 0 to maxPossibleHeight
    let y = Math.random() * maxPossibleHeight

    // Add some noise to the height
    y += (Math.random() - 0.5) * roughness * maxHeight * (1 - distanceToPeak / (width / 2))

    // Add more detailed features
    const featureHeight = addMountainFeatures(x, z, width, depth, maxHeight)
    y += featureHeight

    // Ensure the height is not negative
    y = Math.max(0, y)

    addPoint(x, y, z, points)
  }

  // Generate three main ridge lines
  const ridgeAngles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]
  ridgeAngles.forEach((angle) => {
    const steps = 500
    for (let i = 0; i < steps; i++) {
      const r = ((i / steps) * width) / 2
      const x = r * Math.cos(angle)
      const z = r * Math.sin(angle)
      const distanceToPeak = Math.sqrt(x * x + z * z)
      let y = peakLocation.height * Math.pow(1 - distanceToPeak / (width / 2), 1.5)

      // Add some noise to the height for more natural-looking ridges
      y += (Math.random() - 0.5) * roughness * maxHeight * 0.2 * (1 - distanceToPeak / (width / 2))

      // Add more detailed features
      const featureHeight = addMountainFeatures(x, z, width, depth, maxHeight) * 0.5
      y += featureHeight

      // Ensure the height is not negative
      y = Math.max(0, y)

      addPoint(x, y, z, points)
    }
  })

  return points
}

function generateBasePlane(width, depth, numPoints) {
  const points = []
  for (let i = 0; i < numPoints; i++) {
    const r = (Math.sqrt(Math.random()) * width) / 2
    const theta = Math.random() * 2 * Math.PI
    const x = r * Math.cos(theta)
    const z = r * Math.sin(theta)
    const y = 0 // Base plane is at y = 0
    const distanceToPeak = Math.sqrt(x * x + z * z)
    addPoint(x, y, z, points)
  }
  return points
}

function addMountainFeatures(x, z, width, depth, maxHeight) {
  const scale = width / 4

  // Add some noise using Perlin-like function
  const noise = (x, z) => {
    return Math.sin(x / scale) * Math.sin(z / scale) + Math.sin((x + z) / scale) * Math.cos((x - z) / scale) * 0.5
  }

  // Create ridges and valleys
  const ridge = Math.abs(noise(x * 2, z * 2))

  // Create smaller bumps and depressions
  const bumps = (noise(x * 5, z * 5) + noise(x * 10, z * 10) * 0.5) * 0.1

  return (ridge + bumps) * maxHeight * 0.2
}

function addPoint(x, y, z, points) {
  const color = new THREE.Color()
  const maxHeight = 200 // Assuming this is the maximum height of the mountain

  // Calculate the base color based on height
  const heightFactor = y / maxHeight
  let r = heightFactor
  let g = heightFactor
  let b = heightFactor

  // Add some variation
  const variation = (Math.random() - 0.5) * 0.2
  r += variation
  g += variation
  b += variation

  // Clamp values between 0 and 1
  r = Math.max(0, Math.min(1, r))
  g = Math.max(0, Math.min(1, g))
  b = Math.max(0, Math.min(1, b))

  color.setRGB(r, g, b)

  // Keep the snow effect at the top
  if (y > 160) {
    if (Math.random() < 0.7) {
      color.setRGB(1, 1, 1) // Pure white for peaks (snow)
    } else {
      color.setRGB(1, 1, 1) // Light gray for some variation in snow
    }
  }

  // Randomly assign some points as red (points of interest)
  const isRed = Math.random() < 0.002 // Reduced probability for red points
  if (isRed && y > 10) {
    // Only add red points above the base
    color.setRGB(1, 0, 0)
  }

  points.push({
    position: new THREE.Vector3(x, y, z),
    color: color,
    size: Math.random() * 0.2 + 0.1, // Add some size variation
  })
}

export { generateMountainPoints }
