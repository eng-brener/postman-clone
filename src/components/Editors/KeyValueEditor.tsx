import { Trash2 } from "lucide-react";
import { KeyValue } from "../../types";

interface KeyValueEditorProps {
  items: KeyValue[];
  onChange: (idx: number, field: keyof KeyValue, val: string | boolean) => void;
  onRemove: (idx: number) => void;
}

export const KeyValueEditor = ({ items, onChange, onRemove }: KeyValueEditorProps) => (
  <div className="kv-editor">
    {items.map((item, idx) => (
      <div key={idx} className="kv-row">
        <input
          className="input-ghost"
          placeholder="Key"
          value={item.key}
          onChange={(e) => onChange(idx, "key", e.target.value)}
        />
        <input
          className="input-ghost"
          placeholder="Value"
          value={item.value}
          onChange={(e) => onChange(idx, "value", e.target.value)}
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
