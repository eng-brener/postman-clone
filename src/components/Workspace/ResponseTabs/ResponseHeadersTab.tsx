import { useI18n } from "../../../i18n";

type ResponseHeadersTabProps = {
  responseHeaders: [string, string][];
};

export const ResponseHeadersTab = ({ responseHeaders }: ResponseHeadersTabProps) => {
  const { t } = useI18n();
  return (
    <div style={{ display: "grid", gap: 0, fontSize: "0.85rem", color: "var(--text-main)", width: "100%" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: 12,
          padding: "8px 16px",
          background: "var(--bg-panel)",
          borderBottom: "1px solid var(--border-subtle)",
          fontWeight: 600,
          color: "var(--text-muted)",
          fontSize: "0.75rem",
          textTransform: "uppercase",
        }}
      >
        <div>{t("response.key")}</div>
        <div>{t("response.value")}</div>
      </div>
      {responseHeaders.map(([key, value], i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr",
            gap: 12,
            padding: "8px 16px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <span style={{ fontWeight: 600, color: "var(--text-muted)" }}>{key}</span>
          <span style={{ wordBreak: "break-all", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  );
};
