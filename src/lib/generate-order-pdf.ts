import { jsPDF } from "jspdf";

interface OrderPdfData {
  orderNumber: string;
  hezeOrderNumber: string | null;
  customerName: string | null;
  postcode: string | null;
  plinthQty: number | null;
  weight: string | null;
  notes: string | null;
  supplierName: string;
}

export function generateOrderPdf(data: OrderPdfData) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = 297;
  const pageH = 210;
  const margin = 20;
  const contentW = pageW - margin * 2;

  // Top dark bar (20mm down from top edge)
  const topMargin = 20;
  const barH = 20;
  doc.setFillColor(40, 40, 40);
  doc.rect(0, topMargin, pageW, barH, "F");

  doc.setTextColor(255, 255, 255);
  const weightText = data.weight ? `${data.weight} kg` : "";
  if (weightText) {
    doc.setFontSize(13);
    doc.setFont("helvetica", "normal");
    doc.text(weightText, margin + 2, topMargin + barH / 2, { baseline: "middle" });
  }

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(data.supplierName.toUpperCase(), pageW / 2, topMargin + barH / 2, {
    align: "center",
    baseline: "middle",
  });

  const plinthText = data.plinthQty ? `${data.plinthQty} plinths` : "";
  if (plinthText) {
    doc.setFontSize(13);
    doc.setFont("helvetica", "normal");
    doc.text(plinthText, pageW - margin - 2, topMargin + barH / 2, {
      align: "right",
      baseline: "middle",
    });
  }

  const contentTop = topMargin + barH;
  const contentBottom = pageH;
  const totalH = contentBottom - contentTop;

  // Evenly space: order number, heze order, line, customer+postcode, line, notes
  // Use proportional zones of the available height
  const zone1Top = contentTop;
  const zone1H = totalH * 0.30; // order number + heze order
  const zone2Top = zone1Top + zone1H;
  const zone2H = totalH * 0.35; // customer name + postcode
  const zone3Top = zone2Top + zone2H;
  const zone3H = totalH * 0.35; // notes

  // Order number (gray, medium) — upper portion of zone 1
  const orderY = zone1Top + zone1H * 0.35;
  doc.setTextColor(140, 140, 140);
  doc.setFontSize(22);
  doc.setFont("helvetica", "normal");
  doc.text(data.orderNumber, pageW / 2, orderY, { align: "center" });

  // Heze order number (black, very large bold) — lower portion of zone 1
  if (data.hezeOrderNumber) {
    const hezeY = zone1Top + zone1H * 0.72;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(48);
    doc.setFont("helvetica", "bold");
    doc.text(data.hezeOrderNumber, pageW / 2, hezeY, { align: "center" });
  }

  // Horizontal line between zone 1 and zone 2
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  doc.line(margin, zone2Top, pageW - margin, zone2Top);

  // Customer name — upper portion of zone 2
  if (data.customerName) {
    const custY = zone2Top + zone2H * 0.38;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text(data.customerName, pageW / 2, custY, { align: "center" });
  }

  // Postcode — lower portion of zone 2
  if (data.postcode) {
    const pcY = zone2Top + zone2H * 0.72;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(36);
    doc.setFont("helvetica", "bold");
    doc.text(data.postcode, pageW / 2, pcY, { align: "center" });
  }

  // Horizontal line between zone 2 and zone 3
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  doc.line(margin, zone3Top, pageW - margin, zone3Top);

  // Notes — centered in zone 3
  if (data.notes) {
    const notesY = zone3Top + zone3H * 0.4;
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(data.notes, contentW);
    doc.text(lines, pageW / 2, notesY, { align: "center" });
  }

  doc.save(`${data.hezeOrderNumber || data.orderNumber}-label.pdf`);
}
