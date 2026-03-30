"use client";

import { useParams } from "next/navigation";
import Link from "next/link";

export default function FinishedPage() {
  const params = useParams();
  const slug = params.slug as string;

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      {/* Green checkmark circle */}
      <div className="w-40 h-40 rounded-full border-4 border-scan-green flex items-center justify-center mb-8">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="80"
          height="80"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#00C853"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20,6 9,17 4,12" />
        </svg>
      </div>

      <h1 className="text-4xl font-black text-white mb-6">Finished</h1>

      <div className="text-center text-white/80 text-lg max-w-md leading-relaxed">
        <p>Kitchens have been moved to &ldquo;Kitchens in Stock&rdquo; tab.</p>
        <p className="mt-2">
          Use that tab to despatch the kitchen when packing the kitchen
          when it leaves our warehouse.
        </p>
      </div>

      <div className="flex gap-4 mt-10">
        <Link
          href={`/supplier/${slug}/in-stock`}
          className="px-8 py-3 rounded bg-accent text-white font-bold text-lg hover:bg-accent-light transition"
        >
          Go to Kitchens In Stock
        </Link>
        <Link
          href={`/supplier/${slug}/delivery`}
          className="px-8 py-3 rounded border-2 border-white text-white font-bold text-lg hover:bg-white/10 transition"
        >
          New Delivery
        </Link>
      </div>
    </div>
  );
}
