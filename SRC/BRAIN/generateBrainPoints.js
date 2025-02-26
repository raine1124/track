import * as THREE from 'three';

function brainShape(u, v, scale = 1) {
    const a = 3.0 * scale;
    const b = 3.5 * scale;
    const c = 2.5 * scale;

    let x = a * Math.sin(u) * Math.cos(v);
    let y = b * Math.sin(u) * Math.sin(v);
    let z = c * Math.cos(u);

    const foldingScale = 0.35 * scale;
    const foldingFreq = 8;

    x += foldingScale * Math.sin(foldingFreq * u) * Math.cos(foldingFreq * v);
    y += foldingScale * Math.sin(foldingFreq * u + Math.PI/4) * Math.sin(foldingFreq * v);
    z += foldingScale * Math.cos(foldingFreq * u) * Math.sin(foldingFreq * v);

    return new THREE.Vector3(x, y, z);
}

function isInsideBrainShape(point, scale = 1) {
    // Convert point to spherical coordinates
    const radius = point.length();
    if (radius === 0) return true; // Center point is always inside

    const theta = Math.acos(point.z / radius);
    const phi = Math.atan2(point.y, point.x);

    // Get the brain surface point at these angles
    const surfacePoint = brainShape(theta, phi, scale);
    const surfaceRadius = surfacePoint.length();

    // Point is inside if its radius is less than the surface radius at that angle
    return radius <= surfaceRadius * 0.9; // 0.9 to keep slightly inside the surface
}

function createNeuralPathway(brainScale) {
    const points = [];
    const colors = [];
    
    const start = new THREE.Vector3(0, 0, 0);
    
    function createBranch(origin, direction, remainingDepth, branchLength) {
        if (remainingDepth <= 0) return;
        
        const steps = 20;
        let currentPoint = origin.clone();
        
        for (let i = 0; i < steps; i++) {
            const curve = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2
            );
            direction.add(curve).normalize();
            
            const nextPoint = currentPoint.clone().add(
                direction.clone().multiplyScalar(branchLength / steps)
            );
            
            if (isInsideBrainShape(nextPoint, brainScale)) {
                points.push(nextPoint.clone());
                
                // New white/gray coloring
                const color = new THREE.Color();
                const hue = 0; // Neutral for white/gray
                const saturation = 0; // No saturation for white/gray
                const lightness = 1 + Math.random() * 0.5; // Ranges from mid-gray to white
                color.setHSL(hue, saturation, lightness);
                colors.push(color);
                
                currentPoint = nextPoint;
                
                if (i > 0 && i % 5 === 0 && remainingDepth > 1) {
                    const subBranches = 1 + Math.floor(Math.random() * 2);
                    for (let j = 0; j < subBranches; j++) {
                        const newDirection = direction.clone()
                            .add(new THREE.Vector3(
                                Math.random() - 0.5,
                                Math.random() - 0.5,
                                Math.random() - 0.5
                            ))
                            .normalize();
                        
                        createBranch(
                            currentPoint.clone(),
                            newDirection,
                            remainingDepth - 1,
                            branchLength * 0.7
                        );
                    }
                }
            }
        }
    }
    
    const initialBranches = 12;
    for (let i = 0; i < initialBranches; i++) {
        const u = (Math.random() * Math.PI);
        const v = (Math.random() * Math.PI * 2);
        
        const targetPoint = brainShape(u, v, brainScale * 0.8);
        const direction = targetPoint.clone().normalize();
        
        createBranch(
            start,
            direction,
            4,
            targetPoint.length()
        );
    }
    
    return { points, colors };
}

export function generateBrainPoints(totalPoints) {
    const points = [];
    const colors = [];

    const brainScale = 1;

    // Increased density for brain surface structure
    const structurePoints = Math.floor(totalPoints * 0.4); // Increased from 0.3
    for (let i = 0; i < structurePoints; i++) {
        const u = Math.random() * Math.PI;
        const v = Math.random() * Math.PI * 2;
        const point = brainShape(u, v, brainScale);
        
        if (point.x > -0.5) {
            points.push(point);
            
            // Lighter blue coloring
            const color = new THREE.Color();
            const hue = 0.6 + (Math.random() * 0.1); // Blue base
            const saturation = 0.3 + (Math.random() * 0.2); // Reduced saturation for lighter blue
            const lightness = 0.4 + (Math.random() * 0.2); // Increased lightness
            color.setHSL(hue, saturation, lightness);
            colors.push(color);
        }
    }

    // Generate neural pathways (white/gray points)
    const pathwayCount = 15;
    for (let i = 0; i < pathwayCount; i++) {
        const { points: pathPoints, colors: pathColors } = createNeuralPathway(brainScale);
        points.push(...pathPoints);
        colors.push(...pathColors);
    }

    return { positions: points, colors: colors };
}

export function generateRedPoints(count, brainPoints) {
    const redPoints = [];
    const usedIndices = new Set();

    for (let i = 0; i < count; i++) {
        let index;
        do {
            index = Math.floor(Math.random() * brainPoints.length);
        } while (usedIndices.has(index));

        usedIndices.add(index);
        const point = brainPoints[index].clone();
        redPoints.push({
            position: point,
            color: new THREE.Color(1, 0, 0),
            size: 0.2
        });
    }

    return redPoints;
}