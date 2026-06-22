import { HaxTraceProvider, useHaxTrace } from '@/contexts/HaxTraceContext';
import { HaxTraceCanvas } from '@/components/HaxTraceCanvas';
import { HaxTraceCurveEditor } from '@/components/HaxTraceCurveEditor';
import { HaxTraceSidePanel } from '@/components/HaxTraceSidePanel';
import { HaxTraceFloatingToolbar } from '@/components/HaxTraceFloatingToolbar';
import { HaxTraceHelpPanel } from '@/components/HaxTraceHelpPanel';
import { useEffect, useState } from 'react';
import { ChevronLeft, CircleHelp as HelpCircle, LayoutDashboard } from 'lucide-react';
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
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Canvas area */}
      <div className="flex-1 relative overflow-hidden transition-all duration-300">
        <HaxTraceCanvas />
        <HaxTraceCurveEditor />
        <HaxTraceFloatingToolbar />

        {/* Top-left buttons - MD3 FAB style */}
        <div className="absolute top-4 left-4 z-40 flex items-center gap-2">
          <Link href="/">
            <button
              title="Dashboard"
              className="w-11 h-11 flex items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant border border-outline-variant shadow-lg hover:bg-surface-container-highest hover:text-on-surface hover:border-outline transition-all duration-200"
            >
              <LayoutDashboard className="w-5 h-5" />
            </button>
          </Link>
          <button
            onClick={() => setHelpOpen(v => !v)}
            title="Help, shortcuts & info"
            className={`w-11 h-11 flex items-center justify-center rounded-full shadow-lg transition-all duration-200 ${
              helpOpen
                ? 'bg-primary-container text-on-primary-container border border-primary'
                : 'bg-surface-container-high text-on-surface-variant border border-outline-variant hover:bg-surface-container-highest hover:text-on-surface'
            }`}
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>

        {helpOpen && <HaxTraceHelpPanel onClose={() => setHelpOpen(false)} />}

        {/* Mini-HUD — appears only when panel is hidden */}
        {panelHidden && (
          <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-surface-container-high border border-outline-variant shadow-lg">
              <span className="text-xs text-on-surface-variant tabular-nums select-none">
                V:&nbsp;<span className="text-on-surface font-semibold">{map.vertexes.length}</span>
              </span>
              <span className="text-outline-variant">|</span>
              <span className="text-xs text-on-surface-variant tabular-nums select-none">
                S:&nbsp;<span className="text-on-surface font-semibold">{map.segments.length}</span>
              </span>
            </div>
            <button
              onClick={() => setPanelHidden(false)}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant border border-outline-variant shadow-lg hover:bg-surface-container-highest hover:text-on-surface transition-all duration-200"
              title="Show properties panel"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Right panel with smooth transition */}
      <div
        className="flex-shrink-0 overflow-hidden transition-all duration-300 ease-out"
        style={{ width: panelHidden ? 0 : 300 }}
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
