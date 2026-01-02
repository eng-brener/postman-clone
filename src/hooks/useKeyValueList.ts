import { useState, useCallback } from "react";
import { KeyValue } from "../types";

const emptyRow = (): KeyValue => ({ key: "", value: "", enabled: true });

export function useKeyValueList(initial: KeyValue[] = [emptyRow()]) {
  const [items, setItems] = useState<KeyValue[]>(initial);

  const update = useCallback((index: number, field: keyof KeyValue, value: string | boolean) => {
    setItems((prev) => {
      const newList = prev.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item
      );
      // Auto-add new row if typing in last row
      if (index === prev.length - 1 && (field === 'key' || field === 'value') && value !== "") {
        newList.push(emptyRow());
      }
      return newList;
    });
  }, []);

  const remove = useCallback((index: number) => {
    setItems(prev => {
      if (prev.length <= 1) return [emptyRow()];
      return prev.filter((_, idx) => idx !== index);
    });
  }, []);

  return [items, update, remove, setItems] as const;
}
