import { Send, MoreHorizontal } from "lucide-react";
import { EnvInput } from "../Editors/EnvInput";

interface UrlBarProps {
  method: string;
  url: string;
  isSending: boolean;
  onMethodChange: (method: string) => void;
  onUrlChange: (url: string) => void;
  onSend: () => void;
  environmentValues: Record<string, string>;
}

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

const getTemplateTooltip = (value: string, environmentValues: Record<string, string>) => {
  if (!value) {
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

export const UrlBar = ({ method, url, isSending, onMethodChange, onUrlChange, onSend, environmentValues }: UrlBarProps) => {
  return (
    <div className="url-bar-container">
      <select
        className="method-select"
        value={method}
        onChange={(e) => onMethodChange(e.target.value)}
      >
        {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
      </select>

      <EnvInput
        wrapperClassName="url-input-wrap"
        className="url-input"
        overlayClassName="env-overlay-url"
        value={url}
        placeholder="Enter URL"
        environmentValues={environmentValues}
        title={getTemplateTooltip(url, environmentValues)}
        onChange={onUrlChange}
      />

      <button
        className="btn-primary"
        onClick={onSend}
        disabled={isSending}
      >
        {isSending ? (
          <MoreHorizontal className="animate-pulse" />
        ) : (
          <>
            <Send size={16} />
            <span>Send</span>
          </>
        )}
      </button>
    </div>
  );
};
