
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
    const newMemory = new Uint8Array(MEMORY_SIZE);
    hexString = hexString.replace(/\s+/g, ''); // Remove whitespace
    const bytes = Array.from({ length: hexString.length / 2 }, (_, i) => hexString.slice(i * 2, i * 2 + 2)).map(s => parseInt(s, 16));

    if (bytes.some(isNaN)) {
      addLog("Error parsing hex string. Contains invalid characters.", 'error');
      return;
    }

    bytes.forEach((byte, index) => {
      if (loadAddr + index < MEMORY_SIZE) {
        newMemory[loadAddr + index] = byte;
      }
    });
    setMemory(newMemory);
    resetCPU(loadAddr); // Reset CPU and set PC to load address
    addLog(`Program loaded (${bytes.length} bytes) at $${loadAddr.toString(16).toUpperCase().padStart(4, '0')}.`, 'success');
  }, [resetCPU, addLog]);

  const step = useCallback(() => {
    setCPU(prevCpu => {
      if (prevCpu.halted) {
        // addLog("CPU halted.", 'warn'); // This can be spammy
        return prevCpu;
      }

      const currentPC = prevCpu.PC;
      let opCode: number;
      try {
        opCode = memory[currentPC];
      } catch (e) {
        addLog(`Memory access error at PC $${currentPC.toString(16)}`, 'error');
        return { ...prevCpu, halted: true };
      }

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

      // Execute instruction
      instructionDef.execute(newCpu, memory, operandAddress, pageCrossed);

      // Update cycles
      newCpu.cycles += instructionDef.baseCycles;
      if (instructionDef.pageCrossCycle && pageCrossed) {
        newCpu.cycles++;
      }
      // Branch cycle additions are handled within branch instructions themselves

      return newCpu;
    });
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
    return memory[address & 0xFFFF];
  }, [memory]);

  const writeMemoryByte = useCallback((address: number, value: number) => {
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
