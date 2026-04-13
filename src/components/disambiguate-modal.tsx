"use client";

export interface AmbiguousCandidate {
  itemId: string;
  orderId: string;
  orderNumber: string;
  itemName: string;
  scannedQty: number;
  quantity: number;
}

interface DisambiguateModalProps {
  barcode: string;
  candidates: AmbiguousCandidate[];
  onPick: (candidate: AmbiguousCandidate) => void;
  onCancel: () => void;
}

export function DisambiguateModal({
  barcode,
  candidates,
  onPick,
  onCancel,
}: DisambiguateModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-3"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl w-full max-w-md p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-black text-gray-800 mb-1">
          Which item was scanned?
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Barcode <span className="font-mono font-bold">{barcode}</span> matches
          multiple items. Tap the one you just scanned.
        </p>

        <div className="space-y-2">
          {candidates.map((c) => {
            const done = c.scannedQty >= c.quantity;
            return (
              <button
                key={c.itemId}
                onClick={() => onPick(c)}
                disabled={done}
                className={`w-full text-left rounded-lg border-2 px-4 py-3 transition ${
                  done
                    ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "border-accent bg-accent/5 hover:bg-accent/15 text-gray-800"
                }`}
              >
                <span className="font-bold text-sm block break-all">
                  {c.itemName}
                </span>
                <span className="text-xs text-gray-500">
                  Order {c.orderNumber} &middot; {c.scannedQty}/{c.quantity}{" "}
                  {done ? "(complete)" : ""}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onCancel}
          className="mt-4 w-full py-2 rounded border border-gray-300 text-gray-600 text-sm font-bold hover:bg-gray-100 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
