
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { use6502Emulator } from './services/use6502Emulator';
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

  const runIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    loadProgram(SIMPLE_PROGRAM_HEX, DEFAULT_PROGRAM_LOAD_ADDRESS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Load default program on initial mount

  // Constants for disassembly view
  const AVG_INST_LENGTH_ESTIMATE = 2.5; // Average bytes per instruction (heuristic)
  const DISASSEMBLY_LINES_BEFORE_PC = 15; // Number of instruction lines to try to show before current PC
  const DISASSEMBLY_LINES_AFTER_PC = 35;  // Number of instruction lines to try to show after current PC
  const TOTAL_DISASSEMBLY_LINES = DISASSEMBLY_LINES_BEFORE_PC + DISASSEMBLY_LINES_AFTER_PC;

  useEffect(() => {
    if (cpu.PC !== undefined && memory.length > 0) {
      try {
        // Calculate a start address to provide context before the current PC
        const estimatedBytesBeforePC = Math.floor(DISASSEMBLY_LINES_BEFORE_PC * AVG_INST_LENGTH_ESTIMATE);
        const startDisassembleAddress = Math.max(0, cpu.PC - estimatedBytesBeforePC);
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
    if (shouldRun && !cpu.halted) {
      if (runIntervalRef.current) clearInterval(runIntervalRef.current);
      const intervalTime = Math.max(1, 1000 / runSpeed); // Ensure interval is at least 1ms
      runIntervalRef.current = window.setInterval(() => {
        if (cpu.halted) { // Check halt state inside interval as well
          setIsRunning(false);
          if (runIntervalRef.current) clearInterval(runIntervalRef.current);
          addLog("CPU halted during run.", "warn");
          return;
        }
        step();
      }, intervalTime);
    } else {
      if (runIntervalRef.current) {
        clearInterval(runIntervalRef.current);
        runIntervalRef.current = null;
      }
    }
  }, [step, runSpeed, cpu.halted, addLog]);

  // Cleanup interval on component unmount or when isRunning/runSpeed changes
  useEffect(() => {
    return () => {
      if (runIntervalRef.current) {
        clearInterval(runIntervalRef.current);
      }
    };
  }, []);

  // Adjust running interval if speed changes while running
  useEffect(() => {
    if (isRunning && !cpu.halted) {
      handleRun(true); // Restart with new speed
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runSpeed]); // Only re-run if runSpeed changes. handleRun has other deps.

  const handleLoadProgram = (hex: string, addr: number) => {
    if (isRunning) handleRun(false); // Stop running if loading new program
    loadProgram(hex, addr);
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
        <div className="md:w-1/3 lg:w-1/4 flex flex-col space-y-4">
          <CpuRegistersView cpu={cpu} />
          <CpuFlagsView cpu={cpu} />
        </div>
        <div className="md:w-2/3 lg:w-3/4">
          <DisassemblyView instructions={disassembledCode} currentPC={cpu.PC} />
        </div>
      </div>

      <MemoryView memory={memory} pcAddress={cpu.PC} />
      <LogView logs={logs} />

      <footer className="text-center text-sm text-gray-500 pt-4 border-t border-gray-700">
        6502 Emulator by AI. For educational purposes.
      </footer>
    </div>
  );
};

export default App;
