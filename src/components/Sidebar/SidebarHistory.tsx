import { ChevronDown, ChevronRight, Pin, Play } from "lucide-react";
import { HistoryItem } from "../../types";

type SidebarHistoryProps = {
  history: HistoryItem[];
  historyOpen: boolean;
  onToggle: () => void;
  onSelect: (method: string, url: string) => void;
  onPinToggle: (id: string) => void;
  onRerun: (item: HistoryItem) => void;
};

const MethodBadge = ({ method }: { method: string }) => {
  return <span className={`method-badge method-${method}`}>{method}</span>;
};

export const SidebarHistory = ({
  history,
  historyOpen,
  onToggle,
  onSelect,
  onPinToggle,
  onRerun,
}: SidebarHistoryProps) => {
  const pinnedHistory = history.filter((item) => item.pinned);
  const recentHistory = history.filter((item) => !item.pinned);

  return (
    <>
      <div className="menu-label row">
        <span>History</span>
        <button
          type="button"
          className="menu-action"
          onClick={onToggle}
          aria-label={historyOpen ? "Collapse history" : "Expand history"}
        >
          {historyOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>
      {historyOpen && (
        <>
          {history.length === 0 && (
            <div style={{ padding: "0 12px", fontSize: "0.8rem", color: "var(--text-dim)" }}>
              No history yet.
            </div>
          )}
          {[...pinnedHistory, ...recentHistory].map((h) => (
            <div key={h.id} className="history-item">
              <button className="history-main" onClick={() => onSelect(h.method, h.url)}>
                <MethodBadge method={h.method} />
                <span className="history-label">{h.url}</span>
              </button>
              <div className="history-actions">
                <button
                  type="button"
                  className="history-action"
                  title="Run request"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRerun(h);
                  }}
                >
                  <Play size={12} />
                </button>
                <button
                  type="button"
                  className={`history-action ${h.pinned ? "active" : ""}`}
                  title={h.pinned ? "Unpin" : "Pin"}
                  onClick={(event) => {
                    event.stopPropagation();
                    onPinToggle(h.id);
                  }}
                >
                  <Pin size={12} />
                </button>
              </div>
            </div>
          ))}
        </>
      )}
    </>
  );
};
