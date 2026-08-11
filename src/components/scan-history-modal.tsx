"use client";

export interface ScanHistoryEntry {
  barcode: string;
  itemName: string;
  orderNumber: string;
  scannedAt: Date;
}

interface ScanHistoryModalProps {
  entries: ScanHistoryEntry[];
  onClose: () => void;
}

export function ScanHistoryModal({ entries, onClose }: ScanHistoryModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-black text-gray-900">Scan History</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {entries.length === 0 ? (
          <p className="text-center text-gray-400 py-14 text-sm">No scans yet this session.</p>
        ) : (
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                <tr className="text-gray-500 text-xs font-bold uppercase tracking-wide">
                  <th className="py-2 px-3 sm:px-4 text-left">Time</th>
                  <th className="py-2 px-3 sm:px-4 text-left">Barcode</th>
                  <th className="py-2 px-3 sm:px-4 text-left">Item</th>
                  <th className="py-2 px-3 sm:px-4 text-left">Order</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr key={i} className={`border-t border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                    <td className="py-2 px-3 sm:px-4 text-gray-400 text-xs whitespace-nowrap">
                      {entry.scannedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                    <td className="py-2 px-3 sm:px-4 text-gray-600 font-mono text-xs">{entry.barcode}</td>
                    <td className="py-2 px-3 sm:px-4 text-gray-800 text-xs">{entry.itemName}</td>
                    <td className="py-2 px-3 sm:px-4 text-gray-800 font-bold text-xs">{entry.orderNumber}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-4 sm:px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
          <p className="text-xs text-gray-400">{entries.length} scan{entries.length !== 1 ? "s" : ""} this session</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 text-white text-sm font-bold rounded-lg hover:bg-gray-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
