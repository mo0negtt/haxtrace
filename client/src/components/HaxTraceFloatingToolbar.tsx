import { useHaxTrace } from "@/contexts/HaxTraceContext";
import {
  Trash2,
  Eye,
  EyeOff,
  Waypoints,
  Undo2,
  Redo2,
  Download,
  Upload,
  FilePlus,
  MousePointer2,
  CircleDot,
  PenLine,
  GripHorizontal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useRef, useState, useCallback, useEffect } from "react";

interface ToolButtonProps {
  icon: React.ReactNode;
  title: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  warning?: boolean;
  testId?: string;
  badge?: string;
}

function ToolButton({ icon, title, active, onClick, disabled, danger, warning, testId, badge }: ToolButtonProps) {
  return (
    <button
      data-testid={testId}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-10 h-10 flex items-center justify-center rounded-[14px] transition-all duration-150 select-none
        ${active
          ? "text-white"
          : danger
            ? "text-red-400 hover:bg-red-500/15"
            : warning
              ? "text-orange-400 hover:bg-orange-500/15"
              : "text-white/45 hover:text-white hover:bg-white/[0.08]"
        }
        ${disabled ? "opacity-20 cursor-not-allowed pointer-events-none" : "cursor-pointer"}
      `}
      style={active ? {
        background: 'rgba(0,212,255,0.18)',
        boxShadow: '0 0 18px rgba(0,212,255,0.4), inset 0 0 0 1px rgba(0,212,255,0.35)',
        color: '#00d4ff',
      } : undefined}
    >
      {icon}
      {badge && (
        <span className={`absolute bottom-1 right-1 text-[9px] font-bold leading-none tabular-nums ${active ? "text-[#00d4ff]/70" : "text-white/20"}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-white/[0.07] mx-1 flex-shrink-0" />;
}

function SquareGuideIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3,15 3,3 15,3" />
      <line x1="6" y1="12" x2="12" y2="6" strokeDasharray="2.5,2" />
      <line x1="3" y1="15" x2="15" y2="3" strokeDasharray="1.5,3" strokeOpacity="0.5" />
    </svg>
  );
}


export const HaxTraceFloatingToolbar = () => {
  const {
    currentTool,
    setCurrentTool,
    undo,
    redo,
    canUndo,
    canRedo,
    importMap,
    exportMap,
    newProject,
    selectedVertices,
    selectedSegments,
    deleteSelectedVertices,
    deleteSelectedSegments,
    previewMode,
    togglePreviewMode,
  } = useHaxTrace();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const exportedMap = exportMap();
    const dataStr = JSON.stringify(exportedMap, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "HaxTrace.hbs"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try { importMap(JSON.parse(ev.target?.result as string)); }
      catch (err) { console.error("Import error:", err); }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const hasSelection = selectedVertices.length > 0 || selectedSegments.length > 0;

  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const initPos = useCallback(() => {
    if (pos === null && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPos({ x: rect.left, y: rect.top });
    }
  }, [pos]);

  const onGripMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    initPos();
    dragging.current = true;
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
  }, [initPos]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const onMouseUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const toolbarStyle: React.CSSProperties = pos
    ? { position: 'absolute', left: pos.x, top: pos.y, bottom: 'auto', transform: 'none' }
    : { position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)' };

  return (
    <>
      <input ref={fileInputRef} type="file" accept=".hbs,.json" onChange={handleImport} className="hidden" />

      <div
        ref={containerRef}
        className="z-50"
        style={{ ...toolbarStyle, userSelect: 'none' }}
      >
        <div
          className="flex items-center px-2 py-1.5"
          style={{
            gap: 2,
            borderRadius: 26,
            background: 'rgba(16,16,20,0.94)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 0 0.5px rgba(255,255,255,0.04) inset',
          }}
        >
          {/* Drag grip */}
          <div
            className="flex items-center justify-center w-6 h-10 cursor-grab active:cursor-grabbing text-white/20 hover:text-white/40 transition-colors flex-shrink-0"
            onMouseDown={onGripMouseDown}
            title="Drag to reposition"
          >
            <GripHorizontal className="w-4 h-4" />
          </div>

          {!minimized && (
            <>
              <Sep />

              {/* ── GROUP 1: File ops ── */}
              <ToolButton testId="button-new-project"
                icon={<FilePlus className="w-[17px] h-[17px]" />}
                title="New Project  [N]" onClick={newProject} warning />
              <ToolButton testId="button-import"
                icon={<Upload className="w-[16px] h-[16px]" />}
                title="Import .hbs map" onClick={() => fileInputRef.current?.click()} />
              <ToolButton testId="button-export"
                icon={<Download className="w-[16px] h-[16px]" />}
                title="Export .hbs map" onClick={handleExport} />

              <Sep />

              {/* ── GROUP 2: Navigation ── */}
              <ToolButton testId="button-tool-pan"
                icon={<MousePointer2 className="w-[17px] h-[17px]" />}
                title="Select / Pan  [P]"
                active={currentTool === "pan"}
                onClick={() => setCurrentTool("pan")}
                badge="P" />

              <Sep />

              {/* ── GROUP 3: Draw ── */}
              <ToolButton testId="button-tool-vertex"
                icon={<CircleDot className="w-[17px] h-[17px]" />}
                title="Vertex  [V]"
                active={currentTool === "vertex"}
                onClick={() => setCurrentTool("vertex")}
                badge="V" />
              <ToolButton testId="button-tool-segment"
                icon={<PenLine className="w-[17px] h-[17px]" />}
                title="Segment  [S]"
                active={currentTool === "segment"}
                onClick={() => setCurrentTool("segment")}
                badge="S" />
              <ToolButton testId="button-tool-polyline"
                icon={<Waypoints className="w-[17px] h-[17px]" />}
                title="Polyline  [L] — right-click for options. Esc to stop."
                active={currentTool === "polyline" || currentTool === "ortho"}
                onClick={() => setCurrentTool("polyline")}
                badge="L" />
              <ToolButton testId="button-tool-ortho"
                icon={<SquareGuideIcon />}
                title="Ortho Guide  [O] — lock to 45°/90° angles"
                active={currentTool === "ortho"}
                onClick={() => setCurrentTool(currentTool === "ortho" ? "polyline" : "ortho")}
                badge="O" />

              <Sep />

              {/* ── GROUP 5: History ── */}
              <ToolButton testId="button-undo"
                icon={<Undo2 className="w-[16px] h-[16px]" />}
                title="Undo  [Ctrl+Z]" onClick={undo} disabled={!canUndo} />
              <ToolButton testId="button-redo"
                icon={<Redo2 className="w-[16px] h-[16px]" />}
                title="Redo  [Ctrl+Y]" onClick={redo} disabled={!canRedo} />

              <Sep />

              {/* ── GROUP 6: View / Actions ── */}
              <ToolButton testId="button-preview"
                icon={previewMode ? <EyeOff className="w-[16px] h-[16px]" /> : <Eye className="w-[16px] h-[16px]" />}
                title={previewMode ? "Exit Preview" : "Preview — hide vertices  [Space]"}
                active={previewMode}
                onClick={togglePreviewMode} />
              <ToolButton testId="button-tool-delete"
                icon={<Trash2 className="w-[16px] h-[16px]" />}
                title="Delete Selected  [Del]"
                onClick={() => {
                  if (selectedVertices.length > 0) deleteSelectedVertices();
                  else if (selectedSegments.length > 0) deleteSelectedSegments();
                }}
                disabled={!hasSelection}
                danger={hasSelection} />

              <Sep />
            </>
          )}

          {/* Minimize toggle */}
          <button
            title={minimized ? "Expand toolbar" : "Minimize toolbar"}
            onClick={() => setMinimized(v => !v)}
            className="w-7 h-7 flex items-center justify-center rounded-xl text-white/25 hover:text-white/60 hover:bg-white/[0.08] transition-all flex-shrink-0"
          >
            {minimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </>
  );
};
