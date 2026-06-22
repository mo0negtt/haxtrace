import { useEffect, useRef, useState, useCallback } from 'react';
import { useHaxTrace } from '@/contexts/HaxTraceContext';
import { CanvasRenderer } from '@/lib/canvasRenderer';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from '@/components/ui/context-menu';
import { Copy, Trash2, FlipHorizontal2, FlipVertical2 } from 'lucide-react';

type ContextTarget =
  | { type: 'vertex'; index: number }
  | { type: 'segment'; index: number }
  | null;

export const HaxTraceCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const animationFrameRef = useRef<number>();
  
  const {
    map,
    currentTool,
    setCurrentTool,
    selectedVertices,
    selectedSegments,
    hoveredVertex,
    setHoveredVertex,
    addVertex,
    addVertexWithMirror,
    addSegment,
    addPolylineVertex,
    addPolylineVertexWithMirror,
    selectVertex,
    selectSegment,
    selectAllVertices,
    clearSegmentSelection,
    clearVertexSelection,
    updateVertex,
    gridVisible,
    gridSize,
    snapToGrid,
    zoom,
    setZoom,
    setMousePos,
    deleteVertex,
    duplicateVertex,
    duplicateSegment,
    duplicateSelectedVertices,
    duplicateSelectedSegments,
    deleteSelectedSegments,
    deleteSelectedVertices,
    polylineAnchorVertex,
    setPolylineAnchorVertex,
    segmentColor,
    previewMode,
    mirrorSelectedVertices,
    mirrorSelectedSegments,
    smartGuides,
    vertexSnap,
    mirrorMode,
    mirrorAxis,
  } = useHaxTrace();

  const [smartGuideLines, setSmartGuideLines] = useState<{
    xs: number[];
    ys: number[];
  }>({ xs: [], ys: [] });

  const renderRef = useRef<() => void>(() => {});
  const [isDraggingVertex, setIsDraggingVertex] = useState<number | null>(null);
  const [dragStartPositions, setDragStartPositions] = useState<Map<number, { x: number; y: number }>>(new Map());
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [contextMenuTarget, setContextMenuTarget] = useState<ContextTarget>(null);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeCurrent, setMarqueeCurrent] = useState<{ x: number; y: number } | null>(null);
  const [polylineMouseScreen, setPolylineMouseScreen] = useState<{ x: number; y: number } | null>(null);
  const [mirrorPolylineAnchorVertex, setMirrorPolylineAnchorVertex] = useState<number | null>(null);
  const [measureStart, setMeasureStart] = useState<{ screen: { x: number; y: number }; world: { x: number; y: number } } | null>(null);
  const [measureEnd, setMeasureEnd] = useState<{ screen: { x: number; y: number }; world: { x: number; y: number } } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const renderer = new CanvasRenderer(canvasRef.current);
    rendererRef.current = renderer;

    if (map.bg.image) {
      renderer.loadBackgroundImage(map.bg.image.dataURL).then(() => {
        render();
      });
    }

    const ro = new ResizeObserver(() => {
      renderer.updateCanvasSize();
      renderRef.current();
    });
    ro.observe(canvasRef.current);

    const handleResize = () => {
      renderer.updateCanvasSize();
      renderRef.current();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    if (map.bg.image) {
      renderer.loadBackgroundImage(map.bg.image.dataURL).then(() => {
        render();
      });
    } else {
      renderer.clearBackgroundImage();
      render();
    }
  }, [map.bg.image?.dataURL]);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.state.zoom = zoom;
    render();
  }, [zoom]);

  // Smart guides: find vertices that align with the cursor within threshold (world units)
  const computeSmartGuides = useCallback((
    worldX: number, worldY: number,
    vertices: typeof map.vertexes,
    excludeIndices: number[] = [],
    threshold = 10
  ) => {
    const xs: number[] = [];
    const ys: number[] = [];
    let snapX: number | null = null;
    let snapY: number | null = null;
    let bestXDist = threshold;
    let bestYDist = threshold;
    vertices.forEach((v, i) => {
      if (excludeIndices.includes(i)) return;
      const dx = Math.abs(v.x - worldX);
      const dy = Math.abs(v.y - worldY);
      if (dx < bestXDist) { bestXDist = dx; snapX = v.x; }
      if (dy < bestYDist) { bestYDist = dy; snapY = v.y; }
      if (dx < threshold && !xs.includes(v.x)) xs.push(v.x);
      if (dy < threshold && !ys.includes(v.y)) ys.push(v.y);
    });
    return { xs, ys, snapX, snapY };
  }, [map.vertexes]);

  // Vertex snap: find the nearest vertex within screen-space threshold
  const findNearestVertex = useCallback((
    screenX: number, screenY: number,
    excludeIndices: number[] = [],
    thresholdPx = 14
  ): { index: number; x: number; y: number } | null => {
    const renderer = rendererRef.current;
    if (!renderer) return null;
    let best: { index: number; x: number; y: number } | null = null;
    let bestDist = thresholdPx;
    map.vertexes.forEach((v, i) => {
      if (excludeIndices.includes(i)) return;
      const s = renderer.worldToScreen(v.x, v.y);
      const d = Math.sqrt((s.x - screenX) ** 2 + (s.y - screenY) ** 2);
      if (d < bestDist) { bestDist = d; best = { index: i, x: v.x, y: v.y }; }
    });
    return best;
  }, [map.vertexes]);

  // Ortho 8-direction snap
  const snapOrtho8 = useCallback((rawX: number, rawY: number, anchor: { x: number; y: number }) => {
    const dx = rawX - anchor.x;
    const dy = rawY - anchor.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.001) return { x: anchor.x, y: anchor.y };
    const angle = Math.atan2(dy, dx);
    const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    return {
      x: Math.round(anchor.x + Math.cos(snappedAngle) * dist),
      y: Math.round(anchor.y + Math.sin(snappedAngle) * dist),
    };
  }, []);

  const render = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    renderer.clear(map.bg.color);
    
    if (map.bg.image) {
      renderer.drawBackgroundImage(map.bg.image);
    }
    
    if (gridVisible) {
      renderer.drawGrid(map.width, map.height, gridSize);
    }

    map.segments.forEach((segment, index) => {
      const isSelected = selectedSegments.includes(index);
      renderer.drawSegment(segment, map.vertexes, isSelected);
    });

    if (!previewMode) {
      map.vertexes.forEach((vertex, index) => {
        const isSelected = selectedVertices.includes(index);
        const isHovered = hoveredVertex === index;
        renderer.drawVertex(vertex, isSelected, isHovered);
      });
    }

    if (marqueeStart && marqueeCurrent && canvasRef.current) {
      const ctx = renderer['ctx'];
      ctx.strokeStyle = '#00d4ff';
      ctx.fillStyle = 'rgba(0, 212, 255, 0.07)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      const width = marqueeCurrent.x - marqueeStart.x;
      const height = marqueeCurrent.y - marqueeStart.y;
      ctx.fillRect(marqueeStart.x, marqueeStart.y, width, height);
      ctx.strokeRect(marqueeStart.x, marqueeStart.y, width, height);
      ctx.setLineDash([]);
    }

    // Smart guide lines
    if (smartGuides && (smartGuideLines.xs.length > 0 || smartGuideLines.ys.length > 0)) {
      const ctx = renderer['ctx'];
      const W = canvasRef.current!.width;
      const H = canvasRef.current!.height;
      ctx.save();
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 5]);
      ctx.globalAlpha = 0.65;
      // Vertical guides (same X)
      smartGuideLines.xs.forEach(wx => {
        const s = renderer.worldToScreen(wx, 0);
        ctx.beginPath();
        ctx.moveTo(s.x, 0);
        ctx.lineTo(s.x, H);
        ctx.stroke();
      });
      // Horizontal guides (same Y)
      smartGuideLines.ys.forEach(wy => {
        const s = renderer.worldToScreen(0, wy);
        ctx.beginPath();
        ctx.moveTo(0, s.y);
        ctx.lineTo(W, s.y);
        ctx.stroke();
      });
      ctx.restore();
    }

    // Ruler overlay with tick marks
    if (currentTool === 'measure' && measureStart && measureEnd) {
      const ctx = renderer['ctx'];
      const { screen: s0, world: w0 } = measureStart;
      const { screen: s1, world: w1 } = measureEnd;
      const dist = Math.sqrt((w1.x - w0.x) ** 2 + (w1.y - w0.y) ** 2);
      const distRounded = Math.round(dist);
      const screenDist = Math.sqrt((s1.x - s0.x) ** 2 + (s1.y - s0.y) ** 2);
      const angleDeg = Math.atan2(s1.y - s0.y, s1.x - s0.x) * (180 / Math.PI);
      const angleRad = Math.atan2(s1.y - s0.y, s1.x - s0.x);
      const px = Math.cos(angleRad), py = Math.sin(angleRad);
      const nx = -py, ny = px;

      ctx.save();

      // Shadow line for depth
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(s0.x + 1, s0.y + 1);
      ctx.lineTo(s1.x + 1, s1.y + 1);
      ctx.stroke();

      // Ruler body (filled rectangle rotated)
      ctx.translate(s0.x, s0.y);
      ctx.rotate(angleRad);
      const rulerH = 10;
      const rulerW = screenDist;
      ctx.fillStyle = 'rgba(0,212,255,0.12)';
      ctx.strokeStyle = 'rgba(0,212,255,0.7)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(0, -rulerH / 2, rulerW, rulerH, 2);
      ctx.fill();
      ctx.stroke();

      // Tick marks
      const worldPerPixel = dist / (screenDist || 1);
      const tickSpacingWorld = (() => {
        const candidates = [1, 5, 10, 25, 50, 100, 200, 500];
        return candidates.find(c => c / worldPerPixel >= 8) ?? 1;
      })();
      const tickSpacingPx = tickSpacingWorld / worldPerPixel;
      const numTicks = Math.floor(screenDist / tickSpacingPx);
      ctx.strokeStyle = 'rgba(0,212,255,0.85)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= numTicks; i++) {
        const tx = i * tickSpacingPx;
        if (tx > screenDist) break;
        const isMajor = i % 5 === 0;
        const tickLen = isMajor ? rulerH * 0.8 : rulerH * 0.45;
        ctx.beginPath();
        ctx.moveTo(tx, -tickLen / 2);
        ctx.lineTo(tx, tickLen / 2);
        ctx.stroke();
      }

      // End caps
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -rulerH / 2 - 2);
      ctx.lineTo(0, rulerH / 2 + 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(screenDist, -rulerH / 2 - 2);
      ctx.lineTo(screenDist, rulerH / 2 + 2);
      ctx.stroke();

      ctx.restore();

      // Endpoint dots
      ctx.save();
      [s0, s1].forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#00d4ff'; ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
      });
      ctx.restore();

      // Distance label
      const mx = (s0.x + s1.x) / 2 + nx * 18;
      const my = (s0.y + s1.y) / 2 + ny * 18;
      const label = `${distRounded}px`;
      ctx.save();
      ctx.font = 'bold 12px Inter, system-ui, sans-serif';
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.beginPath();
      ctx.roundRect(mx - tw / 2 - 8, my - 11, tw + 16, 22, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,212,255,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#00d4ff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, mx, my);
      // Angle
      const aLabel = `${Math.round(angleDeg < 0 ? angleDeg + 360 : angleDeg)}°`;
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(0,212,255,0.6)';
      ctx.fillText(aLabel, mx, my + 15);
      ctx.restore();
    }

    // Polyline preview
    if ((currentTool === 'polyline' || currentTool === 'ortho') && polylineAnchorVertex !== null && polylineMouseScreen) {
      const anchorVertex = map.vertexes[polylineAnchorVertex];
      if (anchorVertex) {
        const ctx = renderer['ctx'];
        const anchorScreen = renderer.worldToScreen(anchorVertex.x, anchorVertex.y);
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = 'rgba(14, 165, 233, 0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(anchorScreen.x, anchorScreen.y);
        ctx.lineTo(polylineMouseScreen.x, polylineMouseScreen.y);
        ctx.stroke();
        ctx.restore();
      }
    }
  }, [map, selectedVertices, selectedSegments, hoveredVertex, gridVisible, gridSize, marqueeStart, marqueeCurrent, currentTool, polylineAnchorVertex, polylineMouseScreen, measureStart, measureEnd, previewMode, smartGuides, smartGuideLines]);

  useEffect(() => {
    renderRef.current = render;
  });

  useEffect(() => {
    render();
  }, [render]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const renderer = rendererRef.current;
    if (!renderer || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const vertexIndex = renderer.getVertexAt(x, y, map.vertexes);
    const isCtrlPressed = e.ctrlKey || e.metaKey;
    
    if (e.button === 2) {
      // Polyline / Ortho: right-click behavior
      if (currentTool === 'polyline' || currentTool === 'ortho') {
        // Check if clicking on a segment first
        const segmentIndex = renderer.getSegmentAt(x, y, map.segments, map.vertexes);
        if (segmentIndex !== null) {
          // Select the segment (with Ctrl for multi-select)
          selectSegment(segmentIndex, isCtrlPressed);
          setContextMenuTarget({ type: 'segment', index: segmentIndex });
          return;
        }
        // Otherwise, end the polyline chain
        if (polylineAnchorVertex !== null) {
          setPolylineAnchorVertex(null);
          setMirrorPolylineAnchorVertex(null);
          setPolylineMouseScreen(null);
          renderRef.current();
        }
        setContextMenuTarget(null);
        return;
      }

      if (vertexIndex !== null) {
        setContextMenuTarget({ type: 'vertex', index: vertexIndex });
        if (selectedVertices.includes(vertexIndex) && selectedVertices.length > 1) {
          const world = renderer.screenToWorld(x, y);
          const positions = new Map<number, { x: number; y: number }>();
          selectedVertices.forEach(idx => {
            positions.set(idx, { x: map.vertexes[idx].x, y: map.vertexes[idx].y });
          });
          setDragStartPositions(positions);
          setDragOffset({ x: world.x, y: world.y });
          setIsDraggingVertex(vertexIndex);
        } else {
          setIsDraggingVertex(vertexIndex);
        }
        return;
      }

      const segmentIndex = renderer.getSegmentAt(x, y, map.segments, map.vertexes);
      if (segmentIndex !== null) {
        setContextMenuTarget({ type: 'segment', index: segmentIndex });
        return;
      }

      setContextMenuTarget(null);
      return;
    }

    if (e.button === 0) {
      // Marquee selection with shift+drag for all tools
      if (e.shiftKey) {
        setMarqueeStart({ x, y });
        setMarqueeCurrent({ x, y });
        return;
      }

      if (vertexIndex !== null && isCtrlPressed) {
        selectVertex(vertexIndex, true);
        return;
      }

      const segmentIndex = renderer.getSegmentAt(x, y, map.segments, map.vertexes);
      if (segmentIndex !== null && isCtrlPressed) {
        selectSegment(segmentIndex, true);
        return;
      }

      if (currentTool === 'pan' && !isCtrlPressed) {
        renderer.startPan(x, y);
        return;
      }

      const snapCoord = (v: number) =>
        snapToGrid && gridSize > 0 ? Math.round(v / gridSize) * gridSize : Math.round(v);

      if (currentTool === 'vertex') {
        if (vertexIndex !== null) {
          const multiSelect = isCtrlPressed;
          selectVertex(vertexIndex, multiSelect);
          if (!multiSelect) {
            setIsDraggingVertex(vertexIndex);
          } else if (selectedVertices.includes(vertexIndex)) {
            const world = renderer.screenToWorld(x, y);
            const positions = new Map<number, { x: number; y: number }>();
            selectedVertices.forEach(idx => {
              positions.set(idx, { x: map.vertexes[idx].x, y: map.vertexes[idx].y });
            });
            setDragStartPositions(positions);
            setDragOffset({ x: world.x, y: world.y });
            setIsDraggingVertex(vertexIndex);
          }
          return;
        }

        if (!isCtrlPressed) {
          const world = renderer.screenToWorld(x, y);
          const sx = snapCoord(world.x), sy = snapCoord(world.y);
          if (mirrorMode) {
            addVertexWithMirror(sx, sy, mirrorAxis);
          } else {
            addVertex(sx, sy);
          }
          clearVertexSelection();
        }
        return;
      }

      if (currentTool === 'segment') {
        if (vertexIndex !== null) {
          selectVertex(vertexIndex);
          return;
        }

        if (segmentIndex !== null) {
          selectSegment(segmentIndex, isCtrlPressed);
        } else if (!isCtrlPressed) {
          clearSegmentSelection();
        }
      }

      if (currentTool === 'measure') {
        const world = renderer.screenToWorld(x, y);
        setMeasureStart({ screen: { x, y }, world: { x: world.x, y: world.y } });
        setMeasureEnd({ screen: { x, y }, world: { x: world.x, y: world.y } });
        return;
      }

      if (currentTool === 'polyline' || currentTool === 'ortho') {
        const world = renderer.screenToWorld(x, y);
        let snappedX = snapCoord(world.x);
        let snappedY = snapCoord(world.y);

        // Ortho 8-direction snap
        if (currentTool === 'ortho' && polylineAnchorVertex !== null) {
          const anchor = map.vertexes[polylineAnchorVertex];
          if (anchor) {
            const snapped = snapOrtho8(snappedX, snappedY, anchor);
            snappedX = snapped.x;
            snappedY = snapped.y;
          }
        }

        if (vertexIndex !== null) {
          if (polylineAnchorVertex === null) {
            setPolylineAnchorVertex(vertexIndex);
            setMirrorPolylineAnchorVertex(null);
          } else if (polylineAnchorVertex !== vertexIndex) {
            addSegment(polylineAnchorVertex, vertexIndex, segmentColor);
            setPolylineAnchorVertex(vertexIndex);
            setMirrorPolylineAnchorVertex(null);
          }
        } else {
          if (mirrorMode) {
            const [newIndex, mirrorIndex] = addPolylineVertexWithMirror(snappedX, snappedY, polylineAnchorVertex, mirrorPolylineAnchorVertex, mirrorAxis, segmentColor);
            setPolylineAnchorVertex(newIndex);
            setMirrorPolylineAnchorVertex(mirrorIndex);
          } else {
            const newIndex = addPolylineVertex(snappedX, snappedY, polylineAnchorVertex, segmentColor);
            setPolylineAnchorVertex(newIndex);
          }
        }
        return;
      }
    }
  }, [currentTool, map, selectedVertices, addVertex, addVertexWithMirror, addSegment, addPolylineVertex, addPolylineVertexWithMirror, selectVertex, selectSegment, clearSegmentSelection, clearVertexSelection, polylineAnchorVertex, setPolylineAnchorVertex, mirrorPolylineAnchorVertex, segmentColor, snapOrtho8, mirrorMode, mirrorAxis]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const renderer = rendererRef.current;
    if (!renderer || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const world = renderer.screenToWorld(x, y);
    setMousePos({ x: Math.round(world.x), y: Math.round(world.y) });

    if (currentTool === 'measure' && measureStart) {
      setMeasureEnd({ screen: { x, y }, world: { x: world.x, y: world.y } });
      render();
      return;
    }

    if (currentTool === 'polyline' || currentTool === 'ortho') {
      let polyScreenX = x, polyScreenY = y;
      let resolvedWorldX = Math.round(world.x);
      let resolvedWorldY = Math.round(world.y);

      // Ortho snap
      if (currentTool === 'ortho' && polylineAnchorVertex !== null) {
        const anchor = map.vertexes[polylineAnchorVertex];
        if (anchor) {
          const snapped = snapOrtho8(resolvedWorldX, resolvedWorldY, anchor);
          resolvedWorldX = snapped.x;
          resolvedWorldY = snapped.y;
        }
      }

      // Vertex snap (polyline: prefer snapping to existing vertices)
      if (vertexSnap) {
        const near = findNearestVertex(x, y, polylineAnchorVertex !== null ? [polylineAnchorVertex] : []);
        if (near) { resolvedWorldX = near.x; resolvedWorldY = near.y; }
      }

      // Smart guides snap (polyline)
      if (smartGuides) {
        const excludes = polylineAnchorVertex !== null ? [polylineAnchorVertex] : [];
        const guides = computeSmartGuides(resolvedWorldX, resolvedWorldY, map.vertexes, excludes);
        if (guides.snapX !== null) resolvedWorldX = guides.snapX;
        if (guides.snapY !== null) resolvedWorldY = guides.snapY;
        setSmartGuideLines({ xs: guides.xs, ys: guides.ys });
      } else {
        setSmartGuideLines({ xs: [], ys: [] });
      }

      const snappedScreen = renderer.worldToScreen(resolvedWorldX, resolvedWorldY);
      polyScreenX = snappedScreen.x;
      polyScreenY = snappedScreen.y;
      setPolylineMouseScreen({ x: polyScreenX, y: polyScreenY });
    } else if (!isDraggingVertex) {
      setSmartGuideLines({ xs: [], ys: [] });
    }

    if (marqueeStart) {
      setMarqueeCurrent({ x, y });
      return;
    }

    if (isDraggingVertex !== null) {
      let wx = world.x;
      let wy = world.y;

      if (dragStartPositions.size > 0 && dragOffset) {
        const deltaX = wx - dragOffset.x;
        const deltaY = wy - dragOffset.y;

        // Smart guides when dragging
        if (smartGuides) {
          const excludes = Array.from(dragStartPositions.keys());
          const firstKey = excludes[0];
          const firstStart = dragStartPositions.get(firstKey)!;
          const projectedX = Math.round(firstStart.x + deltaX);
          const projectedY = Math.round(firstStart.y + deltaY);
          const guides = computeSmartGuides(projectedX, projectedY, map.vertexes, excludes);
          setSmartGuideLines({ xs: guides.xs, ys: guides.ys });
          const snapDx = guides.snapX !== null ? guides.snapX - projectedX : 0;
          const snapDy = guides.snapY !== null ? guides.snapY - projectedY : 0;
          dragStartPositions.forEach((startPos, idx) => {
            updateVertex(idx, Math.round(startPos.x + deltaX + snapDx), Math.round(startPos.y + deltaY + snapDy));
          });
        } else {
          dragStartPositions.forEach((startPos, idx) => {
            updateVertex(idx, Math.round(startPos.x + deltaX), Math.round(startPos.y + deltaY));
          });
        }
      } else {
        // Single vertex drag
        if (vertexSnap) {
          const near = findNearestVertex(x, y, [isDraggingVertex]);
          if (near) { wx = near.x; wy = near.y; }
        }
        if (smartGuides) {
          const guides = computeSmartGuides(Math.round(wx), Math.round(wy), map.vertexes, [isDraggingVertex]);
          setSmartGuideLines({ xs: guides.xs, ys: guides.ys });
          const snapX = guides.snapX ?? Math.round(wx);
          const snapY = guides.snapY ?? Math.round(wy);
          updateVertex(isDraggingVertex, snapX, snapY);
        } else {
          updateVertex(isDraggingVertex, Math.round(wx), Math.round(wy));
        }
      }
      render();
      return;
    }

    if (renderer.state.isPanning) {
      renderer.updatePan(x, y);
      render();
      return;
    }

    const vertexIndex = renderer.getVertexAt(x, y, map.vertexes);
    if (vertexIndex !== hoveredVertex) {
      setHoveredVertex(vertexIndex);
    }
  }, [isDraggingVertex, dragStartPositions, dragOffset, map, hoveredVertex, setHoveredVertex, updateVertex, render, marqueeStart, setMousePos, currentTool, polylineAnchorVertex, measureStart, snapOrtho8, smartGuides, vertexSnap, computeSmartGuides, findNearestVertex]);

  const handleMouseUp = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    setSmartGuideLines({ xs: [], ys: [] });

    if (marqueeStart && marqueeCurrent) {
      const minX = Math.min(marqueeStart.x, marqueeCurrent.x);
      const maxX = Math.max(marqueeStart.x, marqueeCurrent.x);
      const minY = Math.min(marqueeStart.y, marqueeCurrent.y);
      const maxY = Math.max(marqueeStart.y, marqueeCurrent.y);

      const worldMin = renderer.screenToWorld(minX, minY);
      const worldMax = renderer.screenToWorld(maxX, maxY);

      // Select vertices inside box
      map.vertexes.forEach((vertex, index) => {
        if (vertex.x >= worldMin.x && vertex.x <= worldMax.x &&
            vertex.y >= worldMin.y && vertex.y <= worldMax.y) {
          selectVertex(index, true);
        }
      });

      // Select segments whose both endpoints are inside box
      map.segments.forEach((seg, index) => {
        const v0 = map.vertexes[seg.v0];
        const v1 = map.vertexes[seg.v1];
        if (!v0 || !v1) return;
        const v0in = v0.x >= worldMin.x && v0.x <= worldMax.x && v0.y >= worldMin.y && v0.y <= worldMax.y;
        const v1in = v1.x >= worldMin.x && v1.x <= worldMax.x && v1.y >= worldMin.y && v1.y <= worldMax.y;
        if (v0in && v1in) {
          selectSegment(index, true);
        }
      });

      setMarqueeStart(null);
      setMarqueeCurrent(null);
      return;
    }

    setIsDraggingVertex(null);
    setDragStartPositions(new Map());
    setDragOffset(null);
    renderer.endPan();
  }, [marqueeStart, marqueeCurrent, map.vertexes, map.segments, selectedVertices, selectVertex, selectSegment]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // Allow context menu only when right-clicking on segments in polyline mode
  // Otherwise suppress for ending polyline chain
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const suppress = (e: MouseEvent) => {
      if (currentTool === 'polyline' || currentTool === 'ortho') {
        // Check if we're over a segment - if so, allow context menu
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const renderer = rendererRef.current;
        if (renderer) {
          const segmentIndex = renderer.getSegmentAt(x, y, map.segments, map.vertexes);
          if (segmentIndex !== null) {
            // Allow context menu for segment selection
            return;
          }
        }
        // Not over a segment - suppress context menu and end polyline
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    el.addEventListener('contextmenu', suppress, { capture: true });
    return () => el.removeEventListener('contextmenu', suppress, { capture: true });
  }, [currentTool, map.segments, map.vertexes]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const renderer = rendererRef.current;
    if (!renderer) return;

    if (e.deltaY < 0) {
      renderer.zoomIn();
    } else {
      renderer.zoomOut();
    }
    setZoom(renderer.state.zoom);
    render();
  }, [render, setZoom]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        selectAllVertices();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (selectedVertices.length > 0) {
          duplicateSelectedVertices();
        } else if (selectedSegments.length > 0) {
          duplicateSelectedSegments();
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedVertices.length > 0) {
          deleteSelectedVertices();
        } else if (selectedSegments.length > 0) {
          deleteSelectedSegments();
        }
      } else if (e.key === 'v' || e.key === 'V' || e.key === '2') {
        e.preventDefault();
        setCurrentTool('vertex');
      } else if (e.key === 's' || e.key === 'S' || e.key === '3') {
        e.preventDefault();
        setCurrentTool('segment');
      } else if (e.key === 'p' || e.key === 'P' || e.key === '1') {
        e.preventDefault();
        setCurrentTool('pan');
      } else if (e.key === 'l' || e.key === 'L' || e.key === '4') {
        e.preventDefault();
        setCurrentTool('polyline');
      } else if (e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        setCurrentTool('ortho');
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setCurrentTool('measure');
        setMeasureStart(null); setMeasureEnd(null);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setPolylineAnchorVertex(null);
        setMirrorPolylineAnchorVertex(null);
        setPolylineMouseScreen(null);
        setMeasureStart(null); setMeasureEnd(null);
        renderRef.current();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectAllVertices, selectedVertices, selectedSegments, duplicateSelectedVertices, duplicateSelectedSegments, deleteSelectedVertices, deleteSelectedSegments, setCurrentTool, setPolylineAnchorVertex]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <canvas
          ref={canvasRef}
          data-testid="canvas-haxtrace"
          className="w-full h-full cursor-crosshair"
          style={{ cursor: currentTool === 'pan' ? 'grab' : 'crosshair' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={handleContextMenu}
          onWheel={handleWheel}
        />
      </ContextMenuTrigger>
      <ContextMenuContent data-testid="context-menu-canvas">

        {/* Vertex context menu */}
        {contextMenuTarget?.type === 'vertex' && (
          <>
            <ContextMenuItem
              data-testid="context-menu-duplicate-vertex"
              onClick={() => {
                duplicateVertex(contextMenuTarget.index);
                setContextMenuTarget(null);
              }}
            >
              <Copy className="w-4 h-4 text-on-surface-variant" />
              <span>Duplicate Vertex</span>
            </ContextMenuItem>
            {selectedVertices.length > 1 && (
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <FlipHorizontal2 className="w-4 h-4 text-on-surface-variant" />
                  <span>Mirror Selection</span>
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  <ContextMenuItem onClick={() => { mirrorSelectedVertices('x'); setContextMenuTarget(null); }}>
                    <FlipHorizontal2 className="w-4 h-4 text-on-surface-variant" />
                    <span>Horizontal (X)</span>
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => { mirrorSelectedVertices('y'); setContextMenuTarget(null); }}>
                    <FlipVertical2 className="w-4 h-4 text-on-surface-variant" />
                    <span>Vertical (Y)</span>
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
            )}
            <ContextMenuSeparator />
            <ContextMenuItem
              data-testid="context-menu-delete-vertex"
              onClick={() => {
                deleteVertex(contextMenuTarget.index);
                setContextMenuTarget(null);
              }}
              className="text-error focus:bg-error-container focus:text-on-error-container"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Vertex</span>
            </ContextMenuItem>
          </>
        )}

        {/* Segment context menu */}
        {contextMenuTarget?.type === 'segment' && (
          <>
            <ContextMenuItem
              data-testid="context-menu-duplicate-segment"
              onClick={() => {
                duplicateSegment(contextMenuTarget.index);
                setContextMenuTarget(null);
              }}
            >
              <Copy className="w-4 h-4 text-on-surface-variant" />
              <span>Duplicate Segment</span>
            </ContextMenuItem>
            {(selectedSegments.length > 0 || (currentTool === 'polyline' || currentTool === 'ortho')) && (
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <FlipHorizontal2 className="w-4 h-4 text-on-surface-variant" />
                  <span>Mirror Segments</span>
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  <ContextMenuItem onClick={() => { mirrorSelectedSegments('x'); setContextMenuTarget(null); }}>
                    <FlipHorizontal2 className="w-4 h-4 text-on-surface-variant" />
                    <span>Horizontal (X)</span>
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => { mirrorSelectedSegments('y'); setContextMenuTarget(null); }}>
                    <FlipVertical2 className="w-4 h-4 text-on-surface-variant" />
                    <span>Vertical (Y)</span>
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
            )}
            <ContextMenuSeparator />
            <ContextMenuItem
              data-testid="context-menu-delete-segment"
              onClick={() => {
                if (!selectedSegments.includes(contextMenuTarget.index)) {
                  selectSegment(contextMenuTarget.index);
                }
                deleteSelectedSegments();
                setContextMenuTarget(null);
              }}
              className="text-error focus:bg-error-container focus:text-on-error-container"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Segment</span>
            </ContextMenuItem>
          </>
        )}

        {!contextMenuTarget && currentTool !== 'polyline' && currentTool !== 'ortho' && (
          <div className="px-3 py-2.5 text-sm text-on-surface-variant/50">No selection</div>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
