export type KeyValue = {
  key: string;
  value: string;
  enabled: boolean;
};

export type BodyType = "none" | "form-data" | "x-www-form-urlencoded" | "raw" | "binary";

export type RawType = "text" | "javascript" | "json" | "html" | "xml";

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

export type HistoryItem = {
  id: string;
  method: string;
  url: string;
  status: string;
  timeMs: number;
};

export type CollectionRequest = {
  id: string;
  type: "request";
  name: string;
  method: string;
  url: string;
};

export type CollectionFolder = {
  id: string;
  type: "folder";
  name: string;
  children: CollectionNode[];
};

export type CollectionNode = CollectionFolder | CollectionRequest;
