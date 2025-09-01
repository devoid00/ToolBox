import React, { useMemo, useState } from "react";
import type { Drawer } from "./ToolboxView";

function randId() {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const a = new Uint32Array(2);
    crypto.getRandomValues(a);
    return Array.from(a).map(x => x.toString(16)).join("");
  }
  return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
}

type Props = {
  drawers: Drawer[];
  onSave: (drawers: Drawer[]) => void;
  onClose: () => void;
};

export default function DrawerEditor({ drawers, onSave, onClose }: Props) {
  const [list, setList] = useState<Drawer[]>(() => drawers.map(d => ({ ...d })));

  const canSave = useMemo(() => {
    if (list.length === 0) return false;
    return list.every(d => d.name.trim() && d.rows > 0 && d.cols > 0);
  }, [list]);

  function addDrawer() {
    setList(prev => [...prev, { id: randId(), name: `Drawer ${prev.length + 1}`, rows: 3, cols: 6 }]);
  }

  function updateField(id: string, field: keyof Drawer, value: string | number) {
    setList(prev => prev.map(d => (d.id === id ? { ...d, [field]: typeof value === "string" ? value : Number(value) } : d)));
  }

  function removeDrawer(id: string) {
    if (!confirm("Remove this drawer? Items placed in it will be cleared.")) return;
    setList(prev => prev.filter(d => d.id !== id));
  }

  function move(id: string, dir: "up" | "down") {
    setList(prev => {
      const idx = prev.findIndex(d => d.id === id);
      if (idx < 0) return prev;
      const j = dir === "up" ? idx - 1 : idx + 1;
      if (j < 0 || j >= prev.length) return prev;
      const copy = prev.slice();
      const tmp = copy[idx];
      copy[idx] = copy[j];
      copy[j] = tmp;
      return copy;
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-2xl p-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">Edit Drawer Layout</div>
          <button className="rounded border px-3 py-1" onClick={onClose}>Close</button>
        </div>

        <div className="flex flex-col gap-2 max-h-[60vh] overflow-auto">
          {list.map((d, i) => (
            <div key={d.id} className="grid grid-cols-12 gap-2 items-center border rounded p-2">
              <div className="col-span-5">
                <input
                  className="w-full rounded border px-3 py-2"
                  value={d.name}
                  onChange={(e) => updateField(d.id, "name", e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  min={1}
                  className="w-full rounded border px-3 py-2"
                  value={d.rows}
                  onChange={(e) => updateField(d.id, "rows", e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  min={1}
                  className="w-full rounded border px-3 py-2"
                  value={d.cols}
                  onChange={(e) => updateField(d.id, "cols", e.target.value)}
                />
              </div>
              <div className="col-span-3 flex justify-end gap-2">
                <button className="rounded border px-2 py-1 text-sm" onClick={() => move(d.id, "up")}>↑</button>
                <button className="rounded border px-2 py-1 text-sm" onClick={() => move(d.id, "down")}>↓</button>
                <button className="rounded border px-2 py-1 text-sm text-red-600" onClick={() => removeDrawer(d.id)}>Delete</button>
              </div>
              <div className="col-span-12 text-xs text-slate-500">Rows × Cols</div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button className="rounded border px-3 py-2" onClick={addDrawer}>Add Drawer</button>
          <div className="flex gap-2">
            <button className="rounded border px-3 py-2" onClick={onClose}>Cancel</button>
            <button
              className={`rounded px-3 py-2 ${canSave ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
              disabled={!canSave}
              onClick={() => onSave(list)}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
