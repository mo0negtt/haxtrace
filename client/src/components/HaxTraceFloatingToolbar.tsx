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
  const baseClasses = `
    relative w-11 h-11 flex items-center justify-center rounded-2xl
    transition-all duration-200 select-none
  `;

  const stateClasses = active
    ? "bg-primary-container text-on-primary-container shadow-md"
    : danger
      ? "text-error hover:bg-error-container"
      : warning
        ? "text-tertiary hover:bg-tertiary-container"
        : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface";

  const disabledClasses = disabled ? "opacity-30 cursor-not-allowed pointer-events-none" : "cursor-pointer";

  return (
    <button
      data-testid={testId}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${stateClasses} ${disabledClasses}`}
    >
      {icon}
      {badge && (
        <span className={`absolute bottom-0.5 right-1 text-[8px] font-bold leading-none tabular-nums ${active ? "text-on-primary-container/70" : "text-on-surface-variant/50"}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function Separator() {
  return <div className="w-px h-6 bg-outline-variant mx-1 flex-shrink-0" />;
}

function SquareGuideIcon({ size = 18 }: { size?: number }) {
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
          className="flex items-center px-2 py-2 bg-surface-container rounded-3xl border border-outline-variant shadow-xl"
          style={{ gap: 4 }}
        >
          {/* Drag grip */}
          <div
            className="flex items-center justify-center w-8 h-11 cursor-grab active:cursor-grabbing text-on-surface-variant/40 hover:text-on-surface-variant transition-colors flex-shrink-0"
            onMouseDown={onGripMouseDown}
            title="Drag to reposition"
          >
            <GripHorizontal className="w-4 h-4" />
          </div>

          {!minimized && (
            <>
              <Separator />

              {/* GROUP 1: File ops */}
              <ToolButton testId="button-new-project"
                icon={<FilePlus className="w-[18px] h-[18px]" />}
                title="New Project  [N]" onClick={newProject} warning />
              <ToolButton testId="button-import"
                icon={<Upload className="w-[17px] h-[17px]" />}
                title="Import .hbs map" onClick={() => fileInputRef.current?.click()} />
              <ToolButton testId="button-export"
                icon={<Download className="w-[17px] h-[17px]" />}
                title="Export .hbs map" onClick={handleExport} />

              <Separator />

              {/* GROUP 2: Navigation */}
              <ToolButton testId="button-tool-pan"
                icon={<MousePointer2 className="w-[18px] h-[18px]" />}
                title="Select / Pan  [P]"
                active={currentTool === "pan"}
                onClick={() => setCurrentTool("pan")}
                badge="P" />

              <Separator />

              {/* GROUP 3: Draw */}
              <ToolButton testId="button-tool-vertex"
                icon={<CircleDot className="w-[18px] h-[18px]" />}
                title="Vertex  [V]"
                active={currentTool === "vertex"}
                onClick={() => setCurrentTool("vertex")}
                badge="V" />
              <ToolButton testId="button-tool-segment"
                icon={<PenLine className="w-[18px] h-[18px]" />}
                title="Segment  [S]"
                active={currentTool === "segment"}
                onClick={() => setCurrentTool("segment")}
                badge="S" />
              <ToolButton testId="button-tool-polyline"
                icon={<Waypoints className="w-[18px] h-[18px]" />}
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

              <Separator />

              {/* GROUP 5: History */}
              <ToolButton testId="button-undo"
                icon={<Undo2 className="w-[17px] h-[17px]" />}
                title="Undo  [Ctrl+Z]" onClick={undo} disabled={!canUndo} />
              <ToolButton testId="button-redo"
                icon={<Redo2 className="w-[17px] h-[17px]" />}
                title="Redo  [Ctrl+Y]" onClick={redo} disabled={!canRedo} />

              <Separator />

              {/* GROUP 6: View / Actions */}
              <ToolButton testId="button-preview"
                icon={previewMode ? <EyeOff className="w-[17px] h-[17px]" /> : <Eye className="w-[17px] h-[17px]" />}
                title={previewMode ? "Exit Preview" : "Preview — hide vertices  [Space]"}
                active={previewMode}
                onClick={togglePreviewMode} />
              <ToolButton testId="button-tool-delete"
                icon={<Trash2 className="w-[17px] h-[17px]" />}
                title="Delete Selected  [Del]"
                onClick={() => {
                  if (selectedVertices.length > 0) deleteSelectedVertices();
                  else if (selectedSegments.length > 0) deleteSelectedSegments();
                }}
                disabled={!hasSelection}
                danger={hasSelection} />

              <Separator />
            </>
          )}

          {/* Minimize toggle */}
          <button
            title={minimized ? "Expand toolbar" : "Minimize toolbar"}
            onClick={() => setMinimized(v => !v)}
            className="w-8 h-11 flex items-center justify-center rounded-2xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all flex-shrink-0"
          >
            {minimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </>
  );
};
