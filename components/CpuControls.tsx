
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SIMPLE_PROGRAM_HEX, DEFAULT_PROGRAM_LOAD_ADDRESS } from '../constants';
import { ClipboardPaste } from 'lucide-react'
interface CpuControlsProps {
  onLoadProgram: (hexString: string, loadAddress: number) => void;
  onReset: () => void;
  onStep: () => void;
  onRun: (isRunning: boolean) => void;
  isRunning: boolean;
  runSpeed: number;
  onSetRunSpeed: (speed: number) => void;
  isHalted: boolean;
}

const ControlButton: React.FC<{ onClick: () => void; children: React.ReactNode; color?: string; disabled?: boolean, className?: string }> =
  ({ onClick, children, color = "blue", disabled = false, className = "" }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 font-semibold rounded-md shadow-sm text-white
                bg-${color}-600 hover:bg-${color}-700 focus:outline-none focus:ring-2
                focus:ring-${color}-500 focus:ring-offset-2 focus:ring-offset-gray-900
                disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {children}
    </button>
  );

// --- Define your sample programs here ---
// Each object should have:
// - name: string (display name in the dropdown)
// - hex: string (space-separated hex bytes of the program)
// - loadAddress: number (the address where the program should be loaded)
const samplePrograms = [
  {
    name: "Sample 1: Infinite Loop (JMP $0200)",
    hex: "4C 00 02", // JMP $0200 (assuming loaded at $0200, it jumps to itself)
    loadAddress: 0x0200
  },
  {
    name: "Sample 2: Load A, Store $00, Loop",
    hex: "A9 C0 85 00 4C 04 02", // LDA #$C0, STA $00, JMP $0204 (loop)
    loadAddress: 0x0200
  },
  {
    name: "Sample 3: Default Simple Program (from constants)",
    hex: SIMPLE_PROGRAM_HEX,
    loadAddress: DEFAULT_PROGRAM_LOAD_ADDRESS
  },
  // To add your own program:
  // {
  //   name: "My Custom Program Name",
  //   hex: "YOUR HEX CODE HERE", // e.g., "A9 FF 8D 00 01 EA"
  //   loadAddress: 0x0300 // Your desired load address
  // },
];
// --- End of sample programs definition ---


const CpuControls: React.FC<CpuControlsProps> = ({
  onLoadProgram, onReset, onStep, onRun, isRunning, runSpeed, onSetRunSpeed, isHalted
}) => {
  const [hexCode, setHexCode] = useState<string>(SIMPLE_PROGRAM_HEX);
  const [loadAddress, setLoadAddress] = useState<string>(DEFAULT_PROGRAM_LOAD_ADDRESS.toString(16));
  const [isSampleMenuOpen, setIsSampleMenuOpen] = useState(false);
  const sampleMenuRef = useRef<HTMLDivElement>(null);


  const handleLoadFromTextarea = useCallback(() => {
    const addr = parseInt(loadAddress, 16);
    if (isNaN(addr) || addr < 0 || addr >= 0x10000) {
      alert("Invalid load address. Must be a hex value between 0000 and FFFF.");
      return;
    }
    onLoadProgram(hexCode, addr);
  }, [hexCode, loadAddress, onLoadProgram]);

  const handleRunToggle = () => {
    onRun(!isRunning);
  };

  const handleLoadSample = (sample: typeof samplePrograms[0]) => {
    setHexCode(sample.hex);
    setLoadAddress(sample.loadAddress.toString(16).padStart(4, '0'));
    onLoadProgram(sample.hex, sample.loadAddress);
    setIsSampleMenuOpen(false);
  };

  const handleClearAndPaste = useCallback(async () => {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      alert('Clipboard API is not available in this browser or context.');
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      setHexCode(text);
    } catch (err) {
      console.error('Failed to read clipboard contents:', err);
      // Inform the user that pasting failed, possibly due to permissions or empty clipboard
      alert('Failed to paste from clipboard. Please ensure you have granted permission and copied text.');
    }
  }, [setHexCode]);

  // Close sample menu if clicked outside
  // Fixed: Import useEffect from react
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sampleMenuRef.current && !sampleMenuRef.current.contains(event.target as Node)) {
        setIsSampleMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-700 pb-2">Controls</h2>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <label htmlFor="hexCode" className="block text-sm font-medium text-gray-300">
            Program Hex Code:
          </label>
          <button
            type="button"
            onClick={handleClearAndPaste}
            className="p-1 text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            title="Clear and Paste from Clipboard"
          >
              <ClipboardPaste size={24} />
          </button>
        </div>
        <textarea
          id="hexCode"
          rows={3}
          className="w-full p-2 font-mono text-sm bg-gray-700 text-gray-100 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          value={hexCode}
          onChange={(e) => setHexCode(e.target.value)}
          placeholder="A9 01 8D 00 02 EA..."
          aria-label="Program Hex Code Input"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="loadAddress" className="block text-sm font-medium text-gray-300 mb-1">
          Load Address (hex):
        </label>
        <input
          type="text"
          id="loadAddress"
          className="w-full p-2 font-mono text-sm bg-gray-700 text-gray-100 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          value={loadAddress.toUpperCase()}
          onChange={(e) => setLoadAddress(e.target.value)}
          placeholder="0200"
          aria-label="Load Address Input"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <div className="relative col-span-1" ref={sampleMenuRef}>
          <ControlButton
            onClick={() => setIsSampleMenuOpen(!isSampleMenuOpen)}
            color="purple"
            className="w-full"
            aria-haspopup="true"
            aria-expanded={isSampleMenuOpen}
          >
            Load Sample Program &#x25BC;
          </ControlButton>
          {isSampleMenuOpen && (
            <div className="absolute z-10 mt-1 w-full bg-gray-700 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {samplePrograms.map((sample, index) => (
                <button
                  key={index}
                  onClick={() => handleLoadSample(sample)}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-purple-600 hover:text-white"
                  role="menuitem"
                >
                  {sample.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <ControlButton onClick={handleLoadFromTextarea} color="indigo" className="w-full">Load from Textarea</ControlButton>
        <ControlButton onClick={onReset} color="red" className="w-full">Reset CPU</ControlButton>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-2 gap-3 mb-4">
        <ControlButton onClick={onStep} color="green" disabled={isRunning || isHalted} className="w-full">Step</ControlButton>
        <ControlButton onClick={handleRunToggle} color={isRunning ? "yellow" : "teal"} disabled={isHalted} className="w-full">
          {isRunning ? 'Pause' : 'Run'}
        </ControlButton>
      </div>


      <div>
        <label htmlFor="runSpeed" className="block text-sm font-medium text-gray-300 mb-1">
          Run Speed (steps/sec): {runSpeed}
        </label>
        <input
          type="range"
          id="runSpeed"
          min="1"
          max="1000"
          step="1"
          value={runSpeed}
          onChange={(e) => onSetRunSpeed(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
          disabled={isRunning}
          aria-label="Run Speed Control"
        />
        <div className="text-xs text-gray-400 flex justify-between"><span>Slow (1)</span> <span>Fast (1000)</span></div>
      </div>
    </div>
  );
};

export default CpuControls;