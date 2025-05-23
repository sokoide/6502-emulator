
// Import ExecuteFunc and AddressingModeFunc types
import { CPUState, Flag, InstructionDefinition, ExecuteFunc, AddressingModeFunc } from '../types';
import * as AM from './cpuAddressingModes'; // AM for Addressing Modes
import { STACK_BASE } from '../constants';

const setZN = (cpu: CPUState, value: number) => {
  cpu.P = (value === 0) ? (cpu.P | Flag.Z) : (cpu.P & ~Flag.Z);
  cpu.P = (value & 0x80) ? (cpu.P | Flag.N) : (cpu.P & ~Flag.N);
};

const setZNC = (cpu: CPUState, value: number, carry: boolean) => {
  setZN(cpu, value);
  cpu.P = carry ? (cpu.P | Flag.C) : (cpu.P & ~Flag.C);
};

const pushByte = (cpu: CPUState, memory: Uint8Array, value: number) => {
  memory[STACK_BASE + cpu.SP] = value;
  cpu.SP = (cpu.SP - 1) & 0xFF;
};

const pullByte = (cpu: CPUState, memory: Uint8Array): number => {
  cpu.SP = (cpu.SP + 1) & 0xFF;
  return memory[STACK_BASE + cpu.SP];
};

const pushWord = (cpu: CPUState, memory: Uint8Array, value: number) => {
  pushByte(cpu, memory, (value >> 8) & 0xFF); // High byte
  pushByte(cpu, memory, value & 0xFF);      // Low byte
};

const pullWord = (cpu: CPUState, memory: Uint8Array): number => {
  const lowByte = pullByte(cpu, memory);
  const highByte = pullByte(cpu, memory);
  return (highByte << 8) | lowByte;
};

// Instruction implementations
const LDA: ExecuteFunc = (cpu, memory, address) => {
  cpu.A = memory[address];
  setZN(cpu, cpu.A);
};
const LDX: ExecuteFunc = (cpu, memory, address) => {
  cpu.X = memory[address];
  setZN(cpu, cpu.X);
};
const LDY: ExecuteFunc = (cpu, memory, address) => {
  cpu.Y = memory[address];
  setZN(cpu, cpu.Y);
};

const STA: ExecuteFunc = (cpu, memory, address) => { memory[address] = cpu.A; };
const STX: ExecuteFunc = (cpu, memory, address) => { memory[address] = cpu.X; };
const STY: ExecuteFunc = (cpu, memory, address) => { memory[address] = cpu.Y; };

const ADC: ExecuteFunc = (cpu, memory, address) => {
  const value = memory[address];
  const carry = (cpu.P & Flag.C) ? 1 : 0;
  const temp = cpu.A + value + carry;
  
  // Overflow: if signs of operands are same and sign of result is different
  // Or more simply: ((A ^ result) & (value ^ result) & 0x80)
  if (!((cpu.A ^ value) & 0x80) && ((cpu.A ^ temp) & 0x80)) {
    cpu.P |= Flag.V;
  } else {
    cpu.P &= ~Flag.V;
  }
  
  // Decimal mode not implemented, treat as binary
  cpu.A = temp & 0xFF;
  setZNC(cpu, cpu.A, temp > 0xFF);
};

const SBC: ExecuteFunc = (cpu, memory, address) => {
  const value = memory[address] ^ 0xFF; // Invert operand for subtraction (like ADC with inverted carry)
  const carry = (cpu.P & Flag.C) ? 1 : 0; // Note: SBC uses carry as "not borrow"
  const temp = cpu.A + value + carry;

  if (!((cpu.A ^ value) & 0x80) && ((cpu.A ^ temp) & 0x80)) {
    cpu.P |= Flag.V;
  } else {
    cpu.P &= ~Flag.V;
  }
  
  cpu.A = temp & 0xFF;
  setZNC(cpu, cpu.A, temp > 0xFF); // Carry is set if no borrow occurred
};

const genericBranch = (cpu: CPUState, memory: Uint8Array, relativeOffsetAddress: number, condition: boolean) => {
    if (condition) {
        const relativeOffset = memory[relativeOffsetAddress]; // already signed by AM.REL
        const oldPC = cpu.PC;
        cpu.PC = (cpu.PC + relativeOffset) & 0xFFFF;
        cpu.cycles++; // Branch taken adds a cycle
        if ((oldPC & 0xFF00) !== (cpu.PC & 0xFF00)) {
            cpu.cycles++; // Page crossed adds another cycle
        }
    }
};

const BEQ: ExecuteFunc = (cpu, memory, address) => genericBranch(cpu, memory, address, (cpu.P & Flag.Z) !== 0);
const BNE: ExecuteFunc = (cpu, memory, address) => genericBranch(cpu, memory, address, (cpu.P & Flag.Z) === 0);
const BCS: ExecuteFunc = (cpu, memory, address) => genericBranch(cpu, memory, address, (cpu.P & Flag.C) !== 0);
const BCC: ExecuteFunc = (cpu, memory, address) => genericBranch(cpu, memory, address, (cpu.P & Flag.C) === 0);
const BMI: ExecuteFunc = (cpu, memory, address) => genericBranch(cpu, memory, address, (cpu.P & Flag.N) !== 0);
const BPL: ExecuteFunc = (cpu, memory, address) => genericBranch(cpu, memory, address, (cpu.P & Flag.N) === 0);
const BVS: ExecuteFunc = (cpu, memory, address) => genericBranch(cpu, memory, address, (cpu.P & Flag.V) !== 0);
const BVC: ExecuteFunc = (cpu, memory, address) => genericBranch(cpu, memory, address, (cpu.P & Flag.V) === 0);

const JMP: ExecuteFunc = (cpu, _memory, address) => { cpu.PC = address; };
const JSR: ExecuteFunc = (cpu, memory, address) => {
  pushWord(cpu, memory, (cpu.PC - 1) & 0xFFFF); // Push PC of next instruction -1
  cpu.PC = address;
};
const RTS: ExecuteFunc = (cpu, memory, _address) => {
  cpu.PC = (pullWord(cpu, memory) + 1) & 0xFFFF;
};
const RTI: ExecuteFunc = (cpu, memory, _address) => {
  cpu.P = (pullByte(cpu, memory) & ~Flag.B) | Flag.U; // B flag is not restored, U is always set
  cpu.PC = pullWord(cpu, memory);
};

const INC: ExecuteFunc = (cpu, memory, address) => {
  const value = (memory[address] + 1) & 0xFF;
  memory[address] = value;
  setZN(cpu, value);
};
const INX: ExecuteFunc = (cpu, _memory, _address) => {
  cpu.X = (cpu.X + 1) & 0xFF;
  setZN(cpu, cpu.X);
};
const INY: ExecuteFunc = (cpu, _memory, _address) => {
  cpu.Y = (cpu.Y + 1) & 0xFF;
  setZN(cpu, cpu.Y);
};
const DEC: ExecuteFunc = (cpu, memory, address) => {
  const value = (memory[address] - 1) & 0xFF;
  memory[address] = value;
  setZN(cpu, value);
};
const DEX: ExecuteFunc = (cpu, _memory, _address) => {
  cpu.X = (cpu.X - 1) & 0xFF;
  setZN(cpu, cpu.X);
};
const DEY: ExecuteFunc = (cpu, _memory, _address) => {
  cpu.Y = (cpu.Y - 1) & 0xFF;
  setZN(cpu, cpu.Y);
};

const CMP: ExecuteFunc = (cpu, memory, address) => {
  const value = memory[address];
  const result = (cpu.A - value) & 0xFF;
  setZN(cpu, result);
  cpu.P = (cpu.A >= value) ? (cpu.P | Flag.C) : (cpu.P & ~Flag.C);
};
const CPX: ExecuteFunc = (cpu, memory, address) => {
  const value = memory[address];
  const result = (cpu.X - value) & 0xFF;
  setZN(cpu, result);
  cpu.P = (cpu.X >= value) ? (cpu.P | Flag.C) : (cpu.P & ~Flag.C);
};
const CPY: ExecuteFunc = (cpu, memory, address) => {
  const value = memory[address];
  const result = (cpu.Y - value) & 0xFF;
  setZN(cpu, result);
  cpu.P = (cpu.Y >= value) ? (cpu.P | Flag.C) : (cpu.P & ~Flag.C);
};

const AND: ExecuteFunc = (cpu, memory, address) => { cpu.A &= memory[address]; setZN(cpu, cpu.A); };
const ORA: ExecuteFunc = (cpu, memory, address) => { cpu.A |= memory[address]; setZN(cpu, cpu.A); };
const EOR: ExecuteFunc = (cpu, memory, address) => { cpu.A ^= memory[address]; setZN(cpu, cpu.A); };
const BIT: ExecuteFunc = (cpu, memory, address) => {
  const value = memory[address];
  cpu.P = (value & cpu.A) === 0 ? (cpu.P | Flag.Z) : (cpu.P & ~Flag.Z);
  cpu.P = (value & Flag.N) ? (cpu.P | Flag.N) : (cpu.P & ~Flag.N);
  cpu.P = (value & Flag.V) ? (cpu.P | Flag.V) : (cpu.P & ~Flag.V);
};

const ASL_A: ExecuteFunc = (cpu, _memory, _address) => {
  const carry = (cpu.A & 0x80) !== 0;
  cpu.A = (cpu.A << 1) & 0xFF;
  setZNC(cpu, cpu.A, carry);
};
const ASL_M: ExecuteFunc = (cpu, memory, address) => {
  const value = memory[address];
  const carry = (value & 0x80) !== 0;
  memory[address] = (value << 1) & 0xFF;
  setZNC(cpu, memory[address], carry);
};
const LSR_A: ExecuteFunc = (cpu, _memory, _address) => {
  const carry = (cpu.A & 0x01) !== 0;
  cpu.A >>= 1;
  setZNC(cpu, cpu.A, carry);
};
const LSR_M: ExecuteFunc = (cpu, memory, address) => {
  const value = memory[address];
  const carry = (value & 0x01) !== 0;
  memory[address] = value >> 1;
  setZNC(cpu, memory[address], carry);
};
const ROL_A: ExecuteFunc = (cpu, _memory, _address) => {
  const oldCarry = (cpu.P & Flag.C) ? 1 : 0;
  const newCarry = (cpu.A & 0x80) !== 0;
  cpu.A = ((cpu.A << 1) | oldCarry) & 0xFF;
  setZNC(cpu, cpu.A, newCarry);
};
const ROL_M: ExecuteFunc = (cpu, memory, address) => {
  const value = memory[address];
  const oldCarry = (cpu.P & Flag.C) ? 1 : 0;
  const newCarry = (value & 0x80) !== 0;
  memory[address] = ((value << 1) | oldCarry) & 0xFF;
  setZNC(cpu, memory[address], newCarry);
};
const ROR_A: ExecuteFunc = (cpu, _memory, _address) => {
  const oldCarry = (cpu.P & Flag.C) ? 0x80 : 0;
  const newCarry = (cpu.A & 0x01) !== 0;
  cpu.A = (cpu.A >> 1) | oldCarry;
  setZNC(cpu, cpu.A, newCarry);
};
const ROR_M: ExecuteFunc = (cpu, memory, address) => {
  const value = memory[address];
  const oldCarry = (cpu.P & Flag.C) ? 0x80 : 0;
  const newCarry = (value & 0x01) !== 0;
  memory[address] = (value >> 1) | oldCarry;
  setZNC(cpu, memory[address], newCarry);
};

const PHA: ExecuteFunc = (cpu, memory, _address) => pushByte(cpu, memory, cpu.A);
const PHP: ExecuteFunc = (cpu, memory, _address) => pushByte(cpu, memory, cpu.P | Flag.B | Flag.U); // B and U set when pushed
const PLA: ExecuteFunc = (cpu, memory, _address) => { cpu.A = pullByte(cpu, memory); setZN(cpu, cpu.A); };
const PLP: ExecuteFunc = (cpu, memory, _address) => { cpu.P = (pullByte(cpu, memory) & ~Flag.B) | Flag.U; }; // B not restored, U always set

const TAX: ExecuteFunc = (cpu, _memory, _address) => { cpu.X = cpu.A; setZN(cpu, cpu.X); };
const TXA: ExecuteFunc = (cpu, _memory, _address) => { cpu.A = cpu.X; setZN(cpu, cpu.A); };
const TAY: ExecuteFunc = (cpu, _memory, _address) => { cpu.Y = cpu.A; setZN(cpu, cpu.Y); };
const TYA: ExecuteFunc = (cpu, _memory, _address) => { cpu.A = cpu.Y; setZN(cpu, cpu.A); };
const TSX: ExecuteFunc = (cpu, _memory, _address) => { cpu.X = cpu.SP; setZN(cpu, cpu.X); };
const TXS: ExecuteFunc = (cpu, _memory, _address) => { cpu.SP = cpu.X; };

const CLC: ExecuteFunc = (cpu, _memory, _address) => { cpu.P &= ~Flag.C; };
const SEC: ExecuteFunc = (cpu, _memory, _address) => { cpu.P |= Flag.C; };
const CLI: ExecuteFunc = (cpu, _memory, _address) => { cpu.P &= ~Flag.I; };
const SEI: ExecuteFunc = (cpu, _memory, _address) => { cpu.P |= Flag.I; };
const CLD: ExecuteFunc = (cpu, _memory, _address) => { cpu.P &= ~Flag.D; }; // Decimal mode not used
const SED: ExecuteFunc = (cpu, _memory, _address) => { cpu.P |= Flag.D; };  // Decimal mode not used
const CLV: ExecuteFunc = (cpu, _memory, _address) => { cpu.P &= ~Flag.V; };

const NOP: ExecuteFunc = (_cpu, _memory, _address) => { /* No operation */ };
const BRK: ExecuteFunc = (cpu, memory, _address) => {
  // BRK is complex. Simplified: push PC+1 (not PC+2 as IRQ would), push P, set I, load PC from IRQ vector ($FFFE/FFFF)
  // For this emulator, it will just halt.
  AM.fetchByte(cpu, memory); // BRK has a padding byte that is ignored, PC needs to advance over it
  pushWord(cpu, memory, cpu.PC); // PC after padding byte
  pushByte(cpu, memory, cpu.P | Flag.B | Flag.U);
  cpu.P |= Flag.I;
  // In a real system, PC would be loaded from $FFFE/$FFFF. Here, we just halt.
  cpu.halted = true; 
};

// --- Instruction Table ---
// Using a Map for sparse opcodes, could be an array of 256 for denser tables.
export const instructionSet = new Map<number, InstructionDefinition>();

const define = (opCode: number, mnemonic: string, addressingMode: AddressingModeFunc | null, execute: ExecuteFunc, bytes: number, baseCycles: number, pageCrossCycle = false, branchCycle = false) => {
  instructionSet.set(opCode, { opCode, mnemonic, addressingMode, execute, bytes, baseCycles, pageCrossCycle, branchCycle });
};

// LDA
define(0xA9, "LDA", AM.IMM, LDA, 2, 2);
define(0xA5, "LDA", AM.ZP,  LDA, 2, 3);
define(0xB5, "LDA", AM.ZPX, LDA, 2, 4);
define(0xAD, "LDA", AM.ABS, LDA, 3, 4);
define(0xBD, "LDA", AM.ABSX,LDA, 3, 4, true);
define(0xB9, "LDA", AM.ABSY,LDA, 3, 4, true);
define(0xA1, "LDA", AM.IZX, LDA, 2, 6);
define(0xB1, "LDA", AM.IZY, LDA, 2, 5, true);
// LDX
define(0xA2, "LDX", AM.IMM, LDX, 2, 2);
define(0xA6, "LDX", AM.ZP,  LDX, 2, 3);
define(0xB6, "LDX", AM.ZPY, LDX, 2, 4);
define(0xAE, "LDX", AM.ABS, LDX, 3, 4);
define(0xBE, "LDX", AM.ABSY,LDX, 3, 4, true);
// LDY
define(0xA0, "LDY", AM.IMM, LDY, 2, 2);
define(0xA4, "LDY", AM.ZP,  LDY, 2, 3);
define(0xB4, "LDY", AM.ZPX, LDY, 2, 4);
define(0xAC, "LDY", AM.ABS, LDY, 3, 4);
define(0xBC, "LDY", AM.ABSX,LDY, 3, 4, true);
// STA
define(0x85, "STA", AM.ZP,  STA, 2, 3);
define(0x95, "STA", AM.ZPX, STA, 2, 4);
define(0x8D, "STA", AM.ABS, STA, 3, 4);
define(0x9D, "STA", AM.ABSX,STA, 3, 5);
define(0x99, "STA", AM.ABSY,STA, 3, 5);
define(0x81, "STA", AM.IZX, STA, 2, 6);
define(0x91, "STA", AM.IZY, STA, 2, 6);
// STX
define(0x86, "STX", AM.ZP,  STX, 2, 3);
define(0x96, "STX", AM.ZPY, STX, 2, 4);
define(0x8E, "STX", AM.ABS, STX, 3, 4);
// STY
define(0x84, "STY", AM.ZP,  STY, 2, 3);
define(0x94, "STY", AM.ZPX, STY, 2, 4);
define(0x8C, "STY", AM.ABS, STY, 3, 4);
// ADC
define(0x69, "ADC", AM.IMM, ADC, 2, 2);
define(0x65, "ADC", AM.ZP,  ADC, 2, 3);
define(0x75, "ADC", AM.ZPX, ADC, 2, 4);
define(0x6D, "ADC", AM.ABS, ADC, 3, 4);
define(0x7D, "ADC", AM.ABSX,ADC, 3, 4, true);
define(0x79, "ADC", AM.ABSY,ADC, 3, 4, true);
define(0x61, "ADC", AM.IZX, ADC, 2, 6);
define(0x71, "ADC", AM.IZY, ADC, 2, 5, true);
// SBC
define(0xE9, "SBC", AM.IMM, SBC, 2, 2);
define(0xE5, "SBC", AM.ZP,  SBC, 2, 3);
define(0xF5, "SBC", AM.ZPX, SBC, 2, 4);
define(0xED, "SBC", AM.ABS, SBC, 3, 4);
define(0xFD, "SBC", AM.ABSX,SBC, 3, 4, true);
define(0xF9, "SBC", AM.ABSY,SBC, 3, 4, true);
define(0xE1, "SBC", AM.IZX, SBC, 2, 6);
define(0xF1, "SBC", AM.IZY, SBC, 2, 5, true);
// Branch instructions
define(0x90, "BCC", AM.REL, BCC, 2, 2, false, true);
define(0xB0, "BCS", AM.REL, BCS, 2, 2, false, true);
define(0xF0, "BEQ", AM.REL, BEQ, 2, 2, false, true);
define(0xD0, "BNE", AM.REL, BNE, 2, 2, false, true);
define(0x30, "BMI", AM.REL, BMI, 2, 2, false, true);
define(0x10, "BPL", AM.REL, BPL, 2, 2, false, true);
define(0x50, "BVC", AM.REL, BVC, 2, 2, false, true);
define(0x70, "BVS", AM.REL, BVS, 2, 2, false, true);
// Jumps and returns
define(0x4C, "JMP", AM.ABS, JMP, 3, 3);
define(0x6C, "JMP", AM.IND, JMP, 3, 5);
define(0x20, "JSR", AM.ABS, JSR, 3, 6);
define(0x60, "RTS", AM.IMP, RTS, 1, 6);
define(0x40, "RTI", AM.IMP, RTI, 1, 6);
// INC, DEC
define(0xE6, "INC", AM.ZP,  INC, 2, 5);
define(0xF6, "INC", AM.ZPX, INC, 2, 6);
define(0xEE, "INC", AM.ABS, INC, 3, 6);
define(0xFE, "INC", AM.ABSX,INC, 3, 7);
define(0xC6, "DEC", AM.ZP,  DEC, 2, 5);
define(0xD6, "DEC", AM.ZPX, DEC, 2, 6);
define(0xCE, "DEC", AM.ABS, DEC, 3, 6);
define(0xDE, "DEC", AM.ABSX,DEC, 3, 7);
// INX, INY, DEX, DEY (Implied)
define(0xE8, "INX", AM.IMP, INX, 1, 2);
define(0xC8, "INY", AM.IMP, INY, 1, 2);
define(0xCA, "DEX", AM.IMP, DEX, 1, 2);
define(0x88, "DEY", AM.IMP, DEY, 1, 2);
// Compare
define(0xC9, "CMP", AM.IMM, CMP, 2, 2);
define(0xC5, "CMP", AM.ZP,  CMP, 2, 3);
define(0xD5, "CMP", AM.ZPX, CMP, 2, 4);
define(0xCD, "CMP", AM.ABS, CMP, 3, 4);
define(0xDD, "CMP", AM.ABSX,CMP, 3, 4, true);
define(0xD9, "CMP", AM.ABSY,CMP, 3, 4, true);
define(0xC1, "CMP", AM.IZX, CMP, 2, 6);
define(0xD1, "CMP", AM.IZY, CMP, 2, 5, true);
define(0xE0, "CPX", AM.IMM, CPX, 2, 2);
define(0xE4, "CPX", AM.ZP,  CPX, 2, 3);
define(0xEC, "CPX", AM.ABS, CPX, 3, 4);
define(0xC0, "CPY", AM.IMM, CPY, 2, 2);
define(0xC4, "CPY", AM.ZP,  CPY, 2, 3);
define(0xCC, "CPY", AM.ABS, CPY, 3, 4);
// Logical
define(0x29, "AND", AM.IMM, AND, 2, 2);
define(0x25, "AND", AM.ZP,  AND, 2, 3);
define(0x35, "AND", AM.ZPX, AND, 2, 4);
define(0x2D, "AND", AM.ABS, AND, 3, 4);
define(0x3D, "AND", AM.ABSX,AND, 3, 4, true);
define(0x39, "AND", AM.ABSY,AND, 3, 4, true);
define(0x21, "AND", AM.IZX, AND, 2, 6);
define(0x31, "AND", AM.IZY, AND, 2, 5, true);
define(0x09, "ORA", AM.IMM, ORA, 2, 2);
define(0x05, "ORA", AM.ZP,  ORA, 2, 3);
define(0x15, "ORA", AM.ZPX, ORA, 2, 4);
define(0x0D, "ORA", AM.ABS, ORA, 3, 4);
define(0x1D, "ORA", AM.ABSX,ORA, 3, 4, true);
define(0x19, "ORA", AM.ABSY,ORA, 3, 4, true);
define(0x01, "ORA", AM.IZX, ORA, 2, 6);
define(0x11, "ORA", AM.IZY, ORA, 2, 5, true);
define(0x49, "EOR", AM.IMM, EOR, 2, 2);
define(0x45, "EOR", AM.ZP,  EOR, 2, 3);
define(0x55, "EOR", AM.ZPX, EOR, 2, 4);
define(0x4D, "EOR", AM.ABS, EOR, 3, 4);
define(0x5D, "EOR", AM.ABSX,EOR, 3, 4, true);
define(0x59, "EOR", AM.ABSY,EOR, 3, 4, true);
define(0x41, "EOR", AM.IZX, EOR, 2, 6);
define(0x51, "EOR", AM.IZY, EOR, 2, 5, true);
define(0x24, "BIT", AM.ZP,  BIT, 2, 3);
define(0x2C, "BIT", AM.ABS, BIT, 3, 4);
// Shifts
define(0x0A, "ASL", AM.IMP, ASL_A, 1, 2); // Accumulator
define(0x06, "ASL", AM.ZP,  ASL_M, 2, 5);
define(0x16, "ASL", AM.ZPX, ASL_M, 2, 6);
define(0x0E, "ASL", AM.ABS, ASL_M, 3, 6);
define(0x1E, "ASL", AM.ABSX,ASL_M, 3, 7);
define(0x4A, "LSR", AM.IMP, LSR_A, 1, 2); // Accumulator
define(0x46, "LSR", AM.ZP,  LSR_M, 2, 5);
define(0x56, "LSR", AM.ZPX, LSR_M, 2, 6);
define(0x4E, "LSR", AM.ABS, LSR_M, 3, 6);
define(0x5E, "LSR", AM.ABSX,LSR_M, 3, 7);
define(0x2A, "ROL", AM.IMP, ROL_A, 1, 2); // Accumulator
define(0x26, "ROL", AM.ZP,  ROL_M, 2, 5);
define(0x36, "ROL", AM.ZPX, ROL_M, 2, 6);
define(0x2E, "ROL", AM.ABS, ROL_M, 3, 6);
define(0x3E, "ROL", AM.ABSX,ROL_M, 3, 7);
define(0x6A, "ROR", AM.IMP, ROR_A, 1, 2); // Accumulator
define(0x66, "ROR", AM.ZP,  ROR_M, 2, 5);
define(0x76, "ROR", AM.ZPX, ROR_M, 2, 6);
define(0x6E, "ROR", AM.ABS, ROR_M, 3, 6);
define(0x7E, "ROR", AM.ABSX,ROR_M, 3, 7);
// Stack
define(0x48, "PHA", AM.IMP, PHA, 1, 3);
define(0x08, "PHP", AM.IMP, PHP, 1, 3);
define(0x68, "PLA", AM.IMP, PLA, 1, 4);
define(0x28, "PLP", AM.IMP, PLP, 1, 4);
// Transfers
define(0xAA, "TAX", AM.IMP, TAX, 1, 2);
define(0x8A, "TXA", AM.IMP, TXA, 1, 2);
define(0xA8, "TAY", AM.IMP, TAY, 1, 2);
define(0x98, "TYA", AM.IMP, TYA, 1, 2);
define(0xBA, "TSX", AM.IMP, TSX, 1, 2);
define(0x9A, "TXS", AM.IMP, TXS, 1, 2);
// Flags
define(0x18, "CLC", AM.IMP, CLC, 1, 2);
define(0x38, "SEC", AM.IMP, SEC, 1, 2);
define(0x58, "CLI", AM.IMP, CLI, 1, 2);
define(0x78, "SEI", AM.IMP, SEI, 1, 2);
define(0xD8, "CLD", AM.IMP, CLD, 1, 2);
define(0xF8, "SED", AM.IMP, SED, 1, 2);
define(0xB8, "CLV", AM.IMP, CLV, 1, 2);
// System
define(0xEA, "NOP", AM.IMP, NOP, 1, 2);
define(0x00, "BRK", AM.IMP, BRK, 1, 7); // Bytes is 1, but fetches padding byte effectively making it 2
// Some common NOPs (often unofficial)
define(0x1A, "NOP*", AM.IMP, NOP, 1, 2);
define(0x3A, "NOP*", AM.IMP, NOP, 1, 2);
define(0x5A, "NOP*", AM.IMP, NOP, 1, 2);
define(0x7A, "NOP*", AM.IMP, NOP, 1, 2);
define(0xDA, "NOP*", AM.IMP, NOP, 1, 2);
define(0xFA, "NOP*", AM.IMP, NOP, 1, 2);
// NOPs with operands
define(0x80, "NOP*", AM.IMM, NOP, 2, 2); // Example, often a synonym for SKB (skip byte)
define(0x04, "NOP*", AM.ZP, NOP, 2, 3); // Example, often TSB zp

// Many more opcodes, including unofficial ones, exist. This covers most official ones.
// Note: Bytes for BRK is technically 1, but it consumes an extra byte from memory (padding/signature)
// which is handled inside BRK's AM.fetchByte. So from disassembler POV it could be 2.
// For simplicity of PC advancement here, it's 1, and BRK handler advances PC for the padding.

export const getInstructionDefinition = (opCode: number): InstructionDefinition | undefined => {
  return instructionSet.get(opCode);
};