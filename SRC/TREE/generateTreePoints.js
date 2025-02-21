import * as THREE from 'three';

function createBranchPoint(startPoint, endPoint, progress) {
    return new THREE.Vector3().lerpVectors(startPoint, endPoint, progress);
}

function createBarkTexture(height, angle) {
    const largeScale = Math.sin(height * 15 + angle * 8) * 0.02;
    const mediumScale = Math.sin(height * 30 + angle * 4) * 0.01;
    const smallScale = Math.sin(height * 50 + angle * 12) * 0.005;
    const microDetail = (Math.random() - 0.5) * 0.01;
    
    const baseColor = 0.15; // Much darker shade of grey
    return baseColor + largeScale + mediumScale + smallScale + microDetail;
}

function createSolidTrunkLayer(height, radius, pointsPerLayer) {
    const points = [];
    const radiusStep = radius / 16; // Increased density for more solid appearance
    const angleStep = (Math.PI * 2) / pointsPerLayer;
    
    for (let r = 0; r <= radius; r += radiusStep) {
        const circumferencePoints = Math.max(6, Math.floor((r / radius) * pointsPerLayer));
        const innerDarkness = 1 - (r / radius) * 0.2; // Less variation for more solid appearance
        
        for (let i = 0; i < circumferencePoints; i++) {
            const angle = i * (Math.PI * 2 / circumferencePoints);
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;
            
            const barkColor = createBarkTexture(height, angle) * innerDarkness;
            points.push({
                position: new THREE.Vector3(x, height, z),
                color: new THREE.Color(barkColor, barkColor, barkColor),
                isActive: false
            });
        }
    }
    
    return points;
}

function createNeedleCluster(center, size, orientation) {
    const points = [];
    const needleCount = 40; // Increased for denser coverage
    
    for (let i = 0; i < needleCount; i++) {
        const angle = (i / needleCount) * Math.PI * 2;
        const length = size * (0.8 + Math.random() * 0.4);
        
        const needlePoints = 8; // Increased for better coverage
        for (let j = 0; j < needlePoints; j++) {
            const progress = j / needlePoints;
            const point = new THREE.Vector3(
                Math.cos(angle) * size * 0.1 * progress,
                progress * length,
                Math.sin(angle) * size * 0.1 * progress
            );
            
            point.applyEuler(orientation);
            point.add(center);
            
            const needleColor = 0.4 + (Math.random() - 0.5) * 0.1;
            points.push({
                position: point,
                color: new THREE.Color(needleColor, needleColor, needleColor),
                isActive: false
            });
        }
    }
    return points;
}

export function generateTreePoints(totalPoints, activePoints) {
    const points = []
    const activeIndices = new Set()
    
    while (activeIndices.size < activePoints) {
        activeIndices.add(Math.floor(Math.random() * totalPoints));
    }

    const trunkHeight = 7.0;
    const baseWidth = 0.4;
    const trunkTaper = 0.8;
    const branchLayers = 40;
    
    // Generate solid trunk
    for (let i = 0; i < trunkHeight * 97; i++) {
        const height = i / 100;
        const progress = height / trunkHeight;
        const radius = baseWidth * (1 - progress * trunkTaper);
        
        const trunkPoints = createSolidTrunkLayer(height, radius, 30);
        points.push(...trunkPoints);
    }


    // Generate branches and needles
    for (let layer = 0; layer < branchLayers; layer++) {
        const heightProgress = layer / branchLayers;
        const height = 1 + heightProgress * (trunkHeight - 1);
        
        const maxBranchLength = 3.0 * (1 - heightProgress);
        const branchesInLayer = Math.floor(10 + (1 - heightProgress) * 4); 
        
        for (let i = 0; i < branchesInLayer; i++) {
            const angle = (i / branchesInLayer) * Math.PI * 2 + layer * 0.5 + Math.random() * 0.2;
            const branchAngle = Math.PI / 2 - (Math.PI / 4) * (1 - heightProgress) + (Math.random() - 0.5) * 0.2;
            
            const start = new THREE.Vector3(0, height, 0);
            const end = new THREE.Vector3(
                Math.cos(angle) * maxBranchLength * (0.8 + Math.random() * 0.4),
                height + Math.sin(branchAngle) * 0.5,
                Math.sin(angle) * maxBranchLength * (0.8 + Math.random() * 0.4)
            );
            
            const branchPoints = 25;
            for (let j = 0; j < branchPoints; j++) {
                const progress = j / branchPoints;
                const branchPoint = createBranchPoint(start, end, progress);
                
                const branchRadius = 0.08 * (1 - progress * 0.5);
                const branchCircumference = 8;
                
                for (let k = 0; k < branchCircumference; k++) {
                    const branchAngle = (k / branchCircumference) * Math.PI * 2;
                    const offset = new THREE.Vector3(
                        Math.cos(branchAngle) * branchRadius,
                        0,
                        Math.sin(branchAngle) * branchRadius
                    );
                    
                    const finalPoint = branchPoint.clone().add(offset);
                    const branchColor = 0.001 + (Math.random() - 0.5) * 0.05;
                    points.push({
                        position: finalPoint,
                        color: new THREE.Color(branchColor, branchColor, branchColor),
                        isActive: activeIndices.has(points.length)
                    });
                }
                
                // Add needle clusters all along the branch
                const orientations = [
                    new THREE.Euler(Math.PI / 2 + (Math.random() - 0.5) * 0.3, angle + Math.PI / 2, 0),
                    new THREE.Euler(-Math.PI / 2 + (Math.random() - 0.5) * 0.3, angle + Math.PI / 2, 0),
                    new THREE.Euler(0, angle + Math.PI / 2, Math.PI / 2 + (Math.random() - 0.5) * 0.3)
                ];
                
                orientations.forEach(orientation => {
                    const clusterOffset = new THREE.Vector3(
                        (Math.random() - 0.5) * 0.1,
                        (Math.random() - 0.5) * 0.1,
                        (Math.random() - 0.5) * 0.1
                    );
                    
                    const needlePoints = createNeedleCluster(
                        branchPoint.clone().add(clusterOffset),
                        0.2 * (1 - progress * 0.5),
                        orientation
                    );
                    points.push(...needlePoints);
                });
            }
        }
    }

const redPoints = [];

    // Add red points
const redPointSize = 0.2 // Increased size for better visibility
const redPointPositions = []
for (let i = 0; i < 3; i++) {
  let attempts = 0
  let position
  do {
    const randomIndex = Math.floor(Math.random() * points.length)
    position = points[randomIndex].position.clone()
    position.y += 1 // Move the point up by 1 unit
    attempts++
  } while (redPointPositions.some((p) => p.distanceTo(position) < 2) && attempts < 100)

  if (attempts < 100) {
    redPointPositions.push(position)
    redPoints.push({
      position: position,
      color: new THREE.Color(1, 0, 0), // Red color
      isActive: false,
      size: redPointSize,
    })
  }
}

    return [...points, ...redPoints];
}