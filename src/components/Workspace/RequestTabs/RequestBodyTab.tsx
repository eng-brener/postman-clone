import Editor from "@monaco-editor/react";
import { BodyType, KeyValue, RawType } from "../../../types";
import { KeyValueEditor } from "../../Editors/KeyValueEditor";

const BODY_TYPES: { id: BodyType; label: string }[] = [
  { id: "none", label: "none" },
  { id: "form-data", label: "form-data" },
  { id: "x-www-form-urlencoded", label: "x-www-form-urlencoded" },
  { id: "raw", label: "raw" },
  { id: "binary", label: "binary" },
];

const RAW_TYPES: RawType[] = ["text", "javascript", "json", "html", "xml"];

type RequestBodyTabProps = {
  bodyType: BodyType;
  rawType: RawType;
  bodyJson: string;
  bodyFormData: KeyValue[];
  bodyUrlEncoded: KeyValue[];
  environmentValues: Record<string, string>;
  editorTheme: string;
  onBodyTypeChange: (type: BodyType) => void;
  onRawTypeChange: (type: RawType) => void;
  onBodyJsonChange: (value: string) => void;
  onBodyFormDataChange: (idx: number, field: keyof KeyValue, val: string | boolean) => void;
  onBodyFormDataRemove: (idx: number) => void;
  onBodyFormDataReplace: (items: KeyValue[]) => void;
  onBodyUrlEncodedChange: (idx: number, field: keyof KeyValue, val: string | boolean) => void;
  onBodyUrlEncodedRemove: (idx: number) => void;
  onBodyUrlEncodedReplace: (items: KeyValue[]) => void;
};

export const RequestBodyTab = ({
  bodyType,
  rawType,
  bodyJson,
  bodyFormData,
  bodyUrlEncoded,
  environmentValues,
  editorTheme,
  onBodyTypeChange,
  onRawTypeChange,
  onBodyJsonChange,
  onBodyFormDataChange,
  onBodyFormDataRemove,
  onBodyFormDataReplace,
  onBodyUrlEncodedChange,
  onBodyUrlEncodedRemove,
  onBodyUrlEncodedReplace,
}: RequestBodyTabProps) => (
  <div className="body-container">
    <div className="body-toolbar">
      {BODY_TYPES.map((bt) => (
        <label key={bt.id} className="body-type-radio">
          <input
            type="radio"
            name="bodyType"
            value={bt.id}
            checked={bodyType === bt.id}
            onChange={(e) => onBodyTypeChange(e.target.value as BodyType)}
            style={{ accentColor: "var(--primary)" }}
          />
          <span
            style={{
              color: bodyType === bt.id ? "var(--text-main)" : "inherit",
              fontWeight: bodyType === bt.id ? 500 : 400,
            }}
          >
            {bt.label}
          </span>
        </label>
      ))}

      {bodyType === "raw" && (
        <select
          className="method-select"
          style={{ height: 32, padding: "0 12px", fontSize: "0.8rem", marginLeft: "auto" }}
          value={rawType}
          onChange={(e) => onRawTypeChange(e.target.value as RawType)}
        >
          {RAW_TYPES.map((rt) => (
            <option key={rt} value={rt}>
              {rt}
            </option>
          ))}
        </select>
      )}
    </div>

    <div className="body-content">
      {bodyType === "none" && (
        <div className="empty-state">
          <span style={{ opacity: 0.5 }}>This request has no body</span>
        </div>
      )}
      {bodyType === "raw" && (
        <div className="body-editor">
          <Editor
            height="100%"
            language={rawType === "javascript" ? "javascript" : rawType}
            theme={editorTheme}
            value={bodyJson}
            onChange={(value) => onBodyJsonChange(value || "")}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 13,
              automaticLayout: true,
              padding: { top: 10 },
            }}
          />
        </div>
      )}
      {bodyType === "form-data" && (
        <KeyValueEditor
          items={bodyFormData}
          onChange={onBodyFormDataChange}
          onRemove={onBodyFormDataRemove}
          environmentValues={environmentValues}
          onItemsReplace={onBodyFormDataReplace}
          showBulkEdit
        />
      )}
      {bodyType === "x-www-form-urlencoded" && (
        <KeyValueEditor
          items={bodyUrlEncoded}
          onChange={onBodyUrlEncodedChange}
          onRemove={onBodyUrlEncodedRemove}
          environmentValues={environmentValues}
          onItemsReplace={onBodyUrlEncodedReplace}
          showBulkEdit
        />
      )}
      {bodyType === "binary" && (
        <div className="empty-state">
          <span style={{ opacity: 0.5 }}>Binary body type not fully implemented (File upload)</span>
        </div>
      )}
    </div>
  </div>
);
