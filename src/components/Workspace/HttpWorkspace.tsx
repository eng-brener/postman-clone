import { ResizableBox } from "react-resizable";
import { AuthData, AuthDataType, AuthType, BodyType, CookieEntry, KeyValue, RawType, RequestSettings } from "../../types";
import { RequestPane } from "./RequestPane";
import { ResponsePane } from "./ResponsePane";
import { UrlBar } from "./UrlBar";
import { useEffect, useState, type HTMLAttributes, type Ref } from "react";
import { useI18n } from "../../i18n";

interface HttpWorkspaceProps {
  method: string;
  url: string;
  isSending: boolean;
  onMethodChange: (method: string) => void;
  onUrlChange: (url: string) => void;
  onSend: () => void;
  environmentValues: Record<string, string>;
  urlPreview: string;
  urlIsValid: boolean;
  activeRequestTab: string;
  onRequestTabChange: (tab: string) => void;
  params: KeyValue[];
  onParamsChange: (idx: number, field: keyof KeyValue, val: string | boolean) => void;
  onParamsRemove: (index: number) => void;
  onParamsAdd: () => void;
  onParamsReplace: (items: KeyValue[]) => void;
  headers: KeyValue[];
  onHeadersChange: (idx: number, field: keyof KeyValue, val: string | boolean) => void;
  onHeadersRemove: (index: number) => void;
  onHeadersAdd: () => void;
  onHeadersReplace: (items: KeyValue[]) => void;
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
  onBodyFormDataReplace: (items: KeyValue[]) => void;
  bodyUrlEncoded: KeyValue[];
  onBodyUrlEncodedChange: (idx: number, field: keyof KeyValue, val: string | boolean) => void;
  onBodyUrlEncodedRemove: (index: number) => void;
  onBodyUrlEncodedReplace: (items: KeyValue[]) => void;
  settings: RequestSettings;
  onSettingsChange: (field: keyof RequestSettings, val: any) => void;
  theme: "dark" | "light" | "dracula";
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
  followRedirects: boolean;
  onFollowRedirectsChange: (value: boolean) => void;
}

export const HttpWorkspace = ({
  method,
  url,
  isSending,
  onMethodChange,
  onUrlChange,
  onSend,
  environmentValues,
  urlPreview,
  urlIsValid,
  activeRequestTab,
  onRequestTabChange,
  params,
  onParamsChange,
  onParamsRemove,
  onParamsAdd,
  onParamsReplace,
  headers,
  onHeadersChange,
  onHeadersRemove,
  onHeadersAdd,
  onHeadersReplace,
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
  onBodyFormDataReplace,
  bodyUrlEncoded,
  onBodyUrlEncodedChange,
  onBodyUrlEncodedRemove,
  onBodyUrlEncodedReplace,
  settings,
  onSettingsChange,
  theme,
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
  followRedirects,
  onFollowRedirectsChange,
}: HttpWorkspaceProps) => {
  const { t } = useI18n();
  // Height state for the resizable pane
  const [requestPaneHeight, setRequestPaneHeight] = useState(300);

  // Initial calculation to set a reasonable default height based on window size
  useEffect(() => {
    const handleResize = () => {
       // Ideally use 40-50% of available height
       const availableHeight = window.innerHeight - 130; // approx header + sidebar headers
       setRequestPaneHeight(Math.max(200, availableHeight * 0.45));
    };
    
    // Set initial
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <UrlBar
        method={method}
        url={url}
        isSending={isSending}
        onMethodChange={onMethodChange}
        onUrlChange={onUrlChange}
        onSend={onSend}
        environmentValues={environmentValues}
        urlPreview={urlPreview}
        urlIsValid={urlIsValid}
      />

      <div className="workspace-grid" style={{ overflow: 'hidden' }}>
        <ResizableBox
          height={requestPaneHeight}
          width={Infinity}
          axis="y"
          resizeHandles={['s']}
          minConstraints={[100, 100]}
          maxConstraints={[Infinity, window.innerHeight - 200]}
          onResize={(_, { size }) => {
             setRequestPaneHeight(size.height);
          }}
          handle={(hProps, ref) => (
             <div 
                {...(hProps as HTMLAttributes<HTMLDivElement>)} 
                ref={ref as Ref<HTMLDivElement>} 
                className="react-resizable-handle" 
                title={t("app.dragResize")}
             />
          )}
        >
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <RequestPane
              activeTab={activeRequestTab}
              onTabChange={onRequestTabChange}
              environmentValues={environmentValues}
              params={params}
              onParamsChange={onParamsChange}
              onParamsRemove={onParamsRemove}
              onParamsAdd={onParamsAdd}
              onParamsReplace={onParamsReplace}
              headers={headers}
              onHeadersChange={onHeadersChange}
              onHeadersRemove={onHeadersRemove}
              onHeadersAdd={onHeadersAdd}
              onHeadersReplace={onHeadersReplace}
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
              onBodyFormDataReplace={onBodyFormDataReplace}
              bodyUrlEncoded={bodyUrlEncoded}
              onBodyUrlEncodedChange={onBodyUrlEncodedChange}
              onBodyUrlEncodedRemove={onBodyUrlEncodedRemove}
              onBodyUrlEncodedReplace={onBodyUrlEncodedReplace}
              settings={settings}
              onSettingsChange={onSettingsChange}
              theme={theme}
            />
          </div>
        </ResizableBox>

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
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
              followRedirects={followRedirects}
              onFollowRedirectsChange={onFollowRedirectsChange}
              theme={theme}
            />
        </div>
      </div>
    </>
  );
};
