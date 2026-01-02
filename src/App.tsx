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

function App() {
  // App Info
  const [appName, setAppName] = useState("Postman Clone");
  const [appVersion, setAppVersion] = useState<string | null>(null);

  // Request State
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("https://catfact.ninja/fact");
  const [isSending, setIsSending] = useState(false);
  const [settings, setSettings] = useState<RequestSettings>({
    httpVersion: "HTTP/1.1",
    verifySsl: true,
    followRedirects: true
  });

  // Auth State
  const [authType, setAuthType] = useState<AuthType>("none");
  const [authData, setAuthData] = useState<AuthData>({
    apiKey: { key: "", value: "", addTo: "header" },
    bearer: { token: "" },
    basic: { username: "", password: "" }
  });
  
  // Tabs State
  const [activeReqTab, setActiveReqTab] = useState("Params");
  const [activeResTab, setActiveResTab] = useState("Preview");

  // Data State (using hooks where appropriate)
  const [params, setParams, removeParam] = useKeyValueList([emptyRow()]);
  const [headers, setHeaders, removeHeader] = useKeyValueList([
    { key: "User-Agent", value: "PostmanClone/1.0", enabled: true },
  ]);

  const [bodyType, setBodyType] = useState<BodyType>("none");
  const [rawType, setRawType] = useState<RawType>("json");
  const [bodyJson, setBodyJson] = useState(
    `{
  "customer_id": "cst_8842",
  "adjust": true,
  "tags": ["solar", "priority"]
}`
  );
  
  const [bodyFormData, setBodyFormData, removeBodyFormData] = useKeyValueList([emptyRow()]);
  const [bodyUrlEncoded, setBodyUrlEncoded, removeBodyUrlEncoded] = useKeyValueList([emptyRow()]);

  // Response State
  const [responseCode, setResponseCode] = useState<number | null>(null);
  const [responseStatus, setResponseStatus] = useState("--");
  const [responseTime, setResponseTime] = useState(0);
  const [responseSize, setResponseSize] = useState(0);
  const [responseRaw, setResponseRaw] = useState("");
  const [responsePretty, setResponsePretty] = useState("");
  const [responseHeaders, setResponseHeaders] = useState<[string, string][]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
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

  const handleSettingsChange = (field: keyof RequestSettings, val: any) => {
    setSettings(prev => ({ ...prev, [field]: val }));
  };

  const handleAuthDataChange = (type: AuthType, field: string, val: string) => {
    setAuthData(prev => ({
       ...prev,
       [type === "api-key" ? "apiKey" : type]: {
          ...prev[type === "api-key" ? "apiKey" : type as "bearer" | "basic"],
          [field]: val
       }
    }));
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
      setErrorMessage(error.toString());
      setResponseRaw(error.toString());
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectRequest = (m: string, u: string) => {
      setMethod(m);
      setUrl(u);
  };

  return (
    <div className="app">
      <Sidebar 
        appName={appName}
        appVersion={appVersion}
        history={history}
        currentUrl={url}
        onSelectRequest={handleSelectRequest}
      />

      <main className="main-content">
        <UrlBar 
            method={method}
            url={url}
            isSending={isSending}
            onMethodChange={setMethod}
            onUrlChange={setUrl}
            onSend={sendRequest}
        />

        <div className="workspace-grid">
            <RequestPane 
                activeTab={activeReqTab}
                onTabChange={setActiveReqTab}
                
                params={params}
                onParamsChange={setParams}
                onParamsRemove={removeParam}

                headers={headers}
                onHeadersChange={setHeaders}
                onHeadersRemove={removeHeader}
                
                authType={authType}
                onAuthTypeChange={setAuthType}
                authData={authData}
                onAuthDataChange={handleAuthDataChange}

                bodyType={bodyType}
                onBodyTypeChange={setBodyType}

                rawType={rawType}
                onRawTypeChange={setRawType}

                bodyJson={bodyJson}
                onBodyJsonChange={setBodyJson}

                bodyFormData={bodyFormData}
                onBodyFormDataChange={setBodyFormData}
                onBodyFormDataRemove={removeBodyFormData}

                bodyUrlEncoded={bodyUrlEncoded}
                onBodyUrlEncodedChange={setBodyUrlEncoded}
                onBodyUrlEncodedRemove={removeBodyUrlEncoded}

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
      </main>
    </div>
  );
}

export default App;
