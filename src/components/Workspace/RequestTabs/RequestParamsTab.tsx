import { KeyValue } from "../../../types";
import { KeyValueEditor } from "../../Editors/KeyValueEditor";

type RequestParamsTabProps = {
  params: KeyValue[];
  environmentValues: Record<string, string>;
  onParamsAdd: () => void;
  onParamsChange: (idx: number, field: keyof KeyValue, val: string | boolean) => void;
  onParamsRemove: (idx: number) => void;
  onParamsReplace: (items: KeyValue[]) => void;
};

export const RequestParamsTab = ({
  params,
  environmentValues,
  onParamsAdd,
  onParamsChange,
  onParamsRemove,
  onParamsReplace,
}: RequestParamsTabProps) => (
  <>
    <div className="kv-toolbar">
      <div className="kv-toolbar-spacer" />
      <button type="button" className="kv-add" onClick={onParamsAdd}>
        + Add Param
      </button>
    </div>
    <KeyValueEditor
      items={params}
      onChange={onParamsChange}
      onRemove={onParamsRemove}
      environmentValues={environmentValues}
      onItemsReplace={onParamsReplace}
      showBulkEdit
    />
  </>
);
