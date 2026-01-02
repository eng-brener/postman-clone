import { AuthData, AuthDataType, AuthType } from "../../../types";
import { EnvInput } from "../../Editors/EnvInput";

const AUTH_TYPES: { id: AuthType; label: string }[] = [
  { id: "none", label: "No Auth" },
  { id: "api-key", label: "API Key" },
  { id: "bearer", label: "Bearer Token" },
  { id: "basic", label: "Basic Auth" },
];

type RequestAuthTabProps = {
  authType: AuthType;
  authData: AuthData;
  environmentValues: Record<string, string>;
  onAuthTypeChange: (type: AuthType) => void;
  onAuthDataChange: (type: AuthDataType, field: string, val: string) => void;
  getTemplateTooltip: (value: string) => string | undefined;
};

export const RequestAuthTab = ({
  authType,
  authData,
  environmentValues,
  onAuthTypeChange,
  onAuthDataChange,
  getTemplateTooltip,
}: RequestAuthTabProps) => (
  <div className="auth-container">
    <div className="auth-sidebar">
      <div className="auth-sidebar-title">Auth Type</div>
      {AUTH_TYPES.map((at) => (
        <button
          key={at.id}
          className={`auth-type-btn ${authType === at.id ? "active" : ""}`}
          onClick={() => onAuthTypeChange(at.id)}
        >
          {at.label}
        </button>
      ))}
    </div>

    <div className="auth-content">
      {authType === "none" && (
        <div className="empty-state">
          <span style={{ opacity: 0.6 }}>This request does not use any authorization.</span>
        </div>
      )}

      {authType === "api-key" && (
        <div style={{ maxWidth: 400, display: "flex", flexDirection: "column", gap: 16 }}>
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
              style={{ width: "100%", height: 38, fontSize: "0.85rem" }}
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
);
