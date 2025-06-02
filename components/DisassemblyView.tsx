import React, { useEffect, useRef } from 'react';
import { InstructionInfo } from '../types';

interface DisassemblyViewProps {
  instructions: InstructionInfo[];
  currentPC: number;
}

// Define a fixed height for the scrollable area.
// h-72 corresponds to 18rem in Tailwind CSS, pixel equivalent is 288px.
const SCROLLABLE_AREA_HEIGHT_CLASS = "h-72";

const DisassemblyView: React.FC<DisassemblyViewProps> = ({ instructions, currentPC }) => {
  const activeInstructionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeInstructionRef.current) {
      activeInstructionRef.current.scrollIntoView({
        behavior: 'auto', // Use 'auto' for less jumpiness during rapid steps, 'smooth' for animation
        block: 'nearest',   // Scrolls the minimum necessary to bring it into view. Other options: 'center', 'start', 'end'
      });
    }
  }, [currentPC, instructions]); // Rerun when PC or the list of instructions changes

  return (
    // Removed h-full. The component's height will now be determined by its content:
    // (padding + title height + fixed scrollable area height).
    <div className="bg-gray-800 p-4 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-3 text-gray-200">Disassembly</h2>
      <div className={`font-mono text-sm overflow-y-auto ${SCROLLABLE_AREA_HEIGHT_CLASS} custom-scrollbar`}>
        {instructions.map((inst) => (
          <div
            key={inst.address} // Assuming inst.address is unique for each instruction in the list
            ref={inst.address === currentPC ? activeInstructionRef : null}
            className={`p-1 whitespace-pre flex ${
              inst.address === currentPC
                ? 'bg-blue-700 text-white rounded'
                : 'hover:bg-gray-700'
            }`}
          >
            <span className="text-purple-300 w-16">${inst.address.toString(16).toUpperCase().padStart(4, '0')}:</span>
            <span className="text-gray-500 w-24">
                {inst.bytes.map(b => b.toString(16).toUpperCase().padStart(2,'0')).join(' ')}
            </span>
            <span className={`${inst.mnemonic === "???" ? 'text-red-400' : 'text-green-300'} w-12`}>{inst.mnemonic}</span>
            <span className="text-yellow-300">{inst.operandStr}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DisassemblyView;
