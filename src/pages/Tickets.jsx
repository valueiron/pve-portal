import { useState, useEffect, useCallback, useRef } from "react";
import {
  FaBug, FaStar, FaCheckSquare, FaArrowUp, FaFileAlt,
  FaTicketAlt, FaPlus, FaEdit, FaTrash, FaChevronUp, FaChevronDown,
  FaSearch, FaExclamationTriangle, FaColumns, FaTh, FaList,
  FaTag, FaTimes, FaCheck
} from "react-icons/fa";
import {
  DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import "./Page.css";
import { API_ENDPOINTS } from "../config/api";
import {
  fetchBoards, createBoard, updateBoard, deleteBoard,
  fetchColumns, createColumn, updateColumn, deleteColumn, reorderColumns,
  fetchTickets, createTicket, updateTicket, deleteTicket, moveTicket,
} from "../services/ticketsService";

// ── Constants ──────────────────────────────────────────────────────────────────

const TABS = ["Board", "Tickets", "Columns", "Boards"];

const PRIORITY_COLORS = {
  low: "#4caf50",
  medium: "#ff9800",
  high: "#f44336",
  critical: "#9c27b0",
};

const TYPE_ICONS = {
  bug: FaBug,
  feature: FaStar,
  task: FaCheckSquare,
  improvement: FaArrowUp,
  docs: FaFileAlt,
};

const PRIORITIES = ["low", "medium", "high", "critical"];
const TYPES = ["bug", "feature", "task", "improvement", "docs"];

// ── Helpers ────────────────────────────────────────────────────────────────────

const ageFrom = (iso) => {
  if (!iso) return "—";
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

const initials = (name) => {
  if (!name) return "?";
  return name.split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);
};

const parseLabels = (labels) => {
  if (!labels) return [];
  if (Array.isArray(labels)) return labels;
  try { return JSON.parse(labels); } catch { return []; }
};

// ── Shared UI ──────────────────────────────────────────────────────────────────

const PriorityBadge = ({ priority }) => (
  <span style={{
    padding: "0.15rem 0.45rem",
    borderRadius: "3px",
    background: PRIORITY_COLORS[priority] || "#666",
    color: "#fff",
    fontSize: "0.65rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  }}>{priority || "—"}</span>
);

const TypeIcon = ({ type, size = 12 }) => {
  const Icon = TYPE_ICONS[type] || FaCheckSquare;
  return <Icon size={size} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />;
};

const Avatar = ({ name }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 22, height: 22, borderRadius: "50%",
    background: "var(--border-strong)", color: "var(--text-primary)",
    fontSize: "0.6rem", fontWeight: 700, flexShrink: 0,
  }}>{initials(name)}</span>
);

const LabelChip = ({ label }) => (
  <span style={{
    padding: "0.1rem 0.4rem", borderRadius: "999px",
    background: "var(--border-subtle)", color: "var(--text-secondary)",
    fontSize: "0.65rem", fontWeight: 500, whiteSpace: "nowrap",
  }}>{label}</span>
);

const Spinner = () => (
  <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
    <div style={{
      width: 28, height: 28, border: "3px solid var(--border-subtle)",
      borderTopColor: "var(--accent, #6366f1)", borderRadius: "50%",
      animation: "spin 0.7s linear infinite",
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const ErrorBanner = ({ msg, onClose }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: "0.6rem",
    padding: "0.75rem 1rem", borderRadius: "var(--radius-lg)",
    background: "rgba(244,67,54,0.12)", border: "1px solid rgba(244,67,54,0.35)",
    color: "#ef9a9a", marginBottom: "1rem",
  }}>
    <FaExclamationTriangle size={13} />
    <span style={{ flex: 1, fontSize: "0.85rem" }}>{msg}</span>
    <button onClick={onClose} style={{ background: "none", border: "none", color: "#ef9a9a", cursor: "pointer" }}>
      <FaTimes size={12} />
    </button>
  </div>
);

const EmptyState = ({ icon: Icon, title, sub }) => (
  <div style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--text-secondary)" }}>
    <Icon size={36} style={{ opacity: 0.3, marginBottom: "1rem" }} />
    <div style={{ fontWeight: 600, fontSize: "1rem", color: "var(--text-primary)", marginBottom: "0.3rem" }}>{title}</div>
    <div style={{ fontSize: "0.85rem" }}>{sub}</div>
  </div>
);

// ── Modal shell ────────────────────────────────────────────────────────────────

const Modal = ({ title, onClose, children, width = 480 }) => (
  <div style={{
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, padding: "1rem",
  }} onClick={onClose}>
    <div style={{
      background: "var(--bg-surface-1)", border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)", width: "100%", maxWidth: width,
      maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
    }} onClick={e => e.stopPropagation()}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1rem 1.25rem", borderBottom: "1px solid var(--border-subtle)",
      }}>
        <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>{title}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>
          <FaTimes size={14} />
        </button>
      </div>
      <div style={{ padding: "1.25rem" }}>{children}</div>
    </div>
  </div>
);

// ── Form helpers ───────────────────────────────────────────────────────────────

const Field = ({ label, children }) => (
  <div style={{ marginBottom: "1rem" }}>
    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600,
      textTransform: "uppercase", letterSpacing: "0.05em",
      color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
      {label}
    </label>
    {children}
  </div>
);

const inputStyle = {
  width: "100%", boxSizing: "border-box",
  padding: "0.5rem 0.75rem",
  background: "var(--bg-elevated, var(--bg-surface-1))",
  border: "1px solid var(--border-subtle)",
  borderRadius: "6px", color: "var(--text-primary)",
  fontSize: "0.875rem", outline: "none",
};

const btnPrimary = {
  padding: "0.5rem 1.1rem", borderRadius: "6px",
  background: "var(--accent, #6366f1)", border: "none",
  color: "#fff", fontWeight: 600, fontSize: "0.85rem",
  cursor: "pointer",
};

const btnSecondary = {
  padding: "0.5rem 1.1rem", borderRadius: "6px",
  background: "transparent", border: "1px solid var(--border-subtle)",
  color: "var(--text-secondary)", fontWeight: 600, fontSize: "0.85rem",
  cursor: "pointer",
};

const btnDanger = {
  padding: "0.4rem 0.8rem", borderRadius: "6px",
  background: "rgba(244,67,54,0.15)", border: "1px solid rgba(244,67,54,0.3)",
  color: "#ef9a9a", fontWeight: 600, fontSize: "0.78rem",
  cursor: "pointer",
};

// ── Board Modal ────────────────────────────────────────────────────────────────

const BoardModal = ({ board, onClose, onSave }) => {
  const [name, setName] = useState(board?.name || "");
  const [description, setDescription] = useState(board?.description || "");
  const [color, setColor] = useState(board?.color || "#6366f1");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), description: description.trim(), color });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <Modal title={board ? "Edit Board" : "New Board"} onClose={onClose}>
      <Field label="Name *">
        <input style={inputStyle} value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. Sprint 24" autoFocus />
      </Field>
      <Field label="Description">
        <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 72 }}
          value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Optional description" />
      </Field>
      <Field label="Color">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            style={{ width: 40, height: 32, border: "none", background: "none", cursor: "pointer" }} />
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{color}</span>
        </div>
      </Field>
      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
        <button style={btnSecondary} onClick={onClose}>Cancel</button>
        <button style={btnPrimary} onClick={save} disabled={saving || !name.trim()}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
};

// ── Column Modal ───────────────────────────────────────────────────────────────

const ColumnModal = ({ column, onClose, onSave }) => {
  const [name, setName] = useState(column?.name || "");
  const [color, setColor] = useState(column?.color || "#6366f1");
  const [wipLimit, setWipLimit] = useState(column?.wip_limit ?? 0);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), color, wip_limit: parseInt(wipLimit) || 0 });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <Modal title={column ? "Edit Column" : "New Column"} onClose={onClose}>
      <Field label="Name *">
        <input style={inputStyle} value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. In Progress" autoFocus />
      </Field>
      <Field label="Color">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            style={{ width: 40, height: 32, border: "none", background: "none", cursor: "pointer" }} />
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{color}</span>
        </div>
      </Field>
      <Field label="WIP Limit (0 = unlimited)">
        <input style={inputStyle} type="number" min={0} value={wipLimit}
          onChange={e => setWipLimit(e.target.value)} />
      </Field>
      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
        <button style={btnSecondary} onClick={onClose}>Cancel</button>
        <button style={btnPrimary} onClick={save} disabled={saving || !name.trim()}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
};

// ── Ticket Modal ───────────────────────────────────────────────────────────────

const TicketModal = ({ ticket, columns, boardId, onClose, onSave }) => {
  const [title, setTitle] = useState(ticket?.title || "");
  const [description, setDescription] = useState(ticket?.description || "");
  const [priority, setPriority] = useState(ticket?.priority || "medium");
  const [type, setType] = useState(ticket?.type || "task");
  const [assignee, setAssignee] = useState(ticket?.assignee || "");
  const [labelsRaw, setLabelsRaw] = useState(() => parseLabels(ticket?.labels).join(", "));
  const [columnId, setColumnId] = useState(ticket?.column_id || columns[0]?.id || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const labelArr = labelsRaw.split(",").map(l => l.trim()).filter(Boolean);
    try {
      await onSave({
        title: title.trim(), description: description.trim(),
        priority, type, assignee: assignee.trim(),
        labels: JSON.stringify(labelArr),
        column_id: parseInt(columnId) || columns[0]?.id,
        position: ticket?.position ?? 0,
      });
      onClose();
    } finally { setSaving(false); }
  };

  const selectStyle = { ...inputStyle };

  return (
    <Modal title={ticket ? "Edit Ticket" : "New Ticket"} onClose={onClose} width={560}>
      <Field label="Title *">
        <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Brief summary of the issue" autoFocus />
      </Field>
      <Field label="Description">
        <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 88 }}
          value={description} onChange={e => setDescription(e.target.value)}
          placeholder="More detail…" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <Field label="Priority">
          <select style={selectStyle} value={priority} onChange={e => setPriority(e.target.value)}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </Field>
        <Field label="Type">
          <select style={selectStyle} value={type} onChange={e => setType(e.target.value)}>
            {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <Field label="Assignee">
          <input style={inputStyle} value={assignee} onChange={e => setAssignee(e.target.value)}
            placeholder="Name or username" />
        </Field>
        <Field label="Column">
          <select style={selectStyle} value={columnId} onChange={e => setColumnId(e.target.value)}>
            {columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Labels (comma-separated)">
        <input style={inputStyle} value={labelsRaw} onChange={e => setLabelsRaw(e.target.value)}
          placeholder="infra, urgent, backend" />
      </Field>
      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
        <button style={btnSecondary} onClick={onClose}>Cancel</button>
        <button style={btnPrimary} onClick={save} disabled={saving || !title.trim()}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
};

// ── Ticket Card ────────────────────────────────────────────────────────────────

const TicketCard = ({ ticket, onEdit, onDelete, style: extraStyle }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const labels = parseLabels(ticket.labels);

  return (
    <div style={{
      background: "var(--bg-elevated, var(--bg-surface-1))",
      border: "1px solid var(--border-subtle)",
      borderRadius: "8px", padding: "0.75rem",
      marginBottom: "0.5rem",
      transition: "border-color 0.15s, box-shadow 0.15s",
      position: "relative",
      ...extraStyle,
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.boxShadow = "none"; }}
      onClick={() => onEdit(ticket)}
    >
      {/* Title row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem", marginBottom: "0.5rem" }}>
        <TypeIcon type={ticket.type} size={11} />
        <span style={{ fontSize: "0.83rem", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4, flex: 1 }}>
          {ticket.title}
        </span>
      </div>

      {/* Labels */}
      {labels.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginBottom: "0.5rem" }}>
          {labels.map(l => <LabelChip key={l} label={l} />)}
        </div>
      )}

      {/* Footer row */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }} onClick={e => e.stopPropagation()}>
        <PriorityBadge priority={ticket.priority} />
        <span style={{ flex: 1 }} />
        {ticket.assignee && <Avatar name={ticket.assignee} />}

        {/* Delete */}
        {confirmDelete ? (
          <>
            <button style={{ ...btnDanger, padding: "0.2rem 0.5rem", fontSize: "0.7rem" }}
              onClick={e => { e.stopPropagation(); onDelete(ticket.id); setConfirmDelete(false); }}>
              Confirm?
            </button>
            <button style={{ ...btnSecondary, padding: "0.2rem 0.45rem", fontSize: "0.7rem" }}
              onClick={e => { e.stopPropagation(); setConfirmDelete(false); }}>
              <FaTimes size={9} />
            </button>
          </>
        ) : (
          <button style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "0.2rem" }}
            onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}>
            <FaTrash size={10} />
          </button>
        )}
      </div>
    </div>
  );
};

// ── Sortable Ticket Card (DnD wrapper) ────────────────────────────────────────

const SortableTicketCard = ({ ticket, onEdit, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ticket.id });
  return (
    <div ref={setNodeRef} style={{
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.4 : 1,
      cursor: isDragging ? "grabbing" : "grab",
    }} {...attributes} {...listeners}>
      <TicketCard ticket={ticket} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
};

// ── Droppable Column ──────────────────────────────────────────────────────────

const DroppableColumn = ({ id, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${id}` });
  return (
    <div ref={setNodeRef} style={{
      flex: 1, padding: "0.75rem 0.7rem",
      overflowY: "auto", maxHeight: 600,
      background: isOver ? "rgba(99,102,241,0.08)" : "transparent",
      transition: "background 0.15s",
    }}>
      {children}
    </div>
  );
};

// ── Board Tab ──────────────────────────────────────────────────────────────────

const BoardTab = ({ boardId, columns, tickets, onEditTicket, onDeleteTicket,
  sensors, onDragStart, onDragEnd, onDragCancel, activeDragTicket }) => {
  if (!boardId) return <EmptyState icon={FaTh} title="No board selected" sub="Select or create a board to get started." />;
  if (!columns.length) return <EmptyState icon={FaColumns} title="No columns yet" sub="Go to the Columns tab to add your first column." />;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners}
      onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
      <div style={{ display: "flex", gap: "1rem", overflowX: "auto", paddingBottom: "1rem", alignItems: "flex-start", minHeight: 300 }}>
        {columns.map(col => {
          const colTickets = tickets.filter(t => t.column_id === col.id)
            .sort((a, b) => a.position - b.position);
          const overWip = col.wip_limit > 0 && colTickets.length > col.wip_limit;
          const ticketIds = colTickets.map(t => t.id);

          return (
            <div key={col.id} style={{
              minWidth: 260, maxWidth: 300, flex: "0 0 280px",
              background: "var(--bg-surface-1)", border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)", overflow: "hidden",
              display: "flex", flexDirection: "column",
            }}>
              {/* Column header stripe */}
              <div style={{ height: 4, background: col.color || "#6366f1" }} />
              <div style={{ padding: "0.75rem 0.85rem", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-primary)", flex: 1 }}>{col.name}</span>
                  <span style={{
                    fontSize: "0.72rem", fontWeight: 600, padding: "0.1rem 0.4rem",
                    borderRadius: "999px",
                    background: overWip ? "rgba(244,67,54,0.15)" : "var(--border-subtle)",
                    color: overWip ? "#ef9a9a" : "var(--text-secondary)",
                  }}>
                    {colTickets.length}{col.wip_limit > 0 ? `/${col.wip_limit}` : ""}
                  </span>
                  {overWip && <FaExclamationTriangle size={11} style={{ color: "#ef9a9a" }} title="WIP limit exceeded" />}
                </div>
              </div>

              {/* Tickets */}
              <SortableContext items={ticketIds} strategy={verticalListSortingStrategy}>
                <DroppableColumn id={col.id}>
                  {colTickets.length === 0
                    ? <div style={{ color: "var(--text-secondary)", fontSize: "0.78rem", textAlign: "center", padding: "1rem 0", opacity: 0.5 }}>Empty</div>
                    : colTickets.map(t => (
                      <SortableTicketCard key={t.id} ticket={t}
                        onEdit={onEditTicket} onDelete={onDeleteTicket} />
                    ))
                  }
                </DroppableColumn>
              </SortableContext>
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {activeDragTicket && (
          <TicketCard ticket={activeDragTicket} onEdit={() => {}} onDelete={() => {}}
            style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.4)", cursor: "grabbing" }} />
        )}
      </DragOverlay>
    </DndContext>
  );
};

// ── Tickets Tab ────────────────────────────────────────────────────────────────

const TicketsTab = ({ boardId, columns, tickets, onEditTicket, onDeleteTicket }) => {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [deletingId, setDeletingId] = useState(null);

  if (!boardId) return <EmptyState icon={FaList} title="No board selected" sub="Select a board above." />;

  const colMap = Object.fromEntries(columns.map(c => [c.id, c]));

  const filtered = tickets.filter(t =>
    !search || [t.title, t.description, t.assignee, t.priority, t.type].some(
      v => (v || "").toLowerCase().includes(search.toLowerCase())
    )
  ).sort((a, b) => {
    let av = a[sortKey] ?? "", bv = b[sortKey] ?? "";
    if (typeof av === "number") return sortDir === "asc" ? av - bv : bv - av;
    return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const thStyle = (key) => ({
    padding: "0.6rem 0.85rem", textAlign: "left",
    fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.06em", color: "var(--text-secondary)",
    cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
    background: sortKey === key ? "var(--border-subtle)" : "transparent",
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <FaSearch size={12} style={{ position: "absolute", left: "0.65rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
          <input style={{ ...inputStyle, paddingLeft: "2rem" }} placeholder="Search tickets…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
          {filtered.length} / {tickets.length}
        </span>
      </div>

      {filtered.length === 0
        ? <EmptyState icon={FaTicketAlt} title="No tickets" sub={search ? "No matches found." : "Create your first ticket from the Board tab."} />
        : (
          <div style={{ overflowX: "auto", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-subtle)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "var(--bg-surface-1)" }}>
                <tr>
                  {[["title","Title"],["priority","Priority"],["type","Type"],["assignee","Assignee"],["column_id","Column"],["created_at","Age"]].map(([k,l]) => (
                    <th key={k} style={thStyle(k)} onClick={() => toggleSort(k)}>
                      {l} {sortKey === k ? (sortDir === "asc" ? "↑" : "↓") : ""}
                    </th>
                  ))}
                  <th style={{ ...thStyle(""), cursor: "default" }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => (
                  <tr key={t.id}
                    style={{ borderTop: "1px solid var(--border-subtle)", cursor: "pointer",
                      background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--border-subtle)"}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)"}
                    onClick={() => onEditTicket(t)}
                  >
                    <td style={{ padding: "0.6rem 0.85rem", fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: 500 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <TypeIcon type={t.type} size={11} />
                        {t.title}
                      </div>
                    </td>
                    <td style={{ padding: "0.6rem 0.85rem" }}><PriorityBadge priority={t.priority} /></td>
                    <td style={{ padding: "0.6rem 0.85rem", fontSize: "0.78rem", color: "var(--text-secondary)", textTransform: "capitalize" }}>{t.type || "—"}</td>
                    <td style={{ padding: "0.6rem 0.85rem" }}>
                      {t.assignee ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <Avatar name={t.assignee} />
                          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{t.assignee}</span>
                        </div>
                      ) : <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>—</span>}
                    </td>
                    <td style={{ padding: "0.6rem 0.85rem" }}>
                      {colMap[t.column_id] ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: colMap[t.column_id].color || "#666", flexShrink: 0 }} />
                          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{colMap[t.column_id].name}</span>
                        </div>
                      ) : <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>—</span>}
                    </td>
                    <td style={{ padding: "0.6rem 0.85rem", fontSize: "0.78rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                      {ageFrom(t.created_at)}
                    </td>
                    <td style={{ padding: "0.6rem 0.85rem" }} onClick={e => e.stopPropagation()}>
                      {deletingId === t.id ? (
                        <div style={{ display: "flex", gap: "0.3rem" }}>
                          <button style={{ ...btnDanger, padding: "0.2rem 0.5rem", fontSize: "0.72rem" }}
                            onClick={() => { onDeleteTicket(t.id); setDeletingId(null); }}>Confirm?</button>
                          <button style={{ ...btnSecondary, padding: "0.2rem 0.4rem" }}
                            onClick={() => setDeletingId(null)}><FaTimes size={9} /></button>
                        </div>
                      ) : (
                        <button style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
                          onClick={() => setDeletingId(t.id)}><FaTrash size={11} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  );
};

// ── Columns Tab ────────────────────────────────────────────────────────────────

const ColumnsTab = ({ boardId, columns, onRefresh }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [editingCol, setEditingCol] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);

  if (!boardId) return <EmptyState icon={FaColumns} title="No board selected" sub="Select a board above." />;

  const handleCreate = async (data) => {
    data.position = columns.length;
    await createColumn(boardId, data);
    onRefresh();
  };

  const handleUpdate = async (col, data) => {
    data.position = col.position;
    await updateColumn(boardId, col.id, data);
    onRefresh();
  };

  const handleDelete = async (id) => {
    try {
      await deleteColumn(boardId, id);
      onRefresh();
    } catch (e) { setError(e.message); }
    setDeletingId(null);
  };

  const handleReorder = async (fromIdx, toIdx) => {
    const order = columns.map(c => c.id);
    const [moved] = order.splice(fromIdx, 1);
    order.splice(toIdx, 0, moved);
    try {
      await reorderColumns(boardId, order);
      onRefresh();
    } catch (e) { setError(e.message); }
  };

  return (
    <div>
      {error && <ErrorBanner msg={error} onClose={() => setError(null)} />}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
        <button style={btnPrimary} onClick={() => setShowCreate(true)}>
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <FaPlus size={11} /> New Column
          </span>
        </button>
      </div>

      {columns.length === 0
        ? <EmptyState icon={FaColumns} title="No columns yet" sub="Create your first column above." />
        : (
          <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            {columns.map((col, idx) => (
              <div key={col.id} style={{
                display: "flex", alignItems: "center", gap: "0.85rem",
                padding: "0.75rem 1rem",
                borderTop: idx > 0 ? "1px solid var(--border-subtle)" : "none",
                background: "var(--bg-surface-1)",
              }}>
                {/* Color swatch */}
                <span style={{ width: 12, height: 12, borderRadius: "50%", background: col.color || "#666", flexShrink: 0 }} />
                {/* Name */}
                <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text-primary)", flex: 1 }}>{col.name}</span>
                {/* WIP */}
                {col.wip_limit > 0 && (
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>WIP: {col.wip_limit}</span>
                )}
                {/* Reorder */}
                <button style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "0.2rem" }}
                  disabled={idx === 0} onClick={() => handleReorder(idx, idx - 1)}>
                  <FaChevronUp size={11} />
                </button>
                <button style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "0.2rem" }}
                  disabled={idx === columns.length - 1} onClick={() => handleReorder(idx, idx + 1)}>
                  <FaChevronDown size={11} />
                </button>
                {/* Edit */}
                <button style={{ ...btnSecondary, padding: "0.3rem 0.65rem", fontSize: "0.78rem" }}
                  onClick={() => setEditingCol(col)}><FaEdit size={11} /></button>
                {/* Delete */}
                {deletingId === col.id ? (
                  <div style={{ display: "flex", gap: "0.3rem" }}>
                    <button style={{ ...btnDanger, padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                      onClick={() => handleDelete(col.id)}>Confirm?</button>
                    <button style={{ ...btnSecondary, padding: "0.3rem 0.55rem" }}
                      onClick={() => setDeletingId(null)}><FaTimes size={10} /></button>
                  </div>
                ) : (
                  <button style={{ ...btnDanger, padding: "0.3rem 0.65rem" }}
                    onClick={() => setDeletingId(col.id)}><FaTrash size={11} /></button>
                )}
              </div>
            ))}
          </div>
        )
      }

      {showCreate && <ColumnModal onClose={() => setShowCreate(false)} onSave={handleCreate} />}
      {editingCol && <ColumnModal column={editingCol} onClose={() => setEditingCol(null)}
        onSave={(data) => handleUpdate(editingCol, data)} />}
    </div>
  );
};

// ── Boards Tab ─────────────────────────────────────────────────────────────────

const BoardsTab = ({ boards, tickets, selectedBoardId, onSelectBoard, onRefresh }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [editingBoard, setEditingBoard] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);

  const ticketCountByBoard = tickets.reduce((acc, t) => {
    acc[t.board_id] = (acc[t.board_id] || 0) + 1;
    return acc;
  }, {});

  const handleCreate = async (data) => {
    await createBoard(data);
    onRefresh();
  };

  const handleUpdate = async (board, data) => {
    await updateBoard(board.id, data);
    onRefresh();
  };

  const handleDelete = async (id) => {
    try {
      await deleteBoard(id);
      onRefresh();
    } catch (e) { setError(e.message); }
    setDeletingId(null);
  };

  return (
    <div>
      {error && <ErrorBanner msg={error} onClose={() => setError(null)} />}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
        <button style={btnPrimary} onClick={() => setShowCreate(true)}>
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <FaPlus size={11} /> New Board
          </span>
        </button>
      </div>

      {boards.length === 0
        ? <EmptyState icon={FaTh} title="No boards yet" sub="Create your first board to get started." />
        : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
            {boards.map(board => {
              const isSelected = board.id === selectedBoardId;
              const count = ticketCountByBoard[board.id] || 0;
              return (
                <div key={board.id} style={{
                  background: "var(--bg-surface-1)",
                  border: `1px solid ${isSelected ? (board.color || "#6366f1") : "var(--border-subtle)"}`,
                  borderRadius: "var(--radius-lg)", overflow: "hidden",
                  cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s",
                  boxShadow: isSelected ? `0 0 0 2px ${board.color || "#6366f1"}33` : "none",
                }} onClick={() => onSelectBoard(board.id)}>
                  <div style={{ height: 5, background: board.color || "#6366f1" }} />
                  <div style={{ padding: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.4rem" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>{board.name}</span>
                      <span style={{
                        fontSize: "0.72rem", fontWeight: 600, padding: "0.1rem 0.45rem",
                        borderRadius: "999px", background: "var(--border-subtle)", color: "var(--text-secondary)",
                        whiteSpace: "nowrap",
                      }}>{count} ticket{count !== 1 ? "s" : ""}</span>
                    </div>
                    {board.description && (
                      <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                        {board.description}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.85rem" }} onClick={e => e.stopPropagation()}>
                      <button style={{ ...btnSecondary, padding: "0.3rem 0.65rem", fontSize: "0.78rem" }}
                        onClick={() => setEditingBoard(board)}><FaEdit size={11} /> Edit</button>
                      {deletingId === board.id ? (
                        <>
                          <button style={{ ...btnDanger, padding: "0.3rem 0.65rem", fontSize: "0.75rem" }}
                            onClick={() => handleDelete(board.id)}>Confirm?</button>
                          <button style={{ ...btnSecondary, padding: "0.3rem 0.55rem" }}
                            onClick={() => setDeletingId(null)}><FaTimes size={10} /></button>
                        </>
                      ) : (
                        <button style={{ ...btnDanger, padding: "0.3rem 0.65rem", fontSize: "0.78rem" }}
                          onClick={() => setDeletingId(board.id)}><FaTrash size={11} /></button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      }

      {showCreate && <BoardModal onClose={() => setShowCreate(false)} onSave={handleCreate} />}
      {editingBoard && <BoardModal board={editingBoard} onClose={() => setEditingBoard(null)}
        onSave={(data) => handleUpdate(editingBoard, data)} />}
    </div>
  );
};

// ── WebSocket hook ─────────────────────────────────────────────────────────────

function useTicketsSocket({ boardId, onEvent }) {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!boardId) return;
    const connect = () => {
      const ws = new WebSocket(API_ENDPOINTS.TICKETS_WS);
      wsRef.current = ws;
      ws.onopen = () => clearTimeout(reconnectTimer.current);
      ws.onmessage = (evt) => { try { onEventRef.current(JSON.parse(evt.data)); } catch {} };
      ws.onclose = () => { reconnectTimer.current = setTimeout(connect, 3000); };
      ws.onerror = () => ws.close();
    };
    connect();
    return () => { clearTimeout(reconnectTimer.current); wsRef.current?.close(); };
  }, [boardId]);
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Tickets() {
  const [activeTab, setActiveTab] = useState("Board");
  const [boards, setBoards] = useState([]);
  const [columns, setColumns] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingTicket, setEditingTicket] = useState(null);
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [activeDragTicket, setActiveDragTicket] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const loadBoards = useCallback(async () => {
    try {
      const data = await fetchBoards();
      setBoards(data || []);
      if (!selectedBoardId && data && data.length > 0) {
        setSelectedBoardId(data[0].id);
      }
    } catch (e) { setError(e.message); }
  }, [selectedBoardId]);

  const loadBoardData = useCallback(async (boardId) => {
    if (!boardId) return;
    setLoading(true);
    try {
      const [cols, tix] = await Promise.all([
        fetchColumns(boardId),
        fetchTickets(boardId),
      ]);
      setColumns((cols || []).sort((a, b) => a.position - b.position));
      setTickets(tix || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadBoards(); }, []);
  useEffect(() => { if (selectedBoardId) loadBoardData(selectedBoardId); }, [selectedBoardId]);

  // ── WebSocket event handler ────────────────────────────────────────────────

  const handleSocketEvent = useCallback((event) => {
    switch (event.type) {
      case "ticket_created":
        setTickets(prev =>
          prev.some(t => t.id === event.data.id) ? prev : [...prev, event.data]
        );
        break;
      case "ticket_updated":
      case "ticket_moved":
        setTickets(prev => prev.map(t => t.id === event.data.id ? event.data : t));
        break;
      case "ticket_deleted":
        setTickets(prev => prev.filter(t => t.id !== event.data.ticket_id));
        break;
      case "column_created":
        setColumns(prev =>
          prev.some(c => c.id === event.data.id)
            ? prev
            : [...prev, event.data].sort((a, b) => a.position - b.position)
        );
        break;
      case "column_updated":
        setColumns(prev =>
          prev.map(c => c.id === event.data.id ? event.data : c)
            .sort((a, b) => a.position - b.position)
        );
        break;
      case "column_deleted":
        setColumns(prev => prev.filter(c => c.id !== event.data.column_id));
        setTickets(prev => prev.filter(t => t.column_id !== event.data.column_id));
        break;
      case "columns_reordered":
        setColumns([...(event.data || [])].sort((a, b) => a.position - b.position));
        break;
      case "board_created":
        setBoards(prev =>
          prev.some(b => b.id === event.data.id) ? prev : [...prev, event.data]
        );
        break;
      case "board_updated":
        setBoards(prev => prev.map(b => b.id === event.data.id ? event.data : b));
        break;
      case "board_deleted":
        setBoards(prev => prev.filter(b => b.id !== event.data.board_id));
        if (selectedBoardId === event.data.board_id) {
          setSelectedBoardId(null);
          setColumns([]);
          setTickets([]);
        }
        break;
    }
  }, [selectedBoardId]);

  useTicketsSocket({ boardId: selectedBoardId, onEvent: handleSocketEvent });

  // ── Drag-and-drop handlers ────────────────────────────────────────────────

  const handleDragStart = ({ active }) => {
    setActiveDragTicket(tickets.find(t => t.id === active.id) || null);
  };

  const handleDragCancel = () => {
    setActiveDragTicket(null);
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveDragTicket(null);
    if (!over || active.id === over.id) return;

    const ticket = tickets.find(t => t.id === active.id);
    if (!ticket) return;

    let destColId, destPosition;
    const overId = String(over.id);
    if (overId.startsWith("col-")) {
      destColId = parseInt(overId.replace("col-", ""));
      const colTickets = tickets.filter(t => t.column_id === destColId);
      destPosition = colTickets.length;
    } else {
      const overTicket = tickets.find(t => t.id === over.id);
      if (!overTicket) return;
      destColId = overTicket.column_id;
      const colTickets = tickets
        .filter(t => t.column_id === destColId)
        .sort((a, b) => a.position - b.position);
      destPosition = colTickets.findIndex(t => t.id === over.id);
    }

    // Optimistic update
    setTickets(prev => prev.map(t =>
      t.id === ticket.id ? { ...t, column_id: destColId, position: destPosition } : t
    ));

    try {
      await moveTicket(selectedBoardId, ticket.id, destColId, destPosition);
      // WS ticket_moved event reconciles authoritative state
    } catch (e) {
      setError(e.message);
      await loadBoardData(selectedBoardId);
    }
  };

  // ── Other handlers ────────────────────────────────────────────────────────

  const handleSelectBoard = (id) => {
    setSelectedBoardId(id);
    setColumns([]);
    setTickets([]);
  };

  const handleSaveTicket = async (data) => {
    if (editingTicket) {
      await updateTicket(selectedBoardId, editingTicket.id, data);
    } else {
      await createTicket(selectedBoardId, data);
    }
    await loadBoardData(selectedBoardId);
  };

  const handleDeleteTicket = async (tickId) => {
    try {
      await deleteTicket(selectedBoardId, tickId);
      setTickets(prev => prev.filter(t => t.id !== tickId));
    } catch (e) { setError(e.message); }
  };

  const tabBtnStyle = (tab) => ({
    padding: "0.45rem 1rem", borderRadius: "6px", border: "none",
    background: activeTab === tab ? "var(--accent, #6366f1)" : "transparent",
    color: activeTab === tab ? "#fff" : "var(--text-secondary)",
    fontWeight: 600, fontSize: "0.82rem", cursor: "pointer",
    transition: "all 0.15s",
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <FaTicketAlt size={22} style={{ color: "var(--accent, #6366f1)" }} />
          Tickets
        </h1>
        <p className="page-description">Kanban boards and ticket tracking for your projects.</p>
      </div>

      {error && <ErrorBanner msg={error} onClose={() => setError(null)} />}

      {/* Top bar */}
      <div style={{
        display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem",
        marginBottom: "1.5rem", padding: "0.75rem 1rem",
        background: "var(--bg-surface-1)", border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
      }}>
        {/* Board selector */}
        <select
          style={{ ...inputStyle, width: "auto", minWidth: 180 }}
          value={selectedBoardId || ""}
          onChange={e => handleSelectBoard(parseInt(e.target.value))}
          disabled={activeTab === "Boards"}
        >
          {boards.length === 0
            ? <option value="">No boards</option>
            : boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)
          }
        </select>

        {/* Create ticket shortcut */}
        {selectedBoardId && activeTab !== "Boards" && activeTab !== "Columns" && (
          <button style={{ ...btnPrimary, display: "flex", alignItems: "center", gap: "0.4rem" }}
            onClick={() => { setEditingTicket(null); setShowCreateTicket(true); }}>
            <FaPlus size={11} /> New Ticket
          </button>
        )}

        <span style={{ flex: 1 }} />

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.25rem", background: "var(--bg-elevated, rgba(255,255,255,0.04))", borderRadius: "8px", padding: "0.25rem" }}>
          {TABS.map(tab => (
            <button key={tab} style={tabBtnStyle(tab)} onClick={() => setActiveTab(tab)}>{tab}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="page-content">
        {loading
          ? <Spinner />
          : activeTab === "Board" ? (
            <BoardTab
              boardId={selectedBoardId} columns={columns} tickets={tickets}
              onEditTicket={(t) => { setEditingTicket(t); setShowCreateTicket(true); }}
              onDeleteTicket={handleDeleteTicket}
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
              activeDragTicket={activeDragTicket}
            />
          ) : activeTab === "Tickets" ? (
            <TicketsTab
              boardId={selectedBoardId} columns={columns} tickets={tickets}
              onEditTicket={(t) => { setEditingTicket(t); setShowCreateTicket(true); }}
              onDeleteTicket={handleDeleteTicket}
            />
          ) : activeTab === "Columns" ? (
            <ColumnsTab boardId={selectedBoardId} columns={columns} onRefresh={() => loadBoardData(selectedBoardId)} />
          ) : (
            <BoardsTab
              boards={boards} tickets={tickets}
              selectedBoardId={selectedBoardId}
              onSelectBoard={handleSelectBoard}
              onRefresh={() => { loadBoards(); if (selectedBoardId) loadBoardData(selectedBoardId); }}
            />
          )
        }
      </div>

      {/* Ticket create/edit modal */}
      {showCreateTicket && (
        <TicketModal
          ticket={editingTicket}
          columns={columns}
          boardId={selectedBoardId}
          onClose={() => { setShowCreateTicket(false); setEditingTicket(null); }}
          onSave={handleSaveTicket}
        />
      )}
    </div>
  );
}
