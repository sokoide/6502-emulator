
import React from 'react';
import { CPUState, Flag } from '../types';
import { FLAG_NAMES } from '../constants';


interface CpuFlagsViewProps {
  cpu: CPUState;
}

const CpuFlagsView: React.FC<CpuFlagsViewProps> = ({ cpu }) => {
  const P = cpu.P;

  const getFlagState = (flag: Flag) => (P & flag) !== 0;

  // Order N V - B D I Z C
  const flagOrder: { name: string, bit: Flag, key: number }[] = [
    { name: FLAG_NAMES[7], bit: Flag.N, key: 7 },
    { name: FLAG_NAMES[6], bit: Flag.V, key: 6 },
    { name: FLAG_NAMES[5], bit: Flag.U, key: 5 }, // U for unused or '-'
    { name: FLAG_NAMES[4], bit: Flag.B, key: 4 },
    { name: FLAG_NAMES[3], bit: Flag.D, key: 3 },
    { name: FLAG_NAMES[2], bit: Flag.I, key: 2 },
    { name: FLAG_NAMES[1], bit: Flag.Z, key: 1 },
    { name: FLAG_NAMES[0], bit: Flag.C, key: 0 },
  ];


  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md mt-4">
      <h2 className="text-xl font-semibold mb-3 text-gray-200 border-b border-gray-700 pb-2">Status Flags (P)
        <span className="font-mono text-sm ml-2 text-purple-300">
          ${P.toString(16).toUpperCase().padStart(2, '0')}
        </span>
      </h2>
      <div className="flex justify-around items-center bg-gray-700 p-3 rounded">
        {flagOrder.map(f => (
          <div key={f.key} className="text-center">
            <div className={`font-mono text-lg ${getFlagState(f.bit) ? 'text-green-400' : 'text-red-400'}`}>
              {getFlagState(f.bit) ? '1' : '0'}
            </div>
            <div className="font-mono text-xs text-blue-300">{f.name}</div>
          </div>
        ))}
      </div>
      {cpu.halted && <p className="text-red-400 font-bold text-center mt-3">CPU HALTED</p>}
    </div>
  );
};

export default CpuFlagsView;
