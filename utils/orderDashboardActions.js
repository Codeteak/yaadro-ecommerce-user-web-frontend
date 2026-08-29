/**
 * Orders dashboard helpers loaded on demand (invoice / share).
 * Keep out of the first-paint path so list cards stay light.
 */

export function downloadOrderInvoice(order) {
  if (!order) return;

  const invoiceText = `
INVOICE
Invoice Number: ${order.orderNumber || order.id}
Order ID: ${order.id}
Date: ${new Date(order.createdAt).toLocaleDateString()}

Items:
${(order.items || [])
  .map(
    (item) =>
      `  ${item.productName || item.name} x${item.quantity} - ₹${Number(item.totalPrice || 0).toFixed(2)}`
  )
  .join('\n')}

Subtotal: ₹${Number(order.subtotal || 0).toFixed(2)}
Tax: ₹${Number(order.tax || 0).toFixed(2)}
Shipping: ₹${Number(order.shipping || 0).toFixed(2)}
Discount: ₹${Number(order.discount || 0).toFixed(2)}
Total: ₹${Number(order.total || 0).toFixed(2)}

Shipping Address:
${order.deliveryAddress?.street || ''}
${order.deliveryAddress?.city || ''}, ${order.deliveryAddress?.state || ''}
${order.deliveryAddress?.zipCode || ''}
${order.deliveryAddress?.country || ''}

Payment Method: ${order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod}
Payment Status: ${order.paymentStatus}
    `.trim();

  const blob = new Blob([invoiceText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${order.orderNumber || order.id}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function shareOrderLink(order, { onCopied } = {}) {
  if (!order?.id) return;

  const shareUrl = `${window.location.origin}/order?id=${encodeURIComponent(order.id)}`;

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: `Order ${order.orderNumber || order.id}`,
        text: 'Check out my order details!',
        url: shareUrl,
      });
      return;
    } catch {
      // Fall through to clipboard
    }
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(shareUrl);
    onCopied?.();
  }
}
