import Editor from "@monaco-editor/react";
import { Clock, FileJson, Send, AlertCircle } from "lucide-react";
import { useState } from "react";

type ParsedCookieRow = {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: string;
  httpOnly: boolean;
  secure: boolean;
};

const splitSetCookieHeader = (value: string) =>
  value
    .split(/,(?=[^;]+=)/)
    .map((part) => part.trim())
    .filter(Boolean);

const parseSetCookieLine = (cookieLine: string): ParsedCookieRow | null => {
  const parts = cookieLine.split(";").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) {
    return null;
  }
  const [nameValue, ...attrs] = parts;
  const eqIndex = nameValue.indexOf("=");
  if (eqIndex <= 0) {
    return null;
  }
  const name = nameValue.slice(0, eqIndex).trim();
  const value = nameValue.slice(eqIndex + 1);
  if (!name) {
    return null;
  }

  let domain = "-";
  let path = "-";
  let expires = "-";
  let httpOnly = false;
  let secure = false;

  for (const attr of attrs) {
    const [rawKey, rawVal] = attr.split("=");
    const key = rawKey.trim().toLowerCase();
    const val = rawVal?.trim();
    if (key === "domain" && val) {
      domain = val;
    } else if (key === "path" && val) {
      path = val;
    } else if (key === "expires" && val) {
      expires = val;
    } else if (key === "httponly") {
      httpOnly = true;
    } else if (key === "secure") {
      secure = true;
    }
  }

  return { name, value, domain, path, expires, httpOnly, secure };
};

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
  responseLanguage: string;
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
    responseRaw, responsePretty, responseHeaders, errorMessage, responseLanguage
  } = props;
  const [expandedCookieValues, setExpandedCookieValues] = useState<Set<string>>(new Set());
  const [expandedCookieNames, setExpandedCookieNames] = useState<Set<string>>(new Set());
  const responseCookies = responseHeaders.filter(([key]) => key.toLowerCase() === "set-cookie");
  const parsedCookies = responseCookies
    .flatMap(([, value]) => splitSetCookieHeader(value))
    .map((line) => parseSetCookieLine(line))
    .filter((cookie): cookie is ParsedCookieRow => Boolean(cookie));

  const toggleCookieValue = (key: string) => {
    setExpandedCookieValues((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleCookieName = (key: string) => {
    setExpandedCookieNames((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const truncateValue = (value: string, max = 28) => {
    if (value.length <= max) {
      return value;
    }
    return `${value.slice(0, max)}...`;
  };

  return (
    <div className="response-pane">
      <div className="pane-header">
        <div className="tabs">
          {(["Preview", "Header", "Cookies", "Raw"] as const).map(tab => {
            const label =
              tab === "Cookies"
                ? parsedCookies.length > 0
                  ? `Cookies (${parsedCookies.length})`
                  : "Cookies"
                : tab === "Header"
                  ? responseHeaders.length > 0
                    ? `Header (${responseHeaders.length})`
                    : "Header"
                  : tab;
            return (
              <TabButton
                key={tab}
                label={label}
                active={activeTab === tab}
                onClick={() => onTabChange(tab)}
              />
            );
          })}
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
                  language={responseLanguage}
                  theme="vs-dark"
                  value={responseLanguage === "json" ? responsePretty || responseRaw : responseRaw}
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
            {activeTab === "Cookies" && (
              <div style={{ padding: 16 }}>
                {parsedCookies.length === 0 ? (
                  <div className="empty-state" style={{ padding: 12 }}>
                    No cookies returned.
                  </div>
                ) : (
                  <div className="cookie-table">
                    <div className="cookie-row-response cookie-header">
                      <div>Name</div>
                      <div>Value</div>
                      <div>Domain</div>
                      <div>Path</div>
                      <div>Expires</div>
                      <div>HttpOnly</div>
                      <div>Secure</div>
                    </div>
                    {parsedCookies.map((cookie, i) => {
                      const rowKey = `${cookie.name}-${i}`;
                      const isValueExpanded = expandedCookieValues.has(rowKey);
                      const isNameExpanded = expandedCookieNames.has(rowKey);
                      return (
                        <div key={rowKey} className="cookie-row-response">
                        <div>
                          <button
                            type="button"
                            className="cookie-value-button"
                            onClick={() => toggleCookieName(rowKey)}
                            title={isNameExpanded ? "Collapse name" : "Expand name"}
                          >
                            <span className={`cookie-value-text ${isNameExpanded ? "expanded" : ""}`}>
                              {isNameExpanded ? cookie.name : truncateValue(cookie.name)}
                            </span>
                          </button>
                        </div>
                        <div>
                          <button
                            type="button"
                            className="cookie-value-button"
                            onClick={() => toggleCookieValue(rowKey)}
                            title={isValueExpanded ? "Collapse value" : "Expand value"}
                          >
                            <span className={`cookie-value-text ${isValueExpanded ? "expanded" : ""}`}>
                              {isValueExpanded ? cookie.value : truncateValue(cookie.value)}
                            </span>
                          </button>
                        </div>
                        <div>{cookie.domain}</div>
                        <div>{cookie.path}</div>
                        <div>{cookie.expires}</div>
                        <div>{cookie.httpOnly ? "Yes" : "No"}</div>
                        <div>{cookie.secure ? "Yes" : "No"}</div>
                      </div>
                      );
                    })}
                  </div>
                )}
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
