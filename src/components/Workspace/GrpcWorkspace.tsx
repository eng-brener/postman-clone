import { useI18n } from "../../i18n";

export const GrpcWorkspace = ({ requestTypeLabel }: { requestTypeLabel: string }) => {
  const { t } = useI18n();
  return (
    <>
      <div className="url-bar-container">
        <div className="modal-text">{t("app.requestBuilderSoon", { type: requestTypeLabel })}</div>
      </div>
      <div className="workspace-grid">
        <div className="request-pane">
          <div className="pane-header">
            <div className="tabs">
              <div className="tab active">{t("app.requestTabLabel")}</div>
            </div>
          </div>
          <div className="pane-content">
            <div className="modal-text">{t("app.requestPlaceholder", { type: requestTypeLabel })}</div>
          </div>
        </div>
        <div className="response-pane">
          <div className="pane-header">
            <div className="tabs">
              <div className="tab active">{t("app.responseTabLabel")}</div>
            </div>
          </div>
          <div className="pane-content">
            <div className="modal-text">{t("app.responsePlaceholder", { type: requestTypeLabel })}</div>
          </div>
        </div>
      </div>
    </>
  );
};
