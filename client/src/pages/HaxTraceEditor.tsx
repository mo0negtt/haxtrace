import { HaxTraceProvider, useHaxTrace } from '@/contexts/HaxTraceContext';
import { HaxTraceCanvas } from '@/components/HaxTraceCanvas';
import { HaxTraceCurveEditor } from '@/components/HaxTraceCurveEditor';
import { HaxTraceSidePanel } from '@/components/HaxTraceSidePanel';
import { HaxTraceFloatingToolbar } from '@/components/HaxTraceFloatingToolbar';
import { HaxTraceHelpPanel } from '@/components/HaxTraceHelpPanel';
import { useEffect, useState } from 'react';
import { ChevronLeft, HelpCircle, LayoutDashboard } from 'lucide-react';
import { Link } from 'wouter';

function EditorContent() {
  const {
    undo,
    redo,
    map,
    selectedVertices,
    selectedSegments,
    deleteSelectedVertices,
    deleteSelectedSegments,
  } = useHaxTrace();

  const [panelHidden, setPanelHidden] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (!isInputField) { e.preventDefault(); undo(); }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        if (!isInputField) { e.preventDefault(); redo(); }
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputField) {
        e.preventDefault();
        if (selectedVertices.length > 0) deleteSelectedVertices();
        else if (selectedSegments.length > 0) deleteSelectedSegments();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedVertices, selectedSegments, deleteSelectedVertices, deleteSelectedSegments]);

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: '#0b0b0b', fontFamily: "'Inter', 'Geist', 'Roboto', sans-serif" }}
    >
      {/* Canvas area */}
      <div className="flex-1 relative overflow-hidden" style={{ transition: 'width 0.25s ease' }}>
        <HaxTraceCanvas />
        <HaxTraceCurveEditor />
        <HaxTraceFloatingToolbar />

        {/* Top-left buttons */}
        <div className="absolute top-4 left-4 z-40 flex items-center gap-2">
          <Link href="/">
            <button
              title="Dashboard"
              className="w-8 h-8 flex items-center justify-center rounded-full transition-all hover:scale-105"
              style={{
                background: 'rgba(14,14,16,0.82)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                color: 'rgba(255,255,255,0.4)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'white'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.18)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>
          </Link>
          <button
            onClick={() => setHelpOpen(v => !v)}
            title="Help, shortcuts & info"
            className="w-8 h-8 flex items-center justify-center rounded-full transition-all hover:scale-105"
            style={{
              background: helpOpen ? 'rgba(0,212,255,0.18)' : 'rgba(14,14,16,0.82)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: helpOpen ? '1px solid rgba(0,212,255,0.35)' : '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              color: helpOpen ? '#00d4ff' : 'rgba(255,255,255,0.4)',
            }}
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        {helpOpen && <HaxTraceHelpPanel onClose={() => setHelpOpen(false)} />}

        {/* Mini-HUD — appears only when panel is hidden */}
        {panelHidden && (
          <div
            className="absolute top-4 right-4 z-40 flex items-center gap-2"
            style={{ pointerEvents: 'auto' }}
          >
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{
                background: 'rgba(14,14,16,0.82)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                pointerEvents: 'none',
              }}
            >
              <span className="text-[11px] text-white/35 tabular-nums select-none">
                V:&nbsp;<span className="text-white/65 font-semibold">{map.vertexes.length}</span>
              </span>
              <span className="text-white/12">|</span>
              <span className="text-[11px] text-white/35 tabular-nums select-none">
                S:&nbsp;<span className="text-white/65 font-semibold">{map.segments.length}</span>
              </span>
            </div>
            <button
              onClick={() => setPanelHidden(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-all hover:scale-105"
              style={{
                background: 'rgba(14,14,16,0.82)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                color: 'rgba(255,255,255,0.4)',
              }}
              title="Show properties panel"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Right panel with smooth transition */}
      <div
        style={{
          flexShrink: 0,
          width: panelHidden ? 0 : 280,
          overflow: 'hidden',
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <HaxTraceSidePanel isHidden={panelHidden} setIsHidden={setPanelHidden} />
      </div>
    </div>
  );
}

export default function HaxTraceEditor() {
  return (
    <HaxTraceProvider>
      <EditorContent />
    </HaxTraceProvider>
  );
}
