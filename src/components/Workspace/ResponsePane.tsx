import Editor, { useMonaco } from "@monaco-editor/react";
import { Send, AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  followRedirects: boolean;
  onFollowRedirectsChange: (value: boolean) => void;
  theme: "dark" | "light" | "dracula";
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
    responseRaw, responsePretty, responseHeaders, errorMessage, responseLanguage,
    followRedirects, onFollowRedirectsChange, theme
  } = props;
  const monaco = useMonaco();
  const editorTheme = theme === "light" ? "vs" : theme === "dracula" ? "dracula" : "vs-dark";
  const [expandedCookieValues, setExpandedCookieValues] = useState<Set<string>>(new Set());
  const [expandedCookieNames, setExpandedCookieNames] = useState<Set<string>>(new Set());
  const [rawSearch, setRawSearch] = useState("");
  const [rawWrap, setRawWrap] = useState(true);
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

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const highlightedRaw = useMemo(() => {
    if (!rawSearch) {
      return escapeHtml(responseRaw);
    }
    const escaped = escapeHtml(responseRaw);
    const pattern = new RegExp(escapeRegExp(rawSearch), "gi");
    return escaped.replace(pattern, (match) => `<mark>${match}</mark>`);
  }, [rawSearch, responseRaw]);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    const kb = bytes / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`;
    }
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  useEffect(() => {
    if (!monaco || theme !== "dracula") {
      return;
    }
    monaco.editor.defineTheme("dracula", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "7c7f9b" },
        { token: "string", foreground: "f1fa8c" },
        { token: "number", foreground: "bd93f9" },
        { token: "keyword", foreground: "ff79c6" },
        { token: "type.identifier", foreground: "8be9fd" },
      ],
      colors: {
        "editor.background": "#1b1d2a",
        "editorLineNumber.foreground": "#5b5f7a",
        "editorLineNumber.activeForeground": "#f8f8f2",
      },
    });
  }, [monaco, theme]);

  return (
    <div className="response-pane" style={{ flex: 1, height: '100%' }}>
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
            <div className={`status-badge ${responseCode < 300 ? 'green' : 'red'}`}>
              <span style={{ marginRight: 6 }}>{responseCode}</span>
              <span>{responseStatus.replace(/^\d+\s*/, '')}</span>
            </div>
            <div className="status-item">
              <span className="status-value">{responseTime} ms</span>
            </div>
            <div className="status-item">
              <span className="status-value">{formatBytes(responseSize)}</span>
            </div>
            <div className="status-item status-toggle">
              <button
                type="button"
                className={`status-toggle-btn ${followRedirects ? "active" : ""}`}
                onClick={() => onFollowRedirectsChange(!followRedirects)}
              >
                Redirects {followRedirects ? "On" : "Off"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="pane-content">
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
                  theme={editorTheme}
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
              <div style={{ display: "grid", gap: 0, fontSize: "0.85rem", color: "var(--text-main)", width: '100%' }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, padding: "8px 16px", background: "var(--bg-panel)", borderBottom: "1px solid var(--border-subtle)", fontWeight: 600, color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                   <div>Key</div>
                   <div>Value</div>
                </div>
                {responseHeaders.map(([key, value], i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, padding: "8px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-muted)" }}>{key}</span>
                    <span style={{ wordBreak: "break-all", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>{value}</span>
                  </div>
                ))}
              </div>
            )}
            {activeTab === "Cookies" && (
              <div className="cookie-pane">
                {parsedCookies.length === 0 ? (
                  <div className="empty-state" style={{ padding: 12 }}>
                    No cookies returned.
                  </div>
                ) : (
                  <div className="cookie-table">
                    <div className="cookie-row-response cookie-header">
                      <div className="cookie-cell-header">Name</div>
                      <div className="cookie-cell-header">Value</div>
                      <div className="cookie-cell-header">Domain</div>
                      <div className="cookie-cell-header">Path</div>
                      <div className="cookie-cell-header">Expires</div>
                      <div className="cookie-cell-header center">HttpOnly</div>
                      <div className="cookie-cell-header center">Secure</div>
                    </div>
                    {parsedCookies.map((cookie, i) => {
                      const rowKey = `${cookie.name}-${i}`;
                      const isValueExpanded = expandedCookieValues.has(rowKey);
                      const isNameExpanded = expandedCookieNames.has(rowKey);
                      return (
                        <div key={rowKey} className="cookie-row-response">
                          <div className="cookie-cell">
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
                          <div className="cookie-cell">
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
                          <div className="cookie-cell">
                            <span className="cookie-cell-text">{cookie.domain}</span>
                          </div>
                          <div className="cookie-cell">
                            <span className="cookie-cell-text">{cookie.path}</span>
                          </div>
                          <div className="cookie-cell">
                            <span className="cookie-cell-text">{cookie.expires}</span>
                          </div>
                          <div className="cookie-cell center">
                            <span className="cookie-cell-text">{cookie.httpOnly ? "Yes" : "No"}</span>
                          </div>
                          <div className="cookie-cell center">
                            <span className="cookie-cell-text">{cookie.secure ? "Yes" : "No"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {activeTab === "Raw" && (
              <div className="response-raw">
                <div className="response-raw-toolbar">
                  <input
                    className="response-raw-search"
                    placeholder="Search in response"
                    value={rawSearch}
                    onChange={(event) => setRawSearch(event.target.value)}
                  />
                  <button
                    type="button"
                    className={`response-raw-toggle ${rawWrap ? "active" : ""}`}
                    onClick={() => setRawWrap((prev) => !prev)}
                  >
                    Wrap {rawWrap ? "On" : "Off"}
                  </button>
                </div>
                <pre
                  className={`response-preview ${rawWrap ? "" : "no-wrap"}`}
                  dangerouslySetInnerHTML={{ __html: highlightedRaw }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
