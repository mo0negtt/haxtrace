export class MapData {
    constructor() {
        this.data = {
            name: "New Stadium",
            width: 420,
            height: 200,
            bg: { color: "718C5A" },
            vertexes: [
                { x: -236, y: -110.9921875 },
                { x: -86, y: -111.9921875 },
                { x: -313, y: 36.0078125 },
                { x: -232, y: -72.9921875 }
            ],
            segments: [
                { v0: 0, v1: 1 },
                { v0: 2, v1: 3 }
            ]
        };
    }

    setName(name) {
        this.data.name = name;
    }

    setBgColor(color) {
        this.data.bg.color = color.substring(1);
    }

    addVertex(x, y) {
        this.data.vertexes.push({ x: Math.round(x), y: Math.round(y) });
    }

    deleteVertex(index) {
        // Remove segments that reference this vertex
        this.data.segments = this.data.segments.filter(segment => 
            segment.v0 !== index && segment.v1 !== index
        );
        
        // Update segment indices
        this.data.segments.forEach(segment => {
            if (segment.v0 > index) segment.v0--;
            if (segment.v1 > index) segment.v1--;
        });
        
        // Remove vertex
        this.data.vertexes.splice(index, 1);
    }

    addSegment(v0, v1, color, curve) {
        if (v0 !== v1) {
            const segment = { v0, v1 };
            
            if (color !== '#000000') {
                segment.color = color.substring(1);
            }
            
            if (curve !== 0) {
                segment.curve = curve;
            }
            
            this.data.segments.push(segment);
        }
    }

    deleteSegment(index) {
        this.data.segments.splice(index, 1);
    }

    getVertexAt(x, y, threshold) {
        let closestVertex = -1;
        let closestDistance = Infinity;
        
        this.data.vertexes.forEach((vertex, index) => {
            const distance = Math.sqrt((vertex.x - x) ** 2 + (vertex.y - y) ** 2);
            if (distance < threshold && distance < closestDistance) {
                closestDistance = distance;
                closestVertex = index;
            }
        });
        
        return closestVertex;
    }

    setData(newData) {
        this.data = newData;
    }

    getData() {
        return this.data;
    }
}
