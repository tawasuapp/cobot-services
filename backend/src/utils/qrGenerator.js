const QRCode = require('qrcode');

async function generateQRCode(type, id, code) {
  const data = JSON.stringify({ type, id, code });
  const qrDataUrl = await QRCode.toDataURL(data, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
  });
  return { qrData: data, qrImage: qrDataUrl };
}

function parseQRCode(qrString) {
  try {
    const parsed = JSON.parse(qrString);
    if (!parsed.type || !parsed.id) {
      throw new Error('Invalid QR code format');
    }
    return parsed;
  } catch {
    throw new Error('Invalid QR code format');
  }
}

module.exports = { generateQRCode, parseQRCode };
