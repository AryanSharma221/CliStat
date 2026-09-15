function getAABBIntersection(ray, objectBBox) {
    if (!objectBBox) return { hit: false, area: 0 };
    const clippedX1 = Math.max(ray.x1, objectBBox.x);
    const clippedX2 = Math.min(ray.x2, objectBBox.x + objectBBox.width);
    const clippedY1 = Math.max(ray.y1, objectBBox.y);
    const clippedY2 = Math.min(ray.y2, objectBBox.y + objectBBox.height);
    if (clippedX1 < clippedX2 && clippedY1 < clippedY2) {
        return { hit: true, area: (clippedX2 - clippedX1) * (clippedY2 - clippedY1) };
    }
    return { hit: false, area: 0 };
}

function detectAllIntersections(rays, objects) {
    const results = [];
    for (const obj of objects) {
        let totalArea = 0, hitCount = 0;
        for (const ray of rays) {
            const result = getAABBIntersection(ray, obj.bbox);
            if (result.hit) { totalArea += result.area; hitCount++; }
        }
        results.push({
            objectId: obj.id, isIntersecting: hitCount > 0,
            intersectArea: totalArea, thermalMass: obj.thermalMass,
            roomId: obj.roomId
        });
    }
    return results;
}\n