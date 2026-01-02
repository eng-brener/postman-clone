import { useMemo, useState } from "react";

type ResponseRawTabProps = {
  responseRaw: string;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const ResponseRawTab = ({ responseRaw }: ResponseRawTabProps) => {
  const [rawSearch, setRawSearch] = useState("");
  const [rawWrap, setRawWrap] = useState(true);

  const highlightedRaw = useMemo(() => {
    if (!rawSearch) {
      return escapeHtml(responseRaw);
    }
    const escaped = escapeHtml(responseRaw);
    const pattern = new RegExp(escapeRegExp(rawSearch), "gi");
    return escaped.replace(pattern, (match) => `<mark>${match}</mark>`);
  }, [rawSearch, responseRaw]);

  return (
    <div className="response-raw">
      <div className="response-raw-toolbar">
        <input
          className="response-raw-search"
          placeholder="Search in response"
          value={rawSearch}
          onChange={(event) => setRawSearch(event.target.value)}
        />
        <button
          type="button"
          className={`response-raw-toggle ${rawWrap ? "active" : ""}`}
          onClick={() => setRawWrap((prev) => !prev)}
        >
          Wrap {rawWrap ? "On" : "Off"}
        </button>
      </div>
      <pre
        className={`response-preview ${rawWrap ? "" : "no-wrap"}`}
        dangerouslySetInnerHTML={{ __html: highlightedRaw }}
      />
    </div>
  );
};
