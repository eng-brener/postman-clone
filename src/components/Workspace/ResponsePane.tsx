import Editor from "@monaco-editor/react";
import { Clock, FileJson, Send, AlertCircle } from "lucide-react";

interface ResponsePaneProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  
  responseCode: number | null;
  responseStatus: string;
  responseTime: number;
  responseSize: number;
  responseRaw: string;
  responsePretty: string;
  responseHeaders: [string, string][];
  errorMessage: string | null;
}

const TabButton = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
  <button className={`tab ${active ? "active" : ""}`} onClick={onClick}>
    {label}
  </button>
);

export const ResponsePane = (props: ResponsePaneProps) => {
  const { 
    activeTab, onTabChange, 
    responseCode, responseStatus, responseTime, responseSize, 
    responseRaw, responsePretty, responseHeaders, errorMessage 
  } = props;

  return (
    <div className="response-pane">
      <div className="pane-header">
        <div className="tabs">
          {["Preview", "Header", "Raw"].map(tab => (
            <TabButton
              key={tab}
              label={tab}
              active={activeTab === tab}
              onClick={() => onTabChange(tab)}
            />
          ))}
        </div>
        {responseCode && (
          <div className="status-bar">
            <div className="status-item">
              <span>Status:</span>
              <span className={`status-value ${responseCode < 300 ? 'green' : 'red'}`}>
                {responseStatus}
              </span>
            </div>
            <div className="status-item">
              <Clock size={14} />
              <span className="status-value">{responseTime}ms</span>
            </div>
            <div className="status-item">
              <FileJson size={14} />
              <span className="status-value">{responseSize} B</span>
            </div>
          </div>
        )}
      </div>

      <div className="pane-content" style={{ padding: 0 }}>
        {errorMessage ? (
          <div style={{ color: 'var(--error)', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <AlertCircle />
              <strong>Error</strong>
            </div>
            {errorMessage}
          </div>
        ) : !responseCode ? (
          <div className="empty-state">
            <Send size={48} opacity={0.1} />
            <span>Send a request to see the response here</span>
          </div>
        ) : (
          <>
            {activeTab === "Preview" && (
              <div style={{ height: '100%' }}>
                <Editor
                  height="100%"
                  language="json"
                  theme="vs-dark"
                  value={responsePretty || responseRaw}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 13,
                    automaticLayout: true,
                    padding: { top: 10 }
                  }}
                />
              </div>
            )}
            {activeTab === "Header" && (
              <div style={{ display: "grid", gap: 8, fontSize: "0.85rem", color: "var(--text-main)", padding: 16 }}>
                {responseHeaders.map(([key, value], i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, paddingBottom: 4, borderBottom: "1px solid var(--border-subtle)" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-muted)" }}>{key}</span>
                    <span style={{ wordBreak: "break-all" }}>{value}</span>
                  </div>
                ))}
              </div>
            )}
            {activeTab === "Raw" && (
              <pre className="response-preview" style={{ margin: 0, padding: 16 }}>{responseRaw}</pre>
            )}
          </>
        )}
      </div>
    </div>
  );
};
