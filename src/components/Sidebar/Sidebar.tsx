import { Layers, Settings } from "lucide-react";
import { HistoryItem } from "../../types";

interface SidebarProps {
  appName: string;
  appVersion: string | null;
  history: HistoryItem[];
  currentUrl: string;
  onSelectRequest: (method: string, url: string) => void;
}

const MethodBadge = ({ method }: { method: string }) => {
  return <span className={`method-badge method-${method}`}>{method}</span>;
};

const SidebarItem = ({
  active,
  method,
  label,
  onClick,
}: {
  active?: boolean;
  method: string;
  label: string;
  onClick: () => void;
}) => (
  <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>
    <MethodBadge method={method} />
    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
      {label}
    </span>
  </button>
);

export const Sidebar = ({ appName, appVersion, history, currentUrl, onSelectRequest }: SidebarProps) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand">
          <Layers className="logo-icon" size={20} />
          <span>{appName}</span>
        </div>
      </div>

      <div className="sidebar-content">
        <div className="sidebar-search">
          {/* Search placeholder */}
        </div>

        <div className="menu-label">Collection</div>
        <SidebarItem
          method="GET"
          label="Get Cat Fact"
          active={currentUrl.includes("catfact")}
          onClick={() => onSelectRequest("GET", "https://catfact.ninja/fact")}
        />
        <SidebarItem
          method="POST"
          label="Create User"
          onClick={() => onSelectRequest("POST", "https://reqres.in/api/users")}
        />

        <div className="menu-label">History</div>
        {history.length === 0 && (
          <div style={{ padding: '0 12px', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            No history yet.
          </div>
        )}
        {history.map((h) => (
          <SidebarItem
            key={h.id}
            method={h.method}
            label={h.url}
            onClick={() => onSelectRequest(h.method, h.url)}
          />
        ))}
      </div>

      <div className="sidebar-header" style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 'auto' }}>
        <div className="nav-item">
          <Settings size={16} />
          <span>Settings</span>
        </div>
        <div style={{ padding: '0 12px', fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 4 }}>
          v{appVersion}
        </div>
      </div>
    </aside>
  );
};
