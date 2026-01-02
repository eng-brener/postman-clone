import { Box, Clock, FolderTree, Settings } from "lucide-react";
import { useI18n } from "../../i18n";

export type SidebarView = "collections" | "history" | "env";

interface ActivityBarProps {
  activeView: SidebarView | null;
  onViewChange: (view: SidebarView) => void;
  onSettingsClick: () => void;
}

export const ActivityBar = ({ activeView, onViewChange, onSettingsClick }: ActivityBarProps) => {
  const { t } = useI18n();
  return (
    <div className="activity-bar">
      <div className="activity-top">
        <button
          className={`activity-item ${activeView === "collections" ? "active" : ""}`}
          onClick={() => onViewChange("collections")}
          title={t("app.collection")}
        >
          <FolderTree size={24} strokeWidth={1.5} />
        </button>
        <button
          className={`activity-item ${activeView === "history" ? "active" : ""}`}
          onClick={() => onViewChange("history")}
          title={t("app.history")}
        >
          <Clock size={24} strokeWidth={1.5} />
        </button>
        <button
          className={`activity-item ${activeView === "env" ? "active" : ""}`}
          onClick={() => onViewChange("env")}
          title={t("app.envModalTitle")}
        >
          <Box size={24} strokeWidth={1.5} />
        </button>
      </div>
      <div className="activity-bottom">
        <button className="activity-item" onClick={onSettingsClick} title={t("app.settings")}>
          <Settings size={24} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};
