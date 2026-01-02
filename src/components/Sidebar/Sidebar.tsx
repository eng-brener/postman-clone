import { Layers } from "lucide-react";
import {
  type Dispatch,
  type SetStateAction,
  useState
} from "react";
import {
  CollectionNode,
  CollectionRequest,
  Environment,
  HistoryItem,
  KeyValue,
  RequestData,
  RequestType,
  Workspace,
} from "../../types";
import { type ThemeOption } from "../../lib/theme";
import { SidebarHistory } from "./SidebarHistory";
import { SidebarSettingsModal } from "./SidebarSettingsModal";
import { useI18n } from "../../i18n";
import { ActivityBar, SidebarView } from "./ActivityBar";
import { CollectionsPanel } from "./Panels/CollectionsPanel";
import { EnvironmentsPanel } from "./Panels/EnvironmentsPanel";
import { KeyValueEditor } from "../Editors/KeyValueEditor";

interface SidebarProps {
  appName: string;
  appVersion: string | null;
  history: HistoryItem[];
  currentUrl: string;
  currentMethod: string;
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onWorkspaceChange: (id: string | null) => void;
  onWorkspaceAdd: () => void;
  onWorkspaceRename: (id: string, name: string) => void;
  onWorkspaceDuplicate: (id: string) => void;
  onWorkspaceDelete: (id: string) => void;
  onWorkspaceSettingsChange: (id: string, settings: Workspace["settings"]) => void;
  collectionNodes: CollectionNode[];
  setCollectionNodes: Dispatch<SetStateAction<CollectionNode[]>>;
  buildRequestData: (method: string, url: string, requestType?: RequestType) => RequestData;
  onSelectRequest: (request: CollectionRequest) => void;
  onSelectHistory: (method: string, url: string) => void;
  onHistoryPinToggle: (id: string) => void;
  onHistoryRerun: (item: HistoryItem) => void;
  environments: Environment[];
  activeEnvironmentId: string | null;
  onEnvironmentChange: (id: string | null) => void;
  onEnvironmentAdd: () => void;
  onEnvironmentRename: (id: string, name: string) => void;
  onEnvironmentDelete: (id: string) => void;
  onEnvironmentVarChange: (id: string, idx: number, field: keyof KeyValue, val: string | boolean) => void;
  onEnvironmentVarRemove: (id: string, idx: number) => void;
  theme: ThemeOption;
  onThemeChange: (theme: ThemeOption) => void;
}

export const Sidebar = ({
  appName,
  appVersion,
  history,
  currentUrl,
  currentMethod,
  workspaces,
  activeWorkspaceId,
  onWorkspaceChange,
  onWorkspaceAdd,
  onWorkspaceRename,
  onWorkspaceDuplicate,
  onWorkspaceDelete,
  onWorkspaceSettingsChange,
  collectionNodes,
  setCollectionNodes,
  buildRequestData,
  onSelectRequest,
  onSelectHistory,
  onHistoryPinToggle,
  onHistoryRerun,
  environments,
  activeEnvironmentId,
  onEnvironmentChange,
  onEnvironmentAdd,
  onEnvironmentRename,
  onEnvironmentDelete,
  onEnvironmentVarChange,
  onEnvironmentVarRemove,
  theme,
  onThemeChange,
}: SidebarProps) => {
  const { t } = useI18n();
  const [activeView, setActiveView] = useState<SidebarView | null>("collections");
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false);
  const [envModalOpen, setEnvModalOpen] = useState(false);

  const activeWorkspace = workspaces.find((ws) => ws.id === activeWorkspaceId) ?? null;
  const activeEnvironment = environments.find((env) => env.id === activeEnvironmentId) ?? null;

  const handleViewChange = (view: SidebarView) => {
    setActiveView((prev) => (prev === view ? null : view));
  };

  return (
    <aside className="sidebar-container" style={{ display: 'flex', height: '100%', width: activeView ? 320 : 'auto' }}>
      <ActivityBar 
        activeView={activeView} 
        onViewChange={handleViewChange} 
        onSettingsClick={() => setSettingsModalOpen(true)}
      />

      {activeView && (
        <div className="sidebar sidebar-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', width: 0 }}>
          <div className="sidebar-header">
            <div className="brand">
              <Layers className="logo-icon" size={20} />
              <span>{appName}</span>
            </div>
            <div className="sidebar-workspace">
              <select
                className="env-select"
                value={activeWorkspaceId ?? workspaces[0]?.id ?? ""}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  if (nextValue === "__settings__") {
                    setWorkspaceModalOpen(true);
                    return;
                  }
                  onWorkspaceChange(nextValue || null);
                }}
                aria-label={t("app.workspaceActiveLabel")}
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name || t("app.workspace")}
                  </option>
                ))}
                <option value="__separator__" disabled>
                  ──────────
                </option>
                <option value="__settings__">{t("app.workspacesManage")}</option>
              </select>
            </div>
            <div className="sidebar-env">
              <select
                className="env-select"
                value={activeEnvironmentId ?? ""}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  if (nextValue === "__settings__") {
                    setEnvModalOpen(true);
                    return;
                  }
                  onEnvironmentChange(nextValue || null);
                }}
                aria-label={t("app.envActiveLabel")}
              >
                <option value="">{t("app.noEnvironment")}</option>
                {environments.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.name || t("app.environment")}
                  </option>
                ))}
                <option value="__separator__" disabled>
                  ──────────
                </option>
                <option value="__settings__">{t("app.settings")}</option>
              </select>
            </div>
          </div>

          <div className="sidebar-content" style={{ flex: 1, overflowY: 'auto' }}>
            {activeView === "collections" && (
              <CollectionsPanel
                collectionNodes={collectionNodes}
                setCollectionNodes={setCollectionNodes}
                currentUrl={currentUrl}
                currentMethod={currentMethod}
                onSelectRequest={onSelectRequest}
                buildRequestData={buildRequestData}
                activeWorkspace={activeWorkspace}
              />
            )}
            {activeView === "history" && (
              <SidebarHistory
                history={history}
                historyOpen={true}
                onToggle={() => {}}
                onSelect={onSelectHistory}
                onPinToggle={onHistoryPinToggle}
                onRerun={onHistoryRerun}
              />
            )}
            {activeView === "env" && (
              <EnvironmentsPanel
                environments={environments}
                activeEnvironmentId={activeEnvironmentId}
                onEnvironmentChange={onEnvironmentChange}
                onEnvironmentAdd={onEnvironmentAdd}
                onEnvironmentEdit={() => setEnvModalOpen(true)}
                onEnvironmentDelete={onEnvironmentDelete}
              />
            )}
          </div>

          <div className="sidebar-footer" style={{ borderTop: '1px solid var(--border-subtle)', padding: '8px 12px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
              v{appVersion}
            </div>
          </div>
        </div>
      )}

      <SidebarSettingsModal
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        appVersion={appVersion}
        theme={theme}
        onThemeChange={onThemeChange}
      />
      {workspaceModalOpen && (
        <div className="modal-overlay" onClick={() => setWorkspaceModalOpen(false)}>
          <div className="modal env-modal workspace-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">{t("app.workspacesTitle")}</div>
            <div className="env-modal-body">
              <div className="env-modal-sidebar">
                <div className="env-sidebar-header">
                  <span>{t("app.workspacesTitle")}</span>
                  <button type="button" className="env-button" onClick={onWorkspaceAdd}>
                    {t("app.workspaceNew")}
                  </button>
                </div>
                <div className="env-list">
                  {workspaces.map((workspace) => (
                    <button
                      key={workspace.id}
                      type="button"
                      className={`env-list-item ${activeWorkspaceId === workspace.id ? "active" : ""}`}
                      onClick={() => onWorkspaceChange(workspace.id)}
                    >
                      <span className="env-list-name">{workspace.name || t("app.workspace")}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="env-modal-main">
                {activeWorkspace ? (
                  <>
                    <div className="env-main-header">
                      <div className="env-name-field">
                        <label className="modal-label" htmlFor="workspace-name-input">
                          {t("app.nameLabel")}
                        </label>
                        <input
                          id="workspace-name-input"
                          className="modal-input"
                          value={activeWorkspace.name}
                          onChange={(event) => onWorkspaceRename(activeWorkspace.id, event.target.value)}
                        />
                      </div>
                      <div className="env-main-actions">
                        <button
                          type="button"
                          className="env-button"
                          onClick={() => onWorkspaceDuplicate(activeWorkspace.id)}
                        >
                          {t("app.workspaceDuplicate")}
                        </button>
                        <button
                          type="button"
                          className="env-button danger"
                          onClick={() => onWorkspaceDelete(activeWorkspace.id)}
                          disabled={workspaces.length <= 1}
                        >
                          {t("app.workspaceDelete")}
                        </button>
                      </div>
                    </div>
                    <div className="env-name-field">
                      <label className="modal-label" htmlFor="workspace-description-input">
                        {t("app.workspaceDescriptionLabel")}
                      </label>
                      <textarea
                        id="workspace-description-input"
                        className="modal-input workspace-description"
                        value={activeWorkspace.settings.description ?? ""}
                        onChange={(event) =>
                          onWorkspaceSettingsChange(activeWorkspace.id, { description: event.target.value })
                        }
                      />
                    </div>
                    <div className="modal-text">{t("app.workspaceSubtitle")}</div>
                  </>
                ) : (
                  <div className="empty-state env-empty-state">
                    {t("app.workspaceEmptyState")}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="modal-button ghost" onClick={() => setWorkspaceModalOpen(false)}>
                {t("app.close")}
              </button>
            </div>
          </div>
        </div>
      )}
      {envModalOpen && (
        <div className="modal-overlay" onClick={() => setEnvModalOpen(false)}>
          <div className="modal env-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">{t("app.envModalTitle")}</div>
            <div className="env-modal-body">
              <div className="env-modal-sidebar">
                <div className="env-sidebar-header">
                  <span>{t("app.envModalTitle")}</span>
                  <button type="button" className="env-button" onClick={onEnvironmentAdd}>
                    {t("app.envNew")}
                  </button>
                </div>
                <div className="env-list">
                  <button
                    type="button"
                    className={`env-list-item ${activeEnvironmentId ? "" : "active"}`}
                    onClick={() => onEnvironmentChange(null)}
                  >
                    {t("app.noEnvironment")}
                  </button>
                  {environments.map((env) => (
                    <button
                      key={env.id}
                      type="button"
                      className={`env-list-item ${activeEnvironmentId === env.id ? "active" : ""}`}
                      onClick={() => onEnvironmentChange(env.id)}
                    >
                      <span className="env-list-name">{env.name || t("app.environment")}</span>
                      <span className="env-list-meta">
                        {t("app.envVarsCount", {
                          count: env.variables.filter((item) => item.enabled && item.key.trim()).length,
                        })}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="env-sidebar-hint">
                  {t("app.envHint")}
                </div>
              </div>
              <div className="env-modal-main">
                {activeEnvironment ? (
                  <>
                    <div className="env-main-header">
                      <div className="env-name-field">
                        <label className="modal-label" htmlFor="env-name-input">
                          {t("app.envNameLabel")}
                        </label>
                        <input
                          id="env-name-input"
                          className="modal-input"
                          value={activeEnvironment.name}
                          onChange={(event) => onEnvironmentRename(activeEnvironment.id, event.target.value)}
                        />
                      </div>
                      <div className="env-main-actions">
                        <button
                          type="button"
                          className="env-button danger"
                          onClick={() => onEnvironmentDelete(activeEnvironment.id)}
                        >
                          {t("app.envDelete")}
                        </button>
                      </div>
                    </div>
                    <div className="env-vars-header">
                      <div>
                        <div className="env-vars-title">{t("app.envVariables")}</div>
                        <div className="env-vars-subtitle">{t("app.envVariablesSubtitle")}</div>
                      </div>
                    </div>
                    <KeyValueEditor
                      items={activeEnvironment.variables}
                      onChange={(idx, field, val) =>
                        onEnvironmentVarChange(activeEnvironment.id, idx, field, val)
                      }
                      onRemove={(idx) => onEnvironmentVarRemove(activeEnvironment.id, idx)}
                    />
                  </>
                ) : (
                  <div className="empty-state env-empty-state">
                    {t("app.envEmptyState")}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="modal-button ghost" onClick={() => setEnvModalOpen(false)}>
                {t("app.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
