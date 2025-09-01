import React, { useEffect, useMemo, useState } from "react";
import ToolboxView, { Drawer, SlotPos } from "./components/ToolboxView";
import DrawerEditor from "./components/DrawerEditor";

type ToolItem = {
  id: string;
  name: string;
  categoryId: string;
  quantity: number;
  location?: string;
  tags: string[];
  notes?: string;
  favorite?: boolean;
  pos?: SlotPos | null;
};

type Category = { id: string; name: string; order: number };
type DB = { categories: Category[]; items: ToolItem[]; drawers?: Drawer[]; updatedAt: string };

const LS_KEY = "toolbox-categorizer:v3";

function cryptoRand() {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const arr = new Uint32Array(2);
    crypto.getRandomValues(arr);
    return Array.from(arr).map((x) => x.toString(16)).join("");
  }
  return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
}

const defaultDrawers: Drawer[] = [
  { id: "d1", name: "Top Tray", rows: 3, cols: 6 },
  { id: "d2", name: "Drawer 1", rows: 3, cols: 6 },
  { id: "d3", name: "Drawer 2", rows: 4, cols: 8 },
  { id: "d4", name: "Drawer 3", rows: 2, cols: 5 }
];

const sample: DB = {
  updatedAt: new Date().toISOString(),
  categories: [
    { id: "c1", name: "Drivers", order: 1 },
    { id: "c2", name: "Sockets", order: 2 },
    { id: "c3", name: "Soldering", order: 3 },
    { id: "c4", name: "Measuring", order: 4 }
  ],
  drawers: defaultDrawers,
  items: [
    { id: cryptoRand(), name: "Phillips #2 Screwdriver", categoryId: "c1", quantity: 2, location: "Tray 1", tags: ["driver", "#2", "phillips"], notes: "Primary" },
    { id: cryptoRand(), name: "Flathead 5mm", categoryId: "c1", quantity: 1, location: "Tray 1", tags: ["driver", "flat"] },
    { id: cryptoRand(), name: "1/2\" Socket 10mm", categoryId: "c2", quantity: 1, location: "Rail A", tags: ["socket", "10mm", "1/2"], favorite: true },
    { id: cryptoRand(), name: "Hakko FX-888D Iron", categoryId: "c3", quantity: 1, location: "Bin S1", tags: ["solder", "iron"] },
    { id: cryptoRand(), name: "Fluke 87V DMM", categoryId: "c4", quantity: 1, location: "Case", tags: ["meter", "dmm"], notes: "Calibrated 2025-06" }
  ]
};

function useLocalDB() {
  const [db, setDb] = useState<DB>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const parsed = raw ? (JSON.parse(raw) as DB) : sample;
      if (!parsed.drawers || parsed.drawers.length === 0) parsed.drawers = defaultDrawers;
      return parsed;
    } catch {
      return sample;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ ...db, updatedAt: new Date().toISOString() }));
    } catch {}
  }, [db]);
  return [db, setDb] as const;
}

export default function App() {
  const [db, setDb] = useLocalDB();
  const [q, setQ] = useState("");
  const [activeCatId, setActiveCatId] = useState(db.categories[0]?.id || "");
  const [showFav, setShowFav] = useState(false);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<ToolItem>>({ name: "", quantity: 1, tags: [], categoryId: db.categories[0]?.id });
  const [activeDrawerId, setActiveDrawerId] = useState(db.drawers?.[0]?.id || "d1");
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    if (!activeCatId && db.categories.length) setActiveCatId(db.categories[0].id);
    if (!activeDrawerId && db.drawers && db.drawers.length) setActiveDrawerId(db.drawers[0].id);
  }, [db, activeCatId, activeDrawerId]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    db.items.forEach((i) => (i.tags || []).forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [db.items]);

  const filtered = useMemo(() => {
    let items = db.items;
    if (activeCatId) items = items.filter((i) => i.categoryId === activeCatId);
    if (showFav) items = items.filter((i) => i.favorite);
    if (tagFilter) items = items.filter((i) => (i.tags || []).includes(tagFilter));
    if (q.trim()) {
      const t = q.toLowerCase();
      items = items.filter((i) =>
        (i.name + " " + (i.notes || "") + " " + (i.location || "") + " " + (i.tags || []).join(" "))
          .toLowerCase()
          .includes(t)
      );
    }
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }, [db.items, activeCatId, tagFilter, q, showFav]);

  function addOrUpdateItem() {
    if (!draft.name || !draft.categoryId) {
      alert("Name and category are required");
      return;
    }
    setDb((prev) => {
      const exists = prev.items.find((i) => i.id === draft.id);
      const item: ToolItem = {
        id: exists ? exists.id : cryptoRand(),
        name: (draft.name ?? "").trim(),
        categoryId: draft.categoryId!,
        quantity: Number(draft.quantity ?? 1),
        location: (draft.location ?? "").trim(),
        tags: (draft.tags ?? []).map((t) => t.trim()).filter(Boolean),
        notes: (draft.notes ?? "").trim(),
        favorite: !!draft.favorite,
        pos: draft.pos ?? (exists ? exists.pos : null)
      };
      return { ...prev, items: exists ? prev.items.map((i) => (i.id === item.id ? item : i)) : [...prev.items, item] };
    });
    setDraft({ name: "", quantity: 1, categoryId: activeCatId || "", tags: [] });
    setDialogOpen(false);
  }

  function deleteItem(id: string) {
    if (!confirm("Delete this item?")) return;
    setDb((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== id) }));
  }

  function moveItemToCategory(id: string, categoryId: string) {
    setDb((prev) => ({ ...prev, items: prev.items.map((i) => (i.id === id ? { ...i, categoryId } : i)) }));
  }

  function placeItem(itemId: string, pos: SlotPos | null) {
    setDb((prev) => {
      let items = prev.items.map(i => {
        if (!pos) return i;
        if (i.pos && i.pos.drawerId === pos.drawerId && i.pos.r === pos.r && i.pos.c === pos.c) {
          if (i.id === itemId) return i;
          return { ...i, pos: null };
        }
        return i;
      });
      items = items.map(i => i.id === itemId ? { ...i, pos } : i);
      return { ...prev, items };
    });
  }

  function createCategory() {
    const name = prompt("New category name");
    if (!name) return;
    const id = cryptoRand();
    const order = (db.categories.at(-1)?.order || 0) + 1;
    setDb((p) => ({ ...p, categories: [...p.categories, { id, name, order }] }));
    setActiveCatId(id);
  }

  function renameCategory(cat: Category) {
    const name = prompt("Rename category", cat.name);
    if (!name) return;
    setDb((p) => ({ ...p, categories: p.categories.map((c) => (c.id === cat.id ? { ...c, name } : c)) }));
  }

  function deleteCategory(cat: Category) {
    if (!confirm(`Delete category "${cat.name}"? Items will remain uncategorized.`)) return;
    setDb((p) => ({
      ...p,
      categories: p.categories.filter((c) => c.id !== cat.id),
      items: p.items.map((i) => (i.categoryId === cat.id ? { ...i, categoryId: "" } : i))
    }));
    setActiveCatId("");
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `toolbox-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result)) as DB;
        if (!obj.items || !obj.categories) throw new Error("Invalid file");
        if (!obj.drawers || obj.drawers.length === 0) obj.drawers = defaultDrawers;
        setDb(obj);
        alert("Imported.");
      } catch {
        alert("Import failed.");
      }
    };
    reader.readAsText(file);
  }

  function saveDrawers(newDrawers: Drawer[]) {
    setDb(prev => {
      const items = prev.items.map(i => {
        if (!i.pos) return i;
        const d = newDrawers.find(x => x.id === i.pos!.drawerId);
        if (!d) return { ...i, pos: null };
        if (i.pos!.r >= d.rows || i.pos!.c >= d.cols) return { ...i, pos: null };
        return i;
      });
      return { ...prev, drawers: newDrawers, items };
    });
    setActiveDrawerId(newDrawers[0]?.id || "");
    setEditorOpen(false);
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <header className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Toolbox Categorizer</h1>
          <span className="ml-2 text-xs px-2 py-1 rounded bg-slate-200">Local</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search name, tags, notes…" className="pl-8 w-64 rounded border px-3 py-2" />
            <span className="absolute left-2 top-2.5 text-slate-400">🔎</span>
          </div>
          <button className="rounded border px-3 py-2" onClick={()=>setShowFav(v=>!v)}>{showFav ? "★ Favorites" : "☆ Favorites"}</button>
          <select className="rounded border px-3 py-2" value={tagFilter||""} onChange={(e)=>setTagFilter(e.target.value||null)}>
            <option value="">All tags</option>
            {allTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button className="rounded bg-slate-900 text-white px-3 py-2" onClick={()=>{ setDraft({ name:"", quantity:1, categoryId: activeCatId||"", tags: []}); setDialogOpen(true); }}>+ Add item</button>
          <div className="relative">
            <button className="rounded border px-3 py-2" onClick={exportJSON}>⬇ Export</button>
            <label className="rounded border px-3 py-2 ml-2 cursor-pointer">⬆ Import
              <input type="file" accept="application/json" className="hidden" onChange={(e)=> e.target.files?.[0] && importJSON(e.target.files[0])} />
            </label>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-4">
        <aside className="col-span-12 md:col-span-5 lg:col-span-4">
          <div className="rounded-xl border bg-white">
            <div className="flex items-center justify-between p-3 border-b">
              <div className="font-semibold text-sm">Categories</div>
              <button className="rounded px-2 py-1 text-sm border" onClick={createCategory}>+ New</button>
            </div>
            <div className="p-2">
              {db.categories.slice().sort((a,b)=>a.order-b.order).map(c => (
                <div key={c.id} className={`group flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-100 ${activeCatId===c.id ? "bg-slate-100 border" : ""}`} onClick={()=>setActiveCatId(c.id)}>
                  <div className="font-medium text-sm">{c.name}</div>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2">
                    <button className="text-xs underline" onClick={(e)=>{ e.stopPropagation(); renameCategory(c); }}>Rename</button>
                    <button className="text-xs text-red-600 underline" onClick={(e)=>{ e.stopPropagation(); deleteCategory(c); }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t">
              {filtered.length === 0 ? (
                <div className="rounded border border-dashed p-6 text-center text-sm text-slate-600">
                  No items match your filters.
                  <div className="mt-3">
                    <button className="rounded bg-slate-900 text-white px-3 py-2" onClick={()=>{ setDraft({ name:"", quantity:1, categoryId: activeCatId||"", tags: []}); setDialogOpen(true); }}>Add your first item</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {filtered.map(i => (
                    <div
                      key={i.id}
                      className="rounded-lg border bg-white p-3 cursor-grab active:cursor-grabbing"
                      draggable
                      onDragStart={(e)=>{ e.dataTransfer.setData("text/x-item-id", i.id); e.dataTransfer.effectAllowed="copyMove"; }}
                      title="Drag to a slot on the right"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold leading-tight">{i.name}</div>
                          <div className="mt-1 flex flex-wrap gap-1 text-xs text-slate-600">
                            <span className="rounded bg-slate-100 px-2 py-0.5">qty {i.quantity}</span>
                            {i.location && <span className="rounded border px-2 py-0.5">{i.location}</span>}
                            {i.favorite ? <span className="text-yellow-500">★</span> : <span className="text-slate-300">☆</span>}
                          </div>
                          {i.pos && (
                            <div className="mt-1 text-[11px] text-emerald-700">
                              Placed in {i.pos.drawerId} (r{i.pos.r+1}, c{i.pos.c+1})
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <select className="rounded border px-2 py-1 text-sm" value={i.categoryId} onChange={(e)=>moveItemToCategory(i.id, e.target.value)}>
                            {db.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          <button className="text-xs underline" onClick={()=>{ setDraft(i); setDialogOpen(true); }}>Edit</button>
                          <button className="text-xs text-red-600 underline" onClick={()=>deleteItem(i.id)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            Updated: {new Date(db.updatedAt).toLocaleString()}
          </div>
        </aside>

        <main className="col-span-12 md:col-span-7 lg:col-span-8">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-sm">Toolbox Layout</div>
            <button className="rounded border px-3 py-1 text-sm" onClick={()=>setEditorOpen(true)}>Layout ⚙️</button>
          </div>
          <ToolboxView
            drawers={db.drawers ?? defaultDrawers}
            items={db.items}
            activeDrawerId={activeDrawerId}
            setActiveDrawerId={setActiveDrawerId}
            onPlace={placeItem}
          />
        </main>
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4" onClick={()=>setDialogOpen(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full p-4" onClick={(e)=>e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">{draft.id ? "Edit item" : "Add item"}</div>
            <div className="grid gap-3">
              <label className="grid grid-cols-4 items-center gap-2">
                <span className="text-right text-sm">Name</span>
                <input className="col-span-3 rounded border px-3 py-2" value={draft.name||""} onChange={(e)=>setDraft(d=>({...d, name:e.target.value}))}/>
              </label>
              <label className="grid grid-cols-4 items-center gap-2">
                <span className="text-right text-sm">Category</span>
                <select className="col-span-3 rounded border px-3 py-2" value={draft.categoryId||""} onChange={(e)=>setDraft(d=>({...d, categoryId:e.target.value}))}>
                  <option value="">Select…</option>
                  {db.categories.slice().sort((a,b)=>a.order-b.order).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label className="grid grid-cols-4 items-center gap-2">
                <span className="text-right text-sm">Quantity</span>
                <input type="number" min={0} className="col-span-3 rounded border px-3 py-2" value={draft.quantity??1} onChange={(e)=>setDraft(d=>({...d, quantity:Number(e.target.value)}))}/>
              </label>
              <label className="grid grid-cols-4 items-center gap-2">
                <span className="text-right text-sm">Location</span>
                <input className="col-span-3 rounded border px-3 py-2" value={draft.location||""} onChange={(e)=>setDraft(d=>({...d, location:e.target.value}))}/>
              </label>
              <label className="grid grid-cols-4 items-center gap-2">
                <span className="text-right text-sm">Tags</span>
                <input placeholder="comma,separated" className="col-span-3 rounded border px-3 py-2" value={(draft.tags||[]).join(',')} onChange={(e)=>setDraft(d=>({...d, tags:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)}))}/>
              </label>
              <label className="grid grid-cols-4 items-center gap-2">
                <span className="text-right text-sm">Notes</span>
                <textarea className="col-span-3 rounded border px-3 py-2" value={draft.notes||""} onChange={(e)=>setDraft(d=>({...d, notes:e.target.value}))}></textarea>
              </label>
              <label className="grid grid-cols-4 items-center gap-2">
                <span className="text-right text-sm">Favorite</span>
                <input type="checkbox" checked={!!draft.favorite} onChange={(e)=>setDraft(d=>({...d, favorite:e.target.checked}))}/>
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded border px-3 py-2" onClick={()=>setDialogOpen(false)}>Cancel</button>
              <button className="rounded bg-slate-900 text-white px-3 py-2" onClick={addOrUpdateItem}>Save</button>
            </div>
          </div>
        </div>
      )}

      {editorOpen && (
        <DrawerEditor
          drawers={db.drawers ?? defaultDrawers}
          onSave={saveDrawers}
          onClose={()=>setEditorOpen(false)}
        />
      )}
    </div>
  );
}
