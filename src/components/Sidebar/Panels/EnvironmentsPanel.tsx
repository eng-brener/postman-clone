import { Edit, Plus, Trash2 } from "lucide-react";
import { Environment } from "../../../types";
import { useI18n } from "../../../i18n";

interface EnvironmentsPanelProps {
  environments: Environment[];
  activeEnvironmentId: string | null;
  onEnvironmentChange: (id: string | null) => void;
  onEnvironmentAdd: () => void;
  onEnvironmentEdit: (id: string) => void;
  onEnvironmentDelete: (id: string) => void;
}

export const EnvironmentsPanel = ({
  environments,
  activeEnvironmentId,
  onEnvironmentChange,
  onEnvironmentAdd,
  onEnvironmentEdit,
  onEnvironmentDelete,
}: EnvironmentsPanelProps) => {
  const { t } = useI18n();

  return (
    <div className="environments-panel">
      <div className="panel-header">
        <span className="panel-title">{t("app.envModalTitle")}</span>
        <button className="panel-action" onClick={onEnvironmentAdd} title={t("app.envNew")}>
          <Plus size={16} />
        </button>
      </div>
      <div className="panel-list">
        <button
          className={`panel-item ${activeEnvironmentId === null ? "active" : ""}`}
          onClick={() => onEnvironmentChange(null)}
        >
          <div className="panel-item-content">
            <span className="panel-item-name">{t("app.noEnvironment")}</span>
          </div>
        </button>
        {environments.map((env) => (
          <div
            key={env.id}
            className={`panel-item ${activeEnvironmentId === env.id ? "active" : ""}`}
            onClick={() => onEnvironmentChange(env.id)}
          >
            <div className="panel-item-content">
              <span className="panel-item-name">{env.name || t("app.environment")}</span>
              <span className="panel-item-meta">
                {t("app.envVarsCount", {
                  count: env.variables.filter((item) => item.enabled && item.key.trim()).length,
                })}
              </span>
            </div>
            <div className="panel-item-actions">
              <button
                className="panel-item-action"
                onClick={(e) => {
                  e.stopPropagation();
                  onEnvironmentEdit(env.id);
                }}
              >
                <Edit size={12} />
              </button>
              <button
                className="panel-item-action danger"
                onClick={(e) => {
                  e.stopPropagation();
                  onEnvironmentDelete(env.id);
                }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
