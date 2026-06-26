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
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 15;
  const contentW = pageW - margin * 2;

  // Top dark bar
  const barH = 22;
  doc.setFillColor(40, 40, 40);
  doc.rect(0, 0, pageW, barH, "F");

  // Weight (left side of bar)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  const weightText = data.weight ? `${data.weight} kg` : "";
  if (weightText) {
    doc.text(weightText, margin + 2, barH / 2 + 1, { baseline: "middle" });
  }

  // Supplier name (center of bar)
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(data.supplierName.toUpperCase(), pageW / 2, barH / 2 + 1, {
    align: "center",
    baseline: "middle",
  });

  // Plinth qty (right side of bar)
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  const plinthText = data.plinthQty ? `${data.plinthQty} plinths` : "";
  if (plinthText) {
    doc.text(plinthText, pageW - margin - 2, barH / 2 + 1, {
      align: "right",
      baseline: "middle",
    });
  }

  let y = barH + 18;

  // Order number (gray, medium)
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(22);
  doc.setFont("helvetica", "normal");
  doc.text(data.orderNumber, pageW / 2, y, { align: "center" });
  y += 14;

  // Heze order number (black, very large bold)
  if (data.hezeOrderNumber) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(48);
    doc.setFont("helvetica", "bold");
    doc.text(data.hezeOrderNumber, pageW / 2, y, { align: "center" });
    y += 22;
  }

  // Horizontal line
  y += 4;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 14;

  // Customer name
  if (data.customerName) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text(data.customerName, pageW / 2, y, { align: "center" });
    y += 16;
  }

  // Postcode
  if (data.postcode) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(36);
    doc.setFont("helvetica", "bold");
    doc.text(data.postcode, pageW / 2, y, { align: "center" });
    y += 18;
  }

  // Horizontal line
  if (data.notes) {
    y += 4;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 12;

    // Notes
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(data.notes, contentW);
    doc.text(lines, pageW / 2, y, { align: "center" });
  }

  doc.save(`${data.hezeOrderNumber || data.orderNumber}-label.pdf`);
}
