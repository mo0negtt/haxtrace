import { useHaxTrace } from '@/contexts/HaxTraceContext';
import { chordLength, angleToRadius, angleToSagitta, radiusToAngle, radiusToSagitta, sagittaToAngle, sagittaToRadius, calculateCircularArc } from '@/lib/circularArc';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';

/* ── colour helpers ─────────────────────────────────────────── */
function hsvToHex(h: number, s: number, v: number) {
  const hi = Math.floor(h / 60) % 6;
  const f = h / 60 - Math.floor(h / 60);
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  const table = [[v,t,p],[q,v,p],[p,v,t],[p,q,v],[t,p,v],[v,p,q]];
  const [r, g, b] = table[hi];
  const hex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}
function hexToHsv(hex: string): [number, number, number] {
  const c = hex.replace('#','');
  const r = parseInt(c.slice(0,2),16)/255, g = parseInt(c.slice(2,4),16)/255, b = parseInt(c.slice(4,6),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max-min;
  let h = 0;
  if (d) {
    if (max===r) h=((g-b)/d+6)%6;
    else if (max===g) h=(b-r)/d+2;
    else h=(r-g)/d+4;
    h*=60;
  }
  return [h, max?d/max:0, max];
}

/* ── SatBright picker canvas ─────────────────────────────────── */
function SBCanvas({ hue, sat, val, onChange }: { hue:number; sat:number; val:number; onChange:(s:number,v:number)=>void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drag = useRef(false);

  const draw = useCallback(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    const w = c.width, h = c.height;
    const cg = ctx.createLinearGradient(0,0,w,0);
    cg.addColorStop(0,'#fff'); cg.addColorStop(1,`hsl(${hue},100%,50%)`);
    ctx.fillStyle = cg; ctx.fillRect(0,0,w,h);
    const bg = ctx.createLinearGradient(0,0,0,h);
    bg.addColorStop(0,'transparent'); bg.addColorStop(1,'#000');
    ctx.fillStyle = bg; ctx.fillRect(0,0,w,h);
  }, [hue]);

  useEffect(()=>{ draw(); }, [draw]);

  const pos = (e: React.MouseEvent | MouseEvent) => {
    const c = ref.current; if(!c) return;
    const r = c.getBoundingClientRect();
    onChange(Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)), Math.max(0,Math.min(1,1-(e.clientY-r.top)/r.height)));
  };
  useEffect(()=>{
    const mv=(e:MouseEvent)=>{ if(drag.current) pos(e); };
    const up=()=>{ drag.current=false; };
    window.addEventListener('mousemove',mv); window.addEventListener('mouseup',up);
    return ()=>{ window.removeEventListener('mousemove',mv); window.removeEventListener('mouseup',up); };
  },[onChange]);

  return (
    <div className="relative rounded-2xl overflow-hidden" style={{height:110}}>
      <canvas ref={ref} width={248} height={110} className="w-full h-full cursor-crosshair block"
        onMouseDown={e=>{ drag.current=true; pos(e); }} />
      <div className="absolute pointer-events-none" style={{
        left:`${sat*100}%`, top:`${(1-val)*100}%`,
        transform:'translate(-50%,-50%)', width:14, height:14,
        borderRadius:'50%', border:'3px solid white', boxShadow:'0 0 0 2px rgba(0,0,0,0.3)'
      }}/>
    </div>
  );
}

/* ── Arc preview mini-graphic ────────────────────────────────── */
function ArcPreview({ value, type, chord }: { value: number; type: string; chord: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    const W = c.width, H = c.height;
    ctx.clearRect(0,0,W,H);
    const x0 = 12, x1 = W-12, y = H/2;
    ctx.strokeStyle='rgba(255,255,255,0.12)'; ctx.lineWidth=1.5; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x1,y); ctx.stroke();
    const absVal = Math.abs(value);
    if (absVal < 0.5 || chord <= 0) return;
    let angleDeg = 0;
    if (type==='angle') angleDeg = value;
    else if (type==='radius') angleDeg = isFinite(radiusToAngle(value,chord)) ? radiusToAngle(value,chord) : 0;
    else if (type==='sagitta') angleDeg = isFinite(sagittaToAngle(value,chord)) ? sagittaToAngle(value,chord) : 0;
    if (Math.abs(angleDeg) < 0.5) return;
    const bulge = (Math.abs(angleDeg) / 180) * H * 0.38 * (angleDeg > 0 ? -1 : 1);
    ctx.strokeStyle='hsl(var(--primary))'; ctx.lineWidth=2; ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x0,y);
    ctx.quadraticCurveTo((x0+x1)/2, y+bulge, x1, y);
    ctx.stroke();
    [x0,x1].forEach(px => {
      ctx.beginPath(); ctx.arc(px,y,3,0,Math.PI*2);
      ctx.fillStyle='hsl(var(--primary) / 0.6)'; ctx.fill();
    });
  }, [value, type, chord]);

  return <canvas ref={ref} width={248} height={44} className="w-full rounded-2xl bg-surface-container-highest block" />;
}

/* ── Main component ──────────────────────────────────────────── */
export const HaxTraceCurveEditor = () => {
  const { selectedSegments, map, updateSegmentCurve, updateSelectedSegmentsCurve, setSegmentColor } = useHaxTrace();

  // ── ALL HOOKS MUST BE BEFORE ANY EARLY RETURN ──
  const [panelPos, setPanelPos] = useState({ x: 24, y: 80 });
  const [dragging, setDragging] = useState(false);
  const [dragOff, setDragOff] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const [hsv, setHsv] = useState<[number,number,number]>([0, 0, 1]);
  const [hexIn, setHexIn] = useState('FFFFFF');


  const isMulti = selectedSegments.length > 1;
  const segIdx = selectedSegments.length >= 1 ? selectedSegments[0] : -1;
  const seg = segIdx >= 0 ? map.segments[segIdx] : undefined;
  const rawColor = seg?.color ? (seg.color.startsWith('#') ? seg.color : `#${seg.color}`) : '#ffffff';
  const displayColor = rawColor.length >= 7 ? rawColor.slice(0,7) : '#ffffff';

  // drag handle
  useEffect(() => {
    const mv = (e: MouseEvent) => { if (dragging) setPanelPos({ x: e.clientX-dragOff.x, y: e.clientY-dragOff.y }); };
    const up = () => setDragging(false);
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
  }, [dragging, dragOff]);

  // sync colour from selected segment whenever it changes
  useEffect(() => {
    if (!seg) return;
    const h = hexToHsv(displayColor);
    setHsv(h);
    setHexIn(displayColor.slice(1).toUpperCase());
  }, [seg?.color]);

  // ── NOW safe to early-return ──
  if (selectedSegments.length === 0 || !seg) return null;

  const curveData = seg.curveData || { type: 'angle' as const, value: 0 };
  const v0 = map.vertexes[seg.v0], v1 = map.vertexes[seg.v1];
  const chord = v0 && v1 ? chordLength(v0, v1) : 0;
  const arcData = v0 && v1 ? calculateCircularArc(v0, v1, curveData.type, curveData.value) : null;
  const direction = arcData ? (arcData.anticlockwise ? 'Counter-CW' : 'Clockwise') : 'Straight';

  const onDragStart = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    setDragOff({ x: e.clientX - r.left, y: e.clientY - r.top });
    setDragging(true);
  };

  // ── Curve handlers (mass-aware) ──
  const handleTypeChange = (newType: 'angle' | 'radius' | 'sagitta') => {
    const sign = curveData.value >= 0 ? 1 : -1;
    const near0 = Math.abs(curveData.value) < 0.001;
    let nv = 0;
    if (!near0 && chord > 0) {
      const t = curveData.type, v = curveData.value;
      if (t==='angle' && newType==='radius') nv = isFinite(angleToRadius(v,chord)) ? angleToRadius(v,chord) : sign*chord;
      else if (t==='angle' && newType==='sagitta') nv = isFinite(angleToSagitta(v,chord)) ? angleToSagitta(v,chord) : sign*0.1;
      else if (t==='radius' && newType==='angle') nv = isFinite(radiusToAngle(v,chord)) ? radiusToAngle(v,chord) : 0;
      else if (t==='radius' && newType==='sagitta') nv = isFinite(radiusToSagitta(v,chord)) ? radiusToSagitta(v,chord) : sign*0.1;
      else if (t==='sagitta' && newType==='angle') nv = isFinite(sagittaToAngle(v,chord)) ? sagittaToAngle(v,chord) : 0;
      else if (t==='sagitta' && newType==='radius') nv = isFinite(sagittaToRadius(v,chord)) ? sagittaToRadius(v,chord) : sign*chord;
    } else if (near0) {
      nv = newType==='radius' ? sign*chord : newType==='sagitta' ? sign*0.1 : 0;
    }
    if (isMulti) {
      updateSelectedSegmentsCurve(newType, nv);
    } else {
      updateSegmentCurve(segIdx, newType, nv);
    }
  };

  const handleValue = (nv: number) => {
    let v = isFinite(nv) ? nv : 0;
    if (curveData.type==='angle') v = Math.max(-340, Math.min(340, v));
    if (isMulti) {
      updateSelectedSegmentsCurve(curveData.type, v);
    } else {
      updateSegmentCurve(segIdx, curveData.type, v);
    }
  };

  const cfg = { angle:{min:-340,max:340,step:1}, radius:{min:-1000,max:1000,step:1}, sagitta:{min:-500,max:500,step:1} }[curveData.type];
  const display = isFinite(curveData.value) ? Math.round(curveData.value*100)/100 : 0;

  // ── Colour handlers ──
  const applyColor = (h: number, s: number, v: number) => {
    const hex = hsvToHex(h,s,v);
    setSegmentColor(hex.replace('#',''));
  };

  return (
    <div
      ref={cardRef}
      className="fixed z-50 select-none w-[300px] bg-surface-container rounded-3xl border border-outline-variant shadow-xl"
      style={{ left: panelPos.x, top: panelPos.y }}
      data-testid="card-curve-editor"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-move border-b border-outline-variant"
        onMouseDown={onDragStart}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-on-surface-variant" />
          <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant select-none">Segment Editor</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center px-2.5 py-1 rounded-full bg-primary-container">
            <span className="text-[10px] text-on-primary-container font-mono font-medium">SEG {isMulti ? `${segIdx}…` : segIdx}</span>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">

        {/* ── Arc Preview ── */}
        <ArcPreview value={display} type={curveData.type} chord={chord} />

        {/* ── Curve Type tabs ── */}
        <div>
          <span className="text-xs text-on-surface-variant uppercase tracking-wider font-medium block mb-2">Curve Type</span>
          <div className="flex gap-1.5 p-1 rounded-2xl bg-surface-container-high">
            {(['angle','radius','sagitta'] as const).map(t => (
              <button key={t} onClick={() => handleTypeChange(t)}
                className={`flex-1 h-9 rounded-xl text-xs font-medium capitalize transition-all duration-200 ${
                  curveData.type === t
                    ? 'bg-primary-container text-on-primary-container'
                    : 'text-on-surface-variant hover:bg-surface-container-highest'
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* ── Curve Value slider ── */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-on-surface-variant uppercase tracking-wider font-medium">
              {curveData.type==='angle' ? 'Angle' : curveData.type==='radius' ? 'Radius' : 'Sagitta'}
            </span>
            <input
              type="number" value={display}
              onChange={e => handleValue(Number(e.target.value))}
              step={cfg.step}
              className="w-24 text-right text-sm text-on-surface font-mono bg-transparent border-0 outline-none"
            />
          </div>
          <div className="relative h-6 flex items-center">
            <div className="absolute inset-x-0 h-3 rounded-full bg-surface-container-highest" />
            <input type="range" min={cfg.min} max={cfg.max} step={cfg.step}
              value={isFinite(curveData.value) ? curveData.value : 0}
              onChange={e => handleValue(parseFloat(e.target.value))}
              className="relative w-full appearance-none bg-transparent cursor-pointer z-10"
              style={{height:24}}
              data-testid="slider-curve-editor"
            />
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="flex gap-2">
          {[['Chord', `${Math.round(chord)}px`], ['Direction', direction]].map(([l,v]) => (
            <div key={l} className="flex-1 rounded-2xl px-4 py-3 bg-surface-container-high space-y-0.5">
              <span className="block text-[10px] text-on-surface-variant uppercase tracking-wider font-medium">{l}</span>
              <span className="block text-sm text-on-surface font-mono">{v}</span>
            </div>
          ))}
        </div>

        <div className="h-px bg-outline-variant" />

        {/* ── Colour Picker ── */}
        <div>
          <span className="text-xs text-on-surface-variant uppercase tracking-wider font-medium block mb-2">Segment Color</span>
          <SBCanvas hue={hsv[0]} sat={hsv[1]} val={hsv[2]}
            onChange={(s,v) => { setHsv([hsv[0],s,v]); applyColor(hsv[0],s,v); }} />

          {/* Hue slider */}
          <div className="mt-3 relative h-6 flex items-center">
            <div className="absolute inset-x-0 h-3 rounded-full"
              style={{background:'linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)'}}/>
            <input type="range" min={0} max={360} step={1} value={hsv[0]}
              onChange={e => { const h=parseFloat(e.target.value); setHsv([h,hsv[1],hsv[2]]); applyColor(h,hsv[1],hsv[2]); }}
              className="relative w-full appearance-none bg-transparent cursor-pointer z-10" style={{height:24}}/>
          </div>

          {/* Hex + swatch */}
          <div className="flex items-center gap-3 mt-3">
            <div className="w-10 h-10 rounded-2xl flex-shrink-0 border-2 border-outline-variant" style={{background:displayColor}}/>
            <div className="flex items-center flex-1 rounded-xl px-3 h-10 bg-surface-container-high border border-outline-variant">
              <span className="text-xs text-on-surface-variant font-mono mr-1">#</span>
              <input type="text" value={hexIn} maxLength={6}
                onChange={e => {
                  const clean = e.target.value.replace(/[^0-9A-Fa-f]/g,'').slice(0,6);
                  setHexIn(clean.toUpperCase());
                  if (clean.length===6) {
                    const h=hexToHsv(`#${clean}`);
                    setHsv(h);
                    applyColor(h[0],h[1],h[2]);
                  }
                }}
                className="flex-1 bg-transparent text-sm text-on-surface font-mono outline-none border-0"/>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
