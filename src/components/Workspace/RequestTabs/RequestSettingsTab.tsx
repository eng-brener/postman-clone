import { RequestSettings } from "../../../types";

type RequestSettingsTabProps = {
  settings: RequestSettings;
  onSettingsChange: (field: keyof RequestSettings, val: any) => void;
};

export const RequestSettingsTab = ({ settings, onSettingsChange }: RequestSettingsTabProps) => (
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
);
