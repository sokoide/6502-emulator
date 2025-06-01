
import { CPUState } from '../types';

// Note: PC should be incremented by the caller for the opcode byte.
// These functions handle PC increment for operand bytes.

// Fetches a byte from memory at PC and increments PC.
export const fetchByte = (cpu: CPUState, memory: Uint8Array): number => {
  const byte = memory[cpu.PC];
  cpu.PC = (cpu.PC + 1) & 0xFFFF;
  return byte;
};

// Fetches a word (2 bytes, little-endian) from memory at PC and increments PC by 2.
export const fetchWord = (cpu: CPUState, memory: Uint8Array): number => {
  const lowByte = fetchByte(cpu, memory);
  const highByte = fetchByte(cpu, memory);
  return (highByte << 8) | lowByte;
};

export const IMP = null; // Implied or Accumulator - no address needed or handled by instruction

export const IMM = (cpu: CPUState): { address: number } => {
  const address = cpu.PC; // Address of the immediate value itself
  cpu.PC = (cpu.PC + 1) & 0xFFFF;
  return { address };
};

export const ZP = (cpu: CPUState, memory: Uint8Array): { address: number } => {
  return { address: fetchByte(cpu, memory) };
};

export const ZPX = (cpu: CPUState, memory: Uint8Array): { address: number } => {
  return { address: (fetchByte(cpu, memory) + cpu.X) & 0xFF };
};

export const ZPY = (cpu: CPUState, memory: Uint8Array): { address: number } => {
  return { address: (fetchByte(cpu, memory) + cpu.Y) & 0xFF };
};

export const ABS = (cpu: CPUState, memory: Uint8Array): { address: number } => {
  return { address: fetchWord(cpu, memory) };
};

export const ABSX = (cpu: CPUState, memory: Uint8Array): { address: number, pageCrossed: boolean } => {
  const baseAddress = fetchWord(cpu, memory);
  const effectiveAddress = (baseAddress + cpu.X) & 0xFFFF;
  const pageCrossed = (baseAddress & 0xFF00) !== (effectiveAddress & 0xFF00);
  return { address: effectiveAddress, pageCrossed };
};

export const ABSY = (cpu: CPUState, memory: Uint8Array): { address: number, pageCrossed: boolean } => {
  const baseAddress = fetchWord(cpu, memory);
  const effectiveAddress = (baseAddress + cpu.Y) & 0xFFFF;
  const pageCrossed = (baseAddress & 0xFF00) !== (effectiveAddress & 0xFF00);
  return { address: effectiveAddress, pageCrossed };
};

export const IND = (cpu: CPUState, memory: Uint8Array): { address: number } => {
  const pointer = fetchWord(cpu, memory);
  // 6502 bug: if low byte of indirect vector is $FF, high byte is read from $xx00 instead of $xxFF+1
  let effectiveAddress: number;
  if ((pointer & 0x00FF) === 0x00FF) {
    effectiveAddress = memory[pointer] | (memory[pointer & 0xFF00] << 8);
  } else {
    effectiveAddress = memory[pointer] | (memory[pointer + 1] << 8);
  }
  return { address: effectiveAddress };
};

export const IZX = (cpu: CPUState, memory: Uint8Array): { address: number } => {
  const zpAddress = (fetchByte(cpu, memory) + cpu.X) & 0xFF;
  const lowByte = memory[zpAddress];
  const highByte = memory[(zpAddress + 1) & 0xFF];
  return { address: (highByte << 8) | lowByte };
};

export const IZY = (cpu: CPUState, memory: Uint8Array): { address: number, pageCrossed: boolean } => {
  const zpAddress = fetchByte(cpu, memory);
  const baseAddress = memory[zpAddress] | (memory[(zpAddress + 1) & 0xFF] << 8);
  const effectiveAddress = (baseAddress + cpu.Y) & 0xFFFF;
  const pageCrossed = (baseAddress & 0xFF00) !== (effectiveAddress & 0xFF00);
  return { address: effectiveAddress, pageCrossed };
};

// Relative addressing mode returns the offset, actual branch handled by instruction
export const REL = (cpu: CPUState, memory: Uint8Array): { address: number } => {
  const offset = fetchByte(cpu, memory); // This is the operand (address of the offset)
  return { address: offset > 127 ? offset - 256 : offset }; // Return signed offset
};
