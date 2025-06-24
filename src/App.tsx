
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { use6502Emulator } from './lib/use6502Emulator';
import CpuControls from './components/CpuControls';
import CpuRegistersView from './components/CpuRegistersView';
import CpuFlagsView from './components/CpuFlagsView';
import MemoryView from './components/MemoryView';
import DisassemblyView from './components/DisassemblyView';
import LogView from './components/LogView';
import { InstructionInfo } from './types';
import { SIMPLE_PROGRAM_HEX, DEFAULT_PROGRAM_LOAD_ADDRESS } from './constants';

const App: React.FC = () => {
  const {
    cpu,
    memory,
    logs,
    loadProgram,
    resetCPU,
    step,
    disassemble,
    addLog
  } = use6502Emulator();

  const [isRunning, setIsRunning] = useState(false);
  const [runSpeed, setRunSpeed] = useState(100); // Steps per second
  const [disassembledCode, setDisassembledCode] = useState<InstructionInfo[]>([]);
  const [lastLoadAddress, setLastLoadAddress] = useState<number | null>(null);

  const runIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    loadProgram(SIMPLE_PROGRAM_HEX, DEFAULT_PROGRAM_LOAD_ADDRESS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Load default program on initial mount

  // Constants for disassembly view
  const AVG_INST_LENGTH_ESTIMATE = 2.5; // Average bytes per instruction (heuristic)
  const DISASSEMBLY_LINES_BEFORE_PC = 64; // Number of instruction lines to try to show before current PC
  const DISASSEMBLY_LINES_AFTER_PC = 192;  // Number of instruction lines to try to show after current PC
  const TOTAL_DISASSEMBLY_LINES = DISASSEMBLY_LINES_BEFORE_PC + DISASSEMBLY_LINES_AFTER_PC;

  useEffect(() => {
    if (cpu.PC !== undefined && memory.length > 0) {
      try {
        // Start disassembly from a fixed address to maintain instruction alignment
        // This prevents misaligned disassembly when starting from estimated addresses
        const startDisassembleAddress = DEFAULT_PROGRAM_LOAD_ADDRESS;
        const instructions = disassemble(startDisassembleAddress, TOTAL_DISASSEMBLY_LINES);
        setDisassembledCode(instructions);
      } catch (error) {
        console.error("Disassembly error:", error);
        addLog("Error during disassembly.", "error");
      }
    }
  }, [cpu.PC, memory, disassemble, addLog]);

  const handleStep = useCallback(() => {
    if (!cpu.halted) {
      step();
    } else {
      addLog("CPU is halted. Cannot step.", "warn");
    }
  }, [step, cpu.halted, addLog]);

  const handleRun = useCallback((shouldRun: boolean) => {
    setIsRunning(shouldRun);
    if (shouldRun) {
      if (runIntervalRef.current) clearInterval(runIntervalRef.current);
      const intervalTime = Math.max(1, 1000 / runSpeed); // Ensure interval is at least 1ms
      runIntervalRef.current = window.setInterval(() => {
        step();
      }, intervalTime);
    } else {
      if (runIntervalRef.current) {
        clearInterval(runIntervalRef.current);
        runIntervalRef.current = null;
      }
    }
  }, [step, runSpeed]);

  // Cleanup interval on component unmount or when isRunning/runSpeed changes
  useEffect(() => {
    return () => {
      if (runIntervalRef.current) {
        clearInterval(runIntervalRef.current);
      }
    };
  }, []);

  // Stop running if CPU is halted
  useEffect(() => {
    if (isRunning && cpu.halted) {
      handleRun(false);
      addLog("CPU halted during run.", "warn");
    }
  }, [cpu.halted, isRunning, handleRun, addLog]);

  // Adjust running interval if speed changes while running
  useEffect(() => {
    if (isRunning && !cpu.halted) {
      handleRun(true); // Restart with new speed
    }
  }, [runSpeed, isRunning, cpu.halted, handleRun]);

  const handleLoadProgram = (hex: string, addr: number) => {
    if (isRunning) handleRun(false); // Stop running if loading new program
    loadProgram(hex, addr);
    setLastLoadAddress(addr); // Track the load address for memory view
  };

  const handleReset = () => {
    if (isRunning) handleRun(false); // Stop running on reset
    resetCPU();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 flex flex-col space-y-4">
      <header className="text-center">
        <h1 className="text-4xl font-bold text-purple-400 tracking-tight">6502 CPU Emulator</h1>
        <p className="text-md text-gray-400">A web-based MOS Technology 6502 microprocessor emulator.</p>
      </header>

      <CpuControls
        onLoadProgram={handleLoadProgram}
        onReset={handleReset}
        onStep={handleStep}
        onRun={handleRun}
        isRunning={isRunning}
        runSpeed={runSpeed}
        onSetRunSpeed={setRunSpeed}
        isHalted={cpu.halted}
      />

      <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
        <div className="md:w-2/5 lg:w-1/3 flex flex-col space-y-4"> {/* Adjusted width for left column */}
          <CpuRegistersView cpu={cpu} />
          <CpuFlagsView cpu={cpu} />
        </div>
        <div className="md:w-3/5 lg:w-2/3"> {/* Adjusted width for right column */}
          <DisassemblyView instructions={disassembledCode} currentPC={cpu.PC} />
        </div>
      </div>

      <MemoryView memory={memory} pcAddress={cpu.PC} jumpToAddress={lastLoadAddress} onAddressJumped={() => setLastLoadAddress(null)} />
      <LogView logs={logs} />

      <footer className="text-center text-sm text-gray-500 pt-4 border-t border-gray-700">
        6502 Emulator by AI. For educational purposes.
      </footer>
    </div>
  );
};

export default App;
