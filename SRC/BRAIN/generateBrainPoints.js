import * as THREE from 'three';

function createNeuronPath(startPoint, branchCount = 3, depth = 4) {
    const points = [];
    const colors = [];

    function branch(start, direction, length, width, currentDepth) {
        if (currentDepth <= 0) return;

        const end = start.clone().add(direction.multiplyScalar(length));
        
        // Create points along the branch
        const pointCount = Math.floor(length * 20);
        for (let i = 0; i < pointCount; i++) {
            const t = i / pointCount;
            const pos = new THREE.Vector3().lerpVectors(start, end, t);
            
            // Add some natural variation
            pos.x += (Math.random() - 0.5) * width;
            pos.y += (Math.random() - 0.5) * width;
            pos.z += (Math.random() - 0.5) * width;

            // Ensure the point is within the brain shape
            const brainRadius = 3.5;
            if (pos.length() > brainRadius) {
                pos.normalize().multiplyScalar(brainRadius);
            }

            points.push(pos);

            // Color variation based on depth
            const color = new THREE.Color();
            const hue = 0.3 + (Math.random() * 0.1); // Green-yellow range
            const saturation = 0.5 + (Math.random() * 0.2);
            const lightness = 0.5 + (currentDepth / depth) * 0.3;
            color.setHSL(hue, saturation, lightness);
            colors.push(color);
        }

        // Create sub-branches
        const subBranches = Math.floor(Math.random() * 2) + 2;
        for (let i = 0; i < subBranches; i++) {
            const newDirection = new THREE.Vector3(
                direction.x + (Math.random() - 0.5),
                direction.y + (Math.random() - 0.5),
                direction.z + (Math.random() - 0.5)
            ).normalize();

            branch(
                end.clone(),
                newDirection,
                length * 0.7,
                width * 0.7,
                currentDepth - 1
            );
        }
    }

    // Create initial branches
    for (let i = 0; i < branchCount; i++) {
        const direction = new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
        ).normalize();

        branch(
            startPoint.clone(),
            direction,
            1.0,
            0.1,
            depth
        );
    }

    return { points, colors };
}

function brainShape(u, v) {
    // Increased base shape parameters
    const a = 3.0; // Width (increased from 2.5)
    const b = 3.5; // Height (increased from 3)
    const c = 2.5; // Depth (increased from 2)

    // Create the basic ellipsoid shape
    let x = a * Math.sin(u) * Math.cos(v);
    let y = b * Math.sin(u) * Math.sin(v);
    let z = c * Math.cos(u);

    // Add cortex folding effect
    const foldingScale = 0.35; // Slightly increased from 0.3
    const foldingFreq = 8;
    
    x += foldingScale * Math.sin(foldingFreq * u) * Math.cos(foldingFreq * v);
    y += foldingScale * Math.sin(foldingFreq * u + Math.PI/4) * Math.sin(foldingFreq * v);
    z += foldingScale * Math.cos(foldingFreq * u) * Math.sin(foldingFreq * v);

    return new THREE.Vector3(x, y, z);
}

export function generateBrainPoints(totalPoints) {
    const points = [];
    const colors = [];

    // Generate base brain structure points
    const structurePoints = Math.floor(totalPoints * 0.3);
    for (let i = 0; i < structurePoints; i++) {
        const u = Math.random() * Math.PI;
        const v = Math.random() * Math.PI * 2;
        
        const point = brainShape(u, v);
        
        // Add some randomness
        point.x += (Math.random() - 0.5) * 0.1;
        point.y += (Math.random() - 0.5) * 0.1;
        point.z += (Math.random() - 0.5) * 0.1;

        // Only add points if they're in the visible hemisphere
        if (point.x > -0.5) {
            points.push(point);

            // Create base structure color (blue-ish)
            const color = new THREE.Color();
            const hue = 0.6 + (Math.random() * 0.1); // Blue range
            const saturation = 0.5 + (Math.random() * 0.2);
            const lightness = 0.4 + (Math.random() * 0.2);
            color.setHSL(hue, saturation, lightness);
            colors.push(color);
        }
    }

    // Generate neuron pathways
    const neuronCount = 60; // Increased from 50
    for (let i = 0; i < neuronCount; i++) {
        // Random starting point within the brain volume
        const startPoint = brainShape(
            Math.random() * Math.PI,
            Math.random() * Math.PI * 2
        );

        const { points: neuronPoints, colors: neuronColors } = createNeuronPath(
            startPoint,
            3 + Math.floor(Math.random() * 3), // 3-5 branches
            3 + Math.floor(Math.random() * 2)  // 3-4 depth
        );

        points.push(...neuronPoints);
        colors.push(...neuronColors);
    }

    // Add some yellow highlight points
    const highlightCount = Math.floor(totalPoints * 0.1);
    for (let i = 0; i < highlightCount; i++) {
        const basePointIndex = Math.floor(Math.random() * points.length);
        const basePoint = points[basePointIndex];
        
        const newPoint = basePoint.clone();
        // Add very small random offset
        newPoint.x += (Math.random() - 0.5) * 0.05;
        newPoint.y += (Math.random() - 0.5) * 0.05;
        newPoint.z += (Math.random() - 0.5) * 0.05;
        
        points.push(newPoint);

        // Yellow highlight color
        const color = new THREE.Color();
        const hue = 0.15 + (Math.random() * 0.05); // Yellow range
        const saturation = 0.6 + (Math.random() * 0.2);
        const lightness = 0.6 + (Math.random() * 0.2);
        color.setHSL(hue, saturation, lightness);
        colors.push(color);
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