"use client";

import { useState } from "react";

interface OrderItem {
  id: string;
  itemName: string;
  barcode?: string;
  quantity: number;
  scannedQty: number;
  despatchedQty?: number;
}

interface Props {
  orderId: string;
  items: OrderItem[];
  showDespatched?: boolean;
  onUpdate: () => void;
}

export function OrderItemsTable({ orderId, items, showDespatched = false, onUpdate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ itemName: "", barcode: "", quantity: "" });
  const [addingItem, setAddingItem] = useState(false);
  const [addForm, setAddForm] = useState({ itemName: "", barcode: "", quantity: "1" });
  const [error, setError] = useState("");

  const handleEditStart = (item: OrderItem) => {
    setEditingId(item.id);
    setEditForm({
      itemName: item.itemName,
      barcode: item.barcode || "",
      quantity: String(item.quantity),
    });
    setError("");
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    setError("");
    const res = await fetch(`/api/orders/${orderId}/items/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to update");
      return;
    }
    setEditingId(null);
    onUpdate();
  };

  const handleDelete = async (item: OrderItem) => {
    if (!confirm(`Remove "${item.itemName}" from this order?`)) return;
    const res = await fetch(`/api/orders/${orderId}/items/${item.id}`, { method: "DELETE" });
    if (res.ok) onUpdate();
  };

  const handleAdd = async () => {
    setError("");
    if (!addForm.itemName.trim() || !addForm.barcode.trim()) {
      setError("Item name and barcode are required");
      return;
    }
    const res = await fetch(`/api/orders/${orderId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to add");
      return;
    }
    setAddForm({ itemName: "", barcode: "", quantity: "1" });
    setAddingItem(false);
    onUpdate();
  };

  return (
    <div className="w-full max-w-4xl">
      <div className="bg-white rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-700 text-xs sm:text-sm">
              <th className="py-2 sm:py-3 px-1 sm:px-4 text-center font-bold">NAME</th>
              <th className="py-2 sm:py-3 px-1 sm:px-4 text-center font-bold w-10 sm:w-16">QTY</th>
              <th className="py-2 sm:py-3 px-1 sm:px-4 text-center font-bold w-12 sm:w-20">SCN</th>
              {showDespatched && (
                <th className="py-2 sm:py-3 px-1 sm:px-4 text-center font-bold w-14 sm:w-24">DSP</th>
              )}
              <th className="py-2 sm:py-3 px-1 text-center font-bold w-16 sm:w-24"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isScanned = item.scannedQty >= item.quantity;
              const isPartial = item.scannedQty > 0 && !isScanned;
              const isEditing = editingId === item.id;

              if (isEditing) {
                return (
                  <tr key={item.id} className="bg-blue-50">
                    <td className="py-2 px-1 sm:px-2" colSpan={showDespatched ? 5 : 4}>
                      <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={editForm.itemName}
                            onChange={(e) => setEditForm({ ...editForm, itemName: e.target.value })}
                            className="px-2 py-1.5 rounded border border-gray-300 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            placeholder="Item name"
                            autoFocus
                          />
                          <input
                            type="text"
                            value={editForm.barcode}
                            onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })}
                            className="px-2 py-1.5 rounded border border-gray-300 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            placeholder="Barcode"
                          />
                          <input
                            type="number"
                            value={editForm.quantity}
                            onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                            className="px-2 py-1.5 rounded border border-gray-300 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-full"
                            placeholder="Qty"
                            min="1"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleEditSave} className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-500">Save</button>
                          <button onClick={() => setEditingId(null)} className="px-3 py-1 border border-gray-300 text-gray-600 text-xs font-bold rounded hover:bg-gray-100">Cancel</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr
                  key={item.id}
                  className={isScanned ? "bg-green-200" : isPartial ? "bg-yellow-200" : "bg-yellow-100"}
                >
                  <td className="py-2 sm:py-3 px-1 sm:px-4 text-center text-gray-800 text-xs sm:text-sm break-all">{item.itemName}</td>
                  <td className="py-2 sm:py-3 px-1 sm:px-4 text-center text-gray-800 text-xs sm:text-sm">{item.quantity}</td>
                  <td className="py-2 sm:py-3 px-1 sm:px-4 text-center text-gray-800 text-xs sm:text-sm">{item.scannedQty}</td>
                  {showDespatched && (
                    <td className="py-2 sm:py-3 px-1 sm:px-4 text-center text-gray-800 text-xs sm:text-sm">{item.despatchedQty}</td>
                  )}
                  <td className="py-2 sm:py-3 px-1 text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => handleEditStart(item)} className="text-blue-600 hover:text-blue-800 p-0.5" title="Edit item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(item)} className="text-red-500 hover:text-red-700 p-0.5" title="Remove item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 5,6 21,6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {addingItem && (
              <tr className="bg-blue-50">
                <td className="py-2 px-1 sm:px-2" colSpan={showDespatched ? 5 : 4}>
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={addForm.itemName}
                        onChange={(e) => setAddForm({ ...addForm, itemName: e.target.value })}
                        className="px-2 py-1.5 rounded border border-gray-300 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder="Item name"
                        autoFocus
                      />
                      <input
                        type="text"
                        value={addForm.barcode}
                        onChange={(e) => setAddForm({ ...addForm, barcode: e.target.value })}
                        className="px-2 py-1.5 rounded border border-gray-300 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder="Barcode"
                      />
                      <input
                        type="number"
                        value={addForm.quantity}
                        onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })}
                        className="px-2 py-1.5 rounded border border-gray-300 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-full"
                        placeholder="Qty"
                        min="1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleAdd} className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-500">Add</button>
                      <button onClick={() => { setAddingItem(false); setError(""); }} className="px-3 py-1 border border-gray-300 text-gray-600 text-xs font-bold rounded hover:bg-gray-100">Cancel</button>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {error && <p className="text-red-300 text-sm mt-2">{error}</p>}

      {!addingItem && (
        <button
          onClick={() => { setAddingItem(true); setError(""); }}
          className="mt-3 flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-bold transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add Item
        </button>
      )}
    </div>
  );
}
