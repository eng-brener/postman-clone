import { useState } from "react";
import { ThemeOption } from "../../lib/theme";

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

  if (!open) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">Settings</div>
        <div className="settings-tabs">
          <button
            type="button"
            className={`settings-tab ${settingsTab === "general" ? "active" : ""}`}
            onClick={() => setSettingsTab("general")}
          >
            General
          </button>
          <button
            type="button"
            className={`settings-tab ${settingsTab === "about" ? "active" : ""}`}
            onClick={() => setSettingsTab("about")}
          >
            About
          </button>
        </div>
        <div className="settings-content">
          {settingsTab === "general" && (
            <div className="settings-panel">
              <div className="settings-title">General</div>
              <div className="settings-text">Configure app defaults and behavior.</div>
              <div className="settings-row">
                <div className="settings-meta">
                  <div className="settings-label">Theme</div>
                  <div className="settings-desc">Choose your preferred appearance.</div>
                </div>
                <select
                  className="settings-select"
                  value={theme}
                  onChange={(event) => onThemeChange(event.target.value as ThemeOption)}
                >
                  <option value="dark">Dark (Current)</option>
                  <option value="light">Light</option>
                  <option value="dracula">Dracula</option>
                </select>
              </div>
            </div>
          )}
          {settingsTab === "about" && (
            <div className="settings-panel">
              <div className="settings-title">About</div>
              <div className="settings-text">
                Postman Clone v{appVersion || "0.0.0"} — built with Tauri + React.
              </div>
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button type="button" className="modal-button ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
