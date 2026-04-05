import { useHaxTrace } from '@/contexts/HaxTraceContext';
import {
  Eye,
  ZoomIn,
  ZoomOut,
  X,
  Grid3x3,
  Magnet,
  Maximize2,
  Upload,
  Trash2,
  Lock,
  Unlock,
  RotateCcw,
  Image,
  Crosshair,
  Sparkles,
  ScanLine,
  FlipHorizontal2,
  ChevronDown,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface HaxTraceSidePanelProps {
  isHidden: boolean;
  setIsHidden: (v: boolean) => void;
}

function hsvToHex(h: number, s: number, v: number): string {
  const hi = Math.floor(h / 60) % 6;
  const f = h / 60 - Math.floor(h / 60);
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r = 0, g = 0, b = 0;
  if (hi === 0) { r = v; g = t; b = p; }
  else if (hi === 1) { r = q; g = v; b = p; }
  else if (hi === 2) { r = p; g = v; b = t; }
  else if (hi === 3) { r = p; g = q; b = v; }
  else if (hi === 4) { r = t; g = p; b = v; }
  else { r = v; g = p; b = q; }
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsv(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  const s = max === 0 ? 0 : d / max;
  return [h, s, max];
}

function SatBrightCanvas({
  hue, saturation, brightness, onChange
}: {
  hue: number;
  saturation: number;
  brightness: number;
  onChange: (s: number, v: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const colorGrad = ctx.createLinearGradient(0, 0, w, 0);
    colorGrad.addColorStop(0, '#fff');
    colorGrad.addColorStop(1, `hsl(${hue}, 100%, 50%)`);
    ctx.fillStyle = colorGrad;
    ctx.fillRect(0, 0, w, h);
    const blackGrad = ctx.createLinearGradient(0, 0, 0, h);
    blackGrad.addColorStop(0, 'transparent');
    blackGrad.addColorStop(1, '#000');
    ctx.fillStyle = blackGrad;
    ctx.fillRect(0, 0, w, h);
  }, [hue]);

  useEffect(() => { drawCanvas(); }, [drawCanvas]);

  const getPos = (e: React.MouseEvent | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    onChange(x, 1 - y);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (isDragging.current) getPos(e); };
    const onUp = () => { isDragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [onChange]);

  const cx = saturation * 100;
  const cy = (1 - brightness) * 100;

  return (
    <div className="relative rounded-xl overflow-hidden" style={{ height: 130 }}>
      <canvas
        ref={canvasRef}
        width={248}
        height={130}
        className="w-full h-full cursor-crosshair"
        style={{ display: 'block' }}
        onMouseDown={(e) => { isDragging.current = true; getPos(e); }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          left: `${cx}%`, top: `${cy}%`,
          transform: 'translate(-50%, -50%)',
          width: 12, height: 12, borderRadius: '50%',
          border: '2px solid white',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
        }}
      />
    </div>
  );
}

function CheckerSlider({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-white/35 uppercase tracking-widest">{label}</span>
        <span className="text-[11px] font-mono text-white/55">{Math.round(value * 100)}%</span>
      </div>
      <div className="relative h-4 flex items-center">
        <div className="absolute inset-x-0 h-2 rounded-full overflow-hidden"
          style={{ background: `repeating-conic-gradient(#555 0% 25%, #333 0% 50%) 0 0 / 8px 8px` }}>
          <div className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${value * 100}%`, background: 'rgba(255,255,255,0.85)' }} />
        </div>
        <input type="range" min={0} max={1} step={0.01} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="relative w-full appearance-none bg-transparent cursor-pointer z-10" style={{ height: 16 }} />
      </div>
    </div>
  );
}

function HueSlider({ hue, onChange }: { hue: number; onChange: (h: number) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-white/35 uppercase tracking-widest">Hue</span>
        <span className="text-[11px] font-mono text-white/55">{Math.round(hue)}°</span>
      </div>
      <div className="relative h-4 flex items-center">
        <div className="absolute inset-x-0 h-2 rounded-full"
          style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }} />
        <input type="range" min={0} max={360} step={1} value={hue}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="relative w-full appearance-none bg-transparent cursor-pointer z-10" style={{ height: 16 }} />
      </div>
    </div>
  );
}

function IOSToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="flex-shrink-0 relative focus:outline-none" style={{ width: 44, height: 24 }}>
      <div className="absolute inset-0 rounded-full transition-all duration-200"
        style={{ background: active ? '#00d4ff' : 'rgba(255,255,255,0.12)' }} />
      <div className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-200"
        style={{ left: active ? 'calc(100% - 20px)' : '4px' }} />
    </button>
  );
}

export const HaxTraceSidePanel = ({ isHidden, setIsHidden }: HaxTraceSidePanelProps) => {
  const {
    map,
    setBackgroundImage,
    updateBackgroundImage,
    removeBackgroundImage,
    segmentColor,
    setSegmentColor,
    colorHistory,
    pushColorHistory,
    gridVisible,
    toggleGrid,
    snapToGrid,
    toggleSnapToGrid,
    smartGuides,
    toggleSmartGuides,
    vertexSnap,
    toggleVertexSnap,
    mirrorMode,
    toggleMirrorMode,
    mirrorAxis,
    setMirrorAxis,
    zoom,
    setZoom,
    mousePos,
    selectedVertices,
  } = useHaxTrace();

  const hexColor = segmentColor.startsWith('#') ? segmentColor : `#${segmentColor}`;
  const displayHex = hexColor.length >= 7 ? hexColor.substring(0, 7) : '#FFFFFF';

  const [hsv, setHsv] = useState<[number, number, number]>(() => hexToHsv(displayHex));
  const [hexInput, setHexInput] = useState(displayHex.slice(1).toUpperCase());

  useEffect(() => {
    const h = hexToHsv(displayHex);
    setHsv(h);
    setHexInput(displayHex.slice(1).toUpperCase());
  }, [segmentColor]);

  const applyColor = useCallback((newHex: string) => {
    setSegmentColor(newHex.replace('#', ''));
    pushColorHistory(newHex);
  }, [setSegmentColor, pushColorHistory]);

  const handleSatBright = useCallback((s: number, v: number) => {
    const newHex = hsvToHex(hsv[0], s, v);
    setHsv([hsv[0], s, v]);
    setHexInput(newHex.slice(1).toUpperCase());
    setSegmentColor(newHex.replace('#', ''));
  }, [hsv, setSegmentColor]);

  const handleHue = useCallback((h: number) => {
    const newHex = hsvToHex(h, hsv[1], hsv[2]);
    setHsv([h, hsv[1], hsv[2]]);
    setHexInput(newHex.slice(1).toUpperCase());
    setSegmentColor(newHex.replace('#', ''));
  }, [hsv, setSegmentColor]);

  const handleHexInput = (v: string) => {
    const clean = v.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
    setHexInput(clean.toUpperCase());
    if (clean.length === 6) {
      const full = `#${clean}`;
      setHsv(hexToHsv(full));
      setSegmentColor(clean);
    }
  };

  const handleHexBlur = () => {
    if (hexInput.length === 6) pushColorHistory(`#${hexInput}`);
  };

  const selectedVertex = selectedVertices.length === 1 ? map.vertexes[selectedVertices[0]] : null;

  const bgFileRef = useRef<HTMLInputElement>(null);

  const handleBgFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setBackgroundImage(ev.target?.result as string);
    reader.readAsDataURL(file);
    if (bgFileRef.current) bgFileRef.current.value = '';
  };

  const handleBgDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => setBackgroundImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  if (isHidden) return null;

  return (
    <div
      className="flex-shrink-0 flex flex-col overflow-hidden h-full"
      style={{
        width: 280,
        background: 'rgba(14,14,16,0.82)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
        borderRadius: '20px 0 0 20px',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/20 select-none">Properties</span>
        <button
          onClick={() => setIsHidden(true)}
          className="w-7 h-7 flex items-center justify-center rounded-xl text-white/25 hover:text-white/70 hover:bg-white/[0.08] transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>

        {/* ASISTENCIA */}
        <CollapsibleSection label="Assistance" icon={<Sparkles className="w-3.5 h-3.5" />}>
          <div className="space-y-2.5">
            {/* Snap to Grid */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Magnet className="w-3.5 h-3.5 text-white/25" />
                <span className="text-[12px] text-white/50">Snap to Grid</span>
              </div>
              <IOSToggle active={snapToGrid} onToggle={toggleSnapToGrid} />
            </div>
            {/* Smart Guides */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ScanLine className="w-3.5 h-3.5" style={{ color: smartGuides ? '#00d4ff' : 'rgba(255,255,255,0.25)' }} />
                <span className="text-[12px]" style={{ color: smartGuides ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.5)' }}>Smart Guides</span>
              </div>
              <IOSToggle active={smartGuides} onToggle={toggleSmartGuides} />
            </div>
            {/* Vertex Snap */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crosshair className="w-3.5 h-3.5" style={{ color: vertexSnap ? '#00d4ff' : 'rgba(255,255,255,0.25)' }} />
                <span className="text-[12px]" style={{ color: vertexSnap ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.5)' }}>Vertex Snap</span>
              </div>
              <IOSToggle active={vertexSnap} onToggle={toggleVertexSnap} />
            </div>
            {/* Mirror Mode */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FlipHorizontal2 className="w-3.5 h-3.5" style={{ color: mirrorMode ? '#00d4ff' : 'rgba(255,255,255,0.25)' }} />
                  <span className="text-[12px]" style={{ color: mirrorMode ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.5)' }}>Mirror Mode</span>
                </div>
                <IOSToggle active={mirrorMode} onToggle={toggleMirrorMode} />
              </div>
              {mirrorMode && (
                <div className="flex gap-1.5 ml-5">
                  {(['x', 'y'] as const).map(ax => (
                    <button key={ax} onClick={() => setMirrorAxis(ax)}
                      className="flex-1 h-7 rounded-lg text-[11px] font-medium uppercase tracking-wider transition-all"
                      style={mirrorAxis === ax ? {
                        background: 'rgba(0,212,255,0.18)',
                        color: '#00d4ff',
                        border: '1px solid rgba(0,212,255,0.35)',
                        boxShadow: '0 0 10px rgba(0,212,255,0.25)',
                      } : {
                        background: 'rgba(255,255,255,0.04)',
                        color: 'rgba(255,255,255,0.35)',
                        border: '1px solid rgba(255,255,255,0.07)',
                      }}>
                      {ax === 'x' ? 'Vertical' : 'Horizontal'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CollapsibleSection>

        <PanelDivider />

        {/* TRANSFORM & POSITION */}
        <Section label="Transform & Position">
          <div className="flex gap-2">
            <NumberField label="X" value={selectedVertex?.x ?? mousePos.x} />
            <NumberField label="Y" value={selectedVertex?.y ?? mousePos.y} />
          </div>
          <div className="mt-2 space-y-0.5">
            <InfoPair label="Cursor" value={`${mousePos.x}, ${mousePos.y}`} />
            <InfoPair label="Vertices" value={String(map.vertexes.length)} />
            <InfoPair label="Segments" value={String(map.segments.length)} />
            <InfoPair label="Map" value={`${map.width} × ${map.height}`} />
          </div>
        </Section>

        <PanelDivider />

        {/* BACKGROUND IMAGE */}
        <Section label="Background Image">
          <input ref={bgFileRef} type="file" accept="image/*" onChange={handleBgFile} className="hidden" />

          {!map.bg.image ? (
            <div
              className="rounded-xl flex flex-col items-center justify-center gap-2 py-6 cursor-pointer transition-all"
              style={{
                border: '1.5px dashed rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.03)',
              }}
              onClick={() => bgFileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleBgDrop}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,212,255,0.08)' }}>
                <Upload className="w-5 h-5 text-[#00d4ff]/60" />
              </div>
              <div className="text-center">
                <p className="text-[12px] text-white/45 font-medium">Upload Image</p>
                <p className="text-[10px] text-white/20 mt-0.5">Click or drag & drop</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Image status row */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl"
                style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)' }}>
                <div className="flex items-center gap-2">
                  <Image className="w-3.5 h-3.5 text-[#00d4ff]/70" />
                  <span className="text-[11px] text-[#00d4ff]/80 font-medium">Image loaded</span>
                </div>
                <button onClick={removeBackgroundImage}
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Opacity */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[10px] text-white/25 uppercase tracking-widest">Opacity</span>
                  <span className="text-[11px] font-mono text-white/50">{Math.round(map.bg.image.opacity * 100)}%</span>
                </div>
                <div className="relative h-4 flex items-center">
                  <div className="absolute inset-x-0 h-2 rounded-full overflow-hidden"
                    style={{ background: `repeating-conic-gradient(#555 0% 25%, #333 0% 50%) 0 0 / 8px 8px` }}>
                    <div className="absolute inset-y-0 left-0 rounded-full"
                      style={{ width: `${map.bg.image.opacity * 100}%`, background: 'rgba(255,255,255,0.85)' }} />
                  </div>
                  <input type="range" min={0} max={1} step={0.01} value={map.bg.image.opacity}
                    onChange={(e) => updateBackgroundImage({ ...map.bg.image!, opacity: parseFloat(e.target.value) })}
                    className="relative w-full appearance-none bg-transparent cursor-pointer z-10" style={{ height: 16 }} />
                </div>
              </div>

              {/* Scale */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[10px] text-white/25 uppercase tracking-widest">Scale</span>
                  <span className="text-[11px] font-mono text-white/50">{Math.round(map.bg.image.scale * 100)}%</span>
                </div>
                <div className="relative h-4 flex items-center">
                  <div className="absolute inset-x-0 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }} />
                  <div className="absolute h-2 top-1/2 -translate-y-1/2 rounded-full left-0"
                    style={{ width: `${((map.bg.image.scale - 0.1) / 4.9) * 100}%`, background: 'linear-gradient(to right,#0ea5e9,#00d4ff)' }} />
                  <input type="range" min={0.1} max={5} step={0.01} value={map.bg.image.scale}
                    onChange={(e) => updateBackgroundImage({ ...map.bg.image!, scale: parseFloat(e.target.value) })}
                    className="relative w-full appearance-none bg-transparent cursor-pointer z-10" style={{ height: 16 }} />
                </div>
              </div>

              {/* Position offset */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-white/25 uppercase tracking-widest">Position Offset</span>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center rounded-xl overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <span className="px-2.5 text-[10px] text-white/25 font-semibold tracking-wider select-none"
                      style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>X</span>
                    <input type="number" value={map.bg.image.offsetX}
                      onChange={(e) => updateBackgroundImage({ ...map.bg.image!, offsetX: Number(e.target.value) })}
                      className="flex-1 px-2 py-1.5 text-[12px] font-mono text-white/65 bg-transparent outline-none border-0 w-0 min-w-0" />
                  </div>
                  <div className="flex-1 flex items-center rounded-xl overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <span className="px-2.5 text-[10px] text-white/25 font-semibold tracking-wider select-none"
                      style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>Y</span>
                    <input type="number" value={map.bg.image.offsetY}
                      onChange={(e) => updateBackgroundImage({ ...map.bg.image!, offsetY: Number(e.target.value) })}
                      className="flex-1 px-2 py-1.5 text-[12px] font-mono text-white/65 bg-transparent outline-none border-0 w-0 min-w-0" />
                  </div>
                </div>
              </div>

              {/* Lock / Reset buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => updateBackgroundImage({ ...map.bg.image!, locked: !map.bg.image!.locked })}
                  className="flex-1 h-8 flex items-center justify-center gap-1.5 rounded-xl transition-all text-[11px]"
                  style={{
                    background: map.bg.image.locked ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.04)',
                    border: map.bg.image.locked ? '1px solid rgba(0,212,255,0.35)' : '1px solid rgba(255,255,255,0.06)',
                    color: map.bg.image.locked ? '#00d4ff' : 'rgba(255,255,255,0.35)',
                  }}
                >
                  {map.bg.image.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  {map.bg.image.locked ? 'Locked' : 'Lock'}
                </button>
                <button
                  onClick={() => updateBackgroundImage({ ...map.bg.image!, offsetX: 0, offsetY: 0, scale: 1 })}
                  className="flex-1 h-8 flex items-center justify-center gap-1.5 rounded-xl transition-all text-[11px]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>
            </div>
          )}
        </Section>

        <PanelDivider />

        {/* APPEARANCE & STYLE */}
        <Section label="Appearance & Style">
          <SatBrightCanvas hue={hsv[0]} saturation={hsv[1]} brightness={hsv[2]} onChange={handleSatBright} />
          <div className="mt-2 space-y-2">
            <HueSlider hue={hsv[0]} onChange={handleHue} />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div className="w-8 h-8 rounded-lg flex-shrink-0 border border-white/10" style={{ background: displayHex }} />
            <div className="flex items-center flex-1 bg-white/[0.05] rounded-xl px-2.5 h-8"
              style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
              <span className="text-[11px] text-white/25 font-mono mr-1">#</span>
              <input type="text" value={hexInput}
                onChange={(e) => handleHexInput(e.target.value)}
                onBlur={handleHexBlur}
                className="flex-1 bg-transparent text-[12px] font-mono text-white/80 outline-none border-0"
                maxLength={6} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-[10px] text-white/18 uppercase tracking-widest block mb-1.5">History</span>
            <div className="flex gap-2">
              {colorHistory.map((c, i) => (
                <button key={i} onClick={() => applyColor(c)}
                  className="w-7 h-7 rounded-full border-2 transition-all hover:scale-110 active:scale-95"
                  style={{
                    background: c,
                    borderColor: displayHex.toLowerCase() === c.toLowerCase() ? '#00d4ff' : 'rgba(255,255,255,0.1)',
                  }} title={c} />
              ))}
              {Array.from({ length: 5 - colorHistory.length }).map((_, i) => (
                <div key={i} className="w-7 h-7 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1.5px dashed rgba(255,255,255,0.09)' }} />
              ))}
            </div>
          </div>
        </Section>

        <PanelDivider />

        {/* VISUALIZATION */}
        <Section label="Visualization">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Grid3x3 className="w-3.5 h-3.5 text-white/25" />
                <span className="text-[12px] text-white/50">Show Grid</span>
              </div>
              <IOSToggle active={gridVisible} onToggle={toggleGrid} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Magnet className="w-3.5 h-3.5 text-white/25" />
                <span className="text-[12px] text-white/50">Snap to Grid</span>
              </div>
              <IOSToggle active={snapToGrid} onToggle={toggleSnapToGrid} />
            </div>
          </div>

          {/* View Scale */}
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-white/25" />
                <span className="text-[10px] text-white/25 uppercase tracking-widest">View Scale</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-mono text-white/50">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(1)} className="text-[9px] uppercase tracking-wider text-white/20 hover:text-[#00d4ff] transition-colors ml-1">Reset</button>
              </div>
            </div>
            <div className="relative h-5 flex items-center">
              <div className="absolute inset-x-0 h-2 rounded-full"
                style={{ background: 'rgba(255,255,255,0.07)' }} />
              <div className="absolute h-2 top-1/2 -translate-y-1/2 rounded-full left-0"
                style={{
                  width: `${((zoom - 0.1) / 4.9) * 100}%`,
                  background: 'linear-gradient(to right, #0ea5e9, #00d4ff)',
                }} />
              <input type="range" min={0.1} max={5} step={0.05} value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="relative w-full appearance-none bg-transparent cursor-pointer z-10" />
            </div>
            <div className="flex gap-1.5 mt-1">
              <button onClick={() => setZoom(zoom / 1.25)} disabled={zoom <= 0.1}
                className="flex-1 h-7 flex items-center justify-center rounded-lg bg-white/[0.04] text-white/30 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setZoom(1)}
                className="flex-1 h-7 flex items-center justify-center rounded-lg bg-white/[0.04] text-white/30 hover:text-white hover:bg-white/10 transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setZoom(zoom * 1.25)} disabled={zoom >= 5}
                className="flex-1 h-7 flex items-center justify-center rounded-lg bg-white/[0.04] text-white/30 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </Section>

        <div className="h-4" />
      </div>
    </div>
  );
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3">
      <span className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-white/16 mb-3 select-none">{label}</span>
      {children}
    </div>
  );
}

function CollapsibleSection({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="px-4 py-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full mb-3 group"
      >
        <div className="flex items-center gap-1.5">
          {icon && <span className="text-[#00d4ff]/60">{icon}</span>}
          <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/30 group-hover:text-white/50 transition-colors select-none">{label}</span>
        </div>
        <ChevronDown
          className="w-3 h-3 text-white/20 group-hover:text-white/40 transition-all"
          style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transitionDuration: '200ms' }}
        />
      </button>
      {open && children}
    </div>
  );
}

function PanelDivider() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.045)', margin: '0 16px' }} />;
}

function NumberField({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 flex items-center rounded-xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <span className="px-2.5 text-[10px] text-white/25 font-semibold tracking-wider select-none"
        style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>{label}</span>
      <span className="flex-1 px-2 py-1.5 text-[12px] font-mono text-white/60 text-center">{value}</span>
    </div>
  );
}

function InfoPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[11px] text-white/22">{label}</span>
      <span className="text-[11px] font-mono text-white/45">{value}</span>
    </div>
  );
}
