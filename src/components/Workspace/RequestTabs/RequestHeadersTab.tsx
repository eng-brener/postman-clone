import { KeyValue } from "../../../types";
import { KeyValueEditor } from "../../Editors/KeyValueEditor";

type RequestHeadersTabProps = {
  headers: KeyValue[];
  environmentValues: Record<string, string>;
  onHeadersAdd: () => void;
  onHeadersChange: (idx: number, field: keyof KeyValue, val: string | boolean) => void;
  onHeadersRemove: (idx: number) => void;
  onHeadersReplace: (items: KeyValue[]) => void;
};

export const RequestHeadersTab = ({
  headers,
  environmentValues,
  onHeadersAdd,
  onHeadersChange,
  onHeadersRemove,
  onHeadersReplace,
}: RequestHeadersTabProps) => (
  <>
    <div className="kv-toolbar">
      <div className="kv-toolbar-spacer" />
      <button type="button" className="kv-add" onClick={onHeadersAdd}>
        + Add Header
      </button>
    </div>
    <KeyValueEditor
      items={headers}
      onChange={onHeadersChange}
      onRemove={onHeadersRemove}
      environmentValues={environmentValues}
      onItemsReplace={onHeadersReplace}
      showBulkEdit
      duplicateCheck="case-insensitive"
    />
  </>
);
