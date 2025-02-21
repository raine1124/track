import * as THREE from "three"

function generateMountainPoints(numPoints, maxHeight, width, depth, roughness) {
  const points = []
  const peakLocations = [
    { x: -width / 4, z: 0, height: maxHeight * 2 },
    { x: 0, z: depth / 4, height: maxHeight * 1.6 },
    { x: width / 4, z: -depth / 4, height: maxHeight * 1.8 },
  ]

  // Generate base plane
  const basePoints = generateBasePlane(width, depth, numPoints / 10)
  points.push(...basePoints)

  // Generate main mountain structure
  for (let i = 0; i < numPoints; i++) {
    const x = Math.random() * width - width / 2
    const z = Math.random() * depth - depth / 2

    // Calculate height based on distance to nearest peak
    let y = 0
    for (const peak of peakLocations) {
      const distanceToPeak = Math.sqrt((x - peak.x) ** 2 + (z - peak.z) ** 2)
      const peakInfluence = Math.max(0, 1 - distanceToPeak / (width / 2))
      y = Math.max(y, peak.height * peakInfluence)
    }

    // Add some noise to the height
    y += (Math.random() - 0.5) * roughness * maxHeight

    // Ensure the height is not negative
    y = Math.max(0, y)

    addPoint(x, y, z, points)
  }

  // Generate ridge lines
  for (let i = 0; i < 50; i++) {
    const startX = Math.random() * width - width / 2
    const startZ = Math.random() * depth - depth / 2
    const endX = startX + (Math.random() - 0.5) * width * 0.5
    const endZ = startZ + (Math.random() - 0.5) * depth * 0.5

    const steps = 100
    for (let j = 0; j < steps; j++) {
      const t = j / (steps - 1)
      const x = startX + (endX - startX) * t
      const z = startZ + (endZ - startZ) * t

      let y = 0
      for (const peak of peakLocations) {
        const distanceToPeak = Math.sqrt((x - peak.x) ** 2 + (z - peak.z) ** 2)
        const peakInfluence = Math.max(0, 1 - distanceToPeak / (width / 2))
        y = Math.max(y, peak.height * peakInfluence)
      }

      // Add some noise to the height for more natural-looking ridges
      y += (Math.random() - 0.5) * roughness * maxHeight * 0.5

      // Ensure the height is not negative
      y = Math.max(0, y)

      addPoint(x, y, z, points)
    }
  }

  return points
}

function generateBasePlane(width, depth, numPoints) {
  const points = []
  for (let i = 0; i < numPoints; i++) {
    const x = Math.random() * width - width / 2
    const z = Math.random() * depth - depth / 2
    const y = 0 // Base plane is at y = 0
    addPoint(x, y, z, points)
  }
  return points
}

function addPoint(x, y, z, points) {
  const color = new THREE.Color()
  if (y > 160) {
    // Stagger white points for snow effect
    if (Math.random() < 0.7) {
      color.setRGB(1, 1, 1) // White for peaks (snow)
    } else {
      color.setRGB(0.9, 0.9, 0.9) // Light gray for some variation in snow
    }
  } else if (y > 120) {
    color.setRGB(0.8, 0.8, 0.8) // Light gray for higher slopes
  } else if (y > 80) {
    color.setRGB(0.6, 0.6, 0.6) // Gray for mid slopes
  } else if (y > 40) {
    color.setRGB(0.4, 0.4, 0.4) // Dark gray for lower slopes
  } else {
    color.setRGB(0.2, 0.2, 0.2) // Darker gray for base
  }

  // Randomly assign some points as red (points of interest)
  const isRed = Math.random() < 0.005 // Reduced probability for red points
  if (isRed && y > 40) {
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
