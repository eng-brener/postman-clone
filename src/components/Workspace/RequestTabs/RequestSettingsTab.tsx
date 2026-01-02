import { RequestSettings } from "../../../types";
import { useI18n } from "../../../i18n";

type RequestSettingsTabProps = {
  settings: RequestSettings;
  onSettingsChange: (field: keyof RequestSettings, val: any) => void;
};

export const RequestSettingsTab = ({ settings, onSettingsChange }: RequestSettingsTabProps) => {
  const { t } = useI18n();
  return (
    <div className="settings-pane">
      <div className="settings-card">
        <div className="settings-row">
          <div className="settings-meta">
            <div className="settings-label">{t("request.settingsHttpVersion")}</div>
            <div className="settings-desc">{t("request.settingsHttpVersionDesc")}</div>
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
            <div className="settings-label">{t("request.settingsSsl")}</div>
            <div className="settings-desc">{t("request.settingsSslDesc")}</div>
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
            <div className="settings-label">{t("request.settingsRedirects")}</div>
            <div className="settings-desc">{t("request.settingsRedirectsDesc")}</div>
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
  );
};
