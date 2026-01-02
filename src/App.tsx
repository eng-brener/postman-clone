import { useEffect, useMemo, useRef, useState } from "react";
import { getName, getVersion } from "@tauri-apps/api/app";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import "./App.css";

import { Sidebar } from "./components/Sidebar/Sidebar";
import { UrlBar } from "./components/Workspace/UrlBar";
import { RequestPane } from "./components/Workspace/RequestPane";
import { ResponsePane } from "./components/Workspace/ResponsePane";

import { useKeyValueList } from "./hooks/useKeyValueList";
import {
  AuthData,
  AuthDataType,
  AuthType,
  BodyType,
  CollectionNode,
  CollectionRequest,
  CookieEntry,
  HistoryItem,
  KeyValue,
  RawType,
  RequestData,
  RequestSettings,
} from "./types";

const emptyRow = (): KeyValue => ({ key: "", value: "", enabled: true });
const cloneKeyValues = (items: KeyValue[]) => items.map((item) => ({ ...item }));
const createCookieId = () => `cookie-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const normalizeDomain = (domain: string) => domain.trim().toLowerCase().replace(/^\./, "");
const isExpiredCookie = (cookie: CookieEntry, now = Date.now()) =>
  cookie.expires !== null && cookie.expires <= now;
const COLLECTION_STORAGE_KEY = "postman-clone.collection";
const isDomainMatch = (host: string, domain: string, hostOnly: boolean) => {
  if (host === domain) {
    return true;
  }
  if (hostOnly) {
    return false;
  }
  return host.endsWith(`.${domain}`);
};
const isPathMatch = (pathname: string, cookiePath: string) => {
  if (!pathname.startsWith(cookiePath)) {
    return false;
  }
  if (cookiePath.endsWith("/")) {
    return true;
  }
  if (pathname.length === cookiePath.length) {
    return true;
  }
  return pathname[cookiePath.length] === "/";
};
const getDefaultCookiePath = (pathname: string) => {
  if (!pathname || !pathname.startsWith("/")) {
    return "/";
  }
  if (pathname === "/") {
    return "/";
  }
  const idx = pathname.lastIndexOf("/");
  if (idx <= 0) {
    return "/";
  }
  return pathname.slice(0, idx + 1);
};
const splitSetCookieHeader = (value: string) =>
  value
    .split(/,(?=[^;]+=)/)
    .map((part) => part.trim())
    .filter(Boolean);

type ParsedCookie = Omit<CookieEntry, "id" | "enabled"> & { expired: boolean };

const parseSetCookie = (cookieLine: string, requestUrl: URL): ParsedCookie | null => {
  const parts = cookieLine.split(";").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) {
    return null;
  }
  const [nameValue, ...attrs] = parts;
  const eqIndex = nameValue.indexOf("=");
  if (eqIndex <= 0) {
    return null;
  }
  const name = nameValue.slice(0, eqIndex).trim();
  const value = nameValue.slice(eqIndex + 1);
  if (!name) {
    return null;
  }

  let domain = normalizeDomain(requestUrl.hostname);
  let hostOnly = true;
  let path = getDefaultCookiePath(requestUrl.pathname);
  let expires: number | null = null;
  let secure = false;
  let httpOnly = false;
  let sameSite: CookieEntry["sameSite"] = null;
  let expired = false;
  let maxAgeOverride: number | null = null;

  for (const attr of attrs) {
    const [rawKey, rawVal] = attr.split("=");
    const key = rawKey.trim().toLowerCase();
    const val = rawVal?.trim();
    if (key === "domain" && val) {
      domain = normalizeDomain(val);
      hostOnly = false;
    } else if (key === "path" && val) {
      path = val.startsWith("/") ? val : `/${val}`;
    } else if (key === "expires" && val) {
      const timestamp = Date.parse(val);
      if (!Number.isNaN(timestamp)) {
        expires = timestamp;
      }
    } else if (key === "max-age" && val) {
      const maxAge = Number.parseInt(val, 10);
      if (Number.isFinite(maxAge)) {
        maxAgeOverride = maxAge;
      }
    } else if (key === "secure") {
      secure = true;
    } else if (key === "httponly") {
      httpOnly = true;
    } else if (key === "samesite" && val) {
      const normalized = val.toLowerCase();
      if (normalized === "lax") {
        sameSite = "Lax";
      } else if (normalized === "strict") {
        sameSite = "Strict";
      } else if (normalized === "none") {
        sameSite = "None";
      }
    }
  }

  if (maxAgeOverride !== null) {
    if (maxAgeOverride <= 0) {
      expired = true;
      expires = Date.now();
    } else {
      expires = Date.now() + maxAgeOverride * 1000;
    }
  }

  if (expires !== null && expires <= Date.now()) {
    expired = true;
  }

  return {
    name,
    value,
    domain,
    path,
    expires,
    secure,
    httpOnly,
    sameSite,
    hostOnly,
    expired,
  };
};

const applySetCookies = (current: CookieEntry[], incoming: ParsedCookie[]) => {
  const now = Date.now();
  let next = current.filter((cookie) => !isExpiredCookie(cookie, now));

  for (const cookie of incoming) {
    const index = next.findIndex(
      (entry) => entry.name === cookie.name && entry.domain === cookie.domain && entry.path === cookie.path
    );
    if (cookie.expired) {
      if (index >= 0) {
        next = next.filter((_, idx) => idx !== index);
      }
      continue;
    }
    if (index >= 0) {
      const existing = next[index];
      next[index] = { ...existing, ...cookie, id: existing.id, enabled: existing.enabled };
    } else {
      next = [...next, { ...cookie, id: createCookieId(), enabled: true }];
    }
  }

  return next;
};

const buildCookieHeader = (requestUrl: URL, jar: CookieEntry[]) => {
  const now = Date.now();
  const host = requestUrl.hostname.toLowerCase();
  const pathname = requestUrl.pathname || "/";
  const isHttps = requestUrl.protocol === "https:";

  const pairs = jar
    .filter((cookie) => cookie.enabled && !isExpiredCookie(cookie, now))
    .filter((cookie) => isDomainMatch(host, cookie.domain, cookie.hostOnly))
    .filter((cookie) => isPathMatch(pathname, cookie.path))
    .filter((cookie) => !cookie.secure || isHttps)
    .filter((cookie) => cookie.name.trim() !== "")
    .map((cookie) => `${cookie.name}=${cookie.value}`);

  return pairs.length > 0 ? pairs.join("; ") : null;
};

const parseParamsFromUrl = (rawUrl: string): KeyValue[] | null => {
  try {
    const parsed = new URL(rawUrl);
    const entries: KeyValue[] = [];
    parsed.searchParams.forEach((value, key) => {
      entries.push({ key, value, enabled: true });
    });
    return entries.length > 0 ? [...entries, emptyRow()] : [emptyRow()];
  } catch {
    return null;
  }
};

const buildUrlWithParams = (rawUrl: string, paramsList: KeyValue[]): string | null => {
  try {
    const parsed = new URL(rawUrl);
    parsed.search = "";
    paramsList
      .filter((item) => item.enabled && item.key.trim())
      .forEach((item) => {
        parsed.searchParams.append(item.key.trim(), item.value);
      });
    return parsed.toString();
  } catch {
    return null;
  }
};

type RequestTab = {
  id: string;
  collectionId: string | null;
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

  const cloneAuthData = (source: AuthData): AuthData => ({
    apiKey: { ...source.apiKey },
    bearer: { ...source.bearer },
    basic: { ...source.basic },
  });

  const buildRequestData = (method: string, url: string): RequestData => ({
    method,
    url,
    params: [emptyRow()],
    headers: cloneKeyValues(defaultHeadersList),
    authType: "none",
    authData: cloneAuthData(defaultAuthData),
    bodyType: "none",
    rawType: "json",
    bodyJson: defaultBodyJson,
    bodyFormData: [emptyRow()],
    bodyUrlEncoded: [emptyRow()],
    settings: { ...defaultSettings },
  });

  const normalizeKeyValueList = (value: unknown, fallback: KeyValue[]) => {
    if (!Array.isArray(value)) {
      return cloneKeyValues(fallback);
    }
    const items = value
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }
        const record = item as Partial<KeyValue>;
        return {
          key: typeof record.key === "string" ? record.key : "",
          value: typeof record.value === "string" ? record.value : "",
          enabled: typeof record.enabled === "boolean" ? record.enabled : true,
        };
      })
      .filter((item): item is KeyValue => Boolean(item));
    return items.length > 0 ? items : cloneKeyValues(fallback);
  };

  const normalizeRequestData = (value: unknown): RequestData => {
    const fallback = buildRequestData("GET", "https://example.com");
    if (!value || typeof value !== "object") {
      return fallback;
    }
    const record = value as Partial<RequestData>;
    const method = typeof record.method === "string" ? record.method : fallback.method;
    const url = typeof record.url === "string" ? record.url : fallback.url;
    return {
      ...fallback,
      method,
      url,
      params: normalizeKeyValueList(record.params, fallback.params),
      headers: normalizeKeyValueList(record.headers, fallback.headers),
      authType: record.authType ?? fallback.authType,
      authData: record.authData ? cloneAuthData(record.authData as AuthData) : cloneAuthData(fallback.authData),
      bodyType: record.bodyType ?? fallback.bodyType,
      rawType: record.rawType ?? fallback.rawType,
      bodyJson: typeof record.bodyJson === "string" ? record.bodyJson : fallback.bodyJson,
      bodyFormData: normalizeKeyValueList(record.bodyFormData, fallback.bodyFormData),
      bodyUrlEncoded: normalizeKeyValueList(record.bodyUrlEncoded, fallback.bodyUrlEncoded),
      settings: record.settings
        ? { ...fallback.settings, ...record.settings }
        : { ...fallback.settings },
    };
  };

  const normalizeCollectionNodes = (value: unknown): CollectionNode[] => {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .map((node) => {
        if (!node || typeof node !== "object") {
          return null;
        }
        const record = node as any;
        if (record.type === "folder") {
          const children = normalizeCollectionNodes(record.children);
          const name = typeof record.name === "string" ? record.name : "Folder";
          const id = typeof record.id === "string" ? record.id : `folder-${Date.now()}-${Math.random().toString(16).slice(2)}`;
          return { id, type: "folder", name, children } as CollectionNode;
        }
        if (record.type === "request") {
          const name = typeof record.name === "string" ? record.name : "Request";
          const id = typeof record.id === "string" ? record.id : `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
          if (record.request) {
            return { id, type: "request", name, request: normalizeRequestData(record.request) } as CollectionNode;
          }
          const method = typeof record.method === "string" ? record.method : "GET";
          const url = typeof record.url === "string" ? record.url : "https://example.com";
          return { id, type: "request", name, request: buildRequestData(method, url) } as CollectionNode;
        }
        return null;
      })
      .filter((node): node is CollectionNode => Boolean(node));
  };

  const createInitialCollectionTree = (): CollectionNode[] => [
    {
      id: "folder-starter",
      type: "folder",
      name: "Starter",
      children: [
        {
          id: "req-catfact",
          type: "request",
          name: "Get Cat Fact",
          request: buildRequestData("GET", "https://catfact.ninja/fact"),
        },
        {
          id: "req-create-user",
          type: "request",
          name: "Create User",
          request: buildRequestData("POST", "https://reqres.in/api/users"),
        },
      ],
    },
    {
      id: "folder-users",
      type: "folder",
      name: "Users",
      children: [
        {
          id: "req-users-list",
          type: "request",
          name: "List Users",
          request: buildRequestData("GET", "https://reqres.in/api/users?page=1"),
        },
        {
          id: "folder-users-profile",
          type: "folder",
          name: "Profiles",
          children: [
            {
              id: "req-user-update",
              type: "request",
              name: "Update User",
              request: buildRequestData("PUT", "https://reqres.in/api/users/2"),
            },
            {
              id: "req-user-patch",
              type: "request",
              name: "Patch User",
              request: buildRequestData("PATCH", "https://reqres.in/api/users/2"),
            },
            {
              id: "req-user-delete",
              type: "request",
              name: "Delete User",
              request: buildRequestData("DELETE", "https://reqres.in/api/users/2"),
            },
          ],
        },
      ],
    },
  ];

  const createDefaultTab = (): RequestTab => ({
    id: `tab-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    collectionId: null,
    method: "GET",
    url: "https://catfact.ninja/fact",
    params: [emptyRow()],
    headers: cloneKeyValues(defaultHeadersList),
    authType: "none",
    authData: cloneAuthData(defaultAuthData),
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

  const [collectionNodes, setCollectionNodes] = useState<CollectionNode[]>(() => {
    if (typeof window === "undefined" || !("localStorage" in window)) {
      return createInitialCollectionTree();
    }
    try {
      const stored = window.localStorage.getItem(COLLECTION_STORAGE_KEY);
      if (!stored) {
        return createInitialCollectionTree();
      }
      const parsed = JSON.parse(stored);
      const normalized = normalizeCollectionNodes(parsed);
      return normalized.length > 0 ? normalized : createInitialCollectionTree();
    } catch {
      return createInitialCollectionTree();
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(collectionNodes));
    } catch {
      // ignore persistence failures
    }
  }, [collectionNodes]);

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
  const [params, , , setParamsList] = useKeyValueList([emptyRow()]);
  const [headers, setHeaders, removeHeader, setHeadersList] = useKeyValueList(defaultHeadersList);
  const [cookieJar, setCookieJar] = useState<CookieEntry[]>([]);
  const skipUrlParamsSyncRef = useRef(false);

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
      base.search = "";
      
      // Add Params
      params
        .filter((item) => item.enabled && item.key.trim())
        .forEach((item) => {
          base.searchParams.append(item.key.trim(), item.value);
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

  const cookieContext = useMemo(() => {
    try {
      const parsed = new URL(requestUrl);
      return {
        url: parsed,
        host: parsed.hostname.toLowerCase(),
        path: getDefaultCookiePath(parsed.pathname),
      };
    } catch {
      return null;
    }
  }, [requestUrl]);

  const applyRequestData = (data: RequestData) => {
    setMethod(data.method);
    setUrl(data.url);
    setSettings({ ...data.settings });
    setAuthType(data.authType);
    setAuthData(cloneAuthData(data.authData));
    setParamsList(cloneKeyValues(data.params));
    setHeadersList(cloneKeyValues(data.headers));
    setBodyType(data.bodyType);
    setRawType(data.rawType);
    setBodyJson(data.bodyJson);
    setBodyFormDataList(cloneKeyValues(data.bodyFormData));
    setBodyUrlEncodedList(cloneKeyValues(data.bodyUrlEncoded));
  };

  const tabToRequestData = (tab: RequestTab): RequestData => ({
    method: tab.method,
    url: tab.url,
    params: cloneKeyValues(tab.params),
    headers: cloneKeyValues(tab.headers),
    authType: tab.authType,
    authData: cloneAuthData(tab.authData),
    bodyType: tab.bodyType,
    rawType: tab.rawType,
    bodyJson: tab.bodyJson,
    bodyFormData: cloneKeyValues(tab.bodyFormData),
    bodyUrlEncoded: cloneKeyValues(tab.bodyUrlEncoded),
    settings: { ...tab.settings },
  });

  const updateCollectionRequest = (requestId: string, data: RequestData) => {
    setCollectionNodes((prev) => {
      const updateNodes = (nodes: CollectionNode[]): CollectionNode[] =>
        nodes.map((node) => {
          if (node.type === "folder") {
            return { ...node, children: updateNodes(node.children) };
          }
          if (node.id === requestId) {
            return { ...node, request: data };
          }
          return node;
        });
      return updateNodes(prev);
    });
  };

  const visibleCookies = useMemo(() => {
    if (!cookieContext) {
      return [];
    }
    const now = Date.now();
    return cookieJar.filter((cookie) => {
      if (isExpiredCookie(cookie, now)) {
        return false;
      }
      return isDomainMatch(cookieContext.host, cookie.domain, cookie.hostOnly);
    });
  }, [cookieJar, cookieContext]);

  const handleCookieAdd = () => {
    if (!cookieContext) {
      return;
    }
    const next: CookieEntry = {
      id: createCookieId(),
      name: "",
      value: "",
      domain: cookieContext.host,
      path: cookieContext.path,
      expires: null,
      secure: false,
      httpOnly: false,
      sameSite: null,
      hostOnly: true,
      enabled: true,
    };
    setCookieJar((prev) => [...prev, next]);
  };

  const handleCookieUpdate = (id: string, patch: Partial<CookieEntry>) => {
    setCookieJar((prev) =>
      prev.flatMap((cookie) => {
        if (cookie.id !== id) {
          return [cookie];
        }
        const next = { ...cookie, ...patch };
        if (patch.domain !== undefined) {
          next.domain = normalizeDomain(patch.domain || "");
        }
        if (patch.path !== undefined) {
          next.path = patch.path ? (patch.path.startsWith("/") ? patch.path : `/${patch.path}`) : "/";
        }
        if (isExpiredCookie(next)) {
          return [];
        }
        return [next];
      })
    );
  };

  const handleCookieRemove = (id: string) => {
    setCookieJar((prev) => prev.filter((cookie) => cookie.id !== id));
  };

  const activeHeaders = useMemo(() => {
    const result: Record<string, string> = {};
    headers
      .filter((item) => item.enabled && item.key.trim())
      .forEach((item) => {
        result[item.key.trim()] = item.value;
      });

    const requestInfo = (() => {
      try {
        return new URL(requestUrl);
      } catch {
        return null;
      }
    })();

    if (requestInfo) {
      const cookieHeader = buildCookieHeader(requestInfo, cookieJar);
      if (cookieHeader) {
        const existingCookieKey = Object.keys(result).find((key) => key.toLowerCase() === "cookie");
        if (existingCookieKey) {
          const existing = result[existingCookieKey].trim();
          result[existingCookieKey] = existing ? `${existing}; ${cookieHeader}` : cookieHeader;
        } else {
          result["Cookie"] = cookieHeader;
        }
      }
    }

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
  }, [headers, bodyType, rawType, activeReqTab, authType, authData, cookieJar, requestUrl]);

  const updateActiveTab = (updater: (tab: RequestTab) => RequestTab) => {
    if (!activeTabId) {
      return;
    }
    let nextTab: RequestTab | null = null;
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) {
          return tab;
        }
        nextTab = updater(tab);
        return nextTab;
      })
    );
    if (nextTab?.collectionId) {
      updateCollectionRequest(nextTab.collectionId, tabToRequestData(nextTab));
    }
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
    if (skipUrlParamsSyncRef.current) {
      skipUrlParamsSyncRef.current = false;
      return;
    }
    const nextParams = parseParamsFromUrl(next);
    if (nextParams) {
      setParamsList(nextParams);
      updateActiveTab((tab) => ({ ...tab, params: nextParams }));
    }
  };

  const syncUrlFromParams = (nextParams: KeyValue[]) => {
    const nextUrl = buildUrlWithParams(url, nextParams);
    if (!nextUrl || nextUrl === url) {
      return;
    }
    skipUrlParamsSyncRef.current = true;
    setUrl(nextUrl);
    updateActiveTab((tab) => ({ ...tab, url: nextUrl }));
  };

  const handleSettingsChange = (field: keyof RequestSettings, val: any) => {
    setSettings((prev) => ({ ...prev, [field]: val }));
    updateActiveTab((tab) => ({ ...tab, settings: { ...tab.settings, [field]: val } }));
  };

  const handleAuthTypeChange = (next: AuthType) => {
    setAuthType(next);
    updateActiveTab((tab) => ({ ...tab, authType: next }));
  };

  const handleAuthDataChange = (type: AuthDataType, field: string, val: string) => {
    const key = type === "api-key" ? "apiKey" : type;
    setAuthData((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: val,
      },
    }));
    updateActiveTab((tab) => ({
      ...tab,
      authData: {
        ...tab.authData,
        [key]: {
          ...tab.authData[key],
          [field]: val,
        },
      },
    }));
  };

  const handleParamsChange = (idx: number, field: keyof KeyValue, val: string | boolean) => {
    const nextParams = updateKeyValueList(params, idx, field, val);
    setParamsList(nextParams);
    updateActiveTab((tab) => ({ ...tab, params: nextParams }));
    syncUrlFromParams(nextParams);
  };

  const handleParamsRemove = (idx: number) => {
    const nextParams = removeKeyValueItem(params, idx);
    setParamsList(nextParams);
    updateActiveTab((tab) => ({ ...tab, params: nextParams }));
    syncUrlFromParams(nextParams);
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
    if (tabs.length === 0) {
      if (activeTabId !== null) {
        setActiveTabId(null);
      }
      return;
    }

    if (!activeTabId || !tabs.some((tab) => tab.id === activeTabId)) {
      const nextActive = tabs[0];
      setActiveTabId(nextActive.id);
      loadTab(nextActive);
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
      if (nextTabs.length === 0) {
        const next = createDefaultTab();
        setActiveTabId(next.id);
        loadTab(next);
        return [next];
      }
      if (tabId === activeTabId) {
        const nextActive = nextTabs[Math.max(0, idx - 1)] ?? nextTabs[0];
        setActiveTabId(nextActive.id);
        loadTab(nextActive);
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

      const setCookieValues = headersList
        .filter(([key]) => key.toLowerCase() === "set-cookie")
        .map(([, value]) => value);
      const directSetCookie = response.headers.get("set-cookie");
      if (directSetCookie && !setCookieValues.includes(directSetCookie)) {
        setCookieValues.push(directSetCookie);
      }
      if (setCookieValues.length > 0) {
        const requestInfo = (() => {
          try {
            return new URL(requestUrl);
          } catch {
            return null;
          }
        })();
        if (requestInfo) {
          const parsedCookies = setCookieValues
            .flatMap((value) => splitSetCookieHeader(value))
            .map((line) => parseSetCookie(line, requestInfo))
            .filter((cookie): cookie is ParsedCookie => Boolean(cookie));
          if (parsedCookies.length > 0) {
            setCookieJar((prev) => applySetCookies(prev, parsedCookies));
          }
        }
      }

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

  const handleSelectRequest = (request: CollectionRequest) => {
    const existing = tabs.find((tab) => tab.collectionId === request.id);
    if (existing) {
      setActiveTabId(existing.id);
      loadTab(existing);
      return;
    }
    const nextTab: RequestTab = {
      id: `tab-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      collectionId: request.id,
      method: request.request.method,
      url: request.request.url,
      params: cloneKeyValues(request.request.params),
      headers: cloneKeyValues(request.request.headers),
      authType: request.request.authType,
      authData: cloneAuthData(request.request.authData),
      bodyType: request.request.bodyType,
      rawType: request.request.rawType,
      bodyJson: request.request.bodyJson,
      bodyFormData: cloneKeyValues(request.request.bodyFormData),
      bodyUrlEncoded: cloneKeyValues(request.request.bodyUrlEncoded),
      settings: { ...request.request.settings },
      responseCode: null,
      responseStatus: "--",
      responseTime: 0,
      responseSize: 0,
      responseRaw: "",
      responsePretty: "",
      responseHeaders: [],
      errorMessage: null,
    };
    setTabs((prev) => [...prev, nextTab]);
    setActiveTabId(nextTab.id);
    loadTab(nextTab);
  };

  const handleSelectHistory = (m: string, u: string) => {
    if (!activeTabId) {
      const parsedParams = parseParamsFromUrl(u);
      const data = buildRequestData(m, u);
      const next: RequestTab = {
        ...createDefaultTab(),
        method: data.method,
        url: data.url,
        params: parsedParams ? cloneKeyValues(parsedParams) : cloneKeyValues(data.params),
      };
      setTabs((prev) => [...prev, next]);
      setActiveTabId(next.id);
      loadTab(next);
      return;
    }
    handleMethodChange(m);
    handleUrlChange(u);
  };

  const hasActiveTab = tabs.length > 0 && activeTabId !== null && tabs.some((tab) => tab.id === activeTabId);

  return (
    <div className="app">
      <Sidebar 
        appName={appName}
        appVersion={appVersion}
        history={history}
        currentUrl={url}
        currentMethod={method}
        collectionNodes={collectionNodes}
        setCollectionNodes={setCollectionNodes}
        buildRequestData={buildRequestData}
        onSelectRequest={handleSelectRequest}
        onSelectHistory={handleSelectHistory}
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

                    cookieContext={cookieContext ? { host: cookieContext.host, path: cookieContext.path } : null}
                    cookies={visibleCookies}
                    onCookieAdd={handleCookieAdd}
                    onCookieUpdate={handleCookieUpdate}
                    onCookieRemove={handleCookieRemove}
                    
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
