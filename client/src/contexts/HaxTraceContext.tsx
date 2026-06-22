import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { HaxMap, Vertex, Segment, BackgroundImage } from '@shared/schema';
import { chordLength, radiusToAngle, sagittaToAngle } from '@/lib/circularArc';

export type Tool = 'vertex' | 'segment' | 'pan' | 'polyline' | 'ortho' | 'measure' | 'pencil' | 'spiral';

interface HaxTraceContextType {
  map: HaxMap;
  setMap: (map: HaxMap) => void;
  currentTool: Tool;
  setCurrentTool: (tool: Tool) => void;
  selectedVertices: number[];
  selectedSegments: number[];
  hoveredVertex: number | null;
  setHoveredVertex: (index: number | null) => void;
  polylineAnchorVertex: number | null;
  setPolylineAnchorVertex: (index: number | null) => void;
  segmentColor: string;
  setSegmentColor: (color: string) => void;
  segmentWeight: number;
  setSegmentWeight: (w: number) => void;
  segmentStyle: 'solid' | 'dashed';
  setSegmentStyle: (s: 'solid' | 'dashed') => void;
  segmentOpacity: number;
  setSegmentOpacity: (o: number) => void;
  colorHistory: string[];
  pushColorHistory: (color: string) => void;
  curveType: 'angle' | 'radius' | 'sagitta';
  setCurveType: (type: 'angle' | 'radius' | 'sagitta') => void;
  curveValue: number;
  setCurveValue: (value: number) => void;
  previewMode: boolean;
  togglePreviewMode: () => void;
  gridVisible: boolean;
  toggleGrid: () => void;
  snapToGrid: boolean;
  toggleSnapToGrid: () => void;
  gridSize: number;
  setGridSize: (size: number) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  mousePos: { x: number; y: number };
  setMousePos: (pos: { x: number; y: number }) => void;
  addVertex: (x: number, y: number) => void;
  addVertexWithMirror: (x: number, y: number, axis: 'x' | 'y') => void;
  addSegment: (v0: number, v1: number, color?: string) => void;
  addPolylineVertex: (x: number, y: number, anchorIndex: number | null, color?: string) => number;
  addPolylineVertexWithMirror: (x: number, y: number, anchorIndex: number | null, mirrorAnchorIndex: number | null, axis: 'x' | 'y', color?: string) => [number, number];
  selectVertex: (index: number, multiSelect?: boolean) => void;
  selectAllVertices: () => void;
  clearVertexSelection: () => void;
  selectSegment: (index: number, multiSelect?: boolean) => void;
  clearSegmentSelection: () => void;
  updateVertex: (index: number, x: number, y: number) => void;
  updateSegmentCurve: (index: number, type: 'angle' | 'radius' | 'sagitta', value: number) => void;
  deleteSelectedSegments: () => void;
  deleteSelectedVertices: () => void;
  deleteVertex: (index: number) => void;
  duplicateVertex: (index: number) => void;
  duplicateSegment: (index: number) => void;
  duplicateSelectedVertices: () => void;
  duplicateSelectedSegments: () => void;
  mirrorSelectedVertices: (axis: 'x' | 'y') => void;
  mirrorSelectedSegments: (axis: 'x' | 'y') => void;
  smartGuides: boolean;
  toggleSmartGuides: () => void;
  vertexSnap: boolean;
  toggleVertexSnap: () => void;
  mirrorMode: boolean;
  toggleMirrorMode: () => void;
  mirrorAxis: 'x' | 'y';
  setMirrorAxis: (axis: 'x' | 'y') => void;
  updateSelectedSegmentsCurve: (type: 'angle' | 'radius' | 'sagitta', value: number) => void;
  setBackgroundImage: (dataURL: string) => void;
  updateBackgroundImage: (bgImage: BackgroundImage) => void;
  removeBackgroundImage: () => void;
  newProject: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  importMap: (mapData: HaxMap) => void;
  exportMap: () => HaxMap;
}

const HaxTraceContext = createContext<HaxTraceContextType | undefined>(undefined);

export const useHaxTrace = () => {
  const context = useContext(HaxTraceContext);
  if (!context) {
    throw new Error('useHaxTrace must be used within HaxTraceProvider');
  }
  return context;
};

interface HaxTraceProviderProps {
  children: ReactNode;
}

const defaultMap: HaxMap = {
  id: '1',
  name: 'HaxTrace',
  width: 400,
  height: 200,
  bg: { color: '141416ff' },
  vertexes: [
  ],
  segments: [
  ],
  discs: [],
  goals: [],
  planes: [],
  joints: [],
  traits: {},
  canBeStored: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const HaxTraceProvider = ({ children }: HaxTraceProviderProps) => {
  const [map, setMapInternal] = useState<HaxMap>(() => {
    const pending = localStorage.getItem('haxtrace_pending_load');
    if (pending) {
      localStorage.removeItem('haxtrace_pending_load');
      try { return JSON.parse(pending); } catch {}
    }
    const saved = localStorage.getItem('haxtraceMap');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved map:', e);
        return defaultMap;
      }
    }
    return defaultMap;
  });

  const initialHistory = (() => {
    const pending = localStorage.getItem('haxtrace_pending_load');
    if (pending) {
      try { return [JSON.parse(pending)]; } catch {}
    }
    const saved = localStorage.getItem('haxtraceMap');
    if (saved) {
      try {
        return [JSON.parse(saved)];
      } catch (e) {
        return [defaultMap];
      }
    }
    return [defaultMap];
  })();
  
  const [history, setHistory] = useState<HaxMap[]>(initialHistory);
  const [historyIndex, setHistoryIndex] = useState(0);

  const saveHistory = useCallback((newMap: HaxMap) => {
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newMap]);
    setHistoryIndex(prev => prev + 1);
    setMapInternal(newMap);
    localStorage.setItem('haxtraceMap', JSON.stringify(newMap));
  }, [historyIndex]);

  const [currentTool, setCurrentToolInternal] = useState<Tool>('polyline');
  const [selectedVertices, setSelectedVertices] = useState<number[]>([]);
  const [selectedSegments, setSelectedSegments] = useState<number[]>([]);
  const [hoveredVertex, setHoveredVertex] = useState<number | null>(null);
  const [polylineAnchorVertex, setPolylineAnchorVertex] = useState<number | null>(null);

  const setCurrentTool = useCallback((tool: Tool) => {
    setCurrentToolInternal(tool);
    if (tool !== 'polyline') {
      setPolylineAnchorVertex(null);
    }
  }, []);
  const [segmentColor, setSegmentColorInternal] = useState<string>('ffffff');
  const [segmentWeight, setSegmentWeight] = useState<number>(3);
  const [segmentStyle, setSegmentStyle] = useState<'solid' | 'dashed'>('solid');
  const [segmentOpacity, setSegmentOpacity] = useState<number>(1);
  const [colorHistory, setColorHistory] = useState<string[]>([]);
  const pushColorHistory = useCallback((color: string) => {
    setColorHistory(prev => {
      const filtered = prev.filter(c => c.toLowerCase() !== color.toLowerCase());
      return [color, ...filtered].slice(0, 5);
    });
  }, []);
  const [curveType, setCurveType] = useState<'angle' | 'radius' | 'sagitta'>('angle');
  const [curveValue, setCurveValue] = useState<number>(0);
  const [previewMode, setPreviewMode] = useState(false);
  const togglePreviewMode = useCallback(() => setPreviewMode(v => !v), []);

  const [gridVisible, setGridVisible] = useState<boolean>(() => {
    const saved = localStorage.getItem('gridVisible');
    return saved ? JSON.parse(saved) : true;
  });
  const [gridSize, setGridSize] = useState<number>(() => {
    const saved = localStorage.getItem('gridSize');
    return saved ? Number(saved) : 50;
  });
  const [zoom, setZoomInternal] = useState<number>(1);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const setSegmentColor = useCallback((color: string) => {
    setSegmentColorInternal(color);
    
    if (selectedSegments.length > 0) {
      const newSegments = [...map.segments];
      selectedSegments.forEach(index => {
        newSegments[index] = {
          ...newSegments[index],
          color: color.startsWith('#') ? color.slice(1) : color
        };
      });
      
      const newMap = {
        ...map,
        segments: newSegments,
      };
      saveHistory(newMap);
    }
  }, [map, selectedSegments, saveHistory]);

  const setMap = useCallback((newMap: HaxMap) => {
    saveHistory(newMap);
  }, [saveHistory]);

  const addVertex = useCallback((x: number, y: number) => {
    const newMap = {
      ...map,
      vertexes: [...map.vertexes, { x, y }],
    };
    saveHistory(newMap);
  }, [map, saveHistory]);

  const addVertexWithMirror = useCallback((x: number, y: number, axis: 'x' | 'y') => {
    const mx = axis === 'x' ? -x : x;
    const my = axis === 'x' ? y : -y;
    const newMap = {
      ...map,
      vertexes: [...map.vertexes, { x, y }, { x: mx, y: my }],
    };
    saveHistory(newMap);
  }, [map, saveHistory]);

  const addPolylineVertex = useCallback((x: number, y: number, anchorIndex: number | null, color?: string): number => {
    const newVertexIndex = map.vertexes.length;
    const newVertexes = [...map.vertexes, { x, y }];
    let newSegments = [...map.segments];
    if (anchorIndex !== null && anchorIndex !== newVertexIndex) {
      const segment: Segment = {
        v0: anchorIndex,
        v1: newVertexIndex,
        ...(color && { color }),
      };
      newSegments = [...newSegments, segment];
    }
    const newMap = { ...map, vertexes: newVertexes, segments: newSegments };
    saveHistory(newMap);
    return newVertexIndex;
  }, [map, saveHistory]);

  const addPolylineVertexWithMirror = useCallback((
    x: number, y: number,
    anchorIndex: number | null, mirrorAnchorIndex: number | null,
    axis: 'x' | 'y', color?: string
  ): [number, number] => {
    const mx = axis === 'x' ? -x : x;
    const my = axis === 'x' ? y : -y;
    const newVertexIndex = map.vertexes.length;
    const mirrorVertexIndex = map.vertexes.length + 1;
    const newVertexes = [...map.vertexes, { x, y }, { x: mx, y: my }];
    let newSegments = [...map.segments];
    if (anchorIndex !== null && anchorIndex !== newVertexIndex) {
      newSegments = [...newSegments, { v0: anchorIndex, v1: newVertexIndex, ...(color && { color }) }];
    }
    if (mirrorAnchorIndex !== null && mirrorAnchorIndex !== mirrorVertexIndex) {
      newSegments = [...newSegments, { v0: mirrorAnchorIndex, v1: mirrorVertexIndex, ...(color && { color }) }];
    }
    saveHistory({ ...map, vertexes: newVertexes, segments: newSegments });
    return [newVertexIndex, mirrorVertexIndex];
  }, [map, saveHistory]);

  const addSegment = useCallback((v0: number, v1: number, color?: string) => {
    const segment: Segment = {
      v0,
      v1,
      ...(color && { color }),
      ...(curveValue !== 0 && {
        curveData: {
          type: curveType,
          value: curveValue,
        },
      }),
    };
    const newMap = {
      ...map,
      segments: [...map.segments, segment],
    };
    saveHistory(newMap);
    setSelectedVertices([]);
  }, [map, saveHistory, curveType, curveValue]);

  const selectVertex = useCallback((index: number, multiSelect: boolean = false) => {
    if (currentTool === 'segment') {
      setSelectedVertices(prev => {
        if (prev.includes(index)) return prev;
        const newSelection = [...prev, index];
        
        if (newSelection.length === 2) {
          addSegment(newSelection[0], newSelection[1], segmentColor);
          return [];
        }
        
        return newSelection;
      });
    } else if (currentTool === 'vertex') {
      if (multiSelect) {
        setSelectedVertices(prev => 
          prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
      } else {
        setSelectedVertices([index]);
      }
    }
  }, [currentTool, addSegment, segmentColor]);

  const selectAllVertices = useCallback(() => {
    const allIndices = map.vertexes.map((_, index) => index);
    setSelectedVertices(allIndices);
  }, [map.vertexes]);

  const clearVertexSelection = useCallback(() => {
    setSelectedVertices([]);
  }, []);

  const selectSegment = useCallback((index: number, multiSelect: boolean = false) => {
    if (multiSelect) {
      setSelectedSegments(prev => 
        prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
      );
    } else {
      setSelectedSegments([index]);
    }
  }, []);

  const clearSegmentSelection = useCallback(() => {
    setSelectedSegments([]);
  }, []);

  const updateVertex = useCallback((index: number, x: number, y: number) => {
    const newVertexes = [...map.vertexes];
    newVertexes[index] = { x, y };
    const newMap = {
      ...map,
      vertexes: newVertexes,
    };
    saveHistory(newMap);
  }, [map, saveHistory]);

  const updateSegmentCurve = useCallback((index: number, type: 'angle' | 'radius' | 'sagitta', value: number) => {
    const newSegments = [...map.segments];
    newSegments[index] = {
      ...newSegments[index],
      curveData: { type, value },
    };
    const newMap = {
      ...map,
      segments: newSegments,
    };
    saveHistory(newMap);
  }, [map, saveHistory]);

  const deleteSelectedSegments = useCallback(() => {
    if (selectedSegments.length === 0) return;
    
    const newSegments = map.segments.filter((_, index) => !selectedSegments.includes(index));
    const newMap = {
      ...map,
      segments: newSegments,
    };
    saveHistory(newMap);
    setSelectedSegments([]);
  }, [map, selectedSegments, saveHistory]);

  const deleteVertex = useCallback((index: number) => {
    const newVertexes = map.vertexes.filter((_, i) => i !== index);
    const newSegments = map.segments
      .filter(s => s.v0 !== index && s.v1 !== index)
      .map(s => ({
        ...s,
        v0: s.v0 > index ? s.v0 - 1 : s.v0,
        v1: s.v1 > index ? s.v1 - 1 : s.v1,
      }));
    const newMap = {
      ...map,
      vertexes: newVertexes,
      segments: newSegments,
    };
    saveHistory(newMap);
  }, [map, saveHistory]);

  const deleteSelectedVertices = useCallback(() => {
    if (selectedVertices.length === 0) return;
    
    const sortedIndices = [...selectedVertices].sort((a, b) => b - a);
    let newVertexes = [...map.vertexes];
    let newSegments = [...map.segments];
    
    sortedIndices.forEach(index => {
      newVertexes = newVertexes.filter((_, i) => i !== index);
      newSegments = newSegments
        .filter(s => s.v0 !== index && s.v1 !== index)
        .map(s => ({
          ...s,
          v0: s.v0 > index ? s.v0 - 1 : s.v0,
          v1: s.v1 > index ? s.v1 - 1 : s.v1,
        }));
    });
    
    const newMap = {
      ...map,
      vertexes: newVertexes,
      segments: newSegments,
    };
    saveHistory(newMap);
    setSelectedVertices([]);
  }, [map, selectedVertices, saveHistory]);

  const duplicateVertex = useCallback((index: number) => {
    const vertex = map.vertexes[index];
    if (!vertex) return;
    const newVertex = { x: vertex.x + 20, y: vertex.y + 20 };
    const newMap = {
      ...map,
      vertexes: [...map.vertexes, newVertex],
    };
    saveHistory(newMap);
  }, [map, saveHistory]);

  const duplicateSegment = useCallback((index: number) => {
    const segment = map.segments[index];
    if (!segment) return;
    const newMap = {
      ...map,
      segments: [...map.segments, { ...segment }],
    };
    saveHistory(newMap);
  }, [map, saveHistory]);

  const duplicateSelectedVertices = useCallback(() => {
    if (selectedVertices.length === 0) return;
    
    const newVertices = selectedVertices.map(index => {
      const vertex = map.vertexes[index];
      return { x: vertex.x + 20, y: vertex.y + 20 };
    });
    
    const newMap = {
      ...map,
      vertexes: [...map.vertexes, ...newVertices],
    };
    saveHistory(newMap);
    
    const startIndex = map.vertexes.length;
    const newSelection = newVertices.map((_, i) => startIndex + i);
    setSelectedVertices(newSelection);
  }, [map, selectedVertices, saveHistory]);

  const duplicateSelectedSegments = useCallback(() => {
    if (selectedSegments.length === 0) return;
    
    const newSegments = selectedSegments.map(index => {
      const segment = map.segments[index];
      return { ...segment };
    });
    
    const newMap = {
      ...map,
      segments: [...map.segments, ...newSegments],
    };
    saveHistory(newMap);
    
    const startIndex = map.segments.length;
    const newSelection = newSegments.map((_, i) => startIndex + i);
    setSelectedSegments(newSelection);
  }, [map, selectedSegments, saveHistory]);

  const mirrorSelectedVertices = useCallback((axis: 'x' | 'y') => {
    if (selectedVertices.length === 0) return;
    const newVertexes = [...map.vertexes];
    const xs = selectedVertices.map(i => map.vertexes[i].x);
    const ys = selectedVertices.map(i => map.vertexes[i].y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    selectedVertices.forEach(idx => {
      const v = map.vertexes[idx];
      newVertexes[idx] = axis === 'x'
        ? { ...v, x: 2 * cx - v.x }
        : { ...v, y: 2 * cy - v.y };
    });
    saveHistory({ ...map, vertexes: newVertexes });
  }, [map, selectedVertices, saveHistory]);

  const [smartGuides, setSmartGuides] = useState(false);
  const toggleSmartGuides = useCallback(() => setSmartGuides(v => !v), []);
  const [vertexSnap, setVertexSnap] = useState(false);
  const toggleVertexSnap = useCallback(() => setVertexSnap(v => !v), []);
  const [mirrorMode, setMirrorMode] = useState(false);
  const toggleMirrorMode = useCallback(() => setMirrorMode(v => !v), []);
  const [mirrorAxis, setMirrorAxis] = useState<'x' | 'y'>('x');

  const updateSelectedSegmentsCurve = useCallback((type: 'angle' | 'radius' | 'sagitta', value: number) => {
    if (selectedSegments.length === 0) return;
    const newSegments = [...map.segments];
    selectedSegments.forEach(idx => {
      newSegments[idx] = { ...newSegments[idx], curveData: { type, value } };
    });
    saveHistory({ ...map, segments: newSegments });
  }, [map, selectedSegments, saveHistory]);

  const mirrorSelectedSegments = useCallback((axis: 'x' | 'y') => {
    if (selectedSegments.length === 0) return;
    const involvedIdx = new Set<number>();
    selectedSegments.forEach(si => {
      involvedIdx.add(map.segments[si].v0);
      involvedIdx.add(map.segments[si].v1);
    });
    const xs = [...involvedIdx].map(i => map.vertexes[i].x);
    const ys = [...involvedIdx].map(i => map.vertexes[i].y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const newVertexes = [...map.vertexes];
    involvedIdx.forEach(idx => {
      const v = map.vertexes[idx];
      newVertexes[idx] = axis === 'x'
        ? { ...v, x: 2 * cx - v.x }
        : { ...v, y: 2 * cy - v.y };
    });
    saveHistory({ ...map, vertexes: newVertexes });
  }, [map, selectedSegments, saveHistory]);

  const setBackgroundImage = useCallback((dataURL: string) => {
    const newMap = {
      ...map,
      bg: {
        ...map.bg,
        image: {
          dataURL,
          opacity: 0.5,
          scale: 1,
          offsetX: 0,
          offsetY: 0,
          fitMode: 'center' as const,
          locked: false,
        },
      },
    };
    saveHistory(newMap);
  }, [map, saveHistory]);

  const updateBackgroundImage = useCallback((bgImage: BackgroundImage) => {
    const newMap = {
      ...map,
      bg: {
        ...map.bg,
        image: bgImage,
      },
    };
    saveHistory(newMap);
  }, [map, saveHistory]);

  const removeBackgroundImage = useCallback(() => {
    const newMap = {
      ...map,
      bg: {
        color: map.bg.color,
      },
    };
    saveHistory(newMap);
  }, [map, saveHistory]);

  const newProject = useCallback(() => {
    if (window.confirm('Are you sure you want to start a new project? All unsaved changes will be lost.')) {
      setHistory([defaultMap]);
      setHistoryIndex(0);
      setMapInternal(defaultMap);
      localStorage.setItem('haxtraceMap', JSON.stringify(defaultMap));
      setSelectedVertices([]);
      setSelectedSegments([]);
    }
  }, []);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newMap = history[historyIndex - 1];
      setHistoryIndex(prev => prev - 1);
      setMapInternal(newMap);
      localStorage.setItem('haxtraceMap', JSON.stringify(newMap));
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newMap = history[historyIndex + 1];
      setHistoryIndex(prev => prev + 1);
      setMapInternal(newMap);
      localStorage.setItem('haxtraceMap', JSON.stringify(newMap));
    }
  }, [historyIndex, history]);

  const importMap = useCallback((mapData: HaxMap) => {
    const normalizedBgColor = mapData.bg?.color 
      ? (mapData.bg.color.startsWith('#') ? mapData.bg.color : `#${mapData.bg.color}`)
      : '#0f0f0fff';
    
    const importedMap = {
      ...mapData,
      bg: {
        ...mapData.bg,
        color: normalizedBgColor,
      },
      vertexes: mapData.vertexes.map(v => ({ ...v })),
      segments: mapData.segments.map(s => {
        if (s.curve !== undefined && s.curve !== 0 && !s.curveData) {
          const { curve, ...rest } = s;
          return {
            ...rest,
            curveData: {
              type: 'angle' as const,
              value: curve,
            },
          };
        }
        return { ...s };
      }),
    };
    setHistory([importedMap]);
    setHistoryIndex(0);
    setMapInternal(importedMap);
    localStorage.setItem('haxtraceMap', JSON.stringify(importedMap));
    setSelectedVertices([]);
    setSelectedSegments([]);
  }, []);

  const exportMap = useCallback(() => {
    const bgColor = map.bg.color.startsWith('#') ? map.bg.color.slice(1) : map.bg.color;
    
    return {
      ...map,
      name: 'HaxTrace',
      bg: {
        ...map.bg,
        color: bgColor,
      },
      segments: map.segments.map(s => {
        let curveValue = s.curve;
        
        if (s.curveData && s.curveData.value !== 0) {
          const v0 = map.vertexes[s.v0];
          const v1 = map.vertexes[s.v1];
          
          if (v0 && v1) {
            const chord = chordLength(v0, v1);
            let angleInDegrees = 0;
            
            switch (s.curveData.type) {
              case 'angle':
                angleInDegrees = s.curveData.value;
                break;
              case 'radius':
                angleInDegrees = radiusToAngle(s.curveData.value, chord);
                break;
              case 'sagitta':
                angleInDegrees = sagittaToAngle(s.curveData.value, chord);
                break;
            }
            
            curveValue = angleInDegrees;
          }
        }
        
        const clampedValue = curveValue ? Math.max(-340, Math.min(340, curveValue)) : curveValue;
        
        const exportSegment: any = {
          v0: s.v0,
          v1: s.v1,
        };
        
        if (clampedValue) {
          exportSegment.curve = clampedValue;
        }
        
        if (s.color) {
          exportSegment.color = s.color;
        }
        
        return exportSegment;
      }),
      discs: map.discs || [],
      goals: map.goals || [],
      planes: map.planes || [],
      joints: map.joints || [],
      traits: map.traits || {},
      canBeStored: map.canBeStored ?? true,
    };
  }, [map]);

  const toggleGrid = useCallback(() => {
    setGridVisible(prev => {
      const newValue = !prev;
      localStorage.setItem('gridVisible', JSON.stringify(newValue));
      return newValue;
    });
  }, []);

  const [snapToGrid, setSnapToGrid] = useState<boolean>(false);
  const toggleSnapToGrid = useCallback(() => {
    setSnapToGrid(prev => !prev);
  }, []);

  const handleSetGridSize = useCallback((size: number) => {
    setGridSize(size);
    localStorage.setItem('gridSize', String(size));
  }, []);

  const setZoom = useCallback((newZoom: number) => {
    setZoomInternal(Math.max(0.1, Math.min(5, newZoom)));
  }, []);

  const value: HaxTraceContextType = {
    map,
    setMap,
    currentTool,
    setCurrentTool,
    selectedVertices,
    selectedSegments,
    hoveredVertex,
    setHoveredVertex,
    polylineAnchorVertex,
    setPolylineAnchorVertex,
    segmentColor,
    setSegmentColor,
    segmentWeight,
    setSegmentWeight,
    segmentStyle,
    setSegmentStyle,
    segmentOpacity,
    setSegmentOpacity,
    colorHistory,
    pushColorHistory,
    curveType,
    setCurveType,
    curveValue,
    setCurveValue,
    previewMode,
    togglePreviewMode,
    gridVisible,
    toggleGrid,
    snapToGrid,
    toggleSnapToGrid,
    gridSize,
    setGridSize: handleSetGridSize,
    zoom,
    setZoom,
    mousePos,
    setMousePos,
    addVertex,
    addVertexWithMirror,
    addSegment,
    addPolylineVertex,
    addPolylineVertexWithMirror,
    selectVertex,
    selectAllVertices,
    clearVertexSelection,
    selectSegment,
    clearSegmentSelection,
    updateVertex,
    updateSegmentCurve,
    deleteSelectedSegments,
    deleteSelectedVertices,
    deleteVertex,
    duplicateVertex,
    duplicateSegment,
    duplicateSelectedVertices,
    duplicateSelectedSegments,
    mirrorSelectedVertices,
    mirrorSelectedSegments,
    smartGuides,
    toggleSmartGuides,
    vertexSnap,
    toggleVertexSnap,
    mirrorMode,
    toggleMirrorMode,
    mirrorAxis,
    setMirrorAxis,
    updateSelectedSegmentsCurve,
    setBackgroundImage,
    updateBackgroundImage,
    removeBackgroundImage,
    newProject,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    importMap,
    exportMap,
  };

  return (
    <HaxTraceContext.Provider value={value}>
      {children}
    </HaxTraceContext.Provider>
  );
};
