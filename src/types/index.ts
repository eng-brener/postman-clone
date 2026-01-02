export type KeyValue = {
  key: string;
  value: string;
  enabled: boolean;
};

export type Environment = {
  id: string;
  name: string;
  variables: KeyValue[];
};

export type BodyType = "none" | "form-data" | "x-www-form-urlencoded" | "raw" | "binary";

export type RawType = "text" | "javascript" | "json" | "html" | "xml";

export type RequestType = "http" | "grpc" | "websocket" | "socketio" | "graphql" | "mqtt" | "ia" | "mcp";

export type RequestSettings = {
  httpVersion: "HTTP/1.1" | "HTTP/2";
  verifySsl: boolean;
  followRedirects: boolean;
};

export type AuthType = "none" | "api-key" | "bearer" | "basic";

export type AuthData = {
  apiKey: { key: string; value: string; addTo: "header" | "query" };
  bearer: { token: string };
  basic: { username: string; password: string };
};

export type AuthDataType = Exclude<AuthType, "none">;

export type CookieSameSite = "Lax" | "Strict" | "None";

export type CookieEntry = {
  id: string;
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number | null;
  secure: boolean;
  httpOnly: boolean;
  sameSite: CookieSameSite | null;
  hostOnly: boolean;
  enabled: boolean;
};

export type HistoryItem = {
  id: string;
  method: string;
  url: string;
  status: string;
  timeMs: number;
  pinned?: boolean;
};

export type RequestData = {
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
};

export type RequestTab = {
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

export type CollectionRequest = {
  id: string;
  type: "request";
  name: string;
  request: RequestData;
};

export type CollectionFolder = {
  id: string;
  type: "folder";
  name: string;
  children: CollectionNode[];
};

export type CollectionNode = CollectionFolder | CollectionRequest;

export type WorkspaceSettings = {
  description?: string;
};

export type Workspace = {
  id: string;
  name: string;
  collectionNodes: CollectionNode[];
  environments: Environment[];
  activeEnvironmentId: string | null;
  tabs: RequestTab[];
  activeTabId: string | null;
  history: HistoryItem[];
  settings: WorkspaceSettings;
};
