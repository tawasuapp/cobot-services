import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

function fmtMoney(amount, currency = 'QAR') {
  if (amount == null) return '-';
  return `${currency} ${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d) {
  if (!d) return '-';
  try { return format(new Date(d), 'MMM dd, yyyy'); } catch { return '-'; }
}

/**
 * Generate and trigger download of a PDF invoice for the given invoice object.
 * Expects `invoice.Customer` and optionally `invoice.Job` to be eager-loaded.
 */
export function downloadInvoicePdf(invoice) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = margin;

  // ── Header ────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(17, 24, 39);
  doc.text('Cobot Services', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text('Doha, Qatar  ·  www.cobot.qa', margin, y + 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(17, 24, 39);
  doc.text('INVOICE', pageW - margin, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(75, 85, 99);
  doc.text(`#${invoice.invoice_number || ''}`, pageW - margin, y + 18, { align: 'right' });
  doc.setFontSize(10);
  doc.setTextColor(invoice.status === 'paid' ? 22 : 180, invoice.status === 'paid' ? 163 : 83, invoice.status === 'paid' ? 74 : 9);
  doc.text((invoice.status || '').toUpperCase(), pageW - margin, y + 34, { align: 'right' });

  y += 70;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 24;

  // ── Bill To / Dates ───────────────────────────────────
  const cust = invoice.Customer || {};
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(156, 163, 175);
  doc.text('BILL TO', margin, y);
  doc.text('INVOICE DETAILS', pageW - margin - 200, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text(cust.company_name || '-', margin, y + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(75, 85, 99);
  let cy = y + 32;
  if (cust.contact_person) { doc.text(cust.contact_person, margin, cy); cy += 14; }
  if (cust.email) { doc.text(cust.email, margin, cy); cy += 14; }
  if (cust.phone) { doc.text(cust.phone, margin, cy); cy += 14; }
  if (cust.address) {
    const wrapped = doc.splitTextToSize(cust.address, 240);
    doc.text(wrapped, margin, cy);
    cy += 14 * wrapped.length;
  }

  // Right column dates
  const rx = pageW - margin - 200;
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text('Issue Date:', rx, y + 16);
  doc.text('Due Date:', rx, y + 32);
  if (invoice.paid_at) doc.text('Paid:', rx, y + 48);
  doc.setTextColor(17, 24, 39);
  doc.text(fmtDate(invoice.issue_date), pageW - margin, y + 16, { align: 'right' });
  doc.text(fmtDate(invoice.due_date), pageW - margin, y + 32, { align: 'right' });
  if (invoice.paid_at) doc.text(fmtDate(invoice.paid_at), pageW - margin, y + 48, { align: 'right' });

  y = Math.max(cy, y + (invoice.paid_at ? 64 : 48)) + 18;

  // ── Summary of work ───────────────────────────────────
  const job = invoice.Job;
  const summary = job?.description || job?.service_type || invoice.notes || 'Cleaning services';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(156, 163, 175);
  doc.text('SUMMARY OF WORK', margin, y);
  y += 8;
  doc.setDrawColor(229, 231, 235);
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(margin, y, pageW - margin * 2, 56, 4, 4, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(55, 65, 81);
  const summaryLines = doc.splitTextToSize(summary, pageW - margin * 2 - 20);
  doc.text(summaryLines, margin + 10, y + 18);
  if (job) {
    const meta = [];
    if (job.job_number) meta.push(`Job: ${job.job_number}`);
    if (job.scheduled_date) meta.push(`Date: ${fmtDate(job.scheduled_date)}`);
    if (job.actual_duration_minutes != null) meta.push(`Duration: ${job.actual_duration_minutes} min`);
    if (meta.length) {
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(meta.join('   ·   '), margin + 10, y + 46);
    }
  }
  y += 70;

  // ── Line items ────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text('DESCRIPTION', margin, y);
  doc.text('AMOUNT', pageW - margin, y, { align: 'right' });
  y += 6;
  doc.setDrawColor(17, 24, 39);
  doc.setLineWidth(1);
  doc.line(margin, y, pageW - margin, y);
  y += 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(31, 41, 55);
  const itemDesc = job?.service_type ? `${job.service_type}${job.job_number ? ' · ' + job.job_number : ''}` : 'Cleaning Services';
  doc.text(itemDesc, margin, y);
  doc.text(fmtMoney(invoice.amount, invoice.currency), pageW - margin, y, { align: 'right' });
  y += 14;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 24;

  // ── Totals ────────────────────────────────────────────
  const totalsX = pageW - margin - 200;
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text('Subtotal', totalsX, y);
  doc.setTextColor(17, 24, 39);
  doc.text(fmtMoney(invoice.amount, invoice.currency), pageW - margin, y, { align: 'right' });
  y += 16;
  doc.setTextColor(107, 114, 128);
  doc.text('Tax', totalsX, y);
  doc.setTextColor(17, 24, 39);
  doc.text(fmtMoney(invoice.tax_amount, invoice.currency), pageW - margin, y, { align: 'right' });
  y += 8;
  doc.setLineWidth(0.5);
  doc.line(totalsX, y, pageW - margin, y);
  y += 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL', totalsX, y);
  doc.setFontSize(14);
  doc.text(fmtMoney(invoice.total_amount, invoice.currency), pageW - margin, y, { align: 'right' });
  y += 30;

  // ── Notes / payment ──────────────────────────────────
  if (invoice.payment_method || invoice.notes) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    if (invoice.payment_method) {
      doc.text(`Payment method: ${invoice.payment_method}`, margin, y);
      y += 14;
    }
    if (invoice.notes) {
      const notesLines = doc.splitTextToSize(`Notes: ${invoice.notes}`, pageW - margin * 2);
      doc.text(notesLines, margin, y);
      y += 14 * notesLines.length;
    }
  }

  // ── Footer ───────────────────────────────────────────
  doc.setFontSize(9);
  doc.setTextColor(156, 163, 175);
  doc.text('Thank you for your business.', pageW / 2, pageH - margin, { align: 'center' });

  doc.save(`${invoice.invoice_number || 'invoice'}.pdf`);
}
