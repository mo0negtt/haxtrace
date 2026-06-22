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
    <div className="relative rounded-2xl overflow-hidden" style={{ height: 130 }}>
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
          width: 16, height: 16, borderRadius: '50%',
          border: '3px solid white',
          boxShadow: '0 0 0 2px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.4)',
        }}
      />
    </div>
  );
}

function CheckerSlider({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-on-surface-variant uppercase tracking-wider font-medium">{label}</span>
        <span className="text-xs text-on-surface font-mono">{Math.round(value * 100)}%</span>
      </div>
      <div className="relative h-6 flex items-center">
        <div className="absolute inset-x-0 h-3 rounded-full overflow-hidden bg-surface-container-highest">
          <div className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-75"
            style={{ width: `${value * 100}%` }} />
        </div>
        <input type="range" min={0} max={1} step={0.01} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="relative w-full appearance-none bg-transparent cursor-pointer z-10" style={{ height: 24 }} />
      </div>
    </div>
  );
}

function HueSlider({ hue, onChange }: { hue: number; onChange: (h: number) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-on-surface-variant uppercase tracking-wider font-medium">Hue</span>
        <span className="text-xs text-on-surface font-mono">{Math.round(hue)}°</span>
      </div>
      <div className="relative h-6 flex items-center">
        <div className="absolute inset-x-0 h-3 rounded-full"
          style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }} />
        <input type="range" min={0} max={360} step={1} value={hue}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="relative w-full appearance-none bg-transparent cursor-pointer z-10" style={{ height: 24 }} />
      </div>
    </div>
  );
}

function MD3Switch({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative w-14 h-8 rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      <div className={`absolute inset-0 rounded-full transition-all duration-200 ${active ? 'bg-primary' : 'bg-surface-container-highest'}`} />
      <div className={`absolute top-1 w-6 h-6 rounded-full bg-on-primary shadow-md transition-all duration-200 ${active ? 'left-7' : 'left-1'}`} />
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
    <div className="flex-shrink-0 flex flex-col overflow-hidden h-full w-[300px] bg-surface-container border-l border-outline-variant shadow-xl">
      {/* Header - MD3 Top App Bar style */}
      <div className="flex items-center justify-between px-4 py-4 flex-shrink-0 bg-surface-container">
        <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant select-none">Properties</span>
        <button
          onClick={() => setIsHidden(true)}
          className="w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all duration-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">

        {/* ASISTENCIA */}
        <CollapsibleSection label="Assistance" icon={<Sparkles className="w-4 h-4" />}>
          <div className="space-y-3">
            {/* Snap to Grid */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5">
                <Magnet className="w-4 h-4 text-on-surface-variant" />
                <span className="text-sm text-on-surface">Snap to Grid</span>
              </div>
              <MD3Switch active={snapToGrid} onToggle={toggleSnapToGrid} />
            </div>
            {/* Smart Guides */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5">
                <ScanLine className={`w-4 h-4 ${smartGuides ? 'text-primary' : 'text-on-surface-variant'}`} />
                <span className={`text-sm ${smartGuides ? 'text-on-surface' : 'text-on-surface-variant'}`}>Smart Guides</span>
              </div>
              <MD3Switch active={smartGuides} onToggle={toggleSmartGuides} />
            </div>
            {/* Vertex Snap */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5">
                <Crosshair className={`w-4 h-4 ${vertexSnap ? 'text-primary' : 'text-on-surface-variant'}`} />
                <span className={`text-sm ${vertexSnap ? 'text-on-surface' : 'text-on-surface-variant'}`}>Vertex Snap</span>
              </div>
              <MD3Switch active={vertexSnap} onToggle={toggleVertexSnap} />
            </div>
            {/* Mirror Mode */}
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2.5">
                  <FlipHorizontal2 className={`w-4 h-4 ${mirrorMode ? 'text-primary' : 'text-on-surface-variant'}`} />
                  <span className={`text-sm ${mirrorMode ? 'text-on-surface' : 'text-on-surface-variant'}`}>Mirror Mode</span>
                </div>
                <MD3Switch active={mirrorMode} onToggle={toggleMirrorMode} />
              </div>
              {mirrorMode && (
                <div className="flex gap-2 ml-6">
                  {(['x', 'y'] as const).map(ax => (
                    <button key={ax} onClick={() => setMirrorAxis(ax)}
                      className={`flex-1 h-9 rounded-xl text-xs font-medium uppercase tracking-wider transition-all duration-200 ${
                        mirrorAxis === ax
                          ? 'bg-primary-container text-on-primary-container'
                          : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                      }`}>
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
          <div className="mt-3 space-y-1">
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
              className="rounded-2xl flex flex-col items-center justify-center gap-3 py-8 cursor-pointer transition-all duration-200 border-2 border-dashed border-outline-variant hover:border-primary hover:bg-primary-container/10"
              onClick={() => bgFileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleBgDrop}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary-container">
                <Upload className="w-6 h-6 text-on-primary-container" />
              </div>
              <div className="text-center">
                <p className="text-sm text-on-surface font-medium">Upload Image</p>
                <p className="text-xs text-on-surface-variant mt-0.5">Click or drag & drop</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image status row */}
              <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-primary-container">
                <div className="flex items-center gap-2.5">
                  <Image className="w-4 h-4 text-on-primary-container" />
                  <span className="text-sm text-on-primary-container font-medium">Image loaded</span>
                </div>
                <button onClick={removeBackgroundImage}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-error hover:bg-error-container hover:text-on-error-container transition-all duration-200">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Opacity */}
              <CheckerSlider label="Opacity" value={map.bg.image.opacity}
                onChange={(v) => updateBackgroundImage({ ...map.bg.image!, opacity: v })} />

              {/* Scale */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-xs text-on-surface-variant uppercase tracking-wider font-medium">Scale</span>
                  <span className="text-xs text-on-surface font-mono">{Math.round(map.bg.image.scale * 100)}%</span>
                </div>
                <div className="relative h-6 flex items-center">
                  <div className="absolute inset-x-0 h-3 rounded-full bg-surface-container-highest" />
                  <div className="absolute h-3 top-1/2 -translate-y-1/2 rounded-full left-0 bg-primary"
                    style={{ width: `${((map.bg.image.scale - 0.1) / 4.9) * 100}%` }} />
                  <input type="range" min={0.1} max={5} step={0.01} value={map.bg.image.scale}
                    onChange={(e) => updateBackgroundImage({ ...map.bg.image!, scale: parseFloat(e.target.value) })}
                    className="relative w-full appearance-none bg-transparent cursor-pointer z-10" style={{ height: 24 }} />
                </div>
              </div>

              {/* Position offset */}
              <div className="space-y-2">
                <span className="text-xs text-on-surface-variant uppercase tracking-wider font-medium">Position Offset</span>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center rounded-xl overflow-hidden bg-surface-container-high border border-outline-variant">
                    <span className="px-3 text-xs text-on-surface-variant font-semibold tracking-wider select-none border-r border-outline-variant">X</span>
                    <input type="number" value={map.bg.image.offsetX}
                      onChange={(e) => updateBackgroundImage({ ...map.bg.image!, offsetX: Number(e.target.value) })}
                      className="flex-1 px-3 py-2 text-sm text-on-surface bg-transparent outline-none border-0 w-0 min-w-0" />
                  </div>
                  <div className="flex-1 flex items-center rounded-xl overflow-hidden bg-surface-container-high border border-outline-variant">
                    <span className="px-3 text-xs text-on-surface-variant font-semibold tracking-wider select-none border-r border-outline-variant">Y</span>
                    <input type="number" value={map.bg.image.offsetY}
                      onChange={(e) => updateBackgroundImage({ ...map.bg.image!, offsetY: Number(e.target.value) })}
                      className="flex-1 px-3 py-2 text-sm text-on-surface bg-transparent outline-none border-0 w-0 min-w-0" />
                  </div>
                </div>
              </div>

              {/* Lock / Reset buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => updateBackgroundImage({ ...map.bg.image!, locked: !map.bg.image!.locked })}
                  className={`flex-1 h-10 flex items-center justify-center gap-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                    map.bg.image.locked
                      ? 'bg-primary-container text-on-primary-container'
                      : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                  }`}
                >
                  {map.bg.image.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  {map.bg.image.locked ? 'Locked' : 'Lock'}
                </button>
                <button
                  onClick={() => updateBackgroundImage({ ...map.bg.image!, offsetX: 0, offsetY: 0, scale: 1 })}
                  className="flex-1 h-10 flex items-center justify-center gap-2 rounded-xl bg-surface-container-high text-on-surface-variant text-xs font-medium hover:bg-surface-container-highest transition-all duration-200"
                >
                  <RotateCcw className="w-4 h-4" />
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
          <div className="mt-3">
            <HueSlider hue={hsv[0]} onChange={handleHue} />
          </div>
          <div className="flex items-center gap-3 mt-4">
            <div className="w-10 h-10 rounded-2xl flex-shrink-0 border-2 border-outline-variant shadow-sm" style={{ background: displayHex }} />
            <div className="flex items-center flex-1 bg-surface-container-high rounded-xl px-3 h-10 border border-outline-variant">
              <span className="text-xs text-on-surface-variant font-mono mr-1">#</span>
              <input type="text" value={hexInput}
                onChange={(e) => handleHexInput(e.target.value)}
                onBlur={handleHexBlur}
                className="flex-1 bg-transparent text-sm text-on-surface font-mono outline-none border-0"
                maxLength={6} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xs text-on-surface-variant uppercase tracking-wider font-medium block mb-2">History</span>
            <div className="flex gap-2">
              {colorHistory.map((c, i) => (
                <button key={i} onClick={() => applyColor(c)}
                  className="w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 active:scale-95"
                  style={{
                    background: c,
                    borderColor: displayHex.toLowerCase() === c.toLowerCase() ? 'hsl(var(--primary))' : 'hsl(var(--outline-variant))',
                  }} title={c} />
              ))}
              {Array.from({ length: 5 - colorHistory.length }).map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-dashed border-outline-variant bg-surface-container" />
              ))}
            </div>
          </div>
        </Section>

        <PanelDivider />

        {/* VISUALIZATION */}
        <Section label="Visualization">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5">
                <Grid3x3 className="w-4 h-4 text-on-surface-variant" />
                <span className="text-sm text-on-surface">Show Grid</span>
              </div>
              <MD3Switch active={gridVisible} onToggle={toggleGrid} />
            </div>
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5">
                <Magnet className="w-4 h-4 text-on-surface-variant" />
                <span className="text-sm text-on-surface">Snap to Grid</span>
              </div>
              <MD3Switch active={snapToGrid} onToggle={toggleSnapToGrid} />
            </div>
          </div>

          {/* View Scale */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-on-surface-variant" />
                <span className="text-xs text-on-surface-variant uppercase tracking-wider font-medium">View Scale</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-on-surface font-mono">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(1)} className="text-xs text-primary font-medium hover:underline">Reset</button>
              </div>
            </div>
            <div className="relative h-6 flex items-center">
              <div className="absolute inset-x-0 h-3 rounded-full bg-surface-container-highest" />
              <div className="absolute h-3 top-1/2 -translate-y-1/2 rounded-full left-0 bg-primary"
                style={{ width: `${((zoom - 0.1) / 4.9) * 100}%` }} />
              <input type="range" min={0.1} max={5} step={0.05} value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="relative w-full appearance-none bg-transparent cursor-pointer z-10" />
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setZoom(zoom / 1.25)} disabled={zoom <= 0.1}
                className="flex-1 h-9 flex items-center justify-center rounded-xl bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest disabled:opacity-30 transition-all duration-200">
                <ZoomOut className="w-4 h-4" />
              </button>
              <button onClick={() => setZoom(1)}
                className="flex-1 h-9 flex items-center justify-center rounded-xl bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-all duration-200">
                <Maximize2 className="w-4 h-4" />
              </button>
              <button onClick={() => setZoom(zoom * 1.25)} disabled={zoom >= 5}
                className="flex-1 h-9 flex items-center justify-center rounded-xl bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest disabled:opacity-30 transition-all duration-200">
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Section>

        <div className="h-6" />
      </div>
    </div>
  );
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-4">
      <span className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-4 select-none">{label}</span>
      {children}
    </div>
  );
}

function CollapsibleSection({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="px-4 py-4">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full group"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-primary">{icon}</span>}
          <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant group-hover:text-on-surface transition-colors select-none">{label}</span>
        </div>
        <ChevronDown
          className="w-4 h-4 text-on-surface-variant transition-all duration-200"
          style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        />
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}

function PanelDivider() {
  return <div className="h-px bg-outline-variant mx-4" />;
}

function NumberField({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 flex items-center rounded-xl overflow-hidden bg-surface-container-high border border-outline-variant">
      <span className="px-3 text-xs text-on-surface-variant font-semibold tracking-wider select-none border-r border-outline-variant">{label}</span>
      <span className="flex-1 px-3 py-2 text-sm text-on-surface font-mono text-center">{value}</span>
    </div>
  );
}

function InfoPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-xs text-on-surface-variant">{label}</span>
      <span className="text-xs text-on-surface font-mono">{value}</span>
    </div>
  );
}
