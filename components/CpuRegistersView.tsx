
import React from 'react';
import { CPUState } from '../types';

interface CpuRegistersViewProps {
  cpu: CPUState;
}

const RegisterDisplay: React.FC<{ name: string; value: number; hex?: boolean }> = ({ name, value, hex = true }) => (
  <div className="flex justify-between items-center p-2 bg-gray-700 rounded">
    <span className="font-mono text-sm text-blue-300">{name}</span>
    <span className="font-mono text-lg text-green-300">
      {hex ? `$${value.toString(16).toUpperCase().padStart(name === 'PC' || name === 'SP' ? 4 : 2, '0')}` : value}
    </span>
  </div>
);

const CpuRegistersView: React.FC<CpuRegistersViewProps> = ({ cpu }) => {
  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-3 text-gray-200 border-b border-gray-700 pb-2">CPU Registers</h2>
      <div className="grid grid-cols-2 gap-3">
        <RegisterDisplay name="A" value={cpu.A} />
        <RegisterDisplay name="X" value={cpu.X} />
        <RegisterDisplay name="Y" value={cpu.Y} />
        <RegisterDisplay name="PC" value={cpu.PC} />
        <RegisterDisplay name="SP" value={cpu.SP} hex={false} /> 
        {/* SP is usually shown as $01xx, but raw value is 00-FF. For simplicity, show $01XX form in text */}
         <div className="flex justify-between items-center p-2 bg-gray-700 rounded">
            <span className="font-mono text-sm text-blue-300">SP (Abs)</span>
            <span className="font-mono text-lg text-green-300">
                $01{cpu.SP.toString(16).toUpperCase().padStart(2, '0')}
            </span>
        </div>
        <RegisterDisplay name="Cycles" value={cpu.cycles} hex={false} />
      </div>
    </div>
  );
};

export default CpuRegistersView;
