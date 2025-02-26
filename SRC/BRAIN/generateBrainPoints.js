import * as THREE from 'three';

function brainHemisphereShape(u, v, scale = 1, isLeftHemisphere = true) {
    // Base ellipsoid parameters
    const a = 3.0 * scale;  // width
    const b = 3.5 * scale;  // height
    const c = 2.5 * scale;  // depth

    // Create base ellipsoid point
    let x = a * Math.sin(u) * Math.cos(v);
    let y = b * Math.sin(u) * Math.sin(v);
    let z = c * Math.cos(u);

    // Add folding patterns to create sulci and gyri
    const foldingScale = 0.4 * scale;
    const foldingFreq = 8;

    x += foldingScale * Math.sin(foldingFreq * u) * Math.cos(foldingFreq * v);
    y += foldingScale * Math.sin(foldingFreq * u + Math.PI/3) * Math.sin(foldingFreq * v);
    z += foldingScale * Math.cos(foldingFreq * u - Math.PI/6) * Math.sin(foldingFreq * v + Math.PI/4);

    // Add longitudinal fissure (separation between hemispheres)
    const hemisphereSeparation = 0.4 * scale;
    
    // Apply hemisphere separation and mirroring
    if (isLeftHemisphere) {
        x = -Math.abs(x) - hemisphereSeparation;
    } else {
        x = Math.abs(x) + hemisphereSeparation;
    }

    // Flatten the bottom part to create a flat base (no brain stem)
    if (y < -1.5 * scale) {
        y = -1.5 * scale;
    }

    return new THREE.Vector3(x, y, z);
}

function isInsideBrainShape(point, scale = 1) {
    // Convert point to spherical coordinates
    const radius = point.length();
    if (radius === 0) return true; // Center point is inside

    const theta = Math.acos(point.z / radius);
    const phi = Math.atan2(point.y, point.x);

    // Determine which hemisphere to check against
    const isLeftHemisphere = point.x < 0;
    
    // Get the brain surface point at these angles
    const surfacePoint = brainHemisphereShape(theta, phi, scale, isLeftHemisphere);
    
    // For points near the center (longitudinal fissure), check both hemispheres
    if (Math.abs(point.x) < 0.5 * scale) {
        const leftPoint = brainHemisphereShape(theta, phi, scale, true);
        const rightPoint = brainHemisphereShape(theta, phi, scale, false);
        
        // If point is in the gap between hemispheres, it's outside
        if (point.x > leftPoint.x && point.x < rightPoint.x) {
            return false;
        }
    }

    // Calculate distance from point to surface in the same direction
    const direction = surfacePoint.clone().normalize();
    const distanceToSurface = surfacePoint.length();
    const pointProjection = direction.multiplyScalar(radius);
    
    // Point is inside if its radius is less than the surface radius in that direction
    return radius <= distanceToSurface * 0.95; // 0.95 to keep slightly inside the surface
}

function createNeuralPathway(brainScale) {
    const points = [];
    const colors = [];
    
    // Start from within one of the hemispheres
    const isLeftStart = Math.random() > 0.5;
    const hemisphereSeparation = 0.4 * brainScale;
    const startX = isLeftStart ? -1.5 * brainScale - hemisphereSeparation : 1.5 * brainScale + hemisphereSeparation;
    const start = new THREE.Vector3(startX, 0, 0);
    
    function createBranch(origin, direction, remainingDepth, branchLength) {
        if (remainingDepth <= 0) return;
        
        const steps = 20;
        let currentPoint = origin.clone();
        
        for (let i = 0; i < steps; i++) {
            // Add some randomness to direction while maintaining general direction
            const curve = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2
            );
            direction.add(curve).normalize();
            
            // Create next point along the direction
            const nextPoint = currentPoint.clone().add(
                direction.clone().multiplyScalar(branchLength / steps)
            );
            
            // Check if next point is still inside the brain
            if (isInsideBrainShape(nextPoint, brainScale)) {
                points.push(nextPoint.clone());
                
                // White/gray coloring for neural pathways
                const color = new THREE.Color();
                const hue = 0; // Neutral
                const saturation = 0; // No saturation for white/gray
                const lightness = 0.7 + Math.random() * 0.3; // Light gray to white range
                color.setHSL(hue, saturation, lightness);
                colors.push(color);
                
                currentPoint = nextPoint;
                
                // Create sub-branches occasionally
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
                        
                        // Don't let branches cross the longitudinal fissure too easily
                        if ((isLeftStart && newDirection.x > 0) || (!isLeftStart && newDirection.x < 0)) {
                            newDirection.x *= 0.2; // Reduce x component
                        }
                        
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
    
    // Create initial branches in the starting hemisphere
    const initialBranches = 10;
    for (let i = 0; i < initialBranches; i++) {
        const u = (Math.random() * Math.PI);
        const v = (Math.random() * Math.PI * 2);
        
        // Target a point within the same hemisphere
        const targetPoint = brainHemisphereShape(u, v, brainScale * 0.8, isLeftStart);
        const direction = targetPoint.clone().sub(start).normalize();
        
        createBranch(
            start,
            direction,
            3,
            targetPoint.clone().sub(start).length()
        );
    }
    
    // Create a few branches that cross between hemispheres (corpus callosum)
    if (Math.random() > 0.3) { // 70% chance to create interhemispheric connections
        const bridgeBranches = 2 + Math.floor(Math.random() * 3); // 2-4 branches
        for (let i = 0; i < bridgeBranches; i++) {
            const u = (Math.random() * Math.PI * 0.5) + Math.PI * 0.25; // Mid-region
            const v = (Math.random() * Math.PI * 0.5) + Math.PI * 0.75; // Front-middle region
            
            // Target a point in the opposite hemisphere
            const targetPoint = brainHemisphereShape(u, v, brainScale * 0.8, !isLeftStart);
            const bridgeStart = new THREE.Vector3(start.x, start.y + 1, start.z); // Start slightly higher
            const direction = targetPoint.clone().sub(bridgeStart).normalize();
            
            createBranch(
                bridgeStart,
                direction,
                2,
                targetPoint.clone().sub(bridgeStart).length() * 1.2
            );
        }
    }
    
    return { points, colors };
}

export function generateBrainPoints(totalPoints) {
    const points = [];
    const colors = [];

    const brainScale = 1;
    
    // Generate points for brain surface structure
    const leftHemispherePoints = Math.floor(totalPoints * 0.2);
    const rightHemispherePoints = Math.floor(totalPoints * 0.2);
    
    // Left hemisphere
    for (let i = 0; i < leftHemispherePoints; i++) {
        const u = Math.random() * Math.PI;
        const v = Math.random() * Math.PI * 2;
        const point = brainHemisphereShape(u, v, brainScale, true);
        
        // Only use points that create the proper shape
        if (point.y > -1.5 * brainScale) {
            points.push(point);
            
            // Color gradation - left hemisphere will be slightly different hue
            const color = new THREE.Color();
            const hue = 0.58 + (Math.random() * 0.08); // Slightly more cyan-blue
            const saturation = 0.6 + (Math.random() * 0.2);
            const lightness = 0.35 + (Math.random() * 0.2);
            color.setHSL(hue, saturation, lightness);
            colors.push(color);
        }
    }
    
    // Right hemisphere
    for (let i = 0; i < rightHemispherePoints; i++) {
        const u = Math.random() * Math.PI;
        const v = Math.random() * Math.PI * 2;
        const point = brainHemisphereShape(u, v, brainScale, false);
        
        // Only use points that create the proper shape
        if (point.y > -1.5 * brainScale) {
            points.push(point);
            
            // Color gradation - right hemisphere will be slightly different hue
            const color = new THREE.Color();
            const hue = 0.62 + (Math.random() * 0.08); // Slightly more blue-violet
            const saturation = 0.6 + (Math.random() * 0.2);
            const lightness = 0.35 + (Math.random() * 0.2);
            color.setHSL(hue, saturation, lightness);
            colors.push(color);
        }
    }

    // Generate neural pathways (white/gray points)
    const pathwayCount = 25; // More pathways for detailed internal structure
    for (let i = 0; i < pathwayCount; i++) {
        const { points: pathPoints, colors: pathColors } = createNeuralPathway(brainScale);
        points.push(...pathPoints);
        colors.push(...pathColors);
    }

    // Add some internal structure points
    const internalPoints = Math.floor(totalPoints * 0.1);
    for (let i = 0; i < internalPoints; i++) {
        // Create a random point within the brain volume
        const theta = Math.random() * Math.PI;
        const phi = Math.random() * Math.PI * 2;
        const radius = (Math.random() * 0.8 + 0.1) * brainScale * 3; // 10-90% of the way to surface
        
        const x = radius * Math.sin(theta) * Math.cos(phi);
        const y = radius * Math.sin(theta) * Math.sin(phi);
        const z = radius * Math.cos(theta);
        
        const point = new THREE.Vector3(x, y, z);
        
        // Only use points that are inside the brain shape
        if (isInsideBrainShape(point, brainScale)) {
            points.push(point);
            
            // Interior points are more white/light gray
            const color = new THREE.Color();
            const hue = 0.6 + (Math.random() * 0.1); // Blue hue
            const saturation = 0.1 + (Math.random() * 0.3); // Less saturated
            const lightness = 0.5 + (Math.random() * 0.3); // Lighter
            color.setHSL(hue, saturation, lightness);
            colors.push(color);
        }
    }

    return { positions: points, colors: colors };
}

export function generateRedPoints(count, brainPoints) {
    const redPoints = [];
    const usedIndices = new Set();

    // Ensure points are well-distributed across both hemispheres
    const leftHemisphereCount = Math.ceil(count / 2);
    const rightHemisphereCount = count - leftHemisphereCount;
    
    // Find points in left hemisphere
    let leftCount = 0;
    while (leftCount < leftHemisphereCount) {
        const index = Math.floor(Math.random() * brainPoints.length);
        if (!usedIndices.has(index) && brainPoints[index].x < 0) {
            usedIndices.add(index);
            const point = brainPoints[index].clone();
            redPoints.push({
                position: point,
                color: new THREE.Color(1, 0, 0),
                size: 0.2
            });
            leftCount++;
        }
    }
    
    // Find points in right hemisphere
    let rightCount = 0;
    while (rightCount < rightHemisphereCount) {
        const index = Math.floor(Math.random() * brainPoints.length);
        if (!usedIndices.has(index) && brainPoints[index].x > 0) {
            usedIndices.add(index);
            const point = brainPoints[index].clone();
            redPoints.push({
                position: point,
                color: new THREE.Color(1, 0, 0),
                size: 0.2
            });
            rightCount++;
        }
    }

    return redPoints;
}
