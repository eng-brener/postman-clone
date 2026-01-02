import { Send, MoreHorizontal } from "lucide-react";

interface UrlBarProps {
  method: string;
  url: string;
  isSending: boolean;
  onMethodChange: (method: string) => void;
  onUrlChange: (url: string) => void;
  onSend: () => void;
}

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export const UrlBar = ({ method, url, isSending, onMethodChange, onUrlChange, onSend }: UrlBarProps) => {
  return (
    <div className="url-bar-container">
      <select
        className="method-select"
        value={method}
        onChange={(e) => onMethodChange(e.target.value)}
      >
        {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
      </select>

      <input
        className="url-input"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        placeholder="Enter URL"
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
