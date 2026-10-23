import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  buildPreview,
  fetchReceiptPage,
  findReceiptUrlInText,
  parseAkrylikPdfLines,
  parseReceiptUrl,
  pdfToLines,
  type PdfPackage,
  type ReceiptLink,
} from "@/lib/akrylik";

const MAX_PDF_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let link: ReceiptLink | null = null;
  let pdfPackages: Map<string, PdfPackage> | null = null;

  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "No PDF file received" }, { status: 400 });
      }
      if (file.size > MAX_PDF_BYTES) {
        return NextResponse.json({ error: "PDF is too large (max 10 MB)" }, { status: 400 });
      }
      const { lines, links } = await pdfToLines(new Uint8Array(await file.arrayBuffer()));
      link =
        links.map((l) => parseReceiptUrl(l)).find(Boolean) ?? findReceiptUrlInText(lines.join("\n"));
      if (!link) {
        return NextResponse.json(
          { error: "Could not find the Akrylik delivery link in this PDF." },
          { status: 400 }
        );
      }
      pdfPackages = parseAkrylikPdfLines(lines);
    } else {
      const { url } = await req.json();
      link = typeof url === "string" ? parseReceiptUrl(url) : null;
      if (!link) {
        return NextResponse.json(
          { error: "That doesn't look like an Akrylik delivery link (https://skan.akrylik.pl/planer/package-logistics/receipt/…)." },
          { status: 400 }
        );
      }
    }

    const page = await fetchReceiptPage(link);
    const existing = await prisma.akrylikPackage.findMany({
      where: { code: { in: page.packages.map((p) => p.code) } },
      select: { code: true },
    });
    const preview = buildPreview(link, page, pdfPackages, new Set(existing.map((e) => e.code)));
    return NextResponse.json(preview);
  } catch (err: any) {
    console.error("Akrylik preview failed:", err);
    return NextResponse.json({ error: err?.message || "Failed to read Akrylik delivery" }, { status: 502 });
  }
}
