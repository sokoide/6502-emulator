
import { useState, useCallback, useRef } from 'react';
import { CPUState, Flag, InstructionInfo, LogEntry } from '../types';
import { MEMORY_SIZE, DEFAULT_PROGRAM_LOAD_ADDRESS, RESET_VECTOR_ADDRESS } from '../constants';
import { getInstructionDefinition } from './cpuInstructions';
import * as AM from './cpuAddressingModes';

const initialCPUState: CPUState = {
  A: 0, X: 0, Y: 0,
  PC: DEFAULT_PROGRAM_LOAD_ADDRESS,
  SP: 0xFD, // Stack pointer starts at $FD, stack is $0100-$01FF
  P: Flag.U | Flag.I, // Unused and Interrupt Disable flags set initially
  cycles: 0,
  halted: false,
};

export const use6502Emulator = () => {
  const [cpu, setCPU] = useState<CPUState>(initialCPUState);
  const [memory, setMemory] = useState<Uint8Array>(() => new Uint8Array(MEMORY_SIZE));
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logIdCounter = useRef(0);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [{ id: logIdCounter.current++, message, type, timestamp: new Date() }, ...prev.slice(0, 99)]);
  }, []);

  const resetCPU = useCallback((loadAddress?: number) => {
    // Try to read reset vector if memory is initialized, otherwise default
    let startPC = loadAddress ?? DEFAULT_PROGRAM_LOAD_ADDRESS;
    if (memory[RESET_VECTOR_ADDRESS] !== undefined && memory[RESET_VECTOR_ADDRESS + 1] !== undefined && !loadAddress) {
      const lowByte = memory[RESET_VECTOR_ADDRESS];
      const highByte = memory[RESET_VECTOR_ADDRESS + 1];
      startPC = (highByte << 8) | lowByte;
    }

    setCPU({
      ...initialCPUState,
      PC: startPC,
      P: Flag.U | Flag.I, // Ensure I is set on reset
      SP: 0xFD,
      halted: false,
      cycles: 0,
    });
    addLog(`CPU Reset. PC set to $${startPC.toString(16).toUpperCase().padStart(4, '0')}.`, 'info');
  }, [memory, addLog]);

  const loadProgram = useCallback((hexString: string, loadAddr: number = DEFAULT_PROGRAM_LOAD_ADDRESS) => {
    try {
      // Input validation
      if (!hexString || typeof hexString !== 'string') {
        addLog("Error: Invalid hex string provided.", 'error');
        return;
      }

      if (loadAddr < 0 || loadAddr >= MEMORY_SIZE) {
        addLog(`Error: Load address $${loadAddr.toString(16).toUpperCase()} is out of range.`, 'error');
        return;
      }

      const newMemory = new Uint8Array(MEMORY_SIZE);
      hexString = hexString.replace(/\s+/g, ''); // Remove whitespace
      
      if (hexString.length === 0) {
        addLog("Error: Empty hex string provided.", 'error');
        return;
      }
      
      if (hexString.length % 2 !== 0) {
        addLog("Error: Hex string must have even number of characters.", 'error');
        return;
      }
      
      const bytes = Array.from(
        { length: hexString.length / 2 }, 
        (_, i) => hexString.slice(i * 2, i * 2 + 2)
      ).map(s => parseInt(s, 16));

      if (bytes.some(isNaN)) {
        addLog("Error: Hex string contains invalid characters. Only 0-9, A-F allowed.", 'error');
        return;
      }

      // Check if program fits in memory
      if (loadAddr + bytes.length > MEMORY_SIZE) {
        addLog(`Error: Program too large. Would exceed memory bounds at $${(loadAddr + bytes.length - 1).toString(16).toUpperCase()}.`, 'error');
        return;
      }

      bytes.forEach((byte, index) => {
        newMemory[loadAddr + index] = byte;
      });
      
      setMemory(newMemory);
      resetCPU(loadAddr);
      addLog(`Program loaded successfully (${bytes.length} bytes) at $${loadAddr.toString(16).toUpperCase().padStart(4, '0')}.`, 'success');
    } catch (error) {
      addLog(`Error loading program: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }, [resetCPU, addLog]);

  const step = useCallback(() => {
    setCPU(prevCpu => {
      if (prevCpu.halted) {
        // addLog("CPU halted.", 'warn'); // This can be spammy
        return prevCpu;
      }

      const currentPC = prevCpu.PC;
      
      // Validate PC is within valid range
      if (currentPC < 0 || currentPC >= MEMORY_SIZE) {
        addLog(`PC out of bounds: $${currentPC.toString(16).padStart(4, '0')}. Halting.`, 'error');
        return { ...prevCpu, halted: true };
      }
      
      const opCode = memory[currentPC];

      const newCpu = { ...prevCpu, PC: (prevCpu.PC + 1) & 0xFFFF }; // Increment PC for opcode

      const instructionDef = getInstructionDefinition(opCode);

      if (!instructionDef) {
        addLog(`Unknown opcode $${opCode.toString(16).toUpperCase().padStart(2, '0')} at $${currentPC.toString(16).toUpperCase().padStart(4, '0')}. Halting.`, 'error');
        return { ...newCpu, PC: currentPC, halted: true }; // Revert PC if opcode invalid
      }

      let operandAddress: number = 0; // For implied/accumulator, this is not used directly by memory access
      let pageCrossed = false;

      // Resolve addressing mode
      // The addressing mode functions in AM increment PC for their operands.
      if (instructionDef.addressingMode) {
        const addrResult = instructionDef.addressingMode(newCpu, memory);
        operandAddress = addrResult.address;
        pageCrossed = addrResult.pageCrossed || false;
      } else {
        // Implied or Accumulator mode
        // For accumulator mode, operandAddress might be conceptually 'A'
        // For implied, it's not used or specific to instruction (e.g. stack pointer for PHA)
      }

      // Execute instruction with error handling
      try {
        instructionDef.execute(newCpu, memory, operandAddress, pageCrossed);
      } catch (error) {
        addLog(`Instruction execution error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        return { ...newCpu, halted: true };
      }

      // Update cycles
      newCpu.cycles += instructionDef.baseCycles;
      if (instructionDef.pageCrossCycle && pageCrossed) {
        newCpu.cycles++;
      }
      // Branch cycle additions are handled within branch instructions themselves

      return newCpu;
    });
    
    // Force memory state update to trigger React re-renders when memory is modified
    setMemory(prevMemory => new Uint8Array(prevMemory));
  }, [memory, addLog]);


  const disassemble = useCallback((startAddress: number, count: number): InstructionInfo[] => {
    const disassembly: InstructionInfo[] = [];
    let currentAddress = startAddress;

    for (let i = 0; i < count && currentAddress < MEMORY_SIZE; i++) {
      const opCode = memory[currentAddress];
      const instructionDef = getInstructionDefinition(opCode);

      let text = ` ???`;
      let bytes: number[] = [opCode];
      let mnemonic = "???";
      let operandStr = "";
      let instructionBytesLength = 1;

      if (instructionDef) {
        mnemonic = instructionDef.mnemonic;
        instructionBytesLength = instructionDef.bytes;

        // Gather operand bytes for display
        for (let j = 1; j < instructionDef.bytes; j++) {
          if (currentAddress + j < MEMORY_SIZE) {
            bytes.push(memory[currentAddress + j]);
          } else {
            bytes.push(0x00); // Placeholder if out of bounds
          }
        }

        // Format operand string based on addressing mode
        if (instructionDef.bytes === 2) {
          const operand = memory[currentAddress + 1];
          if (instructionDef.addressingMode === AM.IMM) {
            operandStr = `#$${operand.toString(16).padStart(2, '0')}`;
          } else if (instructionDef.addressingMode === AM.REL) {
            const relAddr = (currentAddress + 2 + (operand > 127 ? operand - 256 : operand)) & 0xFFFF;
            operandStr = `$${relAddr.toString(16).padStart(4, '0')}`;
          } else if (instructionDef.addressingMode === AM.ZP) {
            operandStr = `$${operand.toString(16).padStart(2, '0')}`;
          } else if (instructionDef.addressingMode === AM.ZPX) {
            operandStr = `$${operand.toString(16).padStart(2, '0')},X`;
          } else if (instructionDef.addressingMode === AM.ZPY) {
            operandStr = `$${operand.toString(16).padStart(2, '0')},Y`;
          } else if (instructionDef.addressingMode === AM.IZX) {
            operandStr = `($${operand.toString(16).padStart(2, '0')},X)`;
          } else if (instructionDef.addressingMode === AM.IZY) {
            operandStr = `($${operand.toString(16).padStart(2, '0')}),Y`;
          } else {
            operandStr = `$${operand.toString(16).padStart(2, '0')}`;
          }
        } else if (instructionDef.bytes === 3) {
          const operandLow = memory[currentAddress + 1];
          const operandHigh = memory[currentAddress + 2];
          const operandWord = (operandHigh << 8) | operandLow;
          if (instructionDef.addressingMode === AM.ABS) {
            operandStr = `$${operandWord.toString(16).padStart(4, '0')}`;
          } else if (instructionDef.addressingMode === AM.ABSX) {
            operandStr = `$${operandWord.toString(16).padStart(4, '0')},X`;
          } else if (instructionDef.addressingMode === AM.ABSY) {
            operandStr = `$${operandWord.toString(16).padStart(4, '0')},Y`;
          } else if (instructionDef.addressingMode === AM.IND) {
            operandStr = `($${operandWord.toString(16).padStart(4, '0')})`;
          } else {
            operandStr = `$${operandWord.toString(16).padStart(4, '0')}`;
          }
        }
        text = `${instructionDef.mnemonic} ${operandStr}`;
      } else {
        text = `DB $${opCode.toString(16).padStart(2, '0')}`; // Data Byte if unknown opcode
      }

      disassembly.push({
        address: currentAddress,
        opCode,
        mnemonic,
        operandStr,
        bytes,
        text
      });
      currentAddress += instructionBytesLength;
    }
    return disassembly;
  }, [memory]);

  const readMemoryByte = useCallback((address: number): number => {
    if (typeof address !== 'number' || address < 0) {
      throw new Error(`Invalid memory read address: ${address}`);
    }
    return memory[address & 0xFFFF];
  }, [memory]);

  const writeMemoryByte = useCallback((address: number, value: number) => {
    if (typeof address !== 'number' || address < 0) {
      throw new Error(`Invalid memory write address: ${address}`);
    }
    if (typeof value !== 'number' || value < 0 || value > 255) {
      throw new Error(`Invalid memory write value: ${value}. Must be 0-255.`);
    }
    
    setMemory(prevMem => {
      const newMem = new Uint8Array(prevMem);
      newMem[address & 0xFFFF] = value & 0xFF;
      return newMem;
    });
  }, []);


  return {
    cpu,
    memory,
    logs,
    loadProgram,
    resetCPU,
    step,
    disassemble,
    addLog,
    readMemoryByte,
    writeMemoryByte,
    setCPU // Expose setCPU for direct manipulation if needed (e.g., debugger)
  };
};
