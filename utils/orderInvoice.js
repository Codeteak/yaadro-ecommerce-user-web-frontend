/**
 * Shared HTML invoice builder + download helpers for order-success / order details.
 */

function money(v) {
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
      return `<tr>
      <td>${name}</td>
      <td class="right">${qty}</td>
      <td class="right">${money(unit)}</td>
      <td class="right">${money(total)}</td>
    </tr>`;
    })
    .join('');

  const logoHtml = logo
    ? `<img src="${safe(logo)}" alt="" width="40" height="40" style="width:40px;height:40px;border-radius:10px;object-fit:contain;background:rgba(255,255,255,.15);margin-right:10px;vertical-align:middle"/>`
    : '';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>Invoice ${safe(orderNumber || orderId)}</title>
    <style>
      body{margin:0;font-family:ui-sans-serif,system-ui,sans-serif;color:#111;background:#f5f7f7}
      .page{max-width:820px;margin:24px auto;padding:16px}
      .card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.06)}
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
            ${[addr.street || addr.address, addr.city, addr.state, addr.zipCode || addr.postalCode, addr.country].filter(Boolean).map(safe).join(', ')}
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
          ${order?.subtotal != null ? `<div class="row"><span>Subtotal</span><b>${money(order.subtotal)}</b></div>` : ''}
          ${order?.shipping != null ? `<div class="row"><span>Delivery</span><b>${money(order.shipping)}</b></div>` : ''}
          ${order?.tax != null ? `<div class="row"><span>Tax</span><b>${money(order.tax)}</b></div>` : ''}
          ${order?.discount != null && Number(order.discount) > 0 ? `<div class="row"><span>Discount</span><b style="color:#7d24d6">−${money(order.discount)}</b></div>` : ''}
          <div class="row grand"><span><b>Total</b></span><b>${order?.total != null ? money(order.total) : '—'}</b></div>
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
