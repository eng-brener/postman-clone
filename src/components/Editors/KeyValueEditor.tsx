import { Trash2, AlignLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { KeyValue } from "../../types";
import { EnvInput } from "./EnvInput";
import { useI18n } from "../../i18n";

interface KeyValueEditorProps {
  items: KeyValue[];
  onChange: (idx: number, field: keyof KeyValue, val: string | boolean) => void;
  onRemove: (idx: number) => void;
  environmentValues?: Record<string, string>;
  onItemsReplace?: (items: KeyValue[]) => void;
  showBulkEdit?: boolean;
  duplicateCheck?: "case-sensitive" | "case-insensitive";
}

const getTemplateTooltip = (value: string, environmentValues?: Record<string, string>) => {
  if (!environmentValues || !value) {
    return undefined;
  }
  const matches = [...value.matchAll(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g)];
  if (matches.length === 0) {
    return undefined;
  }
  const keys = Array.from(new Set(matches.map((match) => match[1]))).filter(
    (key) => Object.prototype.hasOwnProperty.call(environmentValues, key)
  );
  if (keys.length === 0) {
    return undefined;
  }
  return keys.map((key) => `{{${key}}} = ${environmentValues[key]}`).join("\n");
};

export const KeyValueEditor = ({
  items,
  onChange,
  onRemove,
  environmentValues,
  onItemsReplace,
  showBulkEdit = false,
  duplicateCheck = "case-sensitive",
}: KeyValueEditorProps) => {
  const { t } = useI18n();
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkValue, setBulkValue] = useState("");

  const duplicateKeys = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach((item) => {
      const key = item.key.trim();
      if (!key) {
        return;
      }
      const normalized = duplicateCheck === "case-insensitive" ? key.toLowerCase() : key;
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    });
    return new Set(Array.from(counts.entries()).filter(([, count]) => count > 1).map(([key]) => key));
  }, [items, duplicateCheck]);

  const openBulkEdit = () => {
    const lines = items
      .filter((item) => item.key.trim() !== "" || item.value.trim() !== "")
      .map((item) => `${item.enabled ? "" : "# "}${item.key}: ${item.value}`);
    setBulkValue(lines.join("\n"));
    setBulkOpen(true);
  };

  const applyBulkEdit = () => {
    if (!onItemsReplace) {
      setBulkOpen(false);
      return;
    }
    const nextItems: KeyValue[] = [];
    const lines = bulkValue.split("\n");
    lines.forEach((rawLine) => {
      let line = rawLine.trim();
      if (!line) {
        return;
      }
      let enabled = true;
      if (line.startsWith("#")) {
        enabled = false;
        line = line.replace(/^#+\s*/, "");
      }
      if (!line) {
        return;
      }
      const colonIndex = line.indexOf(":");
      const equalIndex = line.indexOf("=");
      let splitIndex = -1;
      if (colonIndex >= 0 && equalIndex >= 0) {
        splitIndex = Math.min(colonIndex, equalIndex);
      } else {
        splitIndex = colonIndex >= 0 ? colonIndex : equalIndex;
      }
      let key = "";
      let value = "";
      if (splitIndex >= 0) {
        key = line.slice(0, splitIndex).trim();
        value = line.slice(splitIndex + 1).trim();
      } else {
        key = line.trim();
      }
      if (!key) {
        return;
      }
      nextItems.push({ key, value, enabled });
    });
    onItemsReplace(nextItems);
    setBulkOpen(false);
  };

  return (
    <div className="kv-editor">
      <div className="kv-header">
        <div className="kv-header-cell">{t("editor.key")}</div>
        <div className="kv-header-cell">{t("editor.value")}</div>
        <div className="kv-header-cell actions">
          {showBulkEdit && (
            <button
              type="button"
              className="kv-bulk-toggle"
              onClick={bulkOpen ? () => setBulkOpen(false) : openBulkEdit}
              title={t("editor.bulkEdit")}
            >
              <AlignLeft size={14} />
            </button>
          )}
        </div>
      </div>
      {bulkOpen && (
        <div className="kv-bulk-panel">
          <div className="kv-bulk-hint">{t("editor.bulkHint")}</div>
          <textarea
            className="kv-bulk-input"
            value={bulkValue}
            onChange={(event) => setBulkValue(event.target.value)}
            placeholder={t("editor.bulkPlaceholder")}
          />
          <div className="kv-bulk-actions">
            <button type="button" className="kv-bulk-cancel" onClick={() => setBulkOpen(false)}>
              {t("editor.bulkCancel")}
            </button>
            <button type="button" className="kv-bulk-apply" onClick={applyBulkEdit}>
              {t("editor.bulkApply")}
            </button>
          </div>
        </div>
      )}
      {items.map((item, idx) => {
        const key = item.key.trim();
        const normalized = duplicateCheck === "case-insensitive" ? key.toLowerCase() : key;
        const isDuplicate = key && duplicateKeys.has(normalized);
        return (
          <div key={idx} className={`kv-row ${isDuplicate ? "duplicate" : ""}`}>
            <div className="kv-cell">
              <EnvInput
                className="kv-input"
                overlayClassName="env-overlay-ghost"
                placeholder={t("editor.keyPlaceholder")}
                value={item.key}
                environmentValues={environmentValues}
                title={getTemplateTooltip(item.key, environmentValues)}
                onChange={(value) => onChange(idx, "key", value)}
              />
            </div>

            <div className="kv-cell">
              <EnvInput
                className="kv-input"
                overlayClassName="env-overlay-ghost"
                placeholder={t("editor.valuePlaceholder")}
                value={item.value}
                environmentValues={environmentValues}
                title={getTemplateTooltip(item.value, environmentValues)}
                onChange={(value) => onChange(idx, "value", value)}
              />
            </div>

            <div className="kv-cell actions">
              <div className="checkbox-wrapper">
                <input
                  type="checkbox"
                  className="kv-checkbox"
                  checked={item.enabled}
                  onChange={(e) => onChange(idx, "enabled", e.target.checked)}
                />
              </div>
              {items.length > 1 && (
                <button className="btn-icon" onClick={() => onRemove(idx)} title={t("editor.removeItem")}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        );
      })}
      {duplicateKeys.size > 0 && (
        <div className="kv-duplicate-warning">
          {t("editor.duplicateWarning")}
        </div>
      )}
    </div>
  );
};
