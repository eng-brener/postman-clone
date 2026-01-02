import { Trash2 } from "lucide-react";
import { KeyValue } from "../../types";
import { EnvInput } from "./EnvInput";

interface KeyValueEditorProps {
  items: KeyValue[];
  onChange: (idx: number, field: keyof KeyValue, val: string | boolean) => void;
  onRemove: (idx: number) => void;
  environmentValues?: Record<string, string>;
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

export const KeyValueEditor = ({ items, onChange, onRemove, environmentValues }: KeyValueEditorProps) => (
  <div className="kv-editor">
    {items.map((item, idx) => (
      <div key={idx} className="kv-row">
        <EnvInput
          className="input-ghost"
          overlayClassName="env-overlay-ghost"
          placeholder="Key"
          value={item.key}
          environmentValues={environmentValues}
          title={getTemplateTooltip(item.key, environmentValues)}
          onChange={(value) => onChange(idx, "key", value)}
        />
        <EnvInput
          className="input-ghost"
          overlayClassName="env-overlay-ghost"
          placeholder="Value"
          value={item.value}
          environmentValues={environmentValues}
          title={getTemplateTooltip(item.value, environmentValues)}
          onChange={(value) => onChange(idx, "value", value)}
        />
        <div className="checkbox-wrapper">
          <input
            type="checkbox"
            checked={item.enabled}
            onChange={(e) => onChange(idx, "enabled", e.target.checked)}
          />
        </div>
        {items.length > 1 && (
          <button 
            className="btn-icon" 
            onClick={() => onRemove(idx)}
            title="Remove item"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    ))}
  </div>
);
