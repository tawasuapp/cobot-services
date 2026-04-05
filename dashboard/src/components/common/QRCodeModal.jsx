import { useState, useEffect } from 'react';
import { Download, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';

export default function QRCodeModal({ isOpen, onClose, entityType, entityId, entityName }) {
  const [qrImage, setQrImage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !entityId || !entityType) return;
    setLoading(true);
    setQrImage(null);

    api.post(`/${entityType}s/${entityId}/qr`)
      .then(({ data }) => setQrImage(data.qr_image))
      .catch(() => toast.error('Failed to generate QR code'))
      .finally(() => setLoading(false));
  }, [isOpen, entityId, entityType]);

  const handleDownload = () => {
    if (!qrImage) return;
    const link = document.createElement('a');
    link.href = qrImage;
    link.download = `${entityType}-${entityName || entityId}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const typeLabel = entityType ? entityType.charAt(0).toUpperCase() + entityType.slice(1) : '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${typeLabel} QR Code`} size="sm">
      <div className="flex flex-col items-center space-y-4 py-2">
        <p className="text-sm text-gray-600">
          <span className="font-medium text-gray-900">{entityName || 'N/A'}</span>
          <span className="ml-1 text-gray-400">({typeLabel})</span>
        </p>

        {loading ? (
          <div className="py-8"><LoadingSpinner /></div>
        ) : qrImage ? (
          <img src={qrImage} alt={`${typeLabel} QR Code`} className="w-64 h-64 border border-gray-200 rounded-lg" />
        ) : (
          <div className="py-8 text-sm text-gray-400">No QR code available</div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={handleDownload} disabled={!qrImage}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50">
            <Download size={16} /> Download
          </button>
          <button onClick={() => window.print()} disabled={!qrImage}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 rounded-lg disabled:opacity-50">
            <Printer size={16} /> Print
          </button>
        </div>
      </div>
    </Modal>
  );
}
