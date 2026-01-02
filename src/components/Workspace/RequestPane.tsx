import Editor from "@monaco-editor/react";
import { Zap, Settings as SettingsIcon } from "lucide-react";
import { KeyValueEditor } from "../Editors/KeyValueEditor";
import { BodyType, RawType, KeyValue, RequestSettings, AuthType, AuthData } from "../../types";

interface RequestPaneProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  
  params: KeyValue[];
  onParamsChange: (idx: number, field: keyof KeyValue, val: string | boolean) => void;
  onParamsRemove: (idx: number) => void;

  headers: KeyValue[];
  onHeadersChange: (idx: number, field: keyof KeyValue, val: string | boolean) => void;
  onHeadersRemove: (idx: number) => void;

  // Auth Props
  authType: AuthType;
  onAuthTypeChange: (type: AuthType) => void;
  authData: AuthData;
  onAuthDataChange: (type: AuthType, field: string, val: string) => void;

  bodyType: BodyType;
  onBodyTypeChange: (type: BodyType) => void;
  
  rawType: RawType;
  onRawTypeChange: (type: RawType) => void;

  bodyJson: string;
  onBodyJsonChange: (val: string) => void;

  bodyFormData: KeyValue[];
  onBodyFormDataChange: (idx: number, field: keyof KeyValue, val: string | boolean) => void;
  onBodyFormDataRemove: (idx: number) => void;

  bodyUrlEncoded: KeyValue[];
  onBodyUrlEncodedChange: (idx: number, field: keyof KeyValue, val: string | boolean) => void;
  onBodyUrlEncodedRemove: (idx: number) => void;

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
      params, onParamsChange, onParamsRemove,
      headers, onHeadersChange, onHeadersRemove,
      authType, onAuthTypeChange, authData, onAuthDataChange,
      bodyType, onBodyTypeChange,
      rawType, onRawTypeChange,
      bodyJson, onBodyJsonChange,
      bodyFormData, onBodyFormDataChange, onBodyFormDataRemove,
      bodyUrlEncoded, onBodyUrlEncodedChange, onBodyUrlEncodedRemove,
      settings, onSettingsChange
  } = props;

  return (
    <div className="request-pane">
      <div className="pane-header">
        <div className="tabs">
          {["Params", "Authorization", "Headers", "Body", "Settings"].map(tab => (
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
          <KeyValueEditor items={params} onChange={onParamsChange} onRemove={onParamsRemove} />
        )}

        {activeTab === "Authorization" && (
          <div style={{ display: "flex", height: "100%", border: "1px solid var(--border-subtle)", borderRadius: 6, overflow: "hidden" }}>
             {/* Left: Auth Type Selector */}
             <div style={{ width: "200px", borderRight: "1px solid var(--border-subtle)", background: "var(--bg-sidebar)", display: "flex", flexDirection: "column" }}>
               <div style={{ padding: "8px 12px", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Type</div>
               {AUTH_TYPES.map(at => (
                 <button
                   key={at.id}
                   style={{
                     textAlign: "left",
                     padding: "8px 12px",
                     background: authType === at.id ? "var(--bg-active)" : "transparent",
                     color: authType === at.id ? "var(--text-main)" : "var(--text-muted)",
                     border: "none",
                     cursor: "pointer",
                     fontSize: "0.85rem",
                     borderLeft: authType === at.id ? "3px solid var(--primary)" : "3px solid transparent"
                   }}
                   onClick={() => onAuthTypeChange(at.id)}
                 >
                   {at.label}
                 </button>
               ))}
             </div>

             {/* Right: Auth Config */}
             <div style={{ flex: 1, padding: 20, overflow: "auto", background: "var(--bg-app)" }}>
                {authType === "none" && (
                   <div className="empty-state" style={{ height: "100%" }}>
                      <span style={{ opacity: 0.6 }}>This request does not use any authorization.</span>
                   </div>
                )}

                {authType === "api-key" && (
                  <div className="kv-editor">
                     <div style={{ marginBottom: 12 }}>
                        <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 6 }}>Key</label>
                        <input 
                          className="input-ghost" 
                          style={{ background: "var(--bg-input)" }}
                          placeholder="Key"
                          value={authData.apiKey.key}
                          onChange={(e) => onAuthDataChange("api-key", "key", e.target.value)}
                        />
                     </div>
                     <div style={{ marginBottom: 12 }}>
                        <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 6 }}>Value</label>
                        <input 
                          className="input-ghost"
                          style={{ background: "var(--bg-input)" }} 
                          placeholder="Value"
                          value={authData.apiKey.value}
                          onChange={(e) => onAuthDataChange("api-key", "value", e.target.value)}
                        />
                     </div>
                     <div>
                        <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 6 }}>Add to</label>
                        <select 
                          className="method-select" 
                          style={{ width: "100%" }}
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
                   <div className="kv-editor">
                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 6 }}>Token</label>
                        <textarea 
                          className="code-editor"
                          style={{ height: 150 }} 
                          placeholder="Bearer Token"
                          value={authData.bearer.token}
                          onChange={(e) => onAuthDataChange("bearer", "token", e.target.value)}
                        />
                     </div>
                   </div>
                )}

                {authType === "basic" && (
                   <div className="kv-editor">
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 6 }}>Username</label>
                        <input 
                          className="input-ghost"
                          style={{ background: "var(--bg-input)" }} 
                          placeholder="Username"
                          value={authData.basic.username}
                          onChange={(e) => onAuthDataChange("basic", "username", e.target.value)}
                        />
                     </div>
                     <div>
                        <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 6 }}>Password</label>
                        <input 
                          className="input-ghost"
                          style={{ background: "var(--bg-input)" }} 
                          type="password"
                          placeholder="Password"
                          value={authData.basic.password}
                          onChange={(e) => onAuthDataChange("basic", "password", e.target.value)}
                        />
                     </div>
                   </div>
                )}
             </div>
          </div>
        )}

        {activeTab === "Headers" && (
          <KeyValueEditor items={headers} onChange={onHeadersChange} onRemove={onHeadersRemove} />
        )}

        {activeTab === "Body" && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 10 }}>
            <div className="radio-group" style={{ display: 'flex', gap: 12, fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap', alignItems: 'center' }}>
              {BODY_TYPES.map(bt => (
                <label key={bt.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="bodyType"
                    value={bt.id}
                    checked={bodyType === bt.id}
                    onChange={(e) => onBodyTypeChange(e.target.value as BodyType)}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span style={{ color: bodyType === bt.id ? 'var(--text-main)' : 'inherit' }}>{bt.label}</span>
                </label>
              ))}

              {bodyType === "raw" && (
                <select 
                  className="method-select" 
                  style={{ height: 24, padding: '0 8px', fontSize: '0.75rem', marginLeft: 'auto' }}
                  value={rawType}
                  onChange={(e) => onRawTypeChange(e.target.value as RawType)}
                >
                  {RAW_TYPES.map(rt => <option key={rt} value={rt}>{rt}</option>)}
                </select>
              )}
            </div>

            <div style={{ flex: 1, position: 'relative', border: '1px solid var(--border-subtle)', borderRadius: 6, overflow: 'hidden' }}>
              {bodyType === "none" && (
                <div className="empty-state">
                  <span style={{ opacity: 0.5 }}>This request has no body</span>
                </div>
              )}
              {bodyType === "raw" && (
                <Editor
                  height="100%"
                  language={rawType === 'javascript' ? 'javascript' : rawType}
                  theme="vs-dark"
                  value={bodyJson}
                  onChange={(value) => onBodyJsonChange(value || "")}
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 13,
                    automaticLayout: true,
                    padding: { top: 10 }
                  }}
                />
              )}
              {bodyType === "form-data" && (
                <div style={{ padding: 10 }}>
                  <KeyValueEditor items={bodyFormData} onChange={onBodyFormDataChange} onRemove={onBodyFormDataRemove} />
                </div>
              )}
              {bodyType === "x-www-form-urlencoded" && (
                <div style={{ padding: 10 }}>
                  <KeyValueEditor items={bodyUrlEncoded} onChange={handleUrlEncodedChange} onRemove={onBodyUrlEncodedRemove} />
                </div>
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
           <div className="kv-editor">
             <div className="kv-row" style={{ gridTemplateColumns: "1fr 120px" }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>HTTP Version</span>
                <select 
                  className="method-select" 
                  style={{ height: 30, padding: '0 8px', fontSize: '0.8rem' }}
                  value={settings.httpVersion}
                  onChange={(e) => onSettingsChange("httpVersion", e.target.value)}
                >
                  <option value="HTTP/1.1">HTTP/1.1</option>
                  <option value="HTTP/2">HTTP/2</option>
                </select>
             </div>
             
             <div className="kv-row" style={{ gridTemplateColumns: "1fr auto" }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>Enable SSL Certificate Verification</span>
                <div className="checkbox-wrapper">
                    <input 
                      type="checkbox" 
                      checked={settings.verifySsl}
                      onChange={(e) => onSettingsChange("verifySsl", e.target.checked)}
                    />
                </div>
             </div>

             <div className="kv-row" style={{ gridTemplateColumns: "1fr auto" }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>Automatically Follow Redirects</span>
                <div className="checkbox-wrapper">
                    <input 
                      type="checkbox" 
                      checked={settings.followRedirects}
                      onChange={(e) => onSettingsChange("followRedirects", e.target.checked)}
                    />
                </div>
             </div>
           </div>
        )}
      </div>
    </div>
  );
};