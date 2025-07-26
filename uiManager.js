export class UIManager {
    constructor(mapData, renderer) {
        this.mapData = mapData;
        this.renderer = renderer;
        this.tools = null; // Will be set from main
    }

    setTools(tools) {
        this.tools = tools;
    }

    updateUI() {
        this.updateVertexList();
        this.updateSegmentList();
        this.updateCurveEditor();
    }

    updateVertexList() {
        const container = document.getElementById('vertexList');
        container.innerHTML = '';
        
        const data = this.mapData.getData();
        data.vertexes.forEach((vertex, index) => {
            const div = document.createElement('div');
            div.className = 'vertex-item';
            div.innerHTML = `
                <span>V${index}: (${vertex.x}, ${vertex.y})</span>
                <button class="delete-btn" onclick="deleteVertex(${index})">×</button>
            `;
            container.appendChild(div);
        });
    }

    updateSegmentList() {
        const container = document.getElementById('segmentList');
        container.innerHTML = '';
        
        const data = this.mapData.getData();
        data.segments.forEach((segment, index) => {
            const div = document.createElement('div');
            div.className = 'segment-item';
            const curveText = segment.curve ? ` (curve: ${segment.curve})` : '';
            div.innerHTML = `
                <span>S${index}: V${segment.v0} → V${segment.v1}${curveText}</span>
                <button class="delete-btn" onclick="deleteSegment(${index})">×</button>
            `;
            container.appendChild(div);
        });
    }

    updateZoomDisplay() {
        document.getElementById('zoomLevel').textContent = Math.round(this.renderer.zoom * 100) + '%';
    }

    updateInputs() {
        const data = this.mapData.getData();
        document.getElementById('mapName').value = data.name || 'New Stadium';
        document.getElementById('bgColor').value = '#' + (data.bg.color || '718C5A');
    }

    updateCurveEditor() {
        if (!this.tools) return;

        const panel = document.getElementById('curveEditorPanel');
        const controls = document.getElementById('curveEditorControls');
        const message = document.getElementById('multipleSegmentsMessage');
        const curveInput = document.getElementById('curveValue');
        const curveSlider = document.getElementById('curveSlider');

        const selection = this.tools.selectedSegments;

        if (selection.length === 0) {
            panel.style.display = 'none';
            return;
        }

        panel.style.display = 'block';

        if (selection.length > 1) {
            controls.style.display = 'none';
            message.style.display = 'block';
        } else {
            controls.style.display = 'block';
            message.style.display = 'none';

            const segmentIndex = selection[0];
            const data = this.mapData.getData();
            const segment = data.segments[segmentIndex];

            const curve = segment.curve || 0;
            curveInput.value = curve;
            curveSlider.value = curve;
        }
    }
}