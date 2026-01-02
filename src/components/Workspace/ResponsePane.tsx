import { useMonaco } from "@monaco-editor/react";
import { Send, AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ResponseCookiesTab, type ParsedCookieRow } from "./ResponseTabs/ResponseCookiesTab";
import { ResponseHeadersTab } from "./ResponseTabs/ResponseHeadersTab";
import { ResponsePreviewTab } from "./ResponseTabs/ResponsePreviewTab";
import { ResponseRawTab } from "./ResponseTabs/ResponseRawTab";

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
              <ResponsePreviewTab
                responseLanguage={responseLanguage}
                responsePretty={responsePretty}
                responseRaw={responseRaw}
                editorTheme={editorTheme}
              />
            )}
            {activeTab === "Header" && (
              <ResponseHeadersTab responseHeaders={responseHeaders} />
            )}
            {activeTab === "Cookies" && (
              <ResponseCookiesTab
                parsedCookies={parsedCookies}
                expandedCookieValues={expandedCookieValues}
                expandedCookieNames={expandedCookieNames}
                onToggleValue={toggleCookieValue}
                onToggleName={toggleCookieName}
                truncateValue={truncateValue}
              />
            )}
            {activeTab === "Raw" && (
              <ResponseRawTab responseRaw={responseRaw} />
            )}
          </>
        )}
      </div>
    </div>
  );
};
