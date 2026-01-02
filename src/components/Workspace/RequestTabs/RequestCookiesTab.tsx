import { useMemo, useState } from "react";
import { CookieEntry } from "../../../types";

type RequestCookiesTabProps = {
  cookieContext: { host: string; path: string } | null;
  cookies: CookieEntry[];
  onCookieAdd: () => void;
  onCookieUpdate: (id: string, patch: Partial<CookieEntry>) => void;
  onCookieRemove: (id: string) => void;
  formatDate: (value: number | null) => string;
  parseDate: (value: string) => number | null;
};

export const RequestCookiesTab = ({
  cookieContext,
  cookies,
  onCookieAdd,
  onCookieUpdate,
  onCookieRemove,
  formatDate,
  parseDate,
}: RequestCookiesTabProps) => {
  const [cookieDomainFilter, setCookieDomainFilter] = useState("");
  const [cookiePathFilter, setCookiePathFilter] = useState("");

  const filteredCookies = useMemo(() => {
    const domainQuery = cookieDomainFilter.trim().toLowerCase();
    const pathQuery = cookiePathFilter.trim().toLowerCase();
    return cookies.filter((cookie) => {
      const matchesDomain = !domainQuery || cookie.domain.toLowerCase().includes(domainQuery);
      const matchesPath = !pathQuery || cookie.path.toLowerCase().includes(pathQuery);
      return matchesDomain && matchesPath;
    });
  }, [cookies, cookieDomainFilter, cookiePathFilter]);

  const hasInsecureSameSite = useMemo(
    () => cookies.some((cookie) => cookie.sameSite === "None" && !cookie.secure),
    [cookies]
  );

  return (
    <div className="cookie-pane">
      {!cookieContext && (
        <div className="empty-state" style={{ height: "100%" }}>
          <span style={{ opacity: 0.6 }}>Enter a valid URL to manage cookies.</span>
        </div>
      )}
      {cookieContext && (
        <>
          <div className="cookie-toolbar">
            <div className="cookie-scope">
              <span className="cookie-scope-label">Domain</span>
              <span className="cookie-scope-value">{cookieContext.host}</span>
            </div>
            <button type="button" className="cookie-add" onClick={onCookieAdd}>
              + Add Cookie
            </button>
          </div>
          <div className="cookie-filters">
            <input
              className="cookie-filter-input"
              placeholder="Filter domain"
              value={cookieDomainFilter}
              onChange={(event) => setCookieDomainFilter(event.target.value)}
            />
            <input
              className="cookie-filter-input"
              placeholder="Filter path"
              value={cookiePathFilter}
              onChange={(event) => setCookiePathFilter(event.target.value)}
            />
          </div>
          {hasInsecureSameSite && (
            <div className="cookie-warning">
              SameSite=None requires Secure. Some cookies may be rejected by browsers.
            </div>
          )}
          {filteredCookies.length === 0 ? (
            <div className="empty-state" style={{ paddingTop: 20 }}>
              {cookies.length === 0 ? "No cookies for this domain yet." : "No cookies match the filters."}
            </div>
          ) : (
            <div className="cookie-table">
              <div className="cookie-row cookie-header">
                <div className="cookie-cell-header center">On</div>
                <div className="cookie-cell-header">Name</div>
                <div className="cookie-cell-header">Value</div>
                <div className="cookie-cell-header">Domain</div>
                <div className="cookie-cell-header">Path</div>
                <div className="cookie-cell-header center">Host Only</div>
                <div className="cookie-cell-header">Expires</div>
                <div className="cookie-cell-header center">Secure</div>
                <div className="cookie-cell-header center">HttpOnly</div>
                <div className="cookie-cell-header">SameSite</div>
                <div className="cookie-cell-header center"></div>
              </div>
              {filteredCookies.map((cookie) => (
                <div key={cookie.id} className="cookie-row">
                  <div className="cookie-cell center">
                    <input
                      type="checkbox"
                      className="kv-checkbox"
                      checked={cookie.enabled}
                      onChange={(event) => onCookieUpdate(cookie.id, { enabled: event.target.checked })}
                    />
                  </div>
                  <div className="cookie-cell">
                    <input
                      className="cookie-input"
                      value={cookie.name}
                      onChange={(event) => onCookieUpdate(cookie.id, { name: event.target.value })}
                    />
                  </div>
                  <div className="cookie-cell">
                    <input
                      className="cookie-input"
                      value={cookie.value}
                      onChange={(event) => onCookieUpdate(cookie.id, { value: event.target.value })}
                    />
                  </div>
                  <div className="cookie-cell">
                    <input
                      className="cookie-input"
                      value={cookie.domain}
                      onChange={(event) => onCookieUpdate(cookie.id, { domain: event.target.value })}
                    />
                  </div>
                  <div className="cookie-cell">
                    <input
                      className="cookie-input"
                      value={cookie.path}
                      onChange={(event) => onCookieUpdate(cookie.id, { path: event.target.value })}
                    />
                  </div>
                  <div className="cookie-cell center">
                    <input
                      type="checkbox"
                      className="kv-checkbox"
                      checked={cookie.hostOnly}
                      onChange={(event) => onCookieUpdate(cookie.id, { hostOnly: event.target.checked })}
                    />
                  </div>
                  <div className="cookie-cell">
                    <input
                      type="datetime-local"
                      className="cookie-input"
                      value={formatDate(cookie.expires)}
                      onChange={(event) => onCookieUpdate(cookie.id, { expires: parseDate(event.target.value) })}
                    />
                  </div>
                  <div className="cookie-cell center">
                    <input
                      type="checkbox"
                      className="kv-checkbox"
                      checked={cookie.secure}
                      onChange={(event) => onCookieUpdate(cookie.id, { secure: event.target.checked })}
                    />
                  </div>
                  <div className="cookie-cell center">
                    <input
                      type="checkbox"
                      className="kv-checkbox"
                      checked={cookie.httpOnly}
                      onChange={(event) => onCookieUpdate(cookie.id, { httpOnly: event.target.checked })}
                    />
                  </div>
                  <div className="cookie-cell">
                    <select
                      className="cookie-select"
                      value={cookie.sameSite ?? ""}
                      onChange={(event) =>
                        onCookieUpdate(cookie.id, {
                          sameSite: event.target.value ? (event.target.value as CookieEntry["sameSite"]) : null,
                        })
                      }
                    >
                      <option value="">-</option>
                      <option value="Lax">Lax</option>
                      <option value="Strict">Strict</option>
                      <option value="None">None</option>
                    </select>
                  </div>
                  <div className="cookie-cell center">
                    <button type="button" className="cookie-delete" onClick={() => onCookieRemove(cookie.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
