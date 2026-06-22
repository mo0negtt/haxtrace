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
  'Drag the toolbar grip to reposition it anywhere on screen.',
  'Click the minimize button on the toolbar to hide it out of the way.',
  'Use Ctrl+click to multi-select vertices or segments.',
  'The Ruler shows distance and angle between two points.',
];

type Tab = 'shortcuts' | 'tips' | 'info';

export const HaxTraceHelpPanel = ({ onClose }: { onClose: () => void }) => {
  const [tab, setTab] = useState<Tab>('shortcuts');

  return (
    <div
      className="absolute top-16 left-4 z-50 flex flex-col w-[320px] max-h-[calc(100vh-100px)] bg-surface-container rounded-3xl border border-outline-variant shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 flex-shrink-0 border-b border-outline-variant">
        <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant select-none">
          Help & Info
        </span>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all duration-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-3 pb-2 flex-shrink-0 bg-surface-container">
        {([['shortcuts', 'Shortcuts', Keyboard], ['tips', 'Tips', Info], ['info', 'About', FileText]] as [Tab, string, any][]).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
              tab === id
                ? 'bg-primary-container text-on-primary-container'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2">

        {tab === 'shortcuts' && (
          <div className="space-y-1">
            {SHORTCUTS.map(({ key, desc }) => (
              <div key={key} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-surface-container-high transition-all">
                <span className="text-sm text-on-surface-variant">{desc}</span>
                <kbd className="px-2.5 py-1 rounded-lg text-xs font-mono text-on-surface bg-surface-container-highest border border-outline-variant">
                  {key}
                </kbd>
              </div>
            ))}
          </div>
        )}

        {tab === 'tips' && (
          <div className="space-y-2 pt-1">
            {TIPS.map((tip, i) => (
              <div key={i} className="flex gap-3 px-3 py-3 rounded-2xl bg-surface-container-low">
                <span className="text-xs font-bold text-primary mt-0.5 flex-shrink-0">#{i + 1}</span>
                <span className="text-sm text-on-surface-variant leading-relaxed">{tip}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'info' && (
          <div className="pt-2 space-y-4">
            <div className="px-1">
              <p className="text-base font-semibold text-on-surface mb-2">HaxTrace Editor</p>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                A precision map editor for Haxball. Trace images into native game geometry — vertices and segments — and export directly to .hbs format.
              </p>
            </div>
            <div className="px-1 space-y-3">
              <p className="text-xs uppercase tracking-wider text-on-surface-variant font-medium">Tools</p>
              {[
                ['Polyline', 'Chain vertices with connected segments. Right-click for options.'],
                ['Ortho Guide', 'Snap lines to 8 directions (0°, 45°, 90°…).'],
                ['Ruler', 'Drag to measure pixel distance and angle between two points.'],
                ['Mirror', 'Right-click a vertex/segment selection to mirror it.'],
              ].map(([name, desc]) => (
                <div key={name} className="rounded-2xl px-4 py-3 bg-surface-container-low">
                  <p className="text-sm font-medium text-on-surface">{name}</p>
                  <p className="text-xs text-on-surface-variant mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
