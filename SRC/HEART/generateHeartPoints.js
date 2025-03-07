import * as THREE from "three"

function createHeartShape(t, u, scale = 1) {
  const x = scale * 16 * Math.pow(Math.sin(t), 3) * Math.cos(u)
  const y = scale * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))
  const z = scale * 8 * Math.pow(Math.sin(t), 3) * Math.sin(u)

  return new THREE.Vector3(x, y, z)
}

function createHeartColor(position, noise) {
  // Softer color palette with reds, pinks, and purples
  const colors = [
    new THREE.Color(0x8B0000), // red
  ]
  // Use position to create smooth color transitions
  const colorIndex = Math.floor((Math.sin(position.x * 3 + position.y * 2) + 1) * (colors.length / 2))
  const baseColor = colors[colorIndex % colors.length].clone()
  
  // ADD YOUR BRIGHTNESS INCREASE CODE HERE
  // Increase brightness by a factor
  baseColor.r = Math.min(1.0, baseColor.r * 1.5);
  baseColor.g = Math.min(1.0, baseColor.g * 1.5);
  baseColor.b = Math.min(1.0, baseColor.b * 1.5);
  
  // Add subtle variation
  const variation = 0.1
  baseColor.r += (Math.random() - 0.5) * variation
  baseColor.g += (Math.random() - 0.5) * variation
  baseColor.b += (Math.random() - 0.5) * variation
  return baseColor
}

export function generateHeartPoints(totalPoints = 200000) {
  const points = []
  const scale = 0.1
  const layers = 200 // Increased for more density
  const pointsPerLayer = Math.floor(totalPoints / layers)

  for (let i = 0; i < layers; i++) {
    const t = (i / layers) * Math.PI * 2

    // Reduced skip area for more fullness
    if (t > Math.PI * 0.45 && t < Math.PI * 0.55) continue

    for (let j = 0; j < pointsPerLayer; j++) {
      const u = (j / pointsPerLayer) * Math.PI * 2

      // Create points throughout the volume, not just on surface
      const radiusScale = 0.7 + Math.random() * 0.3 // Points from 70% to 100% of radius
      const positionOuter = createHeartShape(t, u, scale)
      positionOuter.multiplyScalar(radiusScale)

      // Add subtle jitter
      const jitter = 0.02
      positionOuter.x += (Math.random() - 0.5) * jitter
      positionOuter.y += (Math.random() - 0.5) * jitter
      positionOuter.z += (Math.random() - 0.5) * jitter

      const color = createHeartColor(positionOuter, 0.1)

      points.push({
        position: positionOuter,
        color: color,
        size: 0.015 + Math.random() * 0.005, // Varied sizes for depth
      })
    }
  }

  // Add highlight points
  const highlightPoints = Math.floor(totalPoints * 0.01)
  for (let i = 0; i < highlightPoints; i++) {
    const t = Math.random() * Math.PI * 2
    const u = Math.random() * Math.PI * 2

    if (t > Math.PI * 0.45 && t < Math.PI * 0.55) continue

    const position = createHeartShape(t, u, scale)
    position.multiplyScalar(1.02)

    points.push({
      position,
      color: new THREE.Color(0xffc0cb), // Soft pink for highlights
      size: 0.02,
    })
  }

  return points
}
