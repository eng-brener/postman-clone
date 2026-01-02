export type ParsedCookieRow = {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: string;
  httpOnly: boolean;
  secure: boolean;
};

type ResponseCookiesTabProps = {
  parsedCookies: ParsedCookieRow[];
  expandedCookieValues: Set<string>;
  expandedCookieNames: Set<string>;
  onToggleValue: (key: string) => void;
  onToggleName: (key: string) => void;
  truncateValue: (value: string, max?: number) => string;
};

export const ResponseCookiesTab = ({
  parsedCookies,
  expandedCookieValues,
  expandedCookieNames,
  onToggleValue,
  onToggleName,
  truncateValue,
}: ResponseCookiesTabProps) => (
  <div className="cookie-pane">
    {parsedCookies.length === 0 ? (
      <div className="empty-state" style={{ padding: 12 }}>
        No cookies returned.
      </div>
    ) : (
      <div className="cookie-table">
        <div className="cookie-row-response cookie-header">
          <div className="cookie-cell-header">Name</div>
          <div className="cookie-cell-header">Value</div>
          <div className="cookie-cell-header">Domain</div>
          <div className="cookie-cell-header">Path</div>
          <div className="cookie-cell-header">Expires</div>
          <div className="cookie-cell-header center">HttpOnly</div>
          <div className="cookie-cell-header center">Secure</div>
        </div>
        {parsedCookies.map((cookie, i) => {
          const rowKey = `${cookie.name}-${i}`;
          const isValueExpanded = expandedCookieValues.has(rowKey);
          const isNameExpanded = expandedCookieNames.has(rowKey);
          return (
            <div key={rowKey} className="cookie-row-response">
              <div className="cookie-cell">
                <button
                  type="button"
                  className="cookie-value-button"
                  onClick={() => onToggleName(rowKey)}
                  title={isNameExpanded ? "Collapse name" : "Expand name"}
                >
                  <span className={`cookie-value-text ${isNameExpanded ? "expanded" : ""}`}>
                    {isNameExpanded ? cookie.name : truncateValue(cookie.name)}
                  </span>
                </button>
              </div>
              <div className="cookie-cell">
                <button
                  type="button"
                  className="cookie-value-button"
                  onClick={() => onToggleValue(rowKey)}
                  title={isValueExpanded ? "Collapse value" : "Expand value"}
                >
                  <span className={`cookie-value-text ${isValueExpanded ? "expanded" : ""}`}>
                    {isValueExpanded ? cookie.value : truncateValue(cookie.value)}
                  </span>
                </button>
              </div>
              <div className="cookie-cell">
                <span className="cookie-cell-text">{cookie.domain}</span>
              </div>
              <div className="cookie-cell">
                <span className="cookie-cell-text">{cookie.path}</span>
              </div>
              <div className="cookie-cell">
                <span className="cookie-cell-text">{cookie.expires}</span>
              </div>
              <div className="cookie-cell center">
                <span className="cookie-cell-text">{cookie.httpOnly ? "Yes" : "No"}</span>
              </div>
              <div className="cookie-cell center">
                <span className="cookie-cell-text">{cookie.secure ? "Yes" : "No"}</span>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);
