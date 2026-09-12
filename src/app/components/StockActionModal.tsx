import React, { useState, useEffect } from 'react';
import { X, ArrowDownCircle, ArrowUpCircle, CheckCircle, Trash2, AlertTriangle } from 'lucide-react';
import { format, addDays, isPast, parseISO } from 'date-fns';

export type StockActionType = 'in' | 'out';

export interface BatchItem {
  id: string;
  qty: number;
  expDate: string;
  sourceName?: string;
  codes?: string[];
}

export interface StockActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  actionType: StockActionType;
  bloodType: string;
  currentStock: number;
  batches?: BatchItem[];
}

export default function StockActionModal({
  isOpen,
  onClose,
  onSubmit,
  actionType,
  bloodType,
  currentStock,
  batches = []
}: StockActionModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [sourceType, setSourceType] = useState('donor');
  const [sourceName, setSourceName] = useState('');
  const [collectedAt, setCollectedAt] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expDate, setExpDate] = useState(format(addDays(new Date(), 35), 'yyyy-MM-dd'));
  const [reason, setReason] = useState('used_patient');
  const [reasonDetail, setReasonDetail] = useState('');

  // Batch selection for discard
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set());

  const isDiscardReason = reason === 'expired' || reason === 'discarded';

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setSourceType('donor');
      setSourceName('');
      setCollectedAt(format(new Date(), 'yyyy-MM-dd'));
      setExpDate(format(addDays(new Date(), 35), 'yyyy-MM-dd'));
      setReason(actionType === 'out' ? 'used_patient' : 'donor_event');
      setReasonDetail('');
      setSelectedBatchIds(new Set());
    }
  }, [isOpen, actionType]);

  // When reason changes to discard, reset batch selection & quantity
  useEffect(() => {
    setSelectedBatchIds(new Set());
    if (!isDiscardReason) return;
    // auto-select expired batches when switching to expired reason
    if (reason === 'expired') {
      const expiredIds = batches
        .filter(b => isPast(parseISO(b.expDate)))
        .map(b => b.id);
      setSelectedBatchIds(new Set(expiredIds));
    }
  }, [reason]);

  // Compute total qty from selected batches
  const selectedQty = isDiscardReason
    ? batches.filter(b => selectedBatchIds.has(b.id)).reduce((s, b) => s + b.qty, 0)
    : quantity;

  const toggleBatch = (id: string) => {
    setSelectedBatchIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCollectedAtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setCollectedAt(newDate);
    if (newDate) {
      setExpDate(format(addDays(new Date(newDate), 35), 'yyyy-MM-dd'));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isDiscardReason) {
      if (selectedBatchIds.size === 0) {
        alert('Pilih minimal satu batch yang akan dibuang!');
        return;
      }
      const discardedBatches = batches.filter(b => selectedBatchIds.has(b.id));
      onSubmit({
        quantity: selectedQty,
        reason,
        reason_detail: reasonDetail,
        discarded_batches: discardedBatches.map(b => b.id),
      });
      return;
    }

    if (actionType === 'out' && quantity > currentStock) {
      alert('Jumlah darah keluar tidak boleh melebihi stok yang ada!');
      return;
    }

    if (actionType === 'in') {
      onSubmit({
        quantity,
        source_type: sourceType,
        source_name: sourceName,
        collected_at: collectedAt,
        exp_date: expDate,
        reason: sourceType === 'donor' ? 'donor_event' : sourceType === 'transfer' ? 'transfer_in' : 'manual_adjustment',
        reason_detail: sourceType === 'donor' ? `Donor dari ${sourceName}` : `Tambahan dari ${sourceName}`
      });
    } else {
      onSubmit({ quantity, reason, reason_detail: reasonDetail });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${actionType === 'in' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {actionType === 'in' ? <ArrowDownCircle className="w-6 h-6" /> : <ArrowUpCircle className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="font-bold text-[#1A1A2E] text-lg">
                {actionType === 'in' ? 'Darah Masuk' : 'Darah Keluar'}
              </h3>
              <p className="text-xs text-[#9B9BB5]">
                Stok saat ini: <span className="font-bold">{currentStock}</span> kantong Golongan <span className="font-bold text-red-600">{bloodType}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full text-[#9B9BB5] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Alasan dulu untuk actionType=out agar batch selector bisa muncul lebih awal */}
          {actionType === 'out' && (
            <div>
              <label className="block text-xs font-bold text-[#4A4A6A] mb-1.5">Alasan Keluar <span className="text-red-500">*</span></label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="w-full text-sm font-medium bg-[#F9F9FC] border border-border rounded-lg py-2.5 px-3 focus:border-[#2980B9] focus:ring-0"
              >
                <option value="used_patient">Digunakan Pasien</option>
                <option value="transfer_out">Dikirim ke RS/PMI Lain</option>
                <option value="expired">Dibuang (Kadaluarsa)</option>
                <option value="discarded">Dibuang (Rusak/Terkontaminasi)</option>
                <option value="manual_adjustment">Penyesuaian Manual (Selisih)</option>
              </select>
            </div>
          )}

          {/* Batch selection — hanya muncul saat alasan buang */}
          {actionType === 'out' && isDiscardReason && batches.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-[#4A4A6A] mb-2 flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                Pilih Batch yang Dibuang <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto rounded-xl border border-border p-2 bg-[#F9F9FC]">
                {batches.map(b => {
                  const expired = isPast(parseISO(b.expDate));
                  const checked = selectedBatchIds.has(b.id);
                  return (
                    <label
                      key={b.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer border transition-all ${
                        checked
                          ? 'bg-red-50 border-red-200'
                          : 'bg-white border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleBatch(b.id)}
                        className="accent-red-500 w-4 h-4 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#1A1A2E] truncate">
                          {b.sourceName || 'Batch'} — <span className="font-bold">{b.qty} ktg</span>
                        </p>
                        <p className={`text-[10px] ${expired ? 'text-red-500 font-semibold' : 'text-[#9B9BB5]'}`}>
                          Exp: {b.expDate} {expired && '⚠ Kadaluarsa'}
                        </p>
                      </div>
                      {expired && <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                    </label>
                  );
                })}
              </div>
              {selectedQty > 0 && (
                <p className="text-xs font-semibold text-red-600 mt-1.5">
                  Total yang akan dibuang: <span className="font-extrabold">{selectedQty} kantong</span>
                </p>
              )}
            </div>
          )}

          {/* Jumlah kantong — disembunyikan saat mode discard (otomatis dari batch) */}
          {!isDiscardReason && (
            <div>
              <label className="block text-xs font-bold text-[#4A4A6A] mb-1.5">Jumlah Kantong <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="1"
                max={actionType === 'in' ? 100 : currentStock}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
                className="w-full text-center text-xl font-bold bg-[#F9F9FC] border border-border rounded-xl py-3 focus:border-[#2980B9] focus:ring-0 text-[#1A1A2E]"
              />
            </div>
          )}

          {actionType === 'in' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#4A4A6A] mb-1.5">Sumber <span className="text-red-500">*</span></label>
                  <select
                    value={sourceType}
                    onChange={(e) => setSourceType(e.target.value)}
                    required
                    className="w-full text-sm font-medium bg-[#F9F9FC] border border-border rounded-lg py-2.5 px-3 focus:border-[#2980B9] focus:ring-0"
                  >
                    <option value="donor">Donor Darah</option>
                    <option value="transfer">Transfer PMI/RS</option>
                    <option value="purchase">Pengadaan Lain</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#4A4A6A] mb-1.5">Nama Pendonor / Instansi <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={sourceName}
                    onChange={(e) => setSourceName(e.target.value)}
                    required
                    placeholder="Cth: Budi atau PMI Pusat"
                    className="w-full text-sm font-medium bg-[#F9F9FC] border border-border rounded-lg py-2.5 px-3 focus:border-[#2980B9] focus:ring-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#4A4A6A] mb-1.5">Tanggal Pengambilan <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={collectedAt}
                    onChange={handleCollectedAtChange}
                    required
                    className="w-full text-sm font-medium bg-[#F9F9FC] border border-border rounded-lg py-2.5 px-3 focus:border-[#2980B9] focus:ring-0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#4A4A6A] mb-1.5">Tanggal Kadaluarsa <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    required
                    className="w-full text-sm font-medium bg-[#F9F9FC] border border-border rounded-lg py-2.5 px-3 focus:border-[#2980B9] focus:ring-0"
                  />
                </div>
              </div>
            </>
          )}

          {actionType === 'out' && (
            <div>
              <label className="block text-xs font-bold text-[#4A4A6A] mb-1.5">Keterangan Tambahan</label>
              <textarea
                value={reasonDetail}
                onChange={(e) => setReasonDetail(e.target.value)}
                placeholder="Opsional: Nama pasien, tujuan, atau detail lainnya..."
                rows={3}
                className="w-full text-sm font-medium bg-[#F9F9FC] border border-border rounded-lg py-2.5 px-3 focus:border-[#2980B9] focus:ring-0 resize-none"
              />
            </div>
          )}

          <div className="pt-4 border-t border-border flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-[#4A4A6A] hover:bg-[#F4F4F8] transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className={`px-5 py-2.5 rounded-xl font-bold text-white flex items-center gap-2 transition-colors ${
                actionType === 'in' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
