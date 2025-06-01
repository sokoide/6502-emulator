
import React, { useState, useEffect, useRef } from 'react';
import { MEMORY_SIZE } from '../constants'; // Import MEMORY_SIZE

interface MemoryViewProps {
  memory: Uint8Array;
  highlightAddress?: number;
  pcAddress?: number;
}

const BYTES_PER_ROW = 16;
const NUM_ROWS = 16; // Display 16 rows (256 bytes) at a time

const MemoryView: React.FC<MemoryViewProps> = ({ memory, highlightAddress, pcAddress }) => {
  const [startAddress, setStartAddress] = useState(0x0000); // Default start address
  const [inputAddress, setInputAddress] = useState("0000"); // Default input address field
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // On initial mount, the view uses its default startAddress (0x0000).
      // The inputAddress is already "0000" via its own useState.
      // We simply return to prevent auto-scrolling based on the initial PC.
      return;
    }

    // Auto-scroll to center PC if pcAddress changes and it's out of the current view.
    // This runs *after* the initial mount.
    // if (pcAddress !== undefined) {
    //   const currentViewEndAddress = startAddress + (NUM_ROWS * BYTES_PER_ROW);
    //   if (pcAddress < startAddress || pcAddress >= currentViewEndAddress) {
    //     const halfViewSizeInBytes = Math.floor(NUM_ROWS / 2) * BYTES_PER_ROW;

    //     let newStartAttempt = pcAddress - halfViewSizeInBytes;

    //     const maxPossibleStartAddress = MEMORY_SIZE - (NUM_ROWS * BYTES_PER_ROW);
    //     newStartAttempt = Math.max(0, newStartAttempt);
    //     newStartAttempt = Math.min(newStartAttempt, maxPossibleStartAddress);

    //     const alignedNewStart = Math.floor(newStartAttempt / BYTES_PER_ROW) * BYTES_PER_ROW;

    //     setStartAddress(alignedNewStart);
    //     // Also update the input field to reflect the new auto-scrolled address
    //     setInputAddress(alignedNewStart.toString(16).padStart(4, '0').toUpperCase());
    //   }
    // }
  }, [pcAddress]); // Only re-run if pcAddress changes, to preserve manual navigation


  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputAddress(e.target.value.toUpperCase());
  };

  const handleGoToAddress = () => {
    const newAddr = parseInt(inputAddress, 16);
    if (!isNaN(newAddr) && newAddr >= 0 && newAddr <= 0xFFFF) {
      setStartAddress(Math.floor(newAddr / BYTES_PER_ROW) * BYTES_PER_ROW); // Align to row start
    } else {
      alert("Invalid address. Must be hex between 0000 and FFFF.");
    }
  };

  const renderMemoryRows = () => {
    const rows = [];
    for (let i = 0; i < NUM_ROWS; i++) {
      const rowAddress = startAddress + (i * BYTES_PER_ROW);
      if (rowAddress >= MEMORY_SIZE) break;

      const byteCells = [];
      const asciiChars = [];
      for (let j = 0; j < BYTES_PER_ROW; j++) {
        const currentByteAddress = rowAddress + j;
        if (currentByteAddress >= MEMORY_SIZE) {
          byteCells.push(<td key={j} className="w-8 h-8 p-1 font-mono text-xs text-center text-gray-600">--</td>);
          asciiChars.push(<td key={`asc-${j}`} className="w-4 h-8 p-1 font-mono text-xs text-center text-gray-600">.</td>);
          continue;
        }

        const byteValue = memory[currentByteAddress];
        let cellClass = "w-8 h-8 p-1 font-mono text-xs text-center text-gray-400";
        if (currentByteAddress === highlightAddress) cellClass += " bg-yellow-600 text-black";
        else if (currentByteAddress === pcAddress) cellClass += " bg-blue-600 text-white";


        byteCells.push(
          <td key={j} className={cellClass}>{byteValue !== undefined ? byteValue.toString(16).padStart(2, '0').toUpperCase() : '--'}</td>
        );
        asciiChars.push(
          <td key={`asc-${j}`} className={`w-4 h-8 p-1 font-mono text-xs text-center ${currentByteAddress === pcAddress ? 'text-blue-300' : 'text-teal-300'}`}>
            {(byteValue >= 32 && byteValue <= 126) ? String.fromCharCode(byteValue) : '.'}</td>
        );
      }

      rows.push(
        <tr key={i} className="hover:bg-gray-700 transition-colors">
          <td className="p-1 font-mono text-xs text-purple-300 sticky left-0 bg-gray-800">${rowAddress.toString(16).padStart(4, '0').toUpperCase()}</td>
          {byteCells}
          <td className="p-1 border-l border-gray-600"></td>
          {/* Separator */}
          {asciiChars}
          </tr>
      );
    }
    return rows;
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md mt-4">
      <div className="flex justify-between items-center mb-3 border-b border-gray-700 pb-2">
        <h2 className="text-xl font-semibold text-gray-200">Memory View</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">Go to: $</span>
          <input
            type="text"
            value={inputAddress}
            onChange={handleAddressChange}
            onKeyDown={(e) => e.key === 'Enter' && handleGoToAddress()}
            className="w-20 p-1 font-mono text-sm bg-gray-700 text-gray-100 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            maxLength={4}
            aria-label="Go to address"
          />
          <button
            onClick={handleGoToAddress}
            className="px-3 py-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-sm"
            aria-label="Go to specified address"
          >
            Go
          </button>
        </div>
      </div>
      <div className="overflow-x-auto max-h-96 relative">
        <table className="w-full border-collapse" aria-label="Memory content">
            <thead className="sticky top-0 bg-gray-800 z-10">
                <tr>
                    <th scope="col" className="p-1 font-mono text-xs text-left text-gray-400 sticky left-0 bg-gray-800">Addr</th>
                    {Array.from({ length: BYTES_PER_ROW }).map((_, i) => (
                    <th scope="col" key={i} className="p-1 font-mono text-xs text-center text-gray-400 w-8">{i.toString(16).toUpperCase()}</th>
                    ))}
                    <th scope="col" className="p-1 border-l border-gray-600" aria-hidden="true"></th>
                    {Array.from({ length: BYTES_PER_ROW }).map((_, i) => (
                    <th scope="col" key={`asc-head-${i}`} className="p-1 font-mono text-xs text-center text-gray-400 w-4"></th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {renderMemoryRows()}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default MemoryView;
