
export interface CPUState {
  A: number; // Accumulator
  X: number; // X Register
  Y: number; // Y Register
  PC: number; // Program Counter
  SP: number; // Stack Pointer
  P: number;  // Status Register (Flags) N V - B D I Z C
  cycles: number; // Total cycles executed
  halted: boolean;
}

export enum Flag {
  C = 1 << 0, // Carry
  Z = 1 << 1, // Zero
  I = 1 << 2, // Interrupt Disable
  D = 1 << 3, // Decimal Mode
  B = 1 << 4, // Break Command
  U = 1 << 5, // Unused (always 1)
  V = 1 << 6, // Overflow
  N = 1 << 7, // Negative
}

export interface InstructionInfo {
  address: number;
  opCode: number;
  mnemonic: string;
  operandStr: string;
  bytes: number[];
  text: string;
}

export interface LogEntry {
  id: number;
  timestamp: Date;
  message: string;
  type: 'info' | 'error' | 'warn' | 'success';
}

// For instruction definition
export type AddressingModeFunc = (cpu: CPUState, memory: Uint8Array) => { address: number; pageCrossed?: boolean };
export type ExecuteFunc = (cpu: CPUState, memory: Uint8Array, operandAddress: number, pageCrossed?: boolean) => void;

export interface InstructionDefinition {
  mnemonic: string;
  opCode: number;
  addressingMode: AddressingModeFunc | null; // null for implied/accumulator
  execute: ExecuteFunc;
  bytes: number;
  baseCycles: number;
  pageCrossCycle?: boolean; // If page crossing adds a cycle for addressing mode
  branchCycle?: boolean; // If branch taken adds a cycle
}
