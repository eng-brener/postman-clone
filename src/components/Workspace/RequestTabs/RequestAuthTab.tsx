import { AuthData, AuthDataType, AuthType } from "../../../types";
import { EnvInput } from "../../Editors/EnvInput";
import { useI18n } from "../../../i18n";

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
}: RequestAuthTabProps) => {
  const { t } = useI18n();
  const authTypes: { id: AuthType; label: string }[] = [
    { id: "none", label: t("request.authNone") },
    { id: "api-key", label: t("request.authApiKey") },
    { id: "bearer", label: t("request.authBearer") },
    { id: "basic", label: t("request.authBasic") },
  ];

  return (
    <div className="auth-container">
      <div className="auth-sidebar">
        <div className="auth-sidebar-title">{t("request.authType")}</div>
        {authTypes.map((at) => (
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
            <span style={{ opacity: 0.6 }}>{t("request.authEmpty")}</span>
          </div>
        )}

        {authType === "api-key" && (
          <div style={{ maxWidth: 400, display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="auth-field-group">
              <label className="auth-label">{t("request.key")}</label>
              <EnvInput
                className="input-ghost"
                overlayClassName="env-overlay-ghost"
                placeholder={t("request.key")}
                value={authData.apiKey.key}
                environmentValues={environmentValues}
                title={getTemplateTooltip(authData.apiKey.key)}
                onChange={(value) => onAuthDataChange("api-key", "key", value)}
              />
            </div>
            <div className="auth-field-group">
              <label className="auth-label">{t("request.value")}</label>
              <EnvInput
                className="input-ghost"
                overlayClassName="env-overlay-ghost"
                placeholder={t("request.value")}
                value={authData.apiKey.value}
                environmentValues={environmentValues}
                title={getTemplateTooltip(authData.apiKey.value)}
                onChange={(value) => onAuthDataChange("api-key", "value", value)}
              />
            </div>
            <div className="auth-field-group">
              <label className="auth-label">{t("request.addTo")}</label>
              <select
                className="method-select"
                style={{ width: "100%", height: 38, fontSize: "0.85rem" }}
                value={authData.apiKey.addTo}
                onChange={(e) => onAuthDataChange("api-key", "addTo", e.target.value)}
              >
                <option value="header">{t("request.header")}</option>
                <option value="query">{t("request.queryParams")}</option>
              </select>
            </div>
          </div>
        )}

        {authType === "bearer" && (
          <div style={{ maxWidth: 400 }}>
            <div className="auth-field-group">
              <label className="auth-label">{t("request.token")}</label>
              <EnvInput
                as="textarea"
                className="code-editor"
                overlayClassName="env-overlay-code"
                style={{ height: 150, minHeight: 100 }}
                placeholder={t("request.bearerToken")}
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
              <label className="auth-label">{t("request.username")}</label>
              <EnvInput
                className="input-ghost"
                overlayClassName="env-overlay-ghost"
                placeholder={t("request.username")}
                value={authData.basic.username}
                environmentValues={environmentValues}
                title={getTemplateTooltip(authData.basic.username)}
                onChange={(value) => onAuthDataChange("basic", "username", value)}
              />
            </div>
            <div className="auth-field-group">
              <label className="auth-label">{t("request.password")}</label>
              <EnvInput
                className="input-ghost"
                overlayClassName="env-overlay-ghost"
                type="password"
                placeholder={t("request.password")}
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
};
