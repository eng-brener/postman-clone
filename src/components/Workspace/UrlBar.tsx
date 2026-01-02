import { Send, MoreHorizontal } from "lucide-react";
import { EnvInput } from "../Editors/EnvInput";
import { useEffect, useRef, useState } from "react";

interface UrlBarProps {
  method: string;
  url: string;
  isSending: boolean;
  onMethodChange: (method: string) => void;
  onUrlChange: (url: string) => void;
  onSend: () => void;
  environmentValues: Record<string, string>;
  urlPreview: string;
  urlIsValid: boolean;
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

export const UrlBar = ({
  method,
  url,
  isSending,
  onMethodChange,
  onUrlChange,
  onSend,
  environmentValues,
  urlPreview,
  urlIsValid,
}: UrlBarProps) => {
  const [isMethodOpen, setIsMethodOpen] = useState(false);
  const methodMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!methodMenuRef.current) {
        return;
      }
      if (!methodMenuRef.current.contains(event.target as Node)) {
        setIsMethodOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <div className="url-bar-container">
        <div className="method-select-wrap" ref={methodMenuRef}>
          <button
            type="button"
            className="method-select method-select-http method-select-button"
            data-method={method}
            aria-haspopup="listbox"
            aria-expanded={isMethodOpen}
            onClick={() => setIsMethodOpen((prev) => !prev)}
          >
            {method}
          </button>
          {isMethodOpen && (
            <div className="method-menu" role="listbox" aria-label="HTTP method">
              {METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="option"
                  aria-selected={m === method}
                  className={`method-menu-item ${m === method ? "active" : ""}`}
                  data-method={m}
                  onClick={() => {
                    onMethodChange(m);
                    setIsMethodOpen(false);
                  }}
                >
                  <span className="method-menu-dot" data-method={m} />
                  <span className="method-menu-label">{m}</span>
                </button>
              ))}
            </div>
          )}
        </div>

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

        <button className="btn-primary" onClick={onSend} disabled={isSending}>
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
      <div className="url-bar-meta">
        <span className="url-meta-label">Resolved:</span>
        <span className="url-meta-value" title={urlPreview}>
          {urlPreview}
        </span>
      </div>
    </>
  );
};
