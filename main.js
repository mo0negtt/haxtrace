import { MapData } from './mapData.js';
import { Tools } from './tools.js';
import { Renderer } from './renderer.js';
import { UIManager } from './uiManager.js';
import { ImportExport } from './importExport.js';

// Global application state
let canvas, ctx;
let mapData = new MapData();
let tools = new Tools();
let renderer;
let uiManager;
let importExport;

// Right-click interaction state
let isDraggingVertex = false;
let isDraggingSegment = false;
let draggedVertexIndex = -1;
let draggedSegmentIndex = -1;
let dragStartX = 0;
let dragStartY = 0;

// Initialize the application
function init() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    // Initialize modules
    renderer = new Renderer(canvas, ctx);
    renderer.setTools(tools); // Pass tools to renderer
    uiManager = new UIManager(mapData, renderer);
    uiManager.setTools(tools); // Pass tools to UIManager
    importExport = new ImportExport(mapData, uiManager, renderer);

    // Set up canvas event listeners
    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel);
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    // Set up UI event listeners
    document.getElementById('mapName').addEventListener('input', () => {
        mapData.setName(document.getElementById('mapName').value);
    });
    document.getElementById('bgColor').addEventListener('input', () => {
        mapData.setBgColor(document.getElementById('bgColor').value);
        renderer.render(mapData);
    });
    document.getElementById('bgImage').addEventListener('change', (e) => {
        renderer.loadBackgroundImage(e);
    });
    document.getElementById('bgOpacity').addEventListener('input', (e) => {
        renderer.updateBgOpacity(parseFloat(e.target.value));
    });
    document.getElementById('importFile').addEventListener('change', (e) => {
        importExport.handleImportFile(e);
    });

    // Background image scale listeners
    const bgScaleValueInput = document.getElementById('bgScaleValue');
    const bgScaleSliderInput = document.getElementById('bgScaleSlider');

    const updateBgScaleUI = (scale) => {
        bgScaleValueInput.value = scale.toFixed(1); // Round to 1 decimal place for display
        bgScaleSliderInput.value = scale.toFixed(1);
    };

    bgScaleValueInput.addEventListener('input', (e) => {
        let value = parseFloat(e.target.value);
        if (isNaN(value)) value = 1.0; // Default if input is invalid
        renderer.updateBgScale(value);
        updateBgScaleUI(renderer.bgScale); // Update both inputs to reflect clamped value
    });

    bgScaleSliderInput.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        renderer.updateBgScale(value);
        updateBgScaleUI(renderer.bgScale); // Update both inputs to reflect clamped value
    });

    // Curve editor listeners
    const curveValueInput = document.getElementById('curveValue');
    const curveSliderInput = document.getElementById('curveSlider');

    const updateCurve = (value) => {
        let clampedValue = parseFloat(value) || 0;
        // Clamp curve value to the allowed range -340 to 340
        clampedValue = Math.max(-340, Math.min(340, clampedValue)); 
        
        if (tools.selectedSegments.length === 1) {
            const segmentIndex = tools.selectedSegments[0];
            const data = mapData.getData();
            // Ensure segment exists before trying to update its curve
            if (data.segments[segmentIndex]) {
                data.segments[segmentIndex].curve = clampedValue;
                uiManager.updateSegmentList();
                renderer.render(mapData);
            }
        }
    };

    curveValueInput.addEventListener('input', (e) => {
        const value = e.target.value;
        updateCurve(value);
        // Ensure slider also updates to clamped value
        curveSliderInput.value = curveValueInput.value;
    });

    curveSliderInput.addEventListener('input', (e) => {
        const value = e.target.value;
        updateCurve(value);
        // Ensure number input also updates to clamped value
        curveValueInput.value = curveSliderInput.value;
    });

    // Initial render
    uiManager.updateUI();
    renderer.render(mapData);
}

// Canvas event handlers
function onCanvasClick(e) {
    if (e.button !== 0) return; // Only handle left clicks

    const worldPos = renderer.screenToWorld(e.clientX, e.clientY);

    if (tools.currentTool === 'vertex') {
        mapData.addVertex(worldPos.x, worldPos.y);
        uiManager.updateUI();
        renderer.render(mapData);
    } else if (tools.currentTool === 'segment') {
        const vertexIndex = mapData.getVertexAt(worldPos.x, worldPos.y, 10 / renderer.zoom);
        if (vertexIndex !== -1) {
            tools.selectVertex(vertexIndex);
            if (tools.selectedVertices.length === 2) {
                const color = document.getElementById('segmentColor').value;
                let curve = parseFloat(document.getElementById('segmentCurve').value);
                // Clamp curve value when adding new segment
                curve = Math.max(-340, Math.min(340, curve)); 

                mapData.addSegment(tools.selectedVertices[0], tools.selectedVertices[1], color, curve);
                tools.clearSelection();
                uiManager.updateUI();
                renderer.render(mapData);
            }
        }
    } else if (tools.currentTool === 'pan') { // Added condition to specifically handle selection in pan tool
        const segmentIndex = getSegmentAt(worldPos.x, worldPos.y);
        if (segmentIndex !== -1) {
            tools.selectSegment(segmentIndex, e.shiftKey);
            uiManager.updateCurveEditor();
            renderer.render(mapData);
        } else {
            tools.clearSegmentSelection();
            uiManager.updateCurveEditor();
            renderer.render(mapData);
        }
    }
}

function onMouseDown(e) {
    const worldPos = renderer.screenToWorld(e.clientX, e.clientY);

    if (e.button === 0) { // Left click
        if (tools.currentTool === 'pan') {
            renderer.startPan(e.clientX, e.clientY);
            canvas.style.cursor = 'grabbing';
        }
    } else if (e.button === 2) { // Right click
        e.preventDefault();

        // Check if clicking on a vertex
        const vertexIndex = mapData.getVertexAt(worldPos.x, worldPos.y, 10 / renderer.zoom);
        if (vertexIndex !== -1) {
            isDraggingVertex = true;
            draggedVertexIndex = vertexIndex;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            canvas.style.cursor = 'move';
            return;
        }

        // Check if clicking on a segment
        // Only allow segment drag/curve adjust if in 'pan' or 'segment' tool (or any tool not adding vertex)
        if (tools.currentTool !== 'vertex') {
            const segmentIndex = getSegmentAt(worldPos.x, worldPos.y);
            if (segmentIndex !== -1) {
                tools.selectSegment(segmentIndex); // Select the segment on right-click down
                uiManager.updateCurveEditor();
                renderer.render(mapData);

                isDraggingSegment = true;
                draggedSegmentIndex = segmentIndex;
                dragStartX = e.clientX;
                dragStartY = e.clientY;
                canvas.style.cursor = 'grab';
                return;
            }
        }
    }
}

function onMouseMove(e) {
    if (tools.currentTool === 'pan' && renderer.isDragging) {
        renderer.updatePan(e.clientX, e.clientY);
        renderer.render(mapData);
    } else if (isDraggingVertex) {
        const worldPos = renderer.screenToWorld(e.clientX, e.clientY);
        const data = mapData.getData();
        if (data.vertexes[draggedVertexIndex]) { // Ensure vertex still exists
            data.vertexes[draggedVertexIndex].x = Math.round(worldPos.x);
            data.vertexes[draggedVertexIndex].y = Math.round(worldPos.y);
            uiManager.updateUI();
            renderer.render(mapData);
        }
    } else if (isDraggingSegment) {
        const deltaX = e.clientX - dragStartX;
        // Adjust sensitivity for curve modification to be milder/smoother
        const rawCurveChange = deltaX * 0.05; 
        const data = mapData.getData();
        if (data.segments[draggedSegmentIndex]) { // Ensure segment still exists
            let currentCurve = parseFloat(data.segments[draggedSegmentIndex].curve || 0);
            let newCurveValue = currentCurve + rawCurveChange;
            // Clamp new curve value
            newCurveValue = Math.max(-340, Math.min(340, newCurveValue));
            newCurveValue = Math.round(newCurveValue * 10) / 10; // Round to 1 decimal place

            data.segments[draggedSegmentIndex].curve = newCurveValue;
            // Update the curve editor input fields immediately during drag
            document.getElementById('curveValue').value = newCurveValue;
            document.getElementById('curveSlider').value = newCurveValue;

            uiManager.updateSegmentList(); // Update segment list to show new curve value
            renderer.render(mapData);
        }
    }
}

function onMouseUp(e) {
    if (renderer.isDragging) {
        renderer.endPan();
        canvas.style.cursor = tools.currentTool === 'pan' ? 'grab' : 'crosshair'; // Restore cursor based on tool
    }

    if (isDraggingVertex) {
        isDraggingVertex = false;
        draggedVertexIndex = -1;
        canvas.style.cursor = tools.currentTool === 'pan' ? 'grab' : 'crosshair';
    }

    if (isDraggingSegment) {
        isDraggingSegment = false;
        draggedSegmentIndex = -1;
        canvas.style.cursor = tools.currentTool === 'pan' ? 'grab' : 'crosshair';
        // After drag ends, ensure UI is fully updated
        uiManager.updateCurveEditor();
        renderer.render(mapData);
    }
}

function onWheel(e) {
    e.preventDefault();
    renderer.handleZoom(e.deltaY);
    uiManager.updateZoomDisplay();
    renderer.render(mapData);
}

function getSegmentAt(x, y) {
    const data = mapData.getData();
    const threshold = 10 / renderer.zoom; // Threshold in world units

    for (let i = 0; i < data.segments.length; i++) {
        const segment = data.segments[i];
        const v0 = data.vertexes[segment.v0];
        const v1 = data.vertexes[segment.v1];

        if (v0 && v1) {
            // For both straight and curved segments, check the distance to the straight line chord.
            // This is a simplified hit test for arcs, as a precise arc hit test is more complex.
            const distance = distanceToLine(x, y, v0.x, v0.y, v1.x, v1.y);
            if (distance < threshold) {
                return i;
            }
        }
    }
    return -1;
}

function distanceToLine(x, y, x1, y1, x2, y2) {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
        param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

// Global functions for UI callbacks
window.setTool = function(tool) {
    tools.setTool(tool);
    uiManager.updateCurveEditor(); // Update editor visibility when tool changes
    canvas.style.cursor = tool === 'pan' ? 'grab' : 'crosshair';
};

window.deleteVertex = function(index) {
    mapData.deleteVertex(index);
    tools.clearSegmentSelection(); // Clear segment selection as indices might change or segments might be deleted
    uiManager.updateUI(); // This will correctly update lists and hide/show curve editor
    renderer.render(mapData);
};

window.deleteSegment = function(index) {
    mapData.deleteSegment(index);
    tools.clearSegmentSelection(); // Clear selection if deleted
    uiManager.updateUI();
    renderer.render(mapData);
};

window.zoomIn = function() {
    renderer.zoomIn();
    uiManager.updateZoomDisplay();
    renderer.render(mapData);
};

window.zoomOut = function() {
    renderer.zoomOut();
    uiManager.updateZoomDisplay();
    renderer.render(mapData);
};

window.resetZoom = function() {
    renderer.resetZoom();
    uiManager.updateZoomDisplay();
    renderer.render(mapData);
};

window.resetBgScale = function() {
    renderer.resetBgScale();
    // Update the UI inputs to reflect the reset value
    document.getElementById('bgScaleValue').value = renderer.bgScale.toFixed(1);
    document.getElementById('bgScaleSlider').value = renderer.bgScale.toFixed(1);
    renderer.render(mapData);
};

window.exportMap = function() {
    importExport.exportMap();
};

window.importMap = function() {
    importExport.importMap();
};

// Initialize when page loads
window.onload = init;