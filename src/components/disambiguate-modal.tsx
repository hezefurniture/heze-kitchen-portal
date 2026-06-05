"use client";

export interface AmbiguousCandidate {
  itemId: string;
  orderId: string;
  orderNumber: string;
  itemName: string;
  scannedQty: number;
  quantity: number;
  parentName?: string;
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
  const hasParents = candidates.some((c) => c.parentName);

  const parentGroups: { parentName: string; items: AmbiguousCandidate[] }[] = [];
  if (hasParents) {
    const map = new Map<string, AmbiguousCandidate[]>();
    for (const c of candidates) {
      const key = c.parentName || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    for (const [parentName, items] of map) {
      parentGroups.push({ parentName, items });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-3"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl w-full max-w-md p-5 shadow-xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-black text-gray-800 mb-1">
          Which item was scanned?
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Barcode <span className="font-mono font-bold">{barcode}</span> matches
          multiple items. Tap the one you just scanned.
        </p>

        {hasParents ? (
          <div className="space-y-4">
            {parentGroups.map((group) => (
              <div key={group.parentName}>
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1.5 px-1">
                  {group.parentName}
                </h3>
                <div className="space-y-2">
                  {group.items.map((c) => (
                    <CandidateButton key={c.itemId} candidate={c} onPick={onPick} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {candidates.map((c) => (
              <CandidateButton key={c.itemId} candidate={c} onPick={onPick} />
            ))}
          </div>
        )}

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

function CandidateButton({
  candidate: c,
  onPick,
}: {
  candidate: AmbiguousCandidate;
  onPick: (c: AmbiguousCandidate) => void;
}) {
  const done = c.scannedQty >= c.quantity;
  return (
    <button
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
}
