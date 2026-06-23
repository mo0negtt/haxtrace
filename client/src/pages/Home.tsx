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
  { badge: "NUEVO" as const, version: "2.7.0", text: "Interfaz rediseñada con Material Design 3. Polyline ahora permite seleccionar segmentos con clic derecho. Selección múltiple con Shift+arrastrar en todas las tools." },
  { badge: "NUEVO" as const, version: "2.6.0", text: "Añadidas Smart Guides y Mirror Mode al editor." },
  { badge: "NUEVO" as const, version: "2.5.0", text: "Curve Editor con soporte multi-segmento (Angle, Radius, Sagitta)." },
  { badge: "FIX" as const, version: "2.4.2", text: "Corregido error en la exportación de polígonos complejos." },
  { badge: "INFO" as const, version: "2.4.0", text: "Polyline tool mejorado con Ortho Guide de 8 direcciones." },
  { badge: "FIX" as const, version: "2.3.1", text: "Arreglado bug de undo/redo en selecciones múltiples." },
  { badge: "NUEVO" as const, version: "2.3.0", text: "Background Image: soporte para lock, offset y escala." },
  { badge: "INFO" as const, version: "2.2.0", text: "Panel de propiedades rediseñado con Material Design 3." },
];

function BadgePill({ type }: { type: "NUEVO" | "FIX" | "INFO" }) {
  const styles = {
    NUEVO: "bg-primary-container text-on-primary-container",
    FIX: "bg-error-container text-on-error-container",
    INFO: "bg-surface-container-highest text-on-surface-variant",
  }[type];
  return (
    <span className={`inline-block text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 ${styles}`}>
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
  variant?: "muted" | "filled" | "tonal";
}) {
  const baseClasses = "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200";
  const variantClasses = {
    muted: "bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
    filled: "bg-primary text-on-primary hover:shadow-lg shadow-primary/30",
    tonal: "bg-primary-container text-on-primary-container hover:bg-primary/15",
  }[variant];

  return (
    <button onClick={onClick} className={`${baseClasses} ${variantClasses}`}>
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
    <div className="h-screen overflow-hidden flex flex-col select-none bg-background text-on-background">
      {/* HEADER + TABS */}
      <header className="flex-shrink-0 flex items-center px-8 py-3 bg-surface border-b border-outline-variant">
        {/* Logo */}
        <div className="flex-shrink-0">
          <img
            src="/haxtrace-icon.png"
            alt="HaxTrace"
            className="h-9 w-auto object-contain"
          />
        </div>

        {/* Center: Tabs (MD3 Segmented Button style) */}
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-surface-container-high rounded-full p-1 flex">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-5 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
                  activeTab === t.id
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: FAB */}
        <div className="flex-shrink-0">
          <Link href="/editor">
            <button
              title="Nuevo Proyecto"
              className="w-12 h-12 flex items-center justify-center rounded-full bg-tertiary text-on-tertiary shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} />
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

      {/* BODY */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto px-8 py-8">
          {activeTab === "inicio" && (
            <>
              {/* Section header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-on-surface">Proyectos Recientes</h2>
                  <p className="text-sm text-on-surface-variant mt-0.5">
                    {projects.length} {projects.length === 1 ? "archivo encontrado" : "archivos encontrados"}
                  </p>
                </div>
                <DashBtn icon={<Upload className="w-4 h-4" />} label="Subir .hbs" variant="tonal" onClick={() => fileInputRef.current?.click()} />
              </div>

              {/* Project grid or empty state */}
              {projects.length > 0 ? (
                <div
                  className="grid gap-4"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
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
                    className={`w-full rounded-3xl flex flex-col items-center justify-center gap-3 transition-all duration-200 h-[140px] ${
                      dragOver
                        ? "bg-primary-container border-2 border-primary"
                        : "bg-surface-container border-2 border-dashed border-outline-variant hover:border-primary hover:bg-primary-container/30"
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                  >
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-surface-container-highest">
                      <Plus className="w-5 h-5 text-on-surface-variant" />
                    </div>
                    <span className="text-sm text-on-surface-variant">Subir archivo</span>
                  </button>
                </div>
              ) : (
                /* Empty state */
                <div
                  className={`rounded-3xl flex flex-col items-center justify-center gap-5 py-20 transition-all duration-200 ${
                    dragOver
                      ? "bg-primary-container border-2 border-primary"
                      : "bg-surface-container border-2 border-dashed border-outline-variant"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                >
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-surface-container-highest">
                    <FolderOpen className="w-6 h-6 text-on-surface-variant" />
                  </div>
                  <div className="text-center">
                    <p className="text-base font-medium text-on-surface-variant">No hay proyectos recientes</p>
                    <p className="text-sm text-on-surface-variant/70 mt-1">Arrastra un .hbs aquí o usa el botón de subir</p>
                  </div>
                  <DashBtn icon={<Upload className="w-4 h-4" />} label="Subir archivo .hbs" variant="filled" onClick={() => fileInputRef.current?.click()} />
                </div>
              )}

              {/* Quick actions */}
              <div className="mt-8">
                <p className="text-xs font-semibold uppercase tracking-wider mb-4 text-on-surface-variant">
                  Acceso Rápido
                </p>
                <div className="flex gap-3">
                  <Link href="/editor">
                    <DashBtn icon={<Zap className="w-4 h-4" />} label="Abrir Editor" variant="filled" />
                  </Link>
                  <a href="https://github.com/haxball/haxball-issues/wiki/Stadium-(.hbs)-File" target="_blank" rel="noopener noreferrer">
                    <DashBtn icon={<GitBranch className="w-4 h-4" />} label="Documentación .hbs" variant="muted" />
                  </a>
                </div>
              </div>
            </>
          )}

          {activeTab === "logs" && (
            <div className="max-w-2xl">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-on-surface">Logs de Versión</h2>
                <p className="text-sm text-on-surface-variant mt-0.5">
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

        {/* RIGHT SIDEBAR */}
        {activeTab === "inicio" && (
          <aside className="flex-shrink-0 flex flex-col overflow-hidden w-[300px] bg-surface-container border-l border-outline-variant">
            <div className="px-5 py-4 flex-shrink-0 border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Logs de Versión
                </span>
              </div>
              <p className="text-xs text-on-surface-variant/70 mt-1">
                changelog · HaxTrace
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
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
      className={`rounded-3xl p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 relative h-[140px] ${
        hovered
          ? "bg-surface-container-high border border-primary shadow-lg"
          : "bg-surface-container border border-outline-variant"
      }`}
    >
      {/* Delete button */}
      {hovered && (
        <button
          onClick={(e) => onDelete(project.id, e)}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-surface-container-highest text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-all duration-200"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 bg-primary-container">
        <FileCode2 className="w-5 h-5 text-on-primary-container" />
      </div>

      <div>
        <p className="text-sm font-semibold text-on-surface truncate leading-tight pr-2">{project.name}</p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs text-on-surface-variant">
            {project.size}
          </span>
          <span className="flex items-center gap-1 text-xs text-on-surface-variant/70">
            <Clock className="w-3 h-3" />
            {timeAgo(project.modified)}
          </span>
        </div>
      </div>
    </div>
  );
}

function LogEntry({ badge, version, text, compact = false }: { badge: "NUEVO" | "FIX" | "INFO"; version: string; text: string; compact?: boolean }) {
  return (
    <div className="flex gap-3 rounded-2xl px-4 py-3 bg-surface-container-low hover:bg-surface-container transition-all duration-200">
      <div className="flex-shrink-0 mt-0.5">
        <BadgePill type={badge} />
      </div>
      <div className="min-w-0">
        <span className="text-xs text-on-surface-variant block">
          v{version}
        </span>
        <p className={`${compact ? "text-xs" : "text-sm"} leading-snug text-on-surface mt-0.5`}>
          {text}
        </p>
      </div>
    </div>
  );
}
