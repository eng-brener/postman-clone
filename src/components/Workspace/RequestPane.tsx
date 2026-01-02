import Editor, { useMonaco } from "@monaco-editor/react";
import { useEffect, useMemo, useState } from "react";
import { EnvInput } from "../Editors/EnvInput";
import { KeyValueEditor } from "../Editors/KeyValueEditor";
import { AuthData, AuthDataType, AuthType, BodyType, CookieEntry, KeyValue, RawType, RequestSettings } from "../../types";

interface RequestPaneProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  environmentValues: Record<string, string>;
  theme: "dark" | "light" | "dracula";
  
  params: KeyValue[];
  onParamsChange: (idx: number, field: keyof KeyValue, val: string | boolean) => void;
  onParamsRemove: (idx: number) => void;
  onParamsAdd: () => void;
  onParamsReplace: (items: KeyValue[]) => void;

  headers: KeyValue[];
  onHeadersChange: (idx: number, field: keyof KeyValue, val: string | boolean) => void;
  onHeadersRemove: (idx: number) => void;
  onHeadersAdd: () => void;
  onHeadersReplace: (items: KeyValue[]) => void;

  cookieContext: { host: string; path: string } | null;
  cookies: CookieEntry[];
  onCookieAdd: () => void;
  onCookieUpdate: (id: string, patch: Partial<CookieEntry>) => void;
  onCookieRemove: (id: string) => void;

  // Auth Props
  authType: AuthType;
  onAuthTypeChange: (type: AuthType) => void;
  authData: AuthData;
  onAuthDataChange: (type: AuthDataType, field: string, val: string) => void;

  bodyType: BodyType;
  onBodyTypeChange: (type: BodyType) => void;
  
  rawType: RawType;
  onRawTypeChange: (type: RawType) => void;

  bodyJson: string;
  onBodyJsonChange: (val: string) => void;

  bodyFormData: KeyValue[];
  onBodyFormDataChange: (idx: number, field: keyof KeyValue, val: string | boolean) => void;
  onBodyFormDataRemove: (idx: number) => void;
  onBodyFormDataReplace: (items: KeyValue[]) => void;

  bodyUrlEncoded: KeyValue[];
  onBodyUrlEncodedChange: (idx: number, field: keyof KeyValue, val: string | boolean) => void;
  onBodyUrlEncodedRemove: (idx: number) => void;
  onBodyUrlEncodedReplace: (items: KeyValue[]) => void;

  settings: RequestSettings;
  onSettingsChange: (field: keyof RequestSettings, val: any) => void;
}

const BODY_TYPES: { id: BodyType; label: string }[] = [
  { id: "none", label: "none" },
  { id: "form-data", label: "form-data" },
  { id: "x-www-form-urlencoded", label: "x-www-form-urlencoded" },
  { id: "raw", label: "raw" },
  { id: "binary", label: "binary" },
];

const RAW_TYPES: RawType[] = ["text", "javascript", "json", "html", "xml"];

const AUTH_TYPES: { id: AuthType; label: string }[] = [
  { id: "none", label: "No Auth" },
  { id: "api-key", label: "API Key" },
  { id: "bearer", label: "Bearer Token" },
  { id: "basic", label: "Basic Auth" },
];

const TabButton = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
  <button className={`tab ${active ? "active" : ""}`} onClick={onClick}>
    {label}
  </button>
);

export const RequestPane = (props: RequestPaneProps) => {
  const { 
      activeTab, onTabChange, 
      environmentValues,
      theme,
      params, onParamsChange, onParamsRemove, onParamsAdd, onParamsReplace,
      headers, onHeadersChange, onHeadersRemove, onHeadersAdd, onHeadersReplace,
      cookieContext, cookies, onCookieAdd, onCookieUpdate, onCookieRemove,
      authType, onAuthTypeChange, authData, onAuthDataChange,
      bodyType, onBodyTypeChange,
      rawType, onRawTypeChange,
      bodyJson, onBodyJsonChange,
      bodyFormData, onBodyFormDataChange, onBodyFormDataRemove, onBodyFormDataReplace,
      bodyUrlEncoded, onBodyUrlEncodedChange, onBodyUrlEncodedRemove, onBodyUrlEncodedReplace,
      settings, onSettingsChange
  } = props;

  const getTemplateTooltip = (value: string) => {
    if (!value) {
      return undefined;
    }
    const matches = [...value.matchAll(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g)];
    if (matches.length === 0) {
      return undefined;
    }
    const keys = Array.from(new Set(matches.map((match) => match[1]))).filter(
      (key) => Object.prototype.hasOwnProperty.call(environmentValues, key)
    );
    if (keys.length === 0) {
      return undefined;
    }
    return keys.map((key) => `{{${key}}} = ${environmentValues[key]}`).join("\n");
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) {
      return "";
    }
    const date = new Date(timestamp);
    const pad = (val: number) => String(val).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;
  };

  const parseDate = (value: string) => {
    if (!value) {
      return null;
    }
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  };

  const [cookieDomainFilter, setCookieDomainFilter] = useState("");
  const [cookiePathFilter, setCookiePathFilter] = useState("");

  const filteredCookies = useMemo(() => {
    const domainQuery = cookieDomainFilter.trim().toLowerCase();
    const pathQuery = cookiePathFilter.trim().toLowerCase();
    return cookies.filter((cookie) => {
      const matchesDomain = !domainQuery || cookie.domain.toLowerCase().includes(domainQuery);
      const matchesPath = !pathQuery || cookie.path.toLowerCase().includes(pathQuery);
      return matchesDomain && matchesPath;
    });
  }, [cookies, cookieDomainFilter, cookiePathFilter]);

  const hasInsecureSameSite = useMemo(
    () => cookies.some((cookie) => cookie.sameSite === "None" && !cookie.secure),
    [cookies]
  );

  const monaco = useMonaco();
  const editorTheme = theme === "light" ? "vs" : theme === "dracula" ? "dracula" : "vs-dark";

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
    <div className="request-pane">
      <div className="pane-header">
        <div className="tabs">
          {["Params", "Authorization", "Headers", "Cookies", "Body", "Settings"].map(tab => (
            <TabButton
              key={tab}
              label={tab}
              active={activeTab === tab}
              onClick={() => onTabChange(tab)}
            />
          ))}
        </div>
      </div>
      <div className="pane-content">
        {activeTab === "Params" && (
          <>
            <div className="kv-toolbar">
              <div className="kv-toolbar-spacer" />
              <button type="button" className="kv-add" onClick={onParamsAdd}>
                + Add Param
              </button>
            </div>
            <KeyValueEditor
              items={params}
              onChange={onParamsChange}
              onRemove={onParamsRemove}
              environmentValues={environmentValues}
              onItemsReplace={onParamsReplace}
              showBulkEdit
            />
          </>
        )}

        {activeTab === "Authorization" && (
          <div className="auth-container">
             {/* Left: Auth Type Selector */}
             <div className="auth-sidebar">
               <div className="auth-sidebar-title">Auth Type</div>
               {AUTH_TYPES.map(at => (
                 <button
                   key={at.id}
                   className={`auth-type-btn ${authType === at.id ? "active" : ""}`}
                   onClick={() => onAuthTypeChange(at.id)}
                 >
                   {at.label}
                 </button>
               ))}
             </div>

             {/* Right: Auth Config */}
             <div className="auth-content">
                {authType === "none" && (
                   <div className="empty-state">
                      <span style={{ opacity: 0.6 }}>This request does not use any authorization.</span>
                   </div>
                )}

                {authType === "api-key" && (
                  <div style={{ maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 16 }}>
                     <div className="auth-field-group">
                        <label className="auth-label">Key</label>
                        <EnvInput 
                          className="input-ghost"
                          overlayClassName="env-overlay-ghost"
                          placeholder="Key"
                          value={authData.apiKey.key}
                          environmentValues={environmentValues}
                          title={getTemplateTooltip(authData.apiKey.key)}
                          onChange={(value) => onAuthDataChange("api-key", "key", value)}
                        />
                     </div>
                     <div className="auth-field-group">
                        <label className="auth-label">Value</label>
                        <EnvInput 
                          className="input-ghost"
                          overlayClassName="env-overlay-ghost"
                          placeholder="Value"
                          value={authData.apiKey.value}
                          environmentValues={environmentValues}
                          title={getTemplateTooltip(authData.apiKey.value)}
                          onChange={(value) => onAuthDataChange("api-key", "value", value)}
                        />
                     </div>
                     <div className="auth-field-group">
                        <label className="auth-label">Add to</label>
                        <select 
                          className="method-select" 
                          style={{ width: "100%", height: 38, fontSize: '0.85rem' }}
                          value={authData.apiKey.addTo}
                          onChange={(e) => onAuthDataChange("api-key", "addTo", e.target.value)}
                        >
                           <option value="header">Header</option>
                           <option value="query">Query Params</option>
                        </select>
                     </div>
                  </div>
                )}

                {authType === "bearer" && (
                   <div style={{ maxWidth: 400 }}>
                      <div className="auth-field-group">
                        <label className="auth-label">Token</label>
                        <EnvInput 
                          as="textarea"
                          className="code-editor"
                          overlayClassName="env-overlay-code"
                          style={{ height: 150, minHeight: 100 }} 
                          placeholder="Bearer Token"
                          value={authData.bearer.token}
                          environmentValues={environmentValues}
                          title={getTemplateTooltip(authData.bearer.token)}
                          onChange={(value) => onAuthDataChange("bearer", "token", value)}
                        />
                     </div>
                   </div>
                )}

                {authType === "basic" && (
                   <div style={{ maxWidth: 400 }}>
                      <div className="auth-field-group">
                        <label className="auth-label">Username</label>
                        <EnvInput 
                          className="input-ghost"
                          overlayClassName="env-overlay-ghost"
                          placeholder="Username"
                          value={authData.basic.username}
                          environmentValues={environmentValues}
                          title={getTemplateTooltip(authData.basic.username)}
                          onChange={(value) => onAuthDataChange("basic", "username", value)}
                        />
                     </div>
                     <div className="auth-field-group">
                        <label className="auth-label">Password</label>
                        <EnvInput 
                          className="input-ghost"
                          overlayClassName="env-overlay-ghost"
                          type="password"
                          placeholder="Password"
                          value={authData.basic.password}
                          environmentValues={environmentValues}
                          title={getTemplateTooltip(authData.basic.password)}
                          onChange={(value) => onAuthDataChange("basic", "password", value)}
                        />
                     </div>
                   </div>
                )}
             </div>
          </div>
        )}

        {activeTab === "Headers" && (
          <>
            <div className="kv-toolbar">
              <div className="kv-toolbar-spacer" />
              <button type="button" className="kv-add" onClick={onHeadersAdd}>
                + Add Header
              </button>
            </div>
            <KeyValueEditor
              items={headers}
              onChange={onHeadersChange}
              onRemove={onHeadersRemove}
              environmentValues={environmentValues}
              onItemsReplace={onHeadersReplace}
              showBulkEdit
              duplicateCheck="case-insensitive"
            />
          </>
        )}

        {activeTab === "Cookies" && (
          <div className="cookie-pane">
            {!cookieContext && (
              <div className="empty-state" style={{ height: "100%" }}>
                <span style={{ opacity: 0.6 }}>Enter a valid URL to manage cookies.</span>
              </div>
            )}
            {cookieContext && (
              <>
                <div className="cookie-toolbar">
                  <div className="cookie-scope">
                    <span className="cookie-scope-label">Domain</span>
                    <span className="cookie-scope-value">{cookieContext.host}</span>
                  </div>
                  <button type="button" className="cookie-add" onClick={onCookieAdd}>
                    + Add Cookie
                  </button>
                </div>
                <div className="cookie-filters">
                  <input
                    className="cookie-filter-input"
                    placeholder="Filter domain"
                    value={cookieDomainFilter}
                    onChange={(event) => setCookieDomainFilter(event.target.value)}
                  />
                  <input
                    className="cookie-filter-input"
                    placeholder="Filter path"
                    value={cookiePathFilter}
                    onChange={(event) => setCookiePathFilter(event.target.value)}
                  />
                </div>
                {hasInsecureSameSite && (
                  <div className="cookie-warning">
                    SameSite=None requires Secure. Some cookies may be rejected by browsers.
                  </div>
                )}
                {filteredCookies.length === 0 ? (
                  <div className="empty-state" style={{ paddingTop: 20 }}>
                    {cookies.length === 0 ? "No cookies for this domain yet." : "No cookies match the filters."}
                  </div>
                ) : (
                  <div className="cookie-table">
                    <div className="cookie-row cookie-header">
                      <div className="cookie-cell-header center">On</div>
                      <div className="cookie-cell-header">Name</div>
                      <div className="cookie-cell-header">Value</div>
                      <div className="cookie-cell-header">Domain</div>
                      <div className="cookie-cell-header">Path</div>
                      <div className="cookie-cell-header center">Host Only</div>
                      <div className="cookie-cell-header">Expires</div>
                      <div className="cookie-cell-header center">Secure</div>
                      <div className="cookie-cell-header center">HttpOnly</div>
                      <div className="cookie-cell-header">SameSite</div>
                      <div className="cookie-cell-header center"></div>
                    </div>
                    {filteredCookies.map((cookie) => {
                      return (
                        <div key={cookie.id} className="cookie-row">
                          <div className="cookie-cell center">
                            <input
                              type="checkbox"
                              className="kv-checkbox"
                              checked={cookie.enabled}
                              onChange={(event) => onCookieUpdate(cookie.id, { enabled: event.target.checked })}
                            />
                          </div>
                          <div className="cookie-cell">
                            <input
                              className="cookie-input"
                              value={cookie.name}
                              onChange={(event) => onCookieUpdate(cookie.id, { name: event.target.value })}
                            />
                          </div>
                          <div className="cookie-cell">
                            <input
                              className="cookie-input"
                              value={cookie.value}
                              onChange={(event) => onCookieUpdate(cookie.id, { value: event.target.value })}
                            />
                          </div>
                          <div className="cookie-cell">
                            <input
                              className="cookie-input"
                              value={cookie.domain}
                              onChange={(event) => onCookieUpdate(cookie.id, { domain: event.target.value })}
                            />
                          </div>
                          <div className="cookie-cell">
                            <input
                              className="cookie-input"
                              value={cookie.path}
                              onChange={(event) => onCookieUpdate(cookie.id, { path: event.target.value })}
                            />
                          </div>
                          <div className="cookie-cell center">
                            <input
                              type="checkbox"
                              className="kv-checkbox"
                              checked={cookie.hostOnly}
                              onChange={(event) => onCookieUpdate(cookie.id, { hostOnly: event.target.checked })}
                            />
                          </div>
                          <div className="cookie-cell">
                            <input
                              type="datetime-local"
                              className="cookie-input"
                              value={formatDate(cookie.expires)}
                              onChange={(event) => onCookieUpdate(cookie.id, { expires: parseDate(event.target.value) })}
                            />
                          </div>
                          <div className="cookie-cell center">
                            <input
                              type="checkbox"
                              className="kv-checkbox"
                              checked={cookie.secure}
                              onChange={(event) => onCookieUpdate(cookie.id, { secure: event.target.checked })}
                            />
                          </div>
                          <div className="cookie-cell center">
                            <input
                              type="checkbox"
                              className="kv-checkbox"
                              checked={cookie.httpOnly}
                              onChange={(event) => onCookieUpdate(cookie.id, { httpOnly: event.target.checked })}
                            />
                          </div>
                          <div className="cookie-cell">
                            <select
                              className="cookie-select"
                              value={cookie.sameSite ?? ""}
                              onChange={(event) =>
                                onCookieUpdate(cookie.id, {
                                  sameSite: event.target.value ? (event.target.value as CookieEntry["sameSite"]) : null,
                                })
                              }
                            >
                              <option value="">-</option>
                              <option value="Lax">Lax</option>
                              <option value="Strict">Strict</option>
                              <option value="None">None</option>
                            </select>
                          </div>
                          <div className="cookie-cell center">
                            <button type="button" className="cookie-delete" onClick={() => onCookieRemove(cookie.id)}>
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "Body" && (
          <div className="body-container">
            <div className="body-toolbar">
              {BODY_TYPES.map(bt => (
                <label key={bt.id} className="body-type-radio">
                  <input
                    type="radio"
                    name="bodyType"
                    value={bt.id}
                    checked={bodyType === bt.id}
                    onChange={(e) => onBodyTypeChange(e.target.value as BodyType)}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span style={{ color: bodyType === bt.id ? 'var(--text-main)' : 'inherit', fontWeight: bodyType === bt.id ? 500 : 400 }}>
                    {bt.label}
                  </span>
                </label>
              ))}

              {bodyType === "raw" && (
                <select 
                  className="method-select" 
                  style={{ height: 32, padding: '0 12px', fontSize: '0.8rem', marginLeft: 'auto' }}
                  value={rawType}
                  onChange={(e) => onRawTypeChange(e.target.value as RawType)}
                >
                  {RAW_TYPES.map(rt => <option key={rt} value={rt}>{rt}</option>)}
                </select>
              )}
            </div>

            <div className="body-content">
              {bodyType === "none" && (
                <div className="empty-state">
                  <span style={{ opacity: 0.5 }}>This request has no body</span>
                </div>
              )}
              {bodyType === "raw" && (
                <div className="body-editor">
                  <Editor
                    height="100%"
                    language={rawType === "javascript" ? "javascript" : rawType}
                    theme={editorTheme}
                    value={bodyJson}
                    onChange={(value) => onBodyJsonChange(value || "")}
                    options={{
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      fontSize: 13,
                      automaticLayout: true,
                      padding: { top: 10 },
                    }}
                  />
                </div>
              )}
              {bodyType === "form-data" && (
                 <KeyValueEditor
                    items={bodyFormData}
                    onChange={onBodyFormDataChange}
                    onRemove={onBodyFormDataRemove}
                    environmentValues={environmentValues}
                    onItemsReplace={onBodyFormDataReplace}
                    showBulkEdit
                  />
              )}
              {bodyType === "x-www-form-urlencoded" && (
                 <KeyValueEditor
                    items={bodyUrlEncoded}
                    onChange={onBodyUrlEncodedChange}
                    onRemove={onBodyUrlEncodedRemove}
                    environmentValues={environmentValues}
                    onItemsReplace={onBodyUrlEncodedReplace}
                    showBulkEdit
                  />
              )}
              {bodyType === "binary" && (
                <div className="empty-state">
                  <span style={{ opacity: 0.5 }}>Binary body type not fully implemented (File upload)</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "Settings" && (
           <div className="settings-pane">
             <div className="settings-card">
               <div className="settings-row">
                 <div className="settings-meta">
                   <div className="settings-label">HTTP Version</div>
                   <div className="settings-desc">Protocol used for the request.</div>
                 </div>
                 <select
                   className="settings-select"
                   value={settings.httpVersion}
                   onChange={(e) => onSettingsChange("httpVersion", e.target.value)}
                 >
                   <option value="HTTP/1.1">HTTP/1.1</option>
                   <option value="HTTP/2">HTTP/2</option>
                 </select>
               </div>

               <div className="settings-row">
                 <div className="settings-meta">
                   <div className="settings-label">SSL Certificate Verification</div>
                   <div className="settings-desc">Validate the server certificate chain.</div>
                 </div>
                 <label className="settings-toggle">
                   <input
                     type="checkbox"
                     checked={settings.verifySsl}
                     onChange={(e) => onSettingsChange("verifySsl", e.target.checked)}
                   />
                   <span className="settings-toggle-ui" />
                 </label>
               </div>

               <div className="settings-row">
                 <div className="settings-meta">
                   <div className="settings-label">Automatically Follow Redirects</div>
                   <div className="settings-desc">Handle 3xx responses without manual steps.</div>
                 </div>
                 <label className="settings-toggle">
                   <input
                     type="checkbox"
                     checked={settings.followRedirects}
                     onChange={(e) => onSettingsChange("followRedirects", e.target.checked)}
                   />
                   <span className="settings-toggle-ui" />
                 </label>
               </div>
             </div>
           </div>
        )}
      </div>
    </div>
  );
};
