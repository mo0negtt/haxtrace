export class Tools {
    constructor() {
        this.currentTool = 'vertex';
        this.selectedVertices = [];
        this.selectedSegments = [];
    }

    setTool(tool) {
        this.currentTool = tool;
        this.selectedVertices = [];
        this.clearSegmentSelection();
        
        // Update tool button states
        document.querySelectorAll('.tool-button').forEach(btn => btn.classList.remove('active'));
        document.getElementById(tool + 'Tool').classList.add('active');
        
        // Update cursor
        document.getElementById('canvas').style.cursor = tool === 'pan' ? 'grab' : 'crosshair';
    }

    selectVertex(index) {
        this.selectedVertices.push(index);
    }

    clearSelection() {
        this.selectedVertices = [];
    }

    selectSegment(index, multiSelect = false) {
        if (!multiSelect) {
            this.clearSegmentSelection();
        }
        if (!this.selectedSegments.includes(index)) {
            this.selectedSegments.push(index);
        }
    }

    clearSegmentSelection() {
        this.selectedSegments = [];
    }
}
