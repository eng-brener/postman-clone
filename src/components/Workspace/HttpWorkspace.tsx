import { AuthData, AuthDataType, AuthType, BodyType, CookieEntry, KeyValue, RawType, RequestSettings } from "../../types";
import { RequestPane } from "./RequestPane";
import { ResponsePane } from "./ResponsePane";
import { UrlBar } from "./UrlBar";

interface HttpWorkspaceProps {
  method: string;
  url: string;
  isSending: boolean;
  onMethodChange: (method: string) => void;
  onUrlChange: (url: string) => void;
  onSend: () => void;
  environmentValues: Record<string, string>;
  activeRequestTab: string;
  onRequestTabChange: (tab: string) => void;
  params: KeyValue[];
  onParamsChange: (idx: number, field: keyof KeyValue, val: string | boolean) => void;
  onParamsRemove: (index: number) => void;
  headers: KeyValue[];
  onHeadersChange: (idx: number, field: keyof KeyValue, val: string | boolean) => void;
  onHeadersRemove: (index: number) => void;
  cookieContext: { host: string; path: string } | null;
  cookies: CookieEntry[];
  onCookieAdd: () => void;
  onCookieUpdate: (id: string, value: Partial<CookieEntry>) => void;
  onCookieRemove: (id: string) => void;
  authType: AuthType;
  onAuthTypeChange: (value: AuthType) => void;
  authData: AuthData;
  onAuthDataChange: (type: AuthDataType, field: string, val: string) => void;
  bodyType: BodyType;
  onBodyTypeChange: (type: BodyType) => void;
  rawType: RawType;
  onRawTypeChange: (type: RawType) => void;
  bodyJson: string;
  onBodyJsonChange: (value: string) => void;
  bodyFormData: KeyValue[];
  onBodyFormDataChange: (idx: number, field: keyof KeyValue, val: string | boolean) => void;
  onBodyFormDataRemove: (index: number) => void;
  bodyUrlEncoded: KeyValue[];
  onBodyUrlEncodedChange: (idx: number, field: keyof KeyValue, val: string | boolean) => void;
  onBodyUrlEncodedRemove: (index: number) => void;
  settings: RequestSettings;
  onSettingsChange: (field: keyof RequestSettings, val: any) => void;
  activeResponseTab: string;
  onResponseTabChange: (tab: string) => void;
  responseCode: number | null;
  responseStatus: string;
  responseTime: number;
  responseSize: number;
  responseRaw: string;
  responsePretty: string;
  responseHeaders: [string, string][];
  errorMessage: string | null;
  responseLanguage: string;
}

export const HttpWorkspace = ({
  method,
  url,
  isSending,
  onMethodChange,
  onUrlChange,
  onSend,
  environmentValues,
  activeRequestTab,
  onRequestTabChange,
  params,
  onParamsChange,
  onParamsRemove,
  headers,
  onHeadersChange,
  onHeadersRemove,
  cookieContext,
  cookies,
  onCookieAdd,
  onCookieUpdate,
  onCookieRemove,
  authType,
  onAuthTypeChange,
  authData,
  onAuthDataChange,
  bodyType,
  onBodyTypeChange,
  rawType,
  onRawTypeChange,
  bodyJson,
  onBodyJsonChange,
  bodyFormData,
  onBodyFormDataChange,
  onBodyFormDataRemove,
  bodyUrlEncoded,
  onBodyUrlEncodedChange,
  onBodyUrlEncodedRemove,
  settings,
  onSettingsChange,
  activeResponseTab,
  onResponseTabChange,
  responseCode,
  responseStatus,
  responseTime,
  responseSize,
  responseRaw,
  responsePretty,
  responseHeaders,
  errorMessage,
  responseLanguage,
}: HttpWorkspaceProps) => (
  <>
    <UrlBar
      method={method}
      url={url}
      isSending={isSending}
      onMethodChange={onMethodChange}
      onUrlChange={onUrlChange}
      onSend={onSend}
      environmentValues={environmentValues}
    />

    <div className="workspace-grid">
      <RequestPane
        activeTab={activeRequestTab}
        onTabChange={onRequestTabChange}
        environmentValues={environmentValues}
        params={params}
        onParamsChange={onParamsChange}
        onParamsRemove={onParamsRemove}
        headers={headers}
        onHeadersChange={onHeadersChange}
        onHeadersRemove={onHeadersRemove}
        cookieContext={cookieContext}
        cookies={cookies}
        onCookieAdd={onCookieAdd}
        onCookieUpdate={onCookieUpdate}
        onCookieRemove={onCookieRemove}
        authType={authType}
        onAuthTypeChange={onAuthTypeChange}
        authData={authData}
        onAuthDataChange={onAuthDataChange}
        bodyType={bodyType}
        onBodyTypeChange={onBodyTypeChange}
        rawType={rawType}
        onRawTypeChange={onRawTypeChange}
        bodyJson={bodyJson}
        onBodyJsonChange={onBodyJsonChange}
        bodyFormData={bodyFormData}
        onBodyFormDataChange={onBodyFormDataChange}
        onBodyFormDataRemove={onBodyFormDataRemove}
        bodyUrlEncoded={bodyUrlEncoded}
        onBodyUrlEncodedChange={onBodyUrlEncodedChange}
        onBodyUrlEncodedRemove={onBodyUrlEncodedRemove}
        settings={settings}
        onSettingsChange={onSettingsChange}
      />

      <ResponsePane
        activeTab={activeResponseTab}
        onTabChange={onResponseTabChange}
        responseCode={responseCode}
        responseStatus={responseStatus}
        responseTime={responseTime}
        responseSize={responseSize}
        responseRaw={responseRaw}
        responsePretty={responsePretty}
        responseHeaders={responseHeaders}
        errorMessage={errorMessage}
        responseLanguage={responseLanguage}
      />
    </div>
  </>
);
