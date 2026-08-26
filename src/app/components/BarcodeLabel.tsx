import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface BarcodeLabelProps {
  bagCode: string;
  bloodType: string;
  expDate: string;
  sourceName?: string;
}

export const BarcodeLabel: React.FC<BarcodeLabelProps> = ({ bagCode, bloodType, expDate, sourceName }) => {
  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border-2 border-dashed border-gray-300 w-[80mm] h-[60mm] mx-auto print:border-solid print:border-gray-400 print:w-auto print:h-auto print:p-2">
      {/* Header: Golongan Darah & Exp */}
      <div className="text-center mb-2 w-full flex justify-between px-2">
        <span className="font-bold text-xl text-red-600">{bloodType}</span>
        <span className="font-semibold text-xs text-gray-600 self-center">EXP: {expDate}</span>
      </div>

      {/* QR Code */}
      <div className="flex justify-center items-center bg-white p-1">
        <QRCodeSVG
          value={bagCode}
          size={90}
          bgColor="#ffffff"
          fgColor="#000000"
          level="M"
          includeMargin={false}
        />
      </div>

      {/* Kode Kantong */}
      <div className="text-center mt-1 w-full text-[9px] font-mono text-gray-700 tracking-widest">
        {bagCode}
      </div>

      {/* Sumber Donor */}
      <div className="text-center mt-0.5 w-full text-[9px] text-gray-500 truncate px-2">
        {sourceName || 'Donor Lokal'}
      </div>
    </div>
  );
};
