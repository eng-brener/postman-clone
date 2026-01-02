import { useMemo, useState } from "react";
import { CookieEntry } from "../../../types";
import { useI18n } from "../../../i18n";

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
  const { t } = useI18n();
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
          <span style={{ opacity: 0.6 }}>{t("request.cookiesEmptyUrl")}</span>
        </div>
      )}
      {cookieContext && (
        <>
          <div className="cookie-toolbar">
            <div className="cookie-scope">
              <span className="cookie-scope-label">{t("request.cookiesDomain")}</span>
              <span className="cookie-scope-value">{cookieContext.host}</span>
            </div>
            <button type="button" className="cookie-add" onClick={onCookieAdd}>
              {t("request.addCookie")}
            </button>
          </div>
          <div className="cookie-filters">
            <input
              className="cookie-filter-input"
              placeholder={t("request.filterDomain")}
              value={cookieDomainFilter}
              onChange={(event) => setCookieDomainFilter(event.target.value)}
            />
            <input
              className="cookie-filter-input"
              placeholder={t("request.filterPath")}
              value={cookiePathFilter}
              onChange={(event) => setCookiePathFilter(event.target.value)}
            />
          </div>
          {hasInsecureSameSite && (
            <div className="cookie-warning">
              {t("request.cookiesWarning")}
            </div>
          )}
          {filteredCookies.length === 0 ? (
            <div className="empty-state" style={{ paddingTop: 20 }}>
              {cookies.length === 0 ? t("request.cookiesEmptyDomain") : t("request.cookiesEmptyFilter")}
            </div>
          ) : (
            <div className="cookie-table">
              <div className="cookie-row cookie-header">
                <div className="cookie-cell-header center">{t("request.cookiesOn")}</div>
                <div className="cookie-cell-header">{t("request.cookiesName")}</div>
                <div className="cookie-cell-header">{t("request.cookiesValue")}</div>
                <div className="cookie-cell-header">{t("request.cookiesDomainHeader")}</div>
                <div className="cookie-cell-header">{t("request.cookiesPath")}</div>
                <div className="cookie-cell-header center">{t("request.cookiesHostOnly")}</div>
                <div className="cookie-cell-header">{t("request.cookiesExpires")}</div>
                <div className="cookie-cell-header center">{t("request.cookiesSecure")}</div>
                <div className="cookie-cell-header center">{t("request.cookiesHttpOnly")}</div>
                <div className="cookie-cell-header">{t("request.cookiesSameSite")}</div>
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
                      {t("request.cookiesDelete")}
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
