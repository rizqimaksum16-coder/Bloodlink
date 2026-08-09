import React from 'react';
import Barcode from 'react-barcode';

interface BarcodeLabelProps {
  bagCode: string;
  bloodType: string;
  expDate: string;
  sourceName?: string;
}

export const BarcodeLabel: React.FC<BarcodeLabelProps> = ({ bagCode, bloodType, expDate, sourceName }) => {
  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border-2 border-dashed border-gray-300 w-[80mm] h-[50mm] mx-auto print:border-none print:w-auto print:h-auto print:p-0">
      <div className="text-center mb-1 w-full flex justify-between px-2">
        <span className="font-bold text-lg text-red-600">{bloodType}</span>
        <span className="font-semibold text-xs text-gray-600">EXP: {expDate}</span>
      </div>
      
      <div className="w-full flex justify-center bg-white">
        <Barcode 
          value={bagCode} 
          width={1.8} 
          height={50} 
          fontSize={14} 
          margin={0}
          displayValue={true}
          background="#ffffff"
          lineColor="#000000"
        />
      </div>

      <div className="text-center mt-2 w-full text-[10px] text-gray-500 truncate px-2">
        {sourceName || 'Donor Lokal'}
      </div>
    </div>
  );
};
