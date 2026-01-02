import { useEffect, useMemo, useState } from "react";
import { getName, getVersion } from "@tauri-apps/api/app";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import "./App.css";

import { Sidebar } from "./components/Sidebar/Sidebar";
import { UrlBar } from "./components/Workspace/UrlBar";
import { RequestPane } from "./components/Workspace/RequestPane";
import { ResponsePane } from "./components/Workspace/ResponsePane";

import { useKeyValueList } from "./hooks/useKeyValueList";
import { BodyType, HistoryItem, KeyValue, RawType, RequestSettings, AuthType, AuthData } from "./types";

const emptyRow = (): KeyValue => ({ key: "", value: "", enabled: true });
const cloneKeyValues = (items: KeyValue[]) => items.map((item) => ({ ...item }));

type RequestTab = {
  id: string;
  method: string;
  url: string;
  params: KeyValue[];
  headers: KeyValue[];
  authType: AuthType;
  authData: AuthData;
  bodyType: BodyType;
  rawType: RawType;
  bodyJson: string;
  bodyFormData: KeyValue[];
  bodyUrlEncoded: KeyValue[];
  settings: RequestSettings;
  responseCode: number | null;
  responseStatus: string;
  responseTime: number;
  responseSize: number;
  responseRaw: string;
  responsePretty: string;
  responseHeaders: [string, string][];
  errorMessage: string | null;
};

function App() {
  // App Info
  const [appName, setAppName] = useState("Postman Clone");
  const [appVersion, setAppVersion] = useState<string | null>(null);

  const defaultSettings: RequestSettings = {
    httpVersion: "HTTP/1.1",
    verifySsl: true,
    followRedirects: true,
  };
  const defaultAuthData: AuthData = {
    apiKey: { key: "", value: "", addTo: "header" },
    bearer: { token: "" },
    basic: { username: "", password: "" },
  };
  const defaultBodyJson = `{
  "customer_id": "cst_8842",
  "adjust": true,
  "tags": ["solar", "priority"]
}`;
  const defaultHeadersList: KeyValue[] = [
    { key: "User-Agent", value: "PostmanClone/1.0", enabled: true },
  ];

  const createDefaultTab = (): RequestTab => ({
    id: `tab-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    method: "GET",
    url: "https://catfact.ninja/fact",
    params: [emptyRow()],
    headers: cloneKeyValues(defaultHeadersList),
    authType: "none",
    authData: { ...defaultAuthData, apiKey: { ...defaultAuthData.apiKey }, bearer: { ...defaultAuthData.bearer }, basic: { ...defaultAuthData.basic } },
    bodyType: "none",
    rawType: "json",
    bodyJson: defaultBodyJson,
    bodyFormData: [emptyRow()],
    bodyUrlEncoded: [emptyRow()],
    settings: { ...defaultSettings },
    responseCode: null,
    responseStatus: "--",
    responseTime: 0,
    responseSize: 0,
    responseRaw: "",
    responsePretty: "",
    responseHeaders: [],
    errorMessage: null,
  });

  const [tabs, setTabs] = useState<RequestTab[]>([createDefaultTab()]);
  const [activeTabId, setActiveTabId] = useState<string | null>(tabs[0].id);

  // Request State
  const [method, setMethod] = useState(tabs[0].method);
  const [url, setUrl] = useState(tabs[0].url);
  const [isSending, setIsSending] = useState(false);
  const [settings, setSettings] = useState<RequestSettings>(tabs[0].settings);

  // Auth State
  const [authType, setAuthType] = useState<AuthType>(tabs[0].authType);
  const [authData, setAuthData] = useState<AuthData>(tabs[0].authData);
  
  // Tabs State
  const [activeReqTab, setActiveReqTab] = useState("Params");
  const [activeResTab, setActiveResTab] = useState("Preview");

  // Data State (using hooks where appropriate)
  const [params, setParams, removeParam, setParamsList] = useKeyValueList([emptyRow()]);
  const [headers, setHeaders, removeHeader, setHeadersList] = useKeyValueList(defaultHeadersList);

  const [bodyType, setBodyType] = useState<BodyType>(tabs[0].bodyType);
  const [rawType, setRawType] = useState<RawType>(tabs[0].rawType);
  const [bodyJson, setBodyJson] = useState(tabs[0].bodyJson);
  
  const [bodyFormData, setBodyFormData, removeBodyFormData, setBodyFormDataList] = useKeyValueList([emptyRow()]);
  const [bodyUrlEncoded, setBodyUrlEncoded, removeBodyUrlEncoded, setBodyUrlEncodedList] = useKeyValueList([emptyRow()]);

  // Response State
  const [responseCode, setResponseCode] = useState<number | null>(tabs[0].responseCode);
  const [responseStatus, setResponseStatus] = useState(tabs[0].responseStatus);
  const [responseTime, setResponseTime] = useState(tabs[0].responseTime);
  const [responseSize, setResponseSize] = useState(tabs[0].responseSize);
  const [responseRaw, setResponseRaw] = useState(tabs[0].responseRaw);
  const [responsePretty, setResponsePretty] = useState(tabs[0].responsePretty);
  const [responseHeaders, setResponseHeaders] = useState<[string, string][]>(tabs[0].responseHeaders);
  const [errorMessage, setErrorMessage] = useState<string | null>(tabs[0].errorMessage);
  
  // History
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    getName().then((n) => setAppName(n || "Postman Clone")).catch(() => {});
    getVersion().then(setAppVersion).catch(() => {});
  }, []);

  // Derived State
  const requestUrl = useMemo(() => {
    try {
      const base = new URL(url);
      
      // Add Params
      params
        .filter((item) => item.enabled && item.key.trim())
        .forEach((item) => {
          base.searchParams.set(item.key.trim(), item.value);
        });

      // Add Auth (Query Params)
      if (authType === "api-key" && authData.apiKey.addTo === "query" && authData.apiKey.key) {
        base.searchParams.set(authData.apiKey.key, authData.apiKey.value);
      }
      
      return base.toString();
    } catch {
      return url;
    }
  }, [url, params, authType, authData]);

  const activeHeaders = useMemo(() => {
    const result: Record<string, string> = {};
    headers
      .filter((item) => item.enabled && item.key.trim())
      .forEach((item) => {
        result[item.key.trim()] = item.value;
      });
    
    // Add Auth (Headers)
    if (authType === "api-key" && authData.apiKey.addTo === "header" && authData.apiKey.key) {
      result[authData.apiKey.key] = authData.apiKey.value;
    } else if (authType === "bearer" && authData.bearer.token) {
      result["Authorization"] = `Bearer ${authData.bearer.token}`;
    } else if (authType === "basic" && authData.basic.username) {
      const credentials = btoa(`${authData.basic.username}:${authData.basic.password}`);
      result["Authorization"] = `Basic ${credentials}`;
    }

    // Add implicit content-type based on body type if not present
    if (activeReqTab === "Body" && !Object.keys(result).some(k => k.toLowerCase() === 'content-type')) {
       if (bodyType === "raw") {
         const mimeMap: Record<RawType, string> = {
            json: "application/json",
            text: "text/plain",
            javascript: "application/javascript",
            html: "text/html",
            xml: "application/xml"
         };
         result["Content-Type"] = mimeMap[rawType];
       } else if (bodyType === "x-www-form-urlencoded") {
         result["Content-Type"] = "application/x-www-form-urlencoded";
       }
    }
    
    return result;
  }, [headers, bodyType, rawType, activeReqTab, authType, authData]);

  const updateActiveTab = (updater: (tab: RequestTab) => RequestTab) => {
    if (!activeTabId) {
      return;
    }
    setTabs((prev) => prev.map((tab) => (tab.id === activeTabId ? updater(tab) : tab)));
  };

  const updateKeyValueList = (
    list: KeyValue[],
    index: number,
    field: keyof KeyValue,
    value: string | boolean
  ) => {
    const next = list.map((item, idx) => (idx === index ? { ...item, [field]: value } : item));
    if (index === list.length - 1 && (field === "key" || field === "value") && value !== "") {
      next.push(emptyRow());
    }
    return next;
  };

  const removeKeyValueItem = (list: KeyValue[], index: number) => {
    if (list.length <= 1) {
      return [emptyRow()];
    }
    return list.filter((_, idx) => idx !== index);
  };

  const handleMethodChange = (next: string) => {
    setMethod(next);
    updateActiveTab((tab) => ({ ...tab, method: next }));
  };

  const handleUrlChange = (next: string) => {
    setUrl(next);
    updateActiveTab((tab) => ({ ...tab, url: next }));
  };

  const handleSettingsChange = (field: keyof RequestSettings, val: any) => {
    setSettings((prev) => ({ ...prev, [field]: val }));
    updateActiveTab((tab) => ({ ...tab, settings: { ...tab.settings, [field]: val } }));
  };

  const handleAuthTypeChange = (next: AuthType) => {
    setAuthType(next);
    updateActiveTab((tab) => ({ ...tab, authType: next }));
  };

  const handleAuthDataChange = (type: AuthType, field: string, val: string) => {
    setAuthData((prev) => ({
      ...prev,
      [type === "api-key" ? "apiKey" : type]: {
        ...prev[type === "api-key" ? "apiKey" : (type as "bearer" | "basic")],
        [field]: val,
      },
    }));
    updateActiveTab((tab) => {
      const key = type === "api-key" ? "apiKey" : type;
      return {
        ...tab,
        authData: {
          ...tab.authData,
          [key]: {
            ...tab.authData[key],
            [field]: val,
          },
        },
      };
    });
  };

  const handleParamsChange = (idx: number, field: keyof KeyValue, val: string | boolean) => {
    setParams(idx, field, val);
    updateActiveTab((tab) => ({ ...tab, params: updateKeyValueList(tab.params, idx, field, val) }));
  };

  const handleParamsRemove = (idx: number) => {
    removeParam(idx);
    updateActiveTab((tab) => ({ ...tab, params: removeKeyValueItem(tab.params, idx) }));
  };

  const handleHeadersChange = (idx: number, field: keyof KeyValue, val: string | boolean) => {
    setHeaders(idx, field, val);
    updateActiveTab((tab) => ({ ...tab, headers: updateKeyValueList(tab.headers, idx, field, val) }));
  };

  const handleHeadersRemove = (idx: number) => {
    removeHeader(idx);
    updateActiveTab((tab) => ({ ...tab, headers: removeKeyValueItem(tab.headers, idx) }));
  };

  const handleBodyTypeChange = (next: BodyType) => {
    setBodyType(next);
    updateActiveTab((tab) => ({ ...tab, bodyType: next }));
  };

  const handleRawTypeChange = (next: RawType) => {
    setRawType(next);
    updateActiveTab((tab) => ({ ...tab, rawType: next }));
  };

  const handleBodyJsonChange = (next: string) => {
    setBodyJson(next);
    updateActiveTab((tab) => ({ ...tab, bodyJson: next }));
  };

  const handleBodyFormDataChange = (idx: number, field: keyof KeyValue, val: string | boolean) => {
    setBodyFormData(idx, field, val);
    updateActiveTab((tab) => ({
      ...tab,
      bodyFormData: updateKeyValueList(tab.bodyFormData, idx, field, val),
    }));
  };

  const handleBodyFormDataRemove = (idx: number) => {
    removeBodyFormData(idx);
    updateActiveTab((tab) => ({ ...tab, bodyFormData: removeKeyValueItem(tab.bodyFormData, idx) }));
  };

  const handleBodyUrlEncodedChange = (idx: number, field: keyof KeyValue, val: string | boolean) => {
    setBodyUrlEncoded(idx, field, val);
    updateActiveTab((tab) => ({
      ...tab,
      bodyUrlEncoded: updateKeyValueList(tab.bodyUrlEncoded, idx, field, val),
    }));
  };

  const handleBodyUrlEncodedRemove = (idx: number) => {
    removeBodyUrlEncoded(idx);
    updateActiveTab((tab) => ({ ...tab, bodyUrlEncoded: removeKeyValueItem(tab.bodyUrlEncoded, idx) }));
  };

  const loadTab = (tab: RequestTab) => {
    setMethod(tab.method);
    setUrl(tab.url);
    setSettings(tab.settings);
    setAuthType(tab.authType);
    setAuthData(tab.authData);
    setParamsList(cloneKeyValues(tab.params));
    setHeadersList(cloneKeyValues(tab.headers));
    setBodyType(tab.bodyType);
    setRawType(tab.rawType);
    setBodyJson(tab.bodyJson);
    setBodyFormDataList(cloneKeyValues(tab.bodyFormData));
    setBodyUrlEncodedList(cloneKeyValues(tab.bodyUrlEncoded));
    setResponseCode(tab.responseCode);
    setResponseStatus(tab.responseStatus);
    setResponseTime(tab.responseTime);
    setResponseSize(tab.responseSize);
    setResponseRaw(tab.responseRaw);
    setResponsePretty(tab.responsePretty);
    setResponseHeaders(tab.responseHeaders);
    setErrorMessage(tab.errorMessage);
  };

  useEffect(() => {
    if (tabs.length === 0 && activeTabId !== null) {
      setActiveTabId(null);
    }
  }, [tabs, activeTabId]);

  const handleSelectTab = (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) {
      return;
    }
    setActiveTabId(tabId);
    loadTab(tab);
  };

  const handleAddTab = () => {
    const next = createDefaultTab();
    setTabs((prev) => [...prev, next]);
    setActiveTabId(next.id);
    loadTab(next);
  };

  const handleCloseTab = (tabId: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === tabId);
      const nextTabs = prev.filter((t) => t.id !== tabId);
      if (tabId === activeTabId) {
        const nextActive = nextTabs[Math.max(0, idx - 1)];
        if (nextActive) {
          setActiveTabId(nextActive.id);
          loadTab(nextActive);
        } else {
          setActiveTabId(null);
        }
      }
      return nextTabs;
    });
  };

  const sendRequest = async () => {
    setIsSending(true);
    setErrorMessage(null);
    setResponseCode(null);
    const start = performance.now();

    try {
      const bodyAllowed = method !== "GET" && method !== "DELETE";
      let payload: BodyInit | undefined = undefined;

      if (bodyAllowed && activeReqTab === "Body") {
        if (bodyType === "raw") {
          payload = bodyJson;
        } else if (bodyType === "form-data") {
           const formData = new FormData();
           bodyFormData.forEach(item => {
             if (item.enabled && item.key.trim()) {
               formData.append(item.key.trim(), item.value);
             }
           });
           payload = formData;
        } else if (bodyType === "x-www-form-urlencoded") {
           const urlEncoded = new URLSearchParams();
           bodyUrlEncoded.forEach(item => {
             if (item.enabled && item.key.trim()) {
               urlEncoded.append(item.key.trim(), item.value);
             }
           });
           payload = urlEncoded.toString();
        }
      }
      
      const response = await tauriFetch(requestUrl, {
        method,
        headers: activeHeaders,
        body: payload,
        redirect: settings.followRedirects ? 'follow' : 'manual'
      });

      const rawText = await response.text();
      const timeMs = Math.round(performance.now() - start);
      
      setResponseTime(timeMs);
      setResponseCode(response.status);
      setResponseStatus(`${response.status} ${response.statusText || ""}`.trim());
      setResponseSize(rawText.length);
      setResponseRaw(rawText);

      // Extract Headers
      const headersList: [string, string][] = [];
      response.headers.forEach((value, key) => {
        headersList.push([key, value]);
      });
      setResponseHeaders(headersList);

      let formatted = rawText;
      try {
        const parsed = JSON.parse(rawText);
        formatted = JSON.stringify(parsed, null, 2);
      } catch {
        // Not JSON
      }
      setResponsePretty(formatted);

      updateActiveTab((tab) => ({
        ...tab,
        responseCode: response.status,
        responseStatus: `${response.status} ${response.statusText || ""}`.trim(),
        responseTime: timeMs,
        responseSize: rawText.length,
        responseRaw: rawText,
        responsePretty: formatted,
        responseHeaders: headersList,
        errorMessage: null,
      }));

      // Add to history
      const historyItem: HistoryItem = {
        id: Date.now().toString(),
        method,
        url: requestUrl,
        status: response.status.toString(),
        timeMs,
      };
      setHistory((prev) => [historyItem, ...prev].slice(0, 10));

    } catch (error: any) {
      const message = error.toString();
      setErrorMessage(message);
      setResponseRaw(message);
      updateActiveTab((tab) => ({
        ...tab,
        responseCode: null,
        responseStatus: "--",
        responseTime: 0,
        responseSize: 0,
        responseRaw: message,
        responsePretty: message,
        responseHeaders: [],
        errorMessage: message,
      }));
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectRequest = (m: string, u: string) => {
      handleMethodChange(m);
      handleUrlChange(u);
  };

  const hasActiveTab = tabs.length > 0 && activeTabId !== null;

  return (
    <div className="app">
      <Sidebar 
        appName={appName}
        appVersion={appVersion}
        history={history}
        currentUrl={url}
        currentMethod={method}
        onSelectRequest={handleSelectRequest}
      />

      <main className="main-content">
        <div className={`request-tabs-bar ${tabs.length === 0 ? "empty" : ""}`}>
          <div className={`request-tabs ${tabs.length === 0 ? "empty" : ""}`}>
            {tabs.length === 0 && "No tabs open"}
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`request-tab ${tab.id === activeTabId ? "active" : ""}`}
                onClick={() => handleSelectTab(tab.id)}
              >
                <span className={`method-badge method-${tab.method}`}>{tab.method}</span>
                <span className="request-tab-label">{tab.url || "New Request"}</span>
                <button
                  type="button"
                  className="request-tab-close"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleCloseTab(tab.id);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="request-tab-add" onClick={handleAddTab}>
            +
          </button>
        </div>

        {hasActiveTab ? (
          <>
            <UrlBar 
                method={method}
                url={url}
                isSending={isSending}
                onMethodChange={handleMethodChange}
                onUrlChange={handleUrlChange}
                onSend={sendRequest}
            />

            <div className="workspace-grid">
                <RequestPane 
                    activeTab={activeReqTab}
                    onTabChange={setActiveReqTab}
                    
                    params={params}
                    onParamsChange={handleParamsChange}
                    onParamsRemove={handleParamsRemove}

                    headers={headers}
                    onHeadersChange={handleHeadersChange}
                    onHeadersRemove={handleHeadersRemove}
                    
                    authType={authType}
                    onAuthTypeChange={handleAuthTypeChange}
                    authData={authData}
                    onAuthDataChange={handleAuthDataChange}

                    bodyType={bodyType}
                    onBodyTypeChange={handleBodyTypeChange}

                    rawType={rawType}
                    onRawTypeChange={handleRawTypeChange}

                    bodyJson={bodyJson}
                    onBodyJsonChange={handleBodyJsonChange}

                    bodyFormData={bodyFormData}
                    onBodyFormDataChange={handleBodyFormDataChange}
                    onBodyFormDataRemove={handleBodyFormDataRemove}

                    bodyUrlEncoded={bodyUrlEncoded}
                    onBodyUrlEncodedChange={handleBodyUrlEncodedChange}
                    onBodyUrlEncodedRemove={handleBodyUrlEncodedRemove}

                    settings={settings}
                    onSettingsChange={handleSettingsChange}
                />

                <ResponsePane 
                    activeTab={activeResTab}
                    onTabChange={setActiveResTab}
                    
                    responseCode={responseCode}
                    responseStatus={responseStatus}
                    responseTime={responseTime}
                    responseSize={responseSize}
                    responseRaw={responseRaw}
                    responsePretty={responsePretty}
                    responseHeaders={responseHeaders}
                    errorMessage={errorMessage}
                />
            </div>
          </>
        ) : (
          <div className="empty-workspace">
            <div className="empty-workspace-card">
              <div className="empty-title">Postman Clone</div>
              <div className="empty-subtitle">Open a request tab to get started.</div>
              <button type="button" className="empty-cta" onClick={handleAddTab}>
                + New Request
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
