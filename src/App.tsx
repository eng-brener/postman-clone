import { useEffect, useMemo, useRef, useState } from "react";
import { getName, getVersion } from "@tauri-apps/api/app";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import "./styles/theme.css";
import "./App.css";

import { Sidebar } from "./components/Sidebar/Sidebar";
import { GrpcWorkspace } from "./components/Workspace/GrpcWorkspace";
import { HttpWorkspace } from "./components/Workspace/HttpWorkspace";

import { useKeyValueList } from "./hooks/useKeyValueList";
import {
  AuthData,
  AuthDataType,
  AuthType,
  BodyType,
  CollectionNode,
  CollectionRequest,
  CookieEntry,
  Environment,
  HistoryItem,
  KeyValue,
  RawType,
  RequestData,
  RequestSettings,
  RequestType,
} from "./types";
import { REQUEST_TYPE_OPTIONS, getDefaultMethodForType, getRequestTypeLabel } from "./lib/request";
import { THEME_STORAGE_KEY, type ThemeOption } from "./lib/theme";

const emptyRow = (): KeyValue => ({ key: "", value: "", enabled: true });
const cloneKeyValues = (items: KeyValue[]) => items.map((item) => ({ ...item }));
const ensureTrailingEmptyRow = (items: KeyValue[]) => {
  if (items.length === 0) {
    return [emptyRow()];
  }
  const last = items[items.length - 1];
  if (last.key.trim() === "" && last.value.trim() === "") {
    return items;
  }
  return [...items, emptyRow()];
};
const addEmptyRow = (items: KeyValue[]) => {
  if (items.length === 0) {
    return [emptyRow()];
  }
  const last = items[items.length - 1];
  if (last.key.trim() === "" && last.value.trim() === "") {
    return items;
  }
  return [...items, emptyRow()];
};
const HISTORY_LIMIT = 10;
const REQUEST_TYPE_VALUES = REQUEST_TYPE_OPTIONS.map((option) => option.value);
const base64EncodeUtf8 = (value: string) => {
  return btoa(unescape(encodeURIComponent(value)));
};
const createCookieId = () => `cookie-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const normalizeDomain = (domain: string) => domain.trim().toLowerCase().replace(/^\./, "");
const isExpiredCookie = (cookie: CookieEntry, now = Date.now()) =>
  cookie.expires !== null && cookie.expires <= now;
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
const COLLECTION_STORAGE_KEY = "postman-clone.collection";
const ENV_STORAGE_KEY = "postman-clone.environments";
const ACTIVE_ENV_STORAGE_KEY = "postman-clone.environments.active";

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

const resolveTemplate = (value: string, variables: Record<string, string>) =>
  value.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(variables, key)) {
      return variables[key];
    }
    return match;
  });

const normalizeEnvironmentList = (value: unknown, fallback: Environment[]): Environment[] => {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const normalized = value
    .map((env) => {
      if (!env || typeof env !== "object") {
        return null;
      }
      const record = env as Partial<Environment>;
      const id =
        typeof record.id === "string" ? record.id : `env-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const name = typeof record.name === "string" ? record.name : "Environment";
      const variables = Array.isArray(record.variables)
        ? record.variables
            .map((item) => {
              if (!item || typeof item !== "object") {
                return null;
              }
              const kv = item as Partial<KeyValue>;
              return {
                key: typeof kv.key === "string" ? kv.key : "",
                value: typeof kv.value === "string" ? kv.value : "",
                enabled: typeof kv.enabled === "boolean" ? kv.enabled : true,
              } as KeyValue;
            })
            .filter((item): item is KeyValue => Boolean(item))
        : [emptyRow()];
      return { id, name, variables: variables.length > 0 ? variables : [emptyRow()] } as Environment;
    })
    .filter((env): env is Environment => Boolean(env));
  return normalized.length > 0 ? normalized : fallback;
};

type RequestTab = {
  id: string;
  collectionId: string | null;
  requestType: RequestType;
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
  responseLanguage: string;
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
    emptyRow(),
  ];

  const cloneAuthData = (source: AuthData): AuthData => ({
    apiKey: { ...source.apiKey },
    bearer: { ...source.bearer },
    basic: { ...source.basic },
  });

  const buildRequestData = (method: string, url: string, requestType: RequestType = "http"): RequestData => ({
    requestType,
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

  const createEnvironment = (name = "New Environment"): Environment => ({
    id: `env-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    variables: [emptyRow()],
  });

  const createDefaultEnvironments = (): Environment[] => [
    { id: "env-default", name: "Base", variables: [emptyRow()] },
  ];

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
    const normalized = items.length > 0 ? items : cloneKeyValues(fallback);
    return ensureTrailingEmptyRow(normalized);
  };

  const normalizeRequestData = (value: unknown): RequestData => {
    const rawRequestType = (value as Partial<RequestData> | null)?.requestType;
    const requestType: RequestType = REQUEST_TYPE_VALUES.includes(rawRequestType as RequestType)
      ? (rawRequestType as RequestType)
      : "http";
    const fallback = buildRequestData(getDefaultMethodForType(requestType), "https://example.com", requestType);
    if (!value || typeof value !== "object") {
      return fallback;
    }
    const record = value as Partial<RequestData>;
    const method = typeof record.method === "string" ? record.method : fallback.method;
    const url = typeof record.url === "string" ? record.url : fallback.url;
    return {
      ...fallback,
      requestType,
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
    requestType: "http",
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
    responseLanguage: "plaintext",
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

  const [environments, setEnvironments] = useState<Environment[]>(() => {
    if (typeof window === "undefined" || !("localStorage" in window)) {
      return createDefaultEnvironments();
    }
    try {
      const stored = window.localStorage.getItem(ENV_STORAGE_KEY);
      if (!stored) {
        return createDefaultEnvironments();
      }
      const parsed = JSON.parse(stored);
      return normalizeEnvironmentList(parsed, createDefaultEnvironments());
    } catch {
      return createDefaultEnvironments();
    }
  });

  const [activeEnvironmentId, setActiveEnvironmentId] = useState<string | null>(() => {
    if (typeof window === "undefined" || !("localStorage" in window)) {
      return "env-default";
    }
    try {
      const stored = window.localStorage.getItem(ACTIVE_ENV_STORAGE_KEY);
      return stored || "env-default";
    } catch {
      return "env-default";
    }
  });

  const [theme, setTheme] = useState<ThemeOption>(() => {
    if (typeof window === "undefined" || !("localStorage" in window)) {
      return "dark";
    }
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeOption | null;
    return stored === "light" || stored === "dracula" ? stored : "dark";
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(ENV_STORAGE_KEY, JSON.stringify(environments));
    } catch {
      // ignore persistence failures
    }
  }, [environments]);

  useEffect(() => {
    try {
      if (activeEnvironmentId) {
        window.localStorage.setItem(ACTIVE_ENV_STORAGE_KEY, activeEnvironmentId);
      } else {
        window.localStorage.removeItem(ACTIVE_ENV_STORAGE_KEY);
      }
    } catch {
      // ignore persistence failures
    }
  }, [activeEnvironmentId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore persistence failures
    }
  }, [theme]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme]);

  useEffect(() => {
    if (activeEnvironmentId && !environments.some((env) => env.id === activeEnvironmentId)) {
      setActiveEnvironmentId(environments[0]?.id ?? null);
    }
  }, [activeEnvironmentId, environments]);

  const [tabs, setTabs] = useState<RequestTab[]>([createDefaultTab()]);
  const [activeTabId, setActiveTabId] = useState<string | null>(tabs[0].id);

  // Request State
  const [requestType, setRequestType] = useState<RequestType>(tabs[0].requestType);
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
  const [responseLanguage, setResponseLanguage] = useState(tabs[0].responseLanguage);
  
  // History
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    getName().then((n) => setAppName(n || "Postman Clone")).catch(() => {});
    getVersion().then(setAppVersion).catch(() => {});
  }, []);

  const activeEnvironment = useMemo(
    () => environments.find((env) => env.id === activeEnvironmentId) ?? null,
    [environments, activeEnvironmentId]
  );

  const environmentValues = useMemo(() => {
    if (!activeEnvironment) {
      return {};
    }
    return activeEnvironment.variables.reduce<Record<string, string>>((acc, item) => {
      const key = item.key.trim();
      if (!item.enabled || !key) {
        return acc;
      }
      acc[key] = item.value;
      return acc;
    }, {});
  }, [activeEnvironment]);

  // Derived State
  const resolvedUrl = useMemo(() => resolveTemplate(url, environmentValues), [url, environmentValues]);
  const trimmedResolvedUrl = useMemo(() => resolvedUrl.trim(), [resolvedUrl]);
  const urlValidation = useMemo(() => {
    try {
      new URL(trimmedResolvedUrl);
      return { valid: true };
    } catch {
      return { valid: false };
    }
  }, [trimmedResolvedUrl]);
  const requestUrl = useMemo(() => {
    try {
      const base = new URL(trimmedResolvedUrl);
      base.search = "";
      
      // Add Params
      params
        .filter((item) => item.enabled && item.key.trim())
        .forEach((item) => {
          const key = resolveTemplate(item.key.trim(), environmentValues);
          const value = resolveTemplate(item.value, environmentValues);
          base.searchParams.append(key, value);
        });

      // Add Auth (Query Params)
      if (authType === "api-key" && authData.apiKey.addTo === "query" && authData.apiKey.key) {
        const key = resolveTemplate(authData.apiKey.key, environmentValues);
        const value = resolveTemplate(authData.apiKey.value, environmentValues);
        if (key) {
          base.searchParams.set(key, value);
        }
      }
      
      return base.toString();
    } catch {
      const resolvedFallback = trimmedResolvedUrl;
      return resolvedFallback || url;
    }
  }, [trimmedResolvedUrl, url, params, authType, authData, environmentValues]);

  const urlPreview = urlValidation.valid ? requestUrl : (trimmedResolvedUrl || url);

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
    setRequestType(data.requestType);
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
    requestType: tab.requestType,
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
        const key = resolveTemplate(item.key.trim(), environmentValues);
        if (key) {
          result[key] = resolveTemplate(item.value, environmentValues);
        }
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
      const key = resolveTemplate(authData.apiKey.key, environmentValues);
      if (key) {
        result[key] = resolveTemplate(authData.apiKey.value, environmentValues);
      }
    } else if (authType === "bearer" && authData.bearer.token) {
      const token = resolveTemplate(authData.bearer.token, environmentValues);
      result["Authorization"] = `Bearer ${token}`;
    } else if (authType === "basic" && authData.basic.username) {
      const username = resolveTemplate(authData.basic.username, environmentValues);
      const password = resolveTemplate(authData.basic.password, environmentValues);
      const credentials = base64EncodeUtf8(`${username}:${password}`);
      result["Authorization"] = `Basic ${credentials}`;
    }

    const bodyAllowed = !["GET", "HEAD"].includes(method);

    if (bodyAllowed && bodyType === "form-data") {
      Object.keys(result).forEach((key) => {
        if (key.toLowerCase() === "content-type") {
          delete result[key];
        }
      });
    }

    // Add implicit content-type based on body type if not present
    if (bodyAllowed && bodyType !== "none" && !Object.keys(result).some(k => k.toLowerCase() === 'content-type')) {
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
  }, [headers, bodyType, rawType, authType, authData, cookieJar, requestUrl, environmentValues, method]);

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

  const handleEnvironmentChange = (id: string | null) => {
    setActiveEnvironmentId(id);
  };

  const handleEnvironmentAdd = () => {
    const next = createEnvironment();
    setEnvironments((prev) => [...prev, next]);
    setActiveEnvironmentId(next.id);
  };

  const handleEnvironmentRename = (id: string, name: string) => {
    setEnvironments((prev) => prev.map((env) => (env.id === id ? { ...env, name } : env)));
  };

  const handleEnvironmentDelete = (id: string) => {
    setEnvironments((prev) => {
      const next = prev.filter((env) => env.id !== id);
      setActiveEnvironmentId((current) => {
        if (current !== id) {
          return current;
        }
        return next[0]?.id ?? null;
      });
      return next;
    });
  };

  const handleEnvironmentVarChange = (
    id: string,
    idx: number,
    field: keyof KeyValue,
    val: string | boolean
  ) => {
    setEnvironments((prev) =>
      prev.map((env) =>
        env.id === id
          ? { ...env, variables: updateKeyValueList(env.variables, idx, field, val) }
          : env
      )
    );
  };

  const handleEnvironmentVarRemove = (id: string, idx: number) => {
    setEnvironments((prev) =>
      prev.map((env) =>
        env.id === id ? { ...env, variables: removeKeyValueItem(env.variables, idx) } : env
      )
    );
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

  const handleParamsAdd = () => {
    setParamsList((prev) => addEmptyRow(prev));
    updateActiveTab((tab) => ({ ...tab, params: addEmptyRow(tab.params) }));
  };

  const handleParamsReplace = (nextItems: KeyValue[]) => {
    const nextParams = addEmptyRow(nextItems);
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

  const handleHeadersAdd = () => {
    setHeadersList((prev) => addEmptyRow(prev));
    updateActiveTab((tab) => ({ ...tab, headers: addEmptyRow(tab.headers) }));
  };

  const handleHeadersReplace = (nextItems: KeyValue[]) => {
    const nextHeaders = addEmptyRow(nextItems);
    setHeadersList(nextHeaders);
    updateActiveTab((tab) => ({ ...tab, headers: nextHeaders }));
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

  const handleBodyFormDataReplace = (nextItems: KeyValue[]) => {
    const nextBody = addEmptyRow(nextItems);
    setBodyFormDataList(nextBody);
    updateActiveTab((tab) => ({ ...tab, bodyFormData: nextBody }));
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

  const handleBodyUrlEncodedReplace = (nextItems: KeyValue[]) => {
    const nextBody = addEmptyRow(nextItems);
    setBodyUrlEncodedList(nextBody);
    updateActiveTab((tab) => ({ ...tab, bodyUrlEncoded: nextBody }));
  };

  const loadTab = (tab: RequestTab) => {
    setRequestType(tab.requestType);
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
    setResponseLanguage(tab.responseLanguage);
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

  const getResponseLanguage = (contentType: string | null, rawText: string) => {
    const normalized = contentType ? contentType.split(";")[0].trim().toLowerCase() : "";
    if (normalized.includes("json")) {
      return "json";
    }
    if (normalized.includes("xml")) {
      return "xml";
    }
    if (normalized.includes("html")) {
      return "html";
    }
    if (normalized.includes("javascript") || normalized.includes("ecmascript")) {
      return "javascript";
    }
    if (normalized.startsWith("text/")) {
      return "plaintext";
    }
    try {
      JSON.parse(rawText);
      return "json";
    } catch {
      return "plaintext";
    }
  };

  const sendRequest = async () => {
    setIsSending(true);
    setErrorMessage(null);
    setResponseCode(null);
    const start = performance.now();

    try {
      const bodyAllowed = !["GET", "HEAD"].includes(method);
      let payload: BodyInit | undefined = undefined;

      if (bodyAllowed && bodyType !== "none") {
        if (bodyType === "raw") {
          payload = resolveTemplate(bodyJson, environmentValues);
        } else if (bodyType === "form-data") {
           const formData = new FormData();
           bodyFormData.forEach(item => {
             if (item.enabled && item.key.trim()) {
               const key = resolveTemplate(item.key.trim(), environmentValues);
               const value = resolveTemplate(item.value, environmentValues);
               if (key) {
                 formData.append(key, value);
               }
             }
           });
           payload = formData;
        } else if (bodyType === "x-www-form-urlencoded") {
           const urlEncoded = new URLSearchParams();
           bodyUrlEncoded.forEach(item => {
             if (item.enabled && item.key.trim()) {
               const key = resolveTemplate(item.key.trim(), environmentValues);
               const value = resolveTemplate(item.value, environmentValues);
               if (key) {
                 urlEncoded.append(key, value);
               }
             }
           });
           payload = urlEncoded.toString();
        }
      }
      
      const response = await tauriFetch(requestUrl, {
        method,
        headers: activeHeaders,
        body: payload,
        redirect: settings.followRedirects ? "follow" : "manual",
        maxRedirections: settings.followRedirects ? undefined : 0,
        danger: settings.verifySsl ? undefined : { acceptInvalidCerts: true, acceptInvalidHostnames: true },
      });

      const rawText = await response.text();
      const responseBytes = new Blob([rawText]).size;
      const timeMs = Math.round(performance.now() - start);
      
      setResponseTime(timeMs);
      setResponseCode(response.status);
      setResponseStatus(`${response.status} ${response.statusText || ""}`.trim());
      setResponseSize(responseBytes);
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

      const contentType = response.headers.get("content-type");
      const responseLang = getResponseLanguage(contentType, rawText);
      let formatted = rawText;
      if (responseLang === "json") {
        try {
          const parsed = JSON.parse(rawText);
          formatted = JSON.stringify(parsed, null, 2);
        } catch {
          // Not valid JSON
        }
      }
      setResponsePretty(formatted);
      setResponseLanguage(responseLang);

      updateActiveTab((tab) => ({
        ...tab,
        responseCode: response.status,
        responseStatus: `${response.status} ${response.statusText || ""}`.trim(),
        responseTime: timeMs,
        responseSize: responseBytes,
        responseRaw: rawText,
        responsePretty: formatted,
        responseHeaders: headersList,
        errorMessage: null,
        responseLanguage: responseLang,
      }));

      // Add to history
      const historyItem: HistoryItem = {
        id: Date.now().toString(),
        method,
        url: requestUrl,
        status: response.status.toString(),
        timeMs,
        pinned: false,
      };
      setHistory((prev) => {
        const pinned = prev.filter((item) => item.pinned);
        const unpinned = prev.filter((item) => !item.pinned);
        const nextUnpinned = [historyItem, ...unpinned].slice(0, HISTORY_LIMIT);
        return [...pinned, ...nextUnpinned];
      });

    } catch (error: any) {
      const message = error.toString();
      setErrorMessage(message);
      setResponseRaw(message);
      setResponseLanguage("plaintext");
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
        responseLanguage: "plaintext",
      }));
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const isEnter = event.key === "Enter";
      if (!isEnter) {
        return;
      }
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        if (!isSending) {
          sendRequest();
        }
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [isSending, sendRequest]);

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
      requestType: request.request.requestType,
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
      responseLanguage: "plaintext",
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
        requestType: data.requestType,
        method: data.method,
        url: data.url,
        params: parsedParams ? cloneKeyValues(parsedParams) : cloneKeyValues(data.params),
      };
      setTabs((prev) => [...prev, next]);
      setActiveTabId(next.id);
      loadTab(next);
      return;
    }
    if (requestType !== "http") {
      setRequestType("http");
      updateActiveTab((tab) => ({ ...tab, requestType: "http" }));
    }
    handleMethodChange(m);
    handleUrlChange(u);
  };

  const handleHistoryPinToggle = (id: string) => {
    setHistory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, pinned: !item.pinned } : item))
    );
  };

  const handleHistoryRerun = (item: HistoryItem) => {
    handleSelectHistory(item.method, item.url);
    setTimeout(() => {
      if (!isSending) {
        sendRequest();
      }
    }, 0);
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
        onHistoryPinToggle={handleHistoryPinToggle}
        onHistoryRerun={handleHistoryRerun}
        environments={environments}
        activeEnvironmentId={activeEnvironmentId}
        onEnvironmentChange={handleEnvironmentChange}
        onEnvironmentAdd={handleEnvironmentAdd}
        onEnvironmentRename={handleEnvironmentRename}
        onEnvironmentDelete={handleEnvironmentDelete}
        onEnvironmentVarChange={handleEnvironmentVarChange}
        onEnvironmentVarRemove={handleEnvironmentVarRemove}
        theme={theme}
        onThemeChange={setTheme}
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
          requestType === "http" ? (
            <HttpWorkspace
              method={method}
              url={url}
              isSending={isSending}
              onMethodChange={handleMethodChange}
              onUrlChange={handleUrlChange}
              onSend={sendRequest}
              environmentValues={environmentValues}
              urlPreview={urlPreview}
              urlIsValid={urlValidation.valid}
              theme={theme}
              activeRequestTab={activeReqTab}
              onRequestTabChange={setActiveReqTab}
              params={params}
              onParamsChange={handleParamsChange}
              onParamsRemove={handleParamsRemove}
              onParamsAdd={handleParamsAdd}
              onParamsReplace={handleParamsReplace}
              headers={headers}
              onHeadersChange={handleHeadersChange}
              onHeadersRemove={handleHeadersRemove}
              onHeadersAdd={handleHeadersAdd}
              onHeadersReplace={handleHeadersReplace}
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
              onBodyFormDataReplace={handleBodyFormDataReplace}
              bodyUrlEncoded={bodyUrlEncoded}
              onBodyUrlEncodedChange={handleBodyUrlEncodedChange}
              onBodyUrlEncodedRemove={handleBodyUrlEncodedRemove}
              onBodyUrlEncodedReplace={handleBodyUrlEncodedReplace}
              settings={settings}
              onSettingsChange={handleSettingsChange}
              activeResponseTab={activeResTab}
              onResponseTabChange={setActiveResTab}
              responseCode={responseCode}
              responseStatus={responseStatus}
              responseTime={responseTime}
              responseSize={responseSize}
              responseRaw={responseRaw}
              responsePretty={responsePretty}
              responseHeaders={responseHeaders}
              errorMessage={errorMessage}
              responseLanguage={responseLanguage}
              followRedirects={settings.followRedirects}
              onFollowRedirectsChange={(value) => handleSettingsChange("followRedirects", value)}
            />
          ) : (
            <GrpcWorkspace requestTypeLabel={getRequestTypeLabel(requestType)} />
          )
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
