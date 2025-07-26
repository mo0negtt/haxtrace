import { MapData } from './mapData.js';
import { Tools } from './tools.js';
import { Renderer } from './renderer.js';
import { UIManager } from './uiManager.js';
import { ImportExport } from './importExport.js';

let canvas, ctx;
let mapData = new MapData();
let tools = new Tools();
let renderer;
let uiManager;
let importExport;

let isDraggingVertex = false;
let isDraggingSegment = false;
let draggedVertexIndex = -1;
let draggedSegmentIndex = -1;
let dragStartX = 0;
let dragStartY = 0;

let history = [];
let historyIndex = -1;


function saveHistory() {
    if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
    }
    history.push(JSON.stringify(mapData.getData()));
    historyIndex = history.length - 1;
}

function restoreHistory(index) {
    if (index >= 0 && index < history.length) {
        const state = JSON.parse(history[index]);
        mapData.setData(state);
        uiManager.updateUI();
        renderer.render(mapData);
    }
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        restoreHistory(historyIndex);
    }
}

function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        restoreHistory(historyIndex);
    }
}

document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
    }
    if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        redo();
    }
});

function init() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    renderer = new Renderer(canvas, ctx);
    renderer.setTools(tools);
    uiManager = new UIManager(mapData, renderer);
    uiManager.setTools(tools);
    importExport = new ImportExport(mapData, uiManager, renderer);

    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel);
    canvas.addEventListener('contextmenu', e => e.preventDefault());

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

    const bgScaleValueInput = document.getElementById('bgScaleValue');
    const bgScaleSliderInput = document.getElementById('bgScaleSlider');

    const updateBgScaleUI = (scale) => {
        bgScaleValueInput.value = scale.toFixed(1);
        bgScaleSliderInput.value = scale.toFixed(1);
    };

    bgScaleValueInput.addEventListener('input', (e) => {
        let value = parseFloat(e.target.value);
        if (isNaN(value)) value = 1.0;
        renderer.updateBgScale(value);
        updateBgScaleUI(renderer.bgScale); 
    });

    bgScaleSliderInput.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        renderer.updateBgScale(value);
        updateBgScaleUI(renderer.bgScale);
    });

    const curveValueInput = document.getElementById('curveValue');
    const curveSliderInput = document.getElementById('curveSlider');

    const updateCurve = (value) => {
        let clampedValue = parseFloat(value) || 0;
        clampedValue = Math.max(-340, Math.min(340, clampedValue)); 
        
        if (tools.selectedSegments.length === 1) {
            const segmentIndex = tools.selectedSegments[0];
            const data = mapData.getData();
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
        curveSliderInput.value = curveValueInput.value;
    });

    curveSliderInput.addEventListener('input', (e) => {
        const value = e.target.value;
        updateCurve(value);
        curveValueInput.value = curveSliderInput.value;
    });

    uiManager.updateUI();
    renderer.render(mapData);
}

function onCanvasClick(e) {
    if (e.button !== 0) return;
    const worldPos = renderer.screenToWorld(e.clientX, e.clientY);

    if (tools.currentTool === 'vertex') {
        mapData.addVertex(worldPos.x, worldPos.y);
        saveHistory();
        uiManager.updateUI();
        renderer.render(mapData);
    } else if (tools.currentTool === 'segment') {
        const vertexIndex = mapData.getVertexAt(worldPos.x, worldPos.y, 10 / renderer.zoom);
        if (vertexIndex !== -1) {
            tools.selectVertex(vertexIndex);
            if (tools.selectedVertices.length === 2) {
                const color = document.getElementById('segmentColor').value;
                let curve = parseFloat(document.getElementById('segmentCurve').value);
                curve = Math.max(-340, Math.min(340, curve)); 
                mapData.addSegment(tools.selectedVertices[0], tools.selectedVertices[1], color, curve);
                tools.clearSelection();
                saveHistory();
                uiManager.updateUI();
                renderer.render(mapData);
            }
        }
    } else if (tools.currentTool === 'pan') {
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

    if (e.button === 0) {
        if (tools.currentTool === 'pan') {
            renderer.startPan(e.clientX, e.clientY);
            canvas.style.cursor = 'grabbing';
        }
    } else if (e.button === 2) {
        e.preventDefault();

        const vertexIndex = mapData.getVertexAt(worldPos.x, worldPos.y, 10 / renderer.zoom);
        if (vertexIndex !== -1) {
            isDraggingVertex = true;
            draggedVertexIndex = vertexIndex;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            canvas.style.cursor = 'move';
            return;
        }

        if (tools.currentTool !== 'vertex') {
            const segmentIndex = getSegmentAt(worldPos.x, worldPos.y);
            if (segmentIndex !== -1) {
                tools.selectSegment(segmentIndex);
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
        if (data.vertexes[draggedVertexIndex]) {
            data.vertexes[draggedVertexIndex].x = Math.round(worldPos.x);
            data.vertexes[draggedVertexIndex].y = Math.round(worldPos.y);
            uiManager.updateUI();
            renderer.render(mapData);
        }
    } else if (isDraggingSegment) {
        const deltaX = e.clientX - dragStartX;
        const rawCurveChange = deltaX * 0.05; 
        const data = mapData.getData();
        if (data.segments[draggedSegmentIndex]) {
            let currentCurve = parseFloat(data.segments[draggedSegmentIndex].curve || 0);
            let newCurveValue = currentCurve + rawCurveChange;
            // Clamp new curve value
            newCurveValue = Math.max(-340, Math.min(340, newCurveValue));
            newCurveValue = Math.round(newCurveValue * 10) / 10;

            data.segments[draggedSegmentIndex].curve = newCurveValue;
            document.getElementById('curveValue').value = newCurveValue;
            document.getElementById('curveSlider').value = newCurveValue;

            uiManager.updateSegmentList();
            renderer.render(mapData);
        }
    }
}

function onMouseUp(e) {
    if (renderer.isDragging) {
        renderer.endPan();
        canvas.style.cursor = tools.currentTool === 'pan' ? 'grab' : 'crosshair';
    }

    if (isDraggingVertex) {
        isDraggingVertex = false;
        draggedVertexIndex = -1;
        canvas.style.cursor = tools.currentTool === 'pan' ? 'grab' : 'crosshair';
        saveHistory();
    }

    if (isDraggingSegment) {
        isDraggingSegment = false;
        draggedSegmentIndex = -1;
        canvas.style.cursor = tools.currentTool === 'pan' ? 'grab' : 'crosshair';
        uiManager.updateCurveEditor();
        renderer.render(mapData);
        saveHistory();
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
    const threshold = 10 / renderer.zoom;

    for (let i = 0; i < data.segments.length; i++) {
        const segment = data.segments[i];
        const v0 = data.vertexes[segment.v0];
        const v1 = data.vertexes[segment.v1];

        if (v0 && v1) {
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

window.setTool = function(tool) {
    tools.setTool(tool);
    uiManager.updateCurveEditor();
    canvas.style.cursor = tool === 'pan' ? 'grab' : 'crosshair';
};

window.deleteVertex = function(index) {
    mapData.deleteVertex(index);
    tools.clearSegmentSelection();
    saveHistory();
    uiManager.updateUI();
    renderer.render(mapData);
};

window.deleteSegment = function(index) {
    mapData.deleteSegment(index);
    tools.clearSegmentSelection();
    saveHistory();
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

window.onload = function() {
    init();
    saveHistory();
};
