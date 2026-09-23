/**
 * Shared HTML invoice builder + download helpers for order-success / order details.
 */

function money(v) {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? `Rs.${n.toFixed(2)}` : '—';
}

function moneyInr(v) {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? `₹${n.toFixed(2)}` : '—';
}

function safe(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isFreeLine(it) {
  const qty = it.quantity ?? 1;
  const unit = it.unitPrice ?? it.price ?? '';
  const total = it.totalPrice ?? (unit !== '' ? Number(unit) * qty : 0);
  return (
    !!it.isConfirmedFreeReward ||
    (Number(total) < 0.01 && Number(unit) > 0)
  );
}

/**
 * @param {{
 *   order: object|null|undefined,
 *   orderId?: string,
 *   paymentStatus?: string,
 *   shopName?: string,
 *   shopImage?: string|null,
 * }} opts
 */
export function buildBillHtml({
  order,
  orderId,
  paymentStatus,
  shopName = 'Yaadro',
  shopImage = null,
} = {}) {
  const items = order?.items || [];
  const addr = order?.deliveryAddress || order?.address || {};
  const createdAt = order?.createdAt ? new Date(order.createdAt).toLocaleString() : '';
  const orderNumber = order?.orderNumber || '';
  const payment = paymentStatus || order?.paymentStatus || 'success';
  const method = order?.paymentMethod || '';
  const brand = String(shopName || 'Yaadro').trim() || 'Yaadro';
  const logo = shopImage ? String(shopImage).trim() : '';

  const rows = items
    .map((it) => {
      const name = safe(it.productName || it.name || it.product?.name || 'Item');
      const qty = it.quantity ?? 1;
      const unit = it.unitPrice ?? it.price ?? '';
      const total = it.totalPrice ?? (unit !== '' ? Number(unit) * qty : '');
      const free = isFreeLine(it);
      const totalLabel = free ? 'FREE' : moneyInr(total);
      const nameLabel = free ? `${name} (FREE)` : name;
      return `<tr>
      <td>${nameLabel}</td>
      <td class="right">${qty}</td>
      <td class="right">${moneyInr(unit)}</td>
      <td class="right">${totalLabel}</td>
    </tr>`;
    })
    .join('');

  const logoHtml = logo
    ? `<img src="${safe(logo)}" alt="" crossorigin="anonymous" width="40" height="40" style="width:40px;height:40px;border-radius:10px;object-fit:contain;background:rgba(255,255,255,.15);margin-right:10px;vertical-align:middle"/>`
    : '';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>Invoice ${safe(orderNumber || orderId)}</title>
    <style>
      body{margin:0;font-family:ui-sans-serif,system-ui,sans-serif;color:#111;background:#fff}
      .page{max-width:820px;margin:0 auto;padding:16px}
      .card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden}
      .top{background:linear-gradient(90deg,#902bf5,#7d24d6);color:#fff;padding:18px}
      .brand{display:flex;justify-content:space-between;align-items:flex-start}
      .brand h1{margin:0;font-size:22px}
      .meta{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:16px}
      .pill{border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;padding:12px}
      .pill .k{font-size:11px;color:#6b7280}
      .pill .v{font-weight:700;margin-top:4px}
      .section{padding:0 16px 16px}
      .section h3{margin:0 0 8px;font-size:13px}
      .address{border:1px solid #e5e7eb;border-radius:14px;padding:12px}
      table{width:100%;border-collapse:collapse}
      th,td{padding:10px 8px;border-bottom:1px solid #f1f5f9;font-size:13px;vertical-align:top}
      th{background:#f9fafb;color:#374151;font-size:12px}
      .right{text-align:right}
      .totals{border:1px solid #e5e7eb;border-radius:14px;padding:12px}
      .row{display:flex;justify-content:space-between;margin:6px 0;font-size:13px;color:#374151}
      .grand{border-top:1px solid #e5e7eb;margin-top:10px;padding-top:10px;font-size:15px}
      .foot{padding:14px 16px;color:#6b7280;font-size:11px;border-top:1px solid #eef2f7}
      @media print{body{background:#fff}.page{margin:0}.card{box-shadow:none}}
    </style>
  </head>
  <body>
    <div class="page"><div class="card">
      <div class="top">
        <div class="brand">
          <div style="display:flex;align-items:center">
            ${logoHtml}
            <div><h1>${safe(brand)}</h1><small>Order invoice</small></div>
          </div>
          <div style="text-align:right"><small>INVOICE</small>
            <div style="font-weight:800;font-size:14px;margin-top:2px">${safe(orderNumber || orderId)}</div>
          </div>
        </div>
      </div>
      <div class="meta">
        <div class="pill"><div class="k">Order ID</div><div class="v">${safe(orderId || order?.id || '')}</div></div>
        <div class="pill"><div class="k">Date</div><div class="v">${safe(createdAt) || '—'}</div></div>
        <div class="pill"><div class="k">Payment</div><div class="v">${safe(payment)}</div></div>
        <div class="pill"><div class="k">Method</div><div class="v">${safe(method) || '—'}</div></div>
      </div>
      <div class="section">
        <h3>Delivery Address</h3>
        <div class="address">
          <div style="font-weight:700">${safe(addr.fullName || addr.name || '')}${addr.phone ? ' • ' + safe(addr.phone) : ''}</div>
          <div style="margin-top:4px;color:#374151">
            ${[addr.street || addr.address, addr.city].filter(Boolean).map(safe).join(', ')}
          </div>
        </div>
      </div>
      <div class="section">
        <h3>Items</h3>
        <table>
          <thead><tr><th>Item</th><th class="right">Qty</th><th class="right">Unit</th><th class="right">Total</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="4">No items</td></tr>'}</tbody>
        </table>
      </div>
      <div class="section">
        <div class="totals">
          ${order?.subtotal != null ? `<div class="row"><span>Subtotal</span><b>${moneyInr(order.subtotal)}</b></div>` : ''}
          ${order?.shipping != null ? `<div class="row"><span>Delivery</span><b>${moneyInr(order.shipping)}</b></div>` : ''}
          ${order?.tax != null ? `<div class="row"><span>Tax</span><b>${moneyInr(order.tax)}</b></div>` : ''}
          ${order?.discount != null && Number(order.discount) > 0 ? `<div class="row"><span>Discount</span><b style="color:#7d24d6">−${moneyInr(order.discount)}</b></div>` : ''}
          <div class="row grand"><span><b>Total</b></span><b>${order?.total != null ? moneyInr(order.total) : '—'}</b></div>
        </div>
      </div>
      <div class="foot">This is a computer-generated invoice.</div>
    </div></div>
  </body>
</html>`;
}

function invoiceFileBase(order, orderId) {
  return String(order?.orderNumber || order?.id || orderId || 'invoice').replace(/[^\w.-]+/g, '_');
}

function wrapText(doc, text, x, y, maxWidth, lineHeight = 5) {
  const lines = doc.splitTextToSize(String(text || ''), maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

/**
 * Build a real text PDF (no canvas screenshot).
 * Uses Rs. for currency so default PDF fonts render reliably.
 */
async function buildTextPdf(opts) {
  const { jsPDF } = await import('jspdf');
  const order = opts.order || {};
  const items = order.items || [];
  const addr = order.deliveryAddress || order.address || {};
  const brand = String(opts.shopName || 'Yaadro').trim() || 'Yaadro';
  const orderNumber = order.orderNumber || opts.orderId || '';
  const createdAt = order.createdAt ? new Date(order.createdAt).toLocaleString() : '—';
  const payment = opts.paymentStatus || order.paymentStatus || 'success';
  const method = order.paymentMethod || '—';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = 16;

  const ensureSpace = (need = 12) => {
    if (y + need <= pageH - 14) return;
    doc.addPage();
    y = 16;
  };

  // Header bar
  doc.setFillColor(144, 43, 245);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(brand, margin, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Order invoice', margin, 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('INVOICE', pageW - margin, 11, { align: 'right' });
  doc.setFontSize(9);
  doc.text(String(orderNumber), pageW - margin, 18, { align: 'right' });

  y = 36;
  doc.setTextColor(17, 17, 17);

  const meta = [
    ['Order ID', String(opts.orderId || order.id || '—')],
    ['Date', createdAt],
    ['Payment', String(payment)],
    ['Method', String(method || '—')],
  ];
  const colW = contentW / 2 - 2;
  meta.forEach((pair, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * (colW + 4);
    const yy = y + row * 16;
    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(x, yy, colW, 14, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(pair[0], x + 3, yy + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(17, 17, 17);
    const val = doc.splitTextToSize(pair[1], colW - 6);
    doc.text(val[0] || '—', x + 3, yy + 10);
    doc.setFont('helvetica', 'normal');
  });
  y += 36;

  ensureSpace(24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Delivery Address', margin, y);
  y += 3;
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin, y, contentW, 22, 2, 2, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(17, 17, 17);
  const nameLine = [addr.fullName || addr.name, addr.phone].filter(Boolean).join(' • ') || '—';
  y = wrapText(doc, nameLine, margin + 3, y + 6, contentW - 6, 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(55, 65, 81);
  const addressLine = [addr.street || addr.address, addr.city]
    .filter(Boolean)
    .join(', ');
  y = wrapText(doc, addressLine || '—', margin + 3, y + 1, contentW - 6, 4.5);
  y += 8;

  ensureSpace(16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 17, 17);
  doc.text('Items', margin, y);
  y += 5;

  // Table header
  doc.setFillColor(249, 250, 251);
  doc.rect(margin, y, contentW, 8, 'F');
  doc.setFontSize(8);
  doc.setTextColor(55, 65, 81);
  doc.text('Item', margin + 2, y + 5.5);
  doc.text('Qty', margin + contentW * 0.56, y + 5.5, { align: 'right' });
  doc.text('Unit', margin + contentW * 0.74, y + 5.5, { align: 'right' });
  doc.text('Total', margin + contentW - 2, y + 5.5, { align: 'right' });
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(17, 17, 17);

  if (items.length === 0) {
    doc.setFontSize(9);
    doc.text('No items', margin + 2, y);
    y += 8;
  } else {
    items.forEach((it) => {
      const name = it.productName || it.name || it.product?.name || 'Item';
      const qty = it.quantity ?? 1;
      const unit = it.unitPrice ?? it.price ?? '';
      const total = it.totalPrice ?? (unit !== '' ? Number(unit) * qty : '');
      const free = isFreeLine(it);
      const nameText = free ? `${name} (FREE)` : String(name);
      const nameLines = doc.splitTextToSize(nameText, contentW * 0.5);
      const rowH = Math.max(8, nameLines.length * 4.5 + 3);
      ensureSpace(rowH + 2);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(nameLines, margin + 2, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(String(qty), margin + contentW * 0.56, y + 4, { align: 'right' });
      doc.text(money(unit), margin + contentW * 0.74, y + 4, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(free ? 'FREE' : money(total), margin + contentW - 2, y + 4, {
        align: 'right',
      });
      doc.setFont('helvetica', 'normal');
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + rowH - 1, margin + contentW, y + rowH - 1);
      y += rowH;
    });
  }

  y += 4;
  ensureSpace(36);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin, y, contentW, 32, 2, 2, 'S');
  let ty = y + 7;
  const addTotalRow = (label, value, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 11 : 9);
    doc.setTextColor(17, 17, 17);
    doc.text(label, margin + 4, ty);
    doc.text(value, margin + contentW - 4, ty, { align: 'right' });
    ty += 6;
  };
  if (order.subtotal != null) addTotalRow('Subtotal', money(order.subtotal));
  if (order.shipping != null) addTotalRow('Delivery', money(order.shipping));
  if (order.tax != null) addTotalRow('Tax', money(order.tax));
  if (order.discount != null && Number(order.discount) > 0) {
    addTotalRow('Discount', `- ${money(order.discount)}`);
  }
  addTotalRow('Total', order.total != null ? money(order.total) : '—', true);

  y = ty + 8;
  ensureSpace(10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text('This is a computer-generated invoice.', margin, y);

  return doc;
}

/** Download invoice HTML as a file (no popup). */
export function downloadBillHtml(opts) {
  const html = buildBillHtml(opts);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${invoiceFileBase(opts.order, opts.orderId)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate and download a real PDF invoice in the browser.
 * @returns {Promise<'pdf'|'printed'|'downloaded'>}
 */
export async function downloadBillPdf(opts) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return 'downloaded';
  }

  const fileBase = invoiceFileBase(opts.order, opts.orderId);

  try {
    const doc = await buildTextPdf(opts);
    doc.save(`${fileBase}.pdf`);
    return 'pdf';
  } catch {
    return printBillPdf(opts);
  }
}

/**
 * Open print dialog for PDF. Falls back to HTML download if popup blocked.
 * @returns {'printed'|'downloaded'}
 */
export function printBillPdf(opts) {
  const html = buildBillHtml(opts);
  try {
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) {
      downloadBillHtml(opts);
      return 'downloaded';
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => {
      try {
        w.print();
      } catch {
        /* ignore */
      }
    }, 400);
    return 'printed';
  } catch {
    downloadBillHtml(opts);
    return 'downloaded';
  }
}
