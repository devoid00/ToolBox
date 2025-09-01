import React from "react";

export type Drawer = { id: string; name: string; rows: number; cols: number };
export type SlotPos = { drawerId: string; r: number; c: number };
export type PositionedItem = { id: string; name: string; categoryId: string; pos?: SlotPos | null };

type Props = {
  drawers: Drawer[];
  items: PositionedItem[];
  activeDrawerId: string;
  setActiveDrawerId: (id: string) => void;
  onPlace: (itemId: string, pos: SlotPos | null) => void;
};

export default function ToolboxView({
  drawers,
  items,
  activeDrawerId,
  setActiveDrawerId,
  onPlace
}: Props) {
  const drawer = drawers.find(d => d.id === activeDrawerId) ?? drawers[0];

  function itemAt(r: number, c: number) {
    return items.find(
      it => it.pos && it.pos.drawerId === drawer.id && it.pos.r === r && it.pos.c === c
    );
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, r: number, c: number) {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("text/x-item-id");
    if (!itemId) return;
    onPlace(itemId, { drawerId: drawer.id, r, c });
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2 overflow-x-auto">
          {drawers.map(d => (
            <button
              key={d.id}
              onClick={() => setActiveDrawerId(d.id)}
              className={`px-3 py-1 rounded border text-sm ${d.id === (drawer?.id ?? "") ? "bg-slate-900 text-white" : "bg-white"}`}
            >
              {d.name}
            </button>
          ))}
        </div>
      </div>

      {drawer && (
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${drawer.cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: drawer.rows }).map((_, r) =>
            Array.from({ length: drawer.cols }).map((__, c) => {
              const i = itemAt(r, c);
              return (
                <div
                  key={`${r}-${c}`}
                  onDrop={(e) => handleDrop(e, r, c)}
                  onDragOver={handleDragOver}
                  className={`aspect-square rounded-lg border flex items-center justify-center text-xs text-center p-1 cursor-copy ${i ? "bg-emerald-50 border-emerald-300" : "bg-slate-50 hover:bg-slate-100"}`}
                  title={i ? i.name : "Drop item here"}
                >
                  <div className="flex flex-col items-center gap-1">
                    <div className="font-medium leading-tight line-clamp-2">
                      {i ? i.name : "Empty"}
                    </div>
                    {i && (
                      <button
                        className="text-[11px] underline text-slate-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlace(i.id, null);
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <p className="mt-3 text-xs text-slate-500">
        Tip: drag items from the left and drop into any slot. Use the drawer tabs to switch layouts.
      </p>
    </div>
  );
}
