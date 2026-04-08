"use client";

import { EditableQty } from "./editable-qty";

export interface LastScannedItem {
  itemId: string;
  itemName: string;
  barcode: string;
  newQty: number;
  totalQty: number;
}

interface LastScannedPanelProps {
  orderNumber?: string;
  barcode?: string;
  items: LastScannedItem[];
  /** "delivery" | "despatch" */
  type: "delivery" | "despatch";
  onUpdate: (
    itemId: string,
    nextValue: number,
    type: "delivery" | "despatch"
  ) => Promise<void>;
}

export function LastScannedPanel({
  orderNumber,
  barcode,
  items,
  type,
  onUpdate,
}: LastScannedPanelProps) {
  if (!items.length) return null;

  return (
    <div className="w-full max-w-4xl bg-white/95 rounded-lg px-3 sm:px-5 py-3 mb-3 fade-in">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h3 className="text-gray-800 font-bold text-sm sm:text-base">
          Last Scanned
        </h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-gray-600">
          {orderNumber && (
            <span>
              Order: <span className="font-bold text-gray-800">{orderNumber}</span>
            </span>
          )}
          {barcode && (
            <span>
              Barcode: <span className="font-mono text-gray-800">{barcode}</span>
            </span>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm table-fixed">
          <thead>
            <tr className="text-gray-600">
              <th className="py-1 px-1 sm:px-2 text-left font-bold">NAME</th>
              <th className="py-1 px-1 sm:px-2 text-center font-bold w-14 sm:w-20">
                {type === "despatch" ? "DONE" : "SCANNED"}
              </th>
              <th className="py-1 px-1 sm:px-2 text-center font-bold w-10 sm:w-14">
                QTY
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.itemId} className="border-t border-gray-200">
                <td className="py-1 px-1 sm:px-2 text-gray-800 break-all">
                  {it.itemName}
                </td>
                <td className="py-1 px-1 sm:px-2 text-center">
                  <EditableQty
                    value={it.newQty}
                    max={it.totalQty}
                    confirmBeforeSave
                    confirmMessage={`Update "${it.itemName}" ${
                      type === "despatch" ? "despatched" : "scanned"
                    } quantity?`}
                    onChange={(v) => onUpdate(it.itemId, v, type)}
                  />
                </td>
                <td className="py-1 px-1 sm:px-2 text-center text-gray-800">
                  {it.totalQty}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
