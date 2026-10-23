import { prisma } from "./db";

const RECEIPT_BASE = "https://skan.akrylik.pl/planer/package-logistics/receipt";

// Akrylik issues two receipt links: a whole delivery run, or one customer's pallets on a vehicle.
const RECEIPT_URL_RE =
  /^https:\/\/skan\.akrylik\.pl\/planer\/package-logistics\/receipt\/(delivery\/\d+\/\d+|vehicle\/\d+\/\d+\/\d+)\/([a-f0-9]{32,128})\/?$/i;
const RECEIPT_IN_TEXT_RE =
  /https:\/\/skan\.akrylik\.pl\/planer\/package-logistics\/receipt\/(?:delivery\/\d+\/\d+|vehicle\/\d+\/\d+\/\d+)\/[a-f0-9]{32,128}/i;

export const AKRYLIK_RECEIVER_NAME = "Heze Warehouse App";

export interface ReceiptLink {
  url: string;
  kind: "delivery" | "vehicle";
  token: string;
}

// Only these exact URL shapes are accepted, so user input can never make the server fetch anything else.
export function parseReceiptUrl(raw: string): ReceiptLink | null {
  const m = raw.trim().match(RECEIPT_URL_RE);
  if (!m) return null;
  const [, route, token] = m;
  return {
    url: `${RECEIPT_BASE}/${route}/${token}`,
    kind: route.toLowerCase().startsWith("vehicle") ? "vehicle" : "delivery",
    token,
  };
}

export function findReceiptUrlInText(text: string): ReceiptLink | null {
  const m = text.replace(/\s+/g, "").match(RECEIPT_IN_TEXT_RE);
  return m ? parseReceiptUrl(m[0]) : null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

export interface ReceiptOrder {
  omId: string; // "8756"
  ownRef: string; // "107.B33 8SY"
  decor: string;
  milling: string; // "NIE" or "TAK · FREZ/..."
}

export interface ReceiptPackage {
  code: string;
  omId: string;
  packageNumber: number;
  packageCount: number;
  status: string;
}

export interface ReceiptPage {
  orders: ReceiptOrder[];
  packages: ReceiptPackage[];
  palletCodes: string[];
}

export function parseReceiptHtml(html: string): ReceiptPage {
  const orders: ReceiptOrder[] = [];
  const orderRe = /<article data-receipt-order="[^"]*"[^>]*>([\s\S]*?)<\/article>/g;
  for (const m of html.matchAll(orderRe)) {
    const body = m[1];
    const h3 = body.match(/<h3>([\s\S]*?)<small>\s*OM #(\d+)\s*<\/small>/);
    if (!h3) continue;
    const own = body.match(/<p class="receipt-order-own">([\s\S]*?)<\/p>/);
    const decor = body.match(/Dekor:\s*<strong>([\s\S]*?)<\/strong>/);
    const milling = body.match(/Frez:\s*<strong>([\s\S]*?)<\/strong>/);
    orders.push({
      omId: h3[2],
      ownRef: stripTags(own ? own[1] : h3[1]),
      decor: decor ? stripTags(decor[1]) : "",
      milling: milling ? stripTags(milling[1]) : "",
    });
  }

  const packages: ReceiptPackage[] = [];
  const pkgRe = /<article data-receipt-package="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g;
  for (const m of html.matchAll(pkgRe)) {
    const code = decodeEntities(m[1]).trim().toUpperCase();
    const body = m[2];
    const om = body.match(/<strong>\s*OM #(\d+)/);
    const num = body.match(/Paczka\s+(\d+)\s+z\s+(\d+)/);
    const status = body.match(/<b data-package-status>([\s\S]*?)<\/b>/);
    if (!om) continue;
    packages.push({
      code,
      omId: om[1],
      packageNumber: num ? Number(num[1]) : 0,
      packageCount: num ? Number(num[2]) : 0,
      status: status ? stripTags(status[1]) : "",
    });
  }

  const hero = html.match(/<section class="receipt-hero">([\s\S]*?)<\/section>/);
  const palletCodes = hero ? Array.from(new Set(hero[1].match(/AKR-PAL-[\dA-Z-]+/g) ?? [])) : [];

  return { orders, packages, palletCodes };
}

export async function fetchReceiptPage(link: ReceiptLink): Promise<ReceiptPage> {
  const res = await fetch(link.url, {
    headers: { Accept: "text/html", "User-Agent": "HezeWarehouseApp/1.0" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status >= 500) {
    throw new Error(`Akrylik's site is temporarily unavailable (${res.status}). Please try again in a moment.`);
  }
  if (!res.ok) {
    throw new Error(`Akrylik rejected the delivery link (${res.status}). It may have expired.`);
  }
  const page = parseReceiptHtml(await res.text());
  if (!page.packages.length) {
    throw new Error("No packages found on the Akrylik delivery page.");
  }
  return page;
}

export interface PdfPanel {
  panelId: string; // "121286"
  dims: string; // "713×596×18"
  decor: string;
  qty: number;
  correctionFor?: string; // "OM #10167"
}

export interface PdfPackage {
  code: string;
  pallet?: string;
  declaredQty?: number;
  panels: PdfPanel[];
}

// Lines are text rows with cells joined by " | " (see pdfToLines).
export function parseAkrylikPdfLines(lines: string[]): Map<string, PdfPackage> {
  const packages = new Map<string, PdfPackage>();
  let current: PdfPackage | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (/^AKR-P-[\dA-Z-]+$/i.test(line)) {
      const code = line.toUpperCase();
      current = packages.get(code) ?? { code, panels: [] };
      packages.set(code, current);
      continue;
    }
    if (!current) continue;

    const header = line.match(/^(P\d+)\s*-\s*.*?-\s*(\d+)\s*szt\.?$/i);
    if (header) {
      current.pallet = header[1].toUpperCase();
      current.declaredQty = Number(header[2]);
      continue;
    }

    const cells = line.split(" | ").map((c) => c.trim());
    if (cells.length >= 4 && /^#\d+$/.test(cells[0])) {
      const dims = cells[1].replace(/\s*[×x]\s*/g, "×");
      const qty = Number(cells[cells.length - 1]);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      current.panels.push({
        panelId: cells[0].slice(1),
        dims,
        decor: cells.slice(2, -1).join(" "),
        qty,
      });
      continue;
    }

    const correction = line.match(/^OM\s*#(\d+)\s*-\s*poprawka/i);
    if (correction && current.panels.length) {
      current.panels[current.panels.length - 1].correctionFor = `OM #${correction[1]}`;
      continue;
    }

    if (/^Zamówienie OM #/i.test(line)) current = null;
  }
  return packages;
}

export async function pdfToLines(data: Uint8Array): Promise<{ lines: string[]; links: string[] }> {
  const { getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(data);
  const lines: string[] = [];
  const links: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    for (const a of await page.getAnnotations()) {
      if (typeof a.url === "string") links.push(a.url);
    }
    const content = await page.getTextContent();
    const rows: { y: number; cells: { x: number; s: string }[] }[] = [];
    for (const it of content.items as any[]) {
      if (typeof it.str !== "string" || !it.str.trim()) continue;
      const y = it.transform[5];
      let row = rows.find((r) => Math.abs(r.y - y) <= 2);
      if (!row) {
        row = { y, cells: [] };
        rows.push(row);
      }
      row.cells.push({ x: it.transform[4], s: it.str });
    }
    rows.sort((a, b) => b.y - a.y);
    for (const r of rows) {
      lines.push(r.cells.sort((a, b) => a.x - b.x).map((c) => c.s).join(" | "));
    }
  }
  return { lines, links };
}

const UK_POSTCODE_RE = /([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\s*$/i;

export function postcodeFromRef(ref: string): string {
  const m = ref.match(UK_POSTCODE_RE);
  return m ? `${m[1]} ${m[2]}`.toUpperCase() : "";
}

function describeMilling(milling: string): string {
  if (!milling || /^nie$/i.test(milling)) return "Milling: none";
  return `Milling: ${milling.replace(/^TAK\s*·\s*/i, "")}`;
}

export interface PreviewItem {
  itemName: string;
  barcode: string;
  quantity: number;
  parentName: string;
}

export interface PreviewPackage {
  code: string;
  omRef: string; // "OM #8756"
  label: string; // "Package 3 of 7"
  hasContents: boolean;
}

export interface PreviewGroup {
  orderNumber: string;
  hezeOrderNumber: string;
  postcode: string;
  notes: string;
  omRefs: string[];
  items: PreviewItem[];
  packages: PreviewPackage[];
}

export interface AkrylikPreview {
  receiptUrl: string;
  palletCodes: string[];
  groups: PreviewGroup[];
  alreadyImported: string[];
  warnings: string[];
  // "short": a PDF without box contents (Akrylik's "Wariant skrócony"); "link": no PDF at all.
  reportVariant: "extended" | "short" | "link";
}

// Orders sharing the same own reference (one kitchen) are merged into one portal order.
export function buildPreview(
  link: ReceiptLink,
  page: ReceiptPage,
  pdfPackages: Map<string, PdfPackage> | null,
  alreadyImported: Set<string>
): AkrylikPreview {
  const warnings: string[] = [];
  const orderById = new Map(page.orders.map((o) => [o.omId, o]));
  const groupsByRef = new Map<string, { ref: string; oms: ReceiptOrder[] }>();
  for (const o of page.orders) {
    const key = o.ownRef.toLowerCase().replace(/\s+/g, " ").trim();
    const g = groupsByRef.get(key) ?? { ref: o.ownRef, oms: [] };
    g.oms.push(o);
    groupsByRef.set(key, g);
  }

  const groups: PreviewGroup[] = [];
  for (const { ref, oms } of groupsByRef.values()) {
    oms.sort((a, b) => Number(a.omId) - Number(b.omId));
    const multi = oms.length > 1;
    const omIds = new Set(oms.map((o) => o.omId));
    const group: PreviewGroup = {
      orderNumber: oms.map((o) => `OM${o.omId}`).join(" / "),
      hezeOrderNumber: ref,
      postcode: postcodeFromRef(ref),
      notes: oms
        .map((o) => `Akrylik OM #${o.omId} · Colour ${o.decor || "?"} · ${describeMilling(o.milling)}`)
        .join("\n"),
      omRefs: oms.map((o) => `OM #${o.omId}`),
      items: [],
      packages: [],
    };

    const pkgs = page.packages
      .filter((p) => omIds.has(p.omId))
      .sort((a, b) => Number(a.omId) - Number(b.omId) || a.packageNumber - b.packageNumber);

    for (const p of pkgs) {
      if (alreadyImported.has(p.code)) continue;
      const om = orderById.get(p.omId)!;
      const prefix = `${multi ? `OM${p.omId} · ` : ""}Pkg ${p.packageNumber}/${p.packageCount}`;
      const parentName = `OM #${p.omId} · Package ${p.packageNumber} of ${p.packageCount}`;
      const contents = pdfPackages?.get(p.code);

      if (contents?.panels.length) {
        const total = contents.panels.reduce((s, x) => s + x.qty, 0);
        if (contents.declaredQty && contents.declaredQty !== total) {
          warnings.push(`${p.code}: PDF says ${contents.declaredQty} pcs but lists ${total}.`);
        }
        for (const panel of contents.panels) {
          const parts = [prefix, `#${panel.panelId}`, panel.dims];
          if (panel.decor && panel.decor !== om.decor) parts.push(panel.decor);
          if (panel.correctionFor) parts.push(`Correction for ${panel.correctionFor}`);
          group.items.push({ itemName: parts.join(" · "), barcode: p.code, quantity: panel.qty, parentName });
        }
      } else {
        group.items.push({
          itemName: `${prefix} · contents not listed`,
          barcode: p.code,
          quantity: 1,
          parentName,
        });
      }
      group.packages.push({
        code: p.code,
        omRef: `OM #${p.omId}`,
        label: `Package ${p.packageNumber} of ${p.packageCount}`,
        hasContents: Boolean(contents?.panels.length),
      });
    }

    if (group.items.length) groups.push(group);
  }

  const reportVariant = !pdfPackages ? "link" : pdfPackages.size === 0 ? "short" : "extended";
  if (reportVariant === "extended") {
    const missing = page.packages.filter((p) => !pdfPackages!.has(p.code) && !alreadyImported.has(p.code));
    if (missing.length) {
      warnings.push(
        `${missing.length} package${missing.length === 1 ? " is" : "s are"} on the delivery link but not in the PDF, so their contents are not listed.`
      );
    }
  }

  return {
    receiptUrl: link.url,
    palletCodes: page.palletCodes,
    groups,
    alreadyImported: page.packages.filter((p) => alreadyImported.has(p.code)).map((p) => p.code),
    warnings,
    reportVariant,
  };
}

interface ConfirmResult {
  ok: boolean;
  repeated?: boolean;
  error?: string;
}

async function confirmPackage(receiptUrl: string, code: string): Promise<ConfirmResult> {
  const link = parseReceiptUrl(receiptUrl);
  if (!link) return { ok: false, error: "Invalid delivery link" };
  try {
    const res = await fetch(`${link.url}/scan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "HezeWarehouseApp/1.0",
      },
      body: JSON.stringify({ package_code: code, receiver_name: AKRYLIK_RECEIVER_NAME }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const payload: any = await res.json().catch(() => ({}));
    if (res.ok && payload.ok === true) return { ok: true, repeated: Boolean(payload.repeated) };
    return { ok: false, error: String(payload.error || payload.message || `HTTP ${res.status}`).slice(0, 300) };
  } catch (err: any) {
    return { ok: false, error: String(err?.message || "Network error").slice(0, 300) };
  }
}

// Confirms to Akrylik every not-yet-synced package whose lines are all fully received.
// Safe to call repeatedly: Akrylik ignores packages it has already recorded.
export async function syncAkrylikPackages(where: { orderIds?: string[]; deliveryId?: string } = {}) {
  const pending = await prisma.akrylikPackage.findMany({
    where: {
      syncedAt: null,
      ...(where.orderIds ? { orderId: { in: where.orderIds } } : {}),
      ...(where.deliveryId ? { deliveryId: where.deliveryId } : {}),
    },
  });
  if (!pending.length) return { confirmed: 0, failed: 0 };

  const lines = await prisma.orderItem.findMany({
    where: { barcode: { in: pending.map((p) => p.code) }, orderId: { in: pending.map((p) => p.orderId) } },
    select: { barcode: true, orderId: true, quantity: true, scannedQty: true },
  });

  let confirmed = 0;
  let failed = 0;
  for (const pkg of pending) {
    const pkgLines = lines.filter((l) => l.barcode === pkg.code && l.orderId === pkg.orderId);
    if (!pkgLines.length || pkgLines.some((l) => l.scannedQty < l.quantity)) continue;

    const result = await confirmPackage(pkg.receiptUrl, pkg.code);
    if (result.ok) {
      confirmed++;
      await prisma.akrylikPackage.update({
        where: { id: pkg.id },
        data: { syncedAt: new Date(), lastError: null, attempts: { increment: 1 } },
      });
    } else {
      failed++;
      await prisma.akrylikPackage.update({
        where: { id: pkg.id },
        data: { lastError: result.error, attempts: { increment: 1 } },
      });
    }
  }
  return { confirmed, failed };
}

// Fire-and-forget so scanning is never slowed down by Akrylik's server.
export function syncAkrylikInBackground(where: { orderIds?: string[]; deliveryId?: string }) {
  syncAkrylikPackages(where).catch((err) => console.error("Akrylik sync failed:", err));
}
