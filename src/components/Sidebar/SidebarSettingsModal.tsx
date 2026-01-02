import { useState } from "react";
import { ThemeOption } from "../../lib/theme";
import { LANGUAGE_OPTIONS, useI18n, type Language } from "../../i18n";

type SidebarSettingsModalProps = {
  open: boolean;
  onClose: () => void;
  appVersion: string | null;
  theme: ThemeOption;
  onThemeChange: (theme: ThemeOption) => void;
};

export const SidebarSettingsModal = ({
  open,
  onClose,
  appVersion,
  theme,
  onThemeChange,
}: SidebarSettingsModalProps) => {
  const [settingsTab, setSettingsTab] = useState<"general" | "about">("general");
  const { t, language, setLanguage } = useI18n();

  if (!open) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">{t("app.settingsTitle")}</div>
        <div className="settings-tabs">
          <button
            type="button"
            className={`settings-tab ${settingsTab === "general" ? "active" : ""}`}
            onClick={() => setSettingsTab("general")}
          >
            {t("app.settingsGeneral")}
          </button>
          <button
            type="button"
            className={`settings-tab ${settingsTab === "about" ? "active" : ""}`}
            onClick={() => setSettingsTab("about")}
          >
            {t("app.settingsAbout")}
          </button>
        </div>
        <div className="settings-content">
          {settingsTab === "general" && (
            <div className="settings-panel">
              <div className="settings-title">{t("app.settingsGeneralTitle")}</div>
              <div className="settings-text">{t("app.settingsGeneralDesc")}</div>
              <div className="settings-row">
                <div className="settings-meta">
                  <div className="settings-label">{t("app.settingsTheme")}</div>
                  <div className="settings-desc">{t("app.settingsThemeDesc")}</div>
                </div>
                <select
                  className="settings-select"
                  value={theme}
                  onChange={(event) => onThemeChange(event.target.value as ThemeOption)}
                >
                  <option value="dark">{t("app.settingsThemeDark")}</option>
                  <option value="light">{t("app.settingsThemeLight")}</option>
                  <option value="dracula">{t("app.settingsThemeDracula")}</option>
                </select>
              </div>
              <div className="settings-row">
                <div className="settings-meta">
                  <div className="settings-label">{t("app.settingsLanguage")}</div>
                  <div className="settings-desc">{t("app.settingsLanguageDesc")}</div>
                </div>
                <select
                  className="settings-select"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value as Language)}
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {settingsTab === "about" && (
            <div className="settings-panel">
              <div className="settings-title">{t("app.settingsAboutTitle")}</div>
              <div className="settings-text">
                {t("app.settingsAboutText", {
                  name: t("app.name"),
                  version: appVersion || "0.0.0",
                })}
              </div>
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button type="button" className="modal-button ghost" onClick={onClose}>
            {t("app.close")}
          </button>
        </div>
      </div>
    </div>
  );
};
