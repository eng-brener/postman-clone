import Editor from "@monaco-editor/react";

type ResponsePreviewTabProps = {
  responseLanguage: string;
  responsePretty: string;
  responseRaw: string;
  editorTheme: string;
};

export const ResponsePreviewTab = ({
  responseLanguage,
  responsePretty,
  responseRaw,
  editorTheme,
}: ResponsePreviewTabProps) => (
  <div style={{ height: "100%" }}>
    <Editor
      height="100%"
      language={responseLanguage}
      theme={editorTheme}
      value={responseLanguage === "json" ? responsePretty || responseRaw : responseRaw}
      options={{
        readOnly: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 13,
        automaticLayout: true,
        padding: { top: 10 },
      }}
    />
  </div>
);
