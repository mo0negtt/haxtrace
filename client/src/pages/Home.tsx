import { Link, useLocation } from "wouter";
import { useState, useRef, useCallback, ReactNode } from "react";
import {
  Plus,
  GitBranch,
  FolderOpen,
  Upload,
  FileCode2,
  Clock,
  Zap,
  Trash2,
} from "lucide-react";

type Tab = "inicio" | "logs";

export interface SavedProject {
  id: string;
  name: string;
  size: string;
  modified: string;
  content: string;
}

const STORAGE_KEY = "haxtrace_projects";
const PENDING_KEY = "haxtrace_pending_load";

function loadProjects(): SavedProject[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveProjects(projects: SavedProject[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  return `Hace ${Math.floor(days / 7)} semanas`;
}

const VERSION_LOGS = [
  { badge: "NUEVO" as const, version: "2.6.0", text: "Añadidas Smart Guides y Mirror Mode al editor." },
  { badge: "NUEVO" as const, version: "2.5.0", text: "Curve Editor con soporte multi-segmento (Angle, Radius, Sagitta)." },
  { badge: "FIX" as const, version: "2.4.2", text: "Corregido error en la exportación de polígonos complejos." },
  { badge: "INFO" as const, version: "2.4.0", text: "Polyline tool mejorado con Ortho Guide de 8 direcciones." },
  { badge: "FIX" as const, version: "2.3.1", text: "Arreglado bug de undo/redo en selecciones múltiples." },
  { badge: "NUEVO" as const, version: "2.3.0", text: "Background Image: soporte para lock, offset y escala." },
  { badge: "INFO" as const, version: "2.2.0", text: "Panel de propiedades rediseñado con glassmorphism." },
  { badge: "FIX" as const, version: "2.1.3", text: "Corregido crash al importar archivos .hbs malformados." },
];

function BadgePill({ type }: { type: "NUEVO" | "FIX" | "INFO" }) {
  const styles = {
    NUEVO: { background: "#00d4ff", color: "#000" },
    FIX: { background: "#f97316", color: "#000" },
    INFO: { background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.12)" },
  }[type];
  return (
    <span className="inline-block text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded-sm flex-shrink-0" style={styles}>
      {type}
    </span>
  );
}

function DashBtn({
  icon,
  label,
  onClick,
  variant = "muted",
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  variant?: "muted" | "cyan";
}) {
  const isCyan = variant === "cyan";
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
      style={{
        background: isCyan ? "rgba(0,212,255,0.08)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${isCyan ? "rgba(0,212,255,0.2)" : "rgba(255,255,255,0.08)"}`,
        color: isCyan ? "#00d4ff" : "rgba(255,255,255,0.45)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        if (isCyan) {
          el.style.background = "rgba(0,212,255,0.14)";
          el.style.borderColor = "rgba(0,212,255,0.35)";
        } else {
          el.style.color = "white";
          el.style.background = "rgba(255,255,255,0.07)";
          el.style.borderColor = "rgba(255,255,255,0.15)";
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        if (isCyan) {
          el.style.background = "rgba(0,212,255,0.08)";
          el.style.borderColor = "rgba(0,212,255,0.2)";
        } else {
          el.style.color = "rgba(255,255,255,0.45)";
          el.style.background = "rgba(255,255,255,0.04)";
          el.style.borderColor = "rgba(255,255,255,0.08)";
        }
      }}
    >
      {icon}
      {label}
    </button>
  );
}

export default function Home() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("inicio");
  const [projects, setProjects] = useState<SavedProject[]>(loadProjects);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs: { id: Tab; label: string }[] = [
    { id: "inicio", label: "Inicio" },
    { id: "logs", label: "Logs de Versión" },
  ];

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.name.endsWith(".hbs")) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        try {
          JSON.parse(content);
        } catch {
          alert(`El archivo "${file.name}" no es un .hbs válido.`);
          return;
        }
        const project: SavedProject = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: file.name,
          size: formatBytes(file.size),
          modified: new Date().toISOString(),
          content,
        };
        setProjects((prev) => {
          const next = [project, ...prev.filter((p) => p.name !== file.name)];
          saveProjects(next);
          return next;
        });
      };
      reader.readAsText(file);
    });
  }, []);

  const openProject = useCallback((project: SavedProject) => {
    localStorage.setItem(PENDING_KEY, project.content);
    navigate("/editor");
  }, [navigate]);

  const deleteProject = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveProjects(next);
      return next;
    });
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  return (
    <div
      className="h-screen overflow-hidden flex flex-col select-none"
      style={{ background: "#0f0f0f", color: "#e5e5e5", fontFamily: "'Inter', 'Geist', system-ui, sans-serif" }}
    >
      {/* ── HEADER + TABS (single bar) ── */}
      <header
        className="flex-shrink-0 flex items-center px-8 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        {/* Left: Logo */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <img
            src="/favicon-trace.png"
            alt="HaxTrace"
            className="w-7 h-7 object-contain"
            style={{ filter: "drop-shadow(0 0 6px rgba(0,212,255,0.4))" }}
          />
          <span className="font-bold text-base tracking-tight text-white">
            Hax<span style={{ color: "#00d4ff" }}>Trace</span>
          </span>
        </div>

        {/* Center: Tabs */}
        <div className="flex-1 flex items-center justify-center gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className="px-4 py-1.5 text-sm font-medium rounded-full transition-all"
              style={
                activeTab === t.id
                  ? { background: "#00d4ff", color: "#000", fontWeight: 700, boxShadow: "0 0 14px rgba(0,212,255,0.35)" }
                  : { color: "rgba(255,255,255,0.35)", background: "transparent" }
              }
              onMouseEnter={(e) => { if (activeTab !== t.id) (e.currentTarget as HTMLElement).style.color = "white"; }}
              onMouseLeave={(e) => { if (activeTab !== t.id) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)"; }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Right: + button */}
        <div className="flex-shrink-0">
          <Link href="/editor">
            <button
              title="Nuevo Proyecto"
              className="w-8 h-8 flex items-center justify-center rounded-full transition-all cursor-pointer"
              style={{ background: "#f97316", boxShadow: "0 0 14px rgba(249,115,22,0.35)", color: "white" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 22px rgba(249,115,22,0.6)"; (e.currentTarget as HTMLElement).style.transform = "scale(1.08)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 14px rgba(249,115,22,0.35)"; (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </Link>
        </div>
      </header>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".hbs"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        onClick={(e) => { (e.target as HTMLInputElement).value = ""; }}
      />

      {/* ── BODY ── */}
      <div className="flex-1 flex overflow-hidden">
        <div
          className="flex-1 overflow-y-auto px-8 py-8"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.07) transparent" }}
        >
          {activeTab === "inicio" && (
            <>
              {/* Section header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold text-white">Proyectos Recientes</h2>
                  <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', 'Roboto Mono', monospace" }}>
                    {projects.length} {projects.length === 1 ? "archivo encontrado" : "archivos encontrados"}
                  </p>
                </div>
                <DashBtn icon={<Upload className="w-3.5 h-3.5" />} label="Subir .hbs" onClick={() => fileInputRef.current?.click()} />
              </div>

              {/* Project grid or empty state */}
              {projects.length > 0 ? (
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                >
                  {projects.map((p) => (
                    <ProjectCard key={p.id} project={p} onOpen={openProject} onDelete={deleteProject} />
                  ))}

                  {/* Upload slot */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-2xl flex flex-col items-center justify-center gap-2 transition-all"
                    style={{
                      height: 120,
                      background: dragOver ? "rgba(0,212,255,0.04)" : "rgba(255,255,255,0.02)",
                      border: `1.5px dashed ${dragOver ? "rgba(0,212,255,0.35)" : "rgba(255,255,255,0.07)"}`,
                    }}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <Plus className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.25)" }} />
                    </div>
                    <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>Subir archivo</span>
                  </button>
                </div>
              ) : (
                /* Empty state */
                <div
                  className="rounded-2xl flex flex-col items-center justify-center gap-4 py-16 transition-all"
                  style={{
                    background: dragOver ? "rgba(0,212,255,0.04)" : "rgba(255,255,255,0.02)",
                    border: `1.5px dashed ${dragOver ? "rgba(0,212,255,0.35)" : "rgba(255,255,255,0.07)"}`,
                  }}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                >
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <FolderOpen className="w-5 h-5" style={{ color: "rgba(255,255,255,0.2)" }} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.25)" }}>No hay proyectos recientes</p>
                    <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.15)" }}>Arrastra un .hbs aquí o usa el botón de subir</p>
                  </div>
                  <DashBtn icon={<Upload className="w-3.5 h-3.5" />} label="Subir archivo .hbs" onClick={() => fileInputRef.current?.click()} />
                </div>
              )}

              {/* Quick actions */}
              <div className="mt-6">
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: "rgba(255,255,255,0.2)" }}>
                  Acceso Rápido
                </p>
                <div className="flex gap-3">
                  <Link href="/editor">
                    <DashBtn icon={<Zap className="w-3.5 h-3.5" />} label="Abrir Editor" variant="cyan" />
                  </Link>
                  <a href="https://github.com/haxball/haxball-issues/wiki/Stadium-(.hbs)-File" target="_blank" rel="noopener noreferrer">
                    <DashBtn icon={<GitBranch className="w-3.5 h-3.5" />} label="Documentación .hbs" />
                  </a>
                </div>
              </div>
            </>
          )}

          {activeTab === "logs" && (
            <div className="max-w-2xl">
              <div className="mb-5">
                <h2 className="text-base font-bold text-white">Logs de Versión</h2>
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', 'Roboto Mono', monospace" }}>
                  changelog · HaxTrace
                </p>
              </div>
              <div className="space-y-2">
                {VERSION_LOGS.map((log, i) => (
                  <LogEntry key={i} {...log} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        {activeTab === "inicio" && (
          <aside
            className="flex-shrink-0 flex flex-col overflow-hidden"
            style={{ width: 280, borderLeft: "1px solid rgba(255,255,255,0.05)", background: "rgba(10,10,12,0.8)" }}
          >
            <div className="px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-2">
                <GitBranch className="w-3.5 h-3.5" style={{ color: "#00d4ff" }} />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Logs de Versión
                </span>
              </div>
              <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono', 'Roboto Mono', monospace" }}>
                changelog · HaxTrace
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.06) transparent" }}>
              {VERSION_LOGS.map((log, i) => (
                <LogEntry key={i} {...log} compact />
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  onOpen,
  onDelete,
}: {
  project: SavedProject;
  onOpen: (p: SavedProject) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => onOpen(project)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all relative"
      style={{
        height: 120,
        background: "rgba(30,30,30,0.6)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: hovered ? "1px solid #00d4ff" : "1px solid rgba(255,255,255,0.07)",
        boxShadow: hovered ? "0 0 18px rgba(0,212,255,0.12)" : "none",
      }}
    >
      {/* Delete button */}
      {hovered && (
        <button
          onClick={(e) => onDelete(project.id, e)}
          className="absolute top-2.5 right-2.5 w-6 h-6 flex items-center justify-center rounded-lg transition-all"
          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.15)"; (e.currentTarget as HTMLElement).style.color = "#ef4444"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.3)"; }}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}

      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.15)" }}
      >
        <FileCode2 className="w-4 h-4" style={{ color: "#00d4ff" }} />
      </div>

      <div>
        <p className="text-[12px] font-semibold text-white truncate leading-tight pr-2">{project.name}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', 'Roboto Mono', monospace" }}>
            {project.size}
          </span>
          <span className="flex items-center gap-1 text-[9px]" style={{ color: "rgba(255,255,255,0.2)" }}>
            <Clock className="w-2.5 h-2.5" />
            {timeAgo(project.modified)}
          </span>
        </div>
      </div>
    </div>
  );
}

function LogEntry({ badge, version, text, compact = false }: { badge: "NUEVO" | "FIX" | "INFO"; version: string; text: string; compact?: boolean }) {
  return (
    <div
      className="flex gap-2.5 rounded-xl px-3 py-2.5 transition-all"
      style={{ background: "rgba(255,255,255,0.02)" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"; }}
    >
      <div className="flex-shrink-0 mt-0.5">
        <BadgePill type={badge} />
      </div>
      <div className="min-w-0">
        <span className="text-[10px] font-mono block" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono', 'Roboto Mono', monospace" }}>
          v{version}
        </span>
        <p className={compact ? "text-[11px] leading-snug" : "text-[12px] leading-snug"} style={{ color: "rgba(255,255,255,0.6)" }}>
          {text}
        </p>
      </div>
    </div>
  );
}
