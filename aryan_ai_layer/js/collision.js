// js/collision.js

// 2D Axis-Aligned Bounding Box (AABB) Ray intersection
function getAABBIntersection(ray, objectBBox) {
    const minX = objectBBox.x;
    const maxX = objectBBox.x + objectBBox.width;
    const minY = objectBBox.y;
    const maxY = objectBBox.y + objectBBox.height;

    // Line clipping against AABB (Cohen-Sutherland inspired simplification for segment overlap)
    const clippedX1 = Math.max(Math.min(ray.x1, ray.x2), minX);
    const clippedX2 = Math.min(Math.max(ray.x1, ray.x2), maxX);
    const clippedY1 = Math.max(Math.min(ray.y1, ray.y2), minY);
    const clippedY2 = Math.min(Math.max(ray.y1, ray.y2), maxY);

    // If the clipped segment is valid, we have a hit
    if (clippedX1 < clippedX2 && clippedY1 < clippedY2) {
        return { 
            hit: true, 
            area: (clippedX2 - clippedX1) * (clippedY2 - clippedY1) 
        };
    }
    return { hit: false, area: 0 };
}

// Scans all rays against all objects to find thermal hits
function detectAllIntersections(rays, objects) {
    const results = [];
    
    for (const obj of objects) {
        let totalArea = 0;
        let hitCount = 0;
        
        for (const ray of rays) {
            const result = getAABBIntersection(ray, obj.bbox);
            if (result.hit) { 
                totalArea += result.area * ray.intensity; 
                hitCount++; 
            }
        }
        
        results.push({
            objectId: obj.id, 
            isIntersecting: hitCount > 0,
            intersectArea: totalArea, 
            thermalMass: obj.thermalMass,
            roomId: obj.roomId || 'unknown'
        });
    }
    
    return results;
}
