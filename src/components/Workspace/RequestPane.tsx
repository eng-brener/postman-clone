import { useEffect } from "react";
import { useMonaco } from "@monaco-editor/react";
import { AuthData, AuthDataType, AuthType, BodyType, CookieEntry, KeyValue, RawType, RequestSettings } from "../../types";
import { RequestAuthTab } from "./RequestTabs/RequestAuthTab";
import { RequestBodyTab } from "./RequestTabs/RequestBodyTab";
import { RequestCookiesTab } from "./RequestTabs/RequestCookiesTab";
import { RequestHeadersTab } from "./RequestTabs/RequestHeadersTab";
import { RequestParamsTab } from "./RequestTabs/RequestParamsTab";
import { RequestSettingsTab } from "./RequestTabs/RequestSettingsTab";

interface RequestPaneProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  environmentValues: Record<string, string>;
  theme: "dark" | "light" | "dracula";
  
  params: KeyValue[];
  onParamsChange: (idx: number, field: keyof KeyValue, val: string | boolean) => void;
  onParamsRemove: (idx: number) => void;
  onParamsAdd: () => void;
  onParamsReplace: (items: KeyValue[]) => void;

  headers: KeyValue[];
  onHeadersChange: (idx: number, field: keyof KeyValue, val: string | boolean) => void;
  onHeadersRemove: (idx: number) => void;
  onHeadersAdd: () => void;
  onHeadersReplace: (items: KeyValue[]) => void;

  cookieContext: { host: string; path: string } | null;
  cookies: CookieEntry[];
  onCookieAdd: () => void;
  onCookieUpdate: (id: string, patch: Partial<CookieEntry>) => void;
  onCookieRemove: (id: string) => void;

  // Auth Props
  authType: AuthType;
  onAuthTypeChange: (type: AuthType) => void;
  authData: AuthData;
  onAuthDataChange: (type: AuthDataType, field: string, val: string) => void;

  bodyType: BodyType;
  onBodyTypeChange: (type: BodyType) => void;
  
  rawType: RawType;
  onRawTypeChange: (type: RawType) => void;

  bodyJson: string;
  onBodyJsonChange: (val: string) => void;

  bodyFormData: KeyValue[];
  onBodyFormDataChange: (idx: number, field: keyof KeyValue, val: string | boolean) => void;
  onBodyFormDataRemove: (idx: number) => void;
  onBodyFormDataReplace: (items: KeyValue[]) => void;

  bodyUrlEncoded: KeyValue[];
  onBodyUrlEncodedChange: (idx: number, field: keyof KeyValue, val: string | boolean) => void;
  onBodyUrlEncodedRemove: (idx: number) => void;
  onBodyUrlEncodedReplace: (items: KeyValue[]) => void;

  settings: RequestSettings;
  onSettingsChange: (field: keyof RequestSettings, val: any) => void;
}

const TabButton = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
  <button className={`tab ${active ? "active" : ""}`} onClick={onClick}>
    {label}
  </button>
);

export const RequestPane = (props: RequestPaneProps) => {
  const { 
      activeTab, onTabChange, 
      environmentValues,
      theme,
      params, onParamsChange, onParamsRemove, onParamsAdd, onParamsReplace,
      headers, onHeadersChange, onHeadersRemove, onHeadersAdd, onHeadersReplace,
      cookieContext, cookies, onCookieAdd, onCookieUpdate, onCookieRemove,
      authType, onAuthTypeChange, authData, onAuthDataChange,
      bodyType, onBodyTypeChange,
      rawType, onRawTypeChange,
      bodyJson, onBodyJsonChange,
      bodyFormData, onBodyFormDataChange, onBodyFormDataRemove, onBodyFormDataReplace,
      bodyUrlEncoded, onBodyUrlEncodedChange, onBodyUrlEncodedRemove, onBodyUrlEncodedReplace,
      settings, onSettingsChange
  } = props;

  const getTemplateTooltip = (value: string) => {
    if (!value) {
      return undefined;
    }
    const matches = [...value.matchAll(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g)];
    if (matches.length === 0) {
      return undefined;
    }
    const keys = Array.from(new Set(matches.map((match) => match[1]))).filter(
      (key) => Object.prototype.hasOwnProperty.call(environmentValues, key)
    );
    if (keys.length === 0) {
      return undefined;
    }
    return keys.map((key) => `{{${key}}} = ${environmentValues[key]}`).join("\n");
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) {
      return "";
    }
    const date = new Date(timestamp);
    const pad = (val: number) => String(val).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;
  };

  const parseDate = (value: string) => {
    if (!value) {
      return null;
    }
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  };

  const monaco = useMonaco();
  const editorTheme = theme === "light" ? "vs" : theme === "dracula" ? "dracula" : "vs-dark";

  useEffect(() => {
    if (!monaco || theme !== "dracula") {
      return;
    }
    monaco.editor.defineTheme("dracula", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "7c7f9b" },
        { token: "string", foreground: "f1fa8c" },
        { token: "number", foreground: "bd93f9" },
        { token: "keyword", foreground: "ff79c6" },
        { token: "type.identifier", foreground: "8be9fd" },
      ],
      colors: {
        "editor.background": "#1b1d2a",
        "editorLineNumber.foreground": "#5b5f7a",
        "editorLineNumber.activeForeground": "#f8f8f2",
      },
    });
  }, [monaco, theme]);

  return (
    <div className="request-pane">
      <div className="pane-header">
        <div className="tabs">
          {["Params", "Authorization", "Headers", "Cookies", "Body", "Settings"].map(tab => (
            <TabButton
              key={tab}
              label={tab}
              active={activeTab === tab}
              onClick={() => onTabChange(tab)}
            />
          ))}
        </div>
      </div>
      <div className="pane-content">
        {activeTab === "Params" && (
          <RequestParamsTab
            params={params}
            environmentValues={environmentValues}
            onParamsAdd={onParamsAdd}
            onParamsChange={onParamsChange}
            onParamsRemove={onParamsRemove}
            onParamsReplace={onParamsReplace}
          />
        )}

        {activeTab === "Authorization" && (
          <RequestAuthTab
            authType={authType}
            authData={authData}
            environmentValues={environmentValues}
            onAuthTypeChange={onAuthTypeChange}
            onAuthDataChange={onAuthDataChange}
            getTemplateTooltip={getTemplateTooltip}
          />
        )}

        {activeTab === "Headers" && (
          <RequestHeadersTab
            headers={headers}
            environmentValues={environmentValues}
            onHeadersAdd={onHeadersAdd}
            onHeadersChange={onHeadersChange}
            onHeadersRemove={onHeadersRemove}
            onHeadersReplace={onHeadersReplace}
          />
        )}

        {activeTab === "Cookies" && (
          <RequestCookiesTab
            cookieContext={cookieContext}
            cookies={cookies}
            onCookieAdd={onCookieAdd}
            onCookieUpdate={onCookieUpdate}
            onCookieRemove={onCookieRemove}
            formatDate={formatDate}
            parseDate={parseDate}
          />
        )}

        {activeTab === "Body" && (
          <RequestBodyTab
            bodyType={bodyType}
            rawType={rawType}
            bodyJson={bodyJson}
            bodyFormData={bodyFormData}
            bodyUrlEncoded={bodyUrlEncoded}
            environmentValues={environmentValues}
            editorTheme={editorTheme}
            onBodyTypeChange={onBodyTypeChange}
            onRawTypeChange={onRawTypeChange}
            onBodyJsonChange={onBodyJsonChange}
            onBodyFormDataChange={onBodyFormDataChange}
            onBodyFormDataRemove={onBodyFormDataRemove}
            onBodyFormDataReplace={onBodyFormDataReplace}
            onBodyUrlEncodedChange={onBodyUrlEncodedChange}
            onBodyUrlEncodedRemove={onBodyUrlEncodedRemove}
            onBodyUrlEncodedReplace={onBodyUrlEncodedReplace}
          />
        )}

        {activeTab === "Settings" && (
          <RequestSettingsTab settings={settings} onSettingsChange={onSettingsChange} />
        )}
      </div>
    </div>
  );
};
