import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Page.css";
import "./Labs.css";
import {
  fetchRepos,
  addRepo,
  deleteRepo,
  syncRepo,
  fetchLabs,
} from "../services/labsService";

// ---------------------------------------------------------------------------
// Difficulty badge
// ---------------------------------------------------------------------------
const DIFFICULTY_COLORS = {
  beginner: { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
  intermediate: { bg: "#fef9c3", color: "#854d0e", border: "#fef08a" },
  advanced: { bg: "#fee2e2", color: "#991b1b", border: "#fecaca" },
};

const DifficultyBadge = ({ level }) => {
  const style = DIFFICULTY_COLORS[level] || DIFFICULTY_COLORS.beginner;
  return (
    <span
      className="labs-badge"
      style={{
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
      }}
    >
      {level}
    </span>
  );
};

// ---------------------------------------------------------------------------
// LabCard
// ---------------------------------------------------------------------------
const LabCard = ({ lab, onLaunch }) => {
  return (
    <div className="page-card labs-lab-card labs-lab-card--clickable" onClick={() => onLaunch(lab.id)}>
      <div className="labs-card-header">
        <h2>{lab.name}</h2>
        <DifficultyBadge level={lab.difficulty} />
      </div>

      {lab.description && (
        <p className="labs-card-description">{lab.description}</p>
      )}

      <div className="labs-card-meta">
        {lab.estimated_time && (
          <span className="labs-meta-item">
            <span className="labs-meta-icon">&#x23F1;</span>
            {lab.estimated_time}
          </span>
        )}
        {lab.clouds && lab.clouds.length > 0 && (
          <span className="labs-meta-item">
            <span className="labs-meta-icon">&#x2601;</span>
            {lab.clouds.join(", ")}
          </span>
        )}
      </div>

      {lab.tags && lab.tags.length > 0 && (
        <div className="labs-tags">
          {lab.tags.map((tag) => (
            <span key={tag} className="labs-tag">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// AddRepoModal
// ---------------------------------------------------------------------------
const AddRepoModal = ({ onClose, onAdded }) => {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const repo = await addRepo(name.trim(), url.trim(), branch.trim() || "main");
      onAdded(repo);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="labs-modal-overlay" onClick={onClose}>
      <div className="labs-modal" onClick={(e) => e.stopPropagation()}>
        <div className="labs-modal-header">
          <h2>Add Repository</h2>
          <button className="labs-modal-close" onClick={onClose}>&#x2715;</button>
        </div>

        <form onSubmit={handleSubmit} className="labs-modal-body">
          <label className="labs-field">
            <span>Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Labs Repo"
              required
            />
          </label>

          <label className="labs-field">
            <span>GitHub URL</span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/org/repo"
              required
            />
          </label>

          <label className="labs-field">
            <span>Branch</span>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
            />
          </label>

          {error && <div className="labs-modal-error">{error}</div>}

          <div className="labs-modal-actions">
            <button type="button" className="labs-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="labs-btn-primary" disabled={loading}>
              {loading ? "Cloning…" : "Add Repository"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// RepoChip — shows a repo filter pill with sync + delete actions
// ---------------------------------------------------------------------------
const RepoChip = ({ repo, selected, onClick, onSync, onDelete }) => {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async (e) => {
    e.stopPropagation();
    setSyncing(true);
    try {
      await onSync(repo.id);
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(repo.id);
  };

  return (
    <div
      className={`labs-repo-chip ${selected ? "labs-repo-chip--active" : ""}`}
      onClick={onClick}
    >
      <span className="labs-repo-chip-name">{repo.name}</span>
      <button
        className="labs-repo-chip-action"
        title="Sync"
        onClick={handleSync}
        disabled={syncing}
      >
        {syncing ? "…" : "↻"}
      </button>
      <button
        className="labs-repo-chip-action labs-repo-chip-action--danger"
        title="Remove"
        onClick={handleDelete}
      >
        ✕
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Labs page
// ---------------------------------------------------------------------------
const Labs = () => {
  const navigate = useNavigate();

  const [repos, setRepos] = useState([]);
  const [labs, setLabs] = useState([]);
  const [selectedRepoId, setSelectedRepoId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadData = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const [repoList, labList] = await Promise.all([
        fetchRepos(force),
        fetchLabs(force),
      ]);
      setRepos(repoList);
      setLabs(labList);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRepoAdded = () => {
    loadData(true);
  };

  const handleSyncRepo = async (id) => {
    try {
      await syncRepo(id);
      await loadData(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteRepo = async (id) => {
    try {
      await deleteRepo(id);
      if (selectedRepoId === id) setSelectedRepoId(null);
      await loadData(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLaunch = (labId) => {
    navigate(`/labs/${encodeURIComponent(labId)}`);
  };

  const filteredLabs = selectedRepoId
    ? labs.filter((l) => l.repo_id === selectedRepoId)
    : labs;

  return (
    <div className="page-container">
      {/* Header row */}
      <div className="labs-header-row">
        <div>
          <h1 className="page-title">Labs</h1>
          <p className="page-description">
            Infrastructure labs powered by GitHub Actions. Add a repository to browse and launch labs.
          </p>
        </div>
        <div className="labs-header-actions">
          <button
            className="labs-btn-icon"
            title="Refresh"
            onClick={() => loadData(true)}
            disabled={loading}
          >
            ↻
          </button>
          <button
            className="labs-btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            + Add Repository
          </button>
        </div>
      </div>

      {/* Repo filter chips */}
      {repos.length > 0 && (
        <div className="labs-repo-chips">
          <RepoChip
            repo={{ id: null, name: "All" }}
            selected={selectedRepoId === null}
            onClick={() => setSelectedRepoId(null)}
            onSync={() => {}}
            onDelete={() => {}}
          />
          {repos.map((repo) => (
            <RepoChip
              key={repo.id}
              repo={repo}
              selected={selectedRepoId === repo.id}
              onClick={() =>
                setSelectedRepoId(selectedRepoId === repo.id ? null : repo.id)
              }
              onSync={handleSyncRepo}
              onDelete={handleDeleteRepo}
            />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="labs-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Content */}
      <div className="page-content">
        {loading ? (
          <div className="labs-loading">Loading labs…</div>
        ) : filteredLabs.length === 0 ? (
          <div className="labs-empty">
            {repos.length === 0
              ? "No repositories configured. Click \"+ Add Repository\" to get started."
              : "No labs found in the selected repository."}
          </div>
        ) : (
          <div className="labs-grid">
            {filteredLabs.map((lab) => (
              <LabCard key={lab.id} lab={lab} onLaunch={handleLaunch} />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showAddModal && (
        <AddRepoModal
          onClose={() => setShowAddModal(false)}
          onAdded={handleRepoAdded}
        />
      )}
    </div>
  );
};

export default Labs;
