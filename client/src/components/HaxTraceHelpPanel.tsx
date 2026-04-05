import { useState } from 'react';
import { X, Keyboard, Info, FileText } from 'lucide-react';

const SHORTCUTS = [
  { key: 'P / 1', desc: 'Select / Pan tool' },
  { key: 'V / 2', desc: 'Vertex tool' },
  { key: 'S / 3', desc: 'Segment tool' },
  { key: 'L / 4', desc: 'Polyline tool' },
  { key: 'O', desc: 'Ortho Guide (8 directions)' },
  { key: 'M', desc: 'Ruler / Measure tool' },
  { key: 'Esc', desc: 'End polyline chain / clear ruler' },
  { key: 'Ctrl+Z', desc: 'Undo' },
  { key: 'Ctrl+Y', desc: 'Redo' },
  { key: 'Ctrl+A', desc: 'Select all vertices' },
  { key: 'Ctrl+D', desc: 'Duplicate selection' },
  { key: 'Del / Backspace', desc: 'Delete selection' },
  { key: 'Scroll', desc: 'Zoom in / out' },
  { key: 'Space', desc: 'Preview mode (hide vertices)' },
];

const TIPS = [
  'Right-click on the canvas with Polyline active to place a vertex or end the chain.',
  'Right-click a vertex with multiple selected to access Mirror options.',
  'Ortho Guide snaps to 0°, 45°, 90°, 135°, 180°… (8 directions).',
  'Drag the toolbar grip (≡) to reposition it anywhere on screen.',
  'Click ∨ on the toolbar to minimize it out of the way.',
  'Use Ctrl+click to multi-select vertices or segments.',
  'The Ruler shows distance and angle between two points.',
];

type Tab = 'shortcuts' | 'tips' | 'info';

export const HaxTraceHelpPanel = ({ onClose }: { onClose: () => void }) => {
  const [tab, setTab] = useState<Tab>('shortcuts');

  return (
    <div
      className="absolute top-14 left-4 z-50 flex flex-col"
      style={{
        width: 300,
        maxHeight: 'calc(100vh - 80px)',
        background: 'rgba(14,14,16,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/30 select-none">
          Help & Info
        </span>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-xl text-white/25 hover:text-white/70 hover:bg-white/[0.08] transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-3 pt-2 pb-1 flex-shrink-0">
        {([['shortcuts', 'Shortcuts', Keyboard], ['tips', 'Tips', Info], ['info', 'About', FileText]] as [Tab, string, any][]).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] transition-all"
            style={{
              background: tab === id ? 'rgba(0,212,255,0.14)' : 'rgba(255,255,255,0.04)',
              color: tab === id ? '#00d4ff' : 'rgba(255,255,255,0.35)',
              border: tab === id ? '1px solid rgba(0,212,255,0.3)' : '1px solid transparent',
            }}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 pt-1"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>

        {tab === 'shortcuts' && (
          <div className="space-y-0.5">
            {SHORTCUTS.map(({ key, desc }) => (
              <div key={key} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.04]">
                <span className="text-[11px] text-white/45">{desc}</span>
                <kbd className="px-2 py-0.5 rounded-md text-[10px] font-mono text-white/60"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {key}
                </kbd>
              </div>
            ))}
          </div>
        )}

        {tab === 'tips' && (
          <div className="space-y-2 pt-1">
            {TIPS.map((tip, i) => (
              <div key={i} className="flex gap-2 px-2 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <span className="text-[10px] font-bold text-[#00d4ff]/50 mt-0.5 flex-shrink-0">#{i + 1}</span>
                <span className="text-[11px] text-white/50 leading-relaxed">{tip}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'info' && (
          <div className="pt-2 space-y-3">
            <div className="px-2">
              <p className="text-[13px] font-semibold text-white/70 mb-1">HaxTrace Editor</p>
              <p className="text-[11px] text-white/35 leading-relaxed">
                A precision map editor for Haxball. Trace images into native game geometry — vertices and segments — and export directly to .hbs format.
              </p>
            </div>
            <div className="px-2 space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest text-white/20 mb-1">Tools</p>
              {[
                ['Polyline', 'Chain vertices with connected segments. Right-click for options.'],
                ['Ortho Guide', 'Snap lines to 8 directions (0°, 45°, 90°…).'],
                ['Ruler', 'Drag to measure pixel distance and angle between two points.'],
                ['Mirror', 'Right-click a vertex/segment selection to mirror it.'],
              ].map(([name, desc]) => (
                <div key={name} className="rounded-lg px-2.5 py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <p className="text-[11px] font-semibold text-white/55">{name}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
