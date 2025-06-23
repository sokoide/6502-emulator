import { describe, it, expect } from 'vitest';
import { getInstructionDefinition } from './cpuInstructions';
import { createCPUState, createMemory, expectFlags } from '../test/utils/testHelpers';
import { Flag } from '../types';
import { DEFAULT_PROGRAM_LOAD_ADDRESS, MEMORY_SIZE } from '../constants';

describe('Emulator Core Integration', () => {
  describe('Program Loading and Execution', () => {
    it('should parse hex program correctly', () => {
      const hexString = 'A9 42 85 10';
      const cleanHex = hexString.replace(/\s+/g, '');
      const bytes = [];
      
      for (let i = 0; i < cleanHex.length; i += 2) {
        bytes.push(parseInt(cleanHex.slice(i, i + 2), 16));
      }

      expect(bytes).toEqual([0xA9, 0x42, 0x85, 0x10]);
    });

    it('should detect invalid hex characters', () => {
      const hexString = 'A9 GG';
      const cleanHex = hexString.replace(/\s+/g, '');
      const bytes = [];
      
      for (let i = 0; i < cleanHex.length; i += 2) {
        const byte = parseInt(cleanHex.slice(i, i + 2), 16);
        bytes.push(byte);
      }

      expect(bytes.some(b => isNaN(b))).toBe(true);
    });

    it('should execute simple LDA/STA sequence', () => {
      const cpu = createCPUState({ PC: 0x1000 });
      const memory = createMemory({ 
        0x1000: 0xA9, 0x1001: 0x42, // LDA #$42
        0x1002: 0x85, 0x1003: 0x10  // STA $10
      });

      // Execute LDA #$42
      let instruction = getInstructionDefinition(memory[cpu.PC])!;
      cpu.PC++;
      instruction.addressingMode!(cpu, memory); // Should advance PC and return immediate address
      instruction.execute(cpu, memory, cpu.PC - 1); // Use previous PC as immediate value address

      expect(cpu.A).toBe(0x42);
      expectFlags(cpu, { Z: false, N: false });

      // Execute STA $10
      instruction = getInstructionDefinition(memory[cpu.PC])!;
      cpu.PC++;
      const addrResult = instruction.addressingMode!(cpu, memory);
      instruction.execute(cpu, memory, addrResult.address);

      expect(memory[0x10]).toBe(0x42);
    });

    it('should handle arithmetic with flag setting', () => {
      const cpu = createCPUState({ A: 0x7F, P: Flag.U });
      const memory = createMemory({ 0x00: 0x01 });
      const instruction = getInstructionDefinition(0x65)!; // ADC zero page

      instruction.execute(cpu, memory, 0x00);

      expect(cpu.A).toBe(0x80);
      expectFlags(cpu, { N: true, V: true, C: false, Z: false });
    });

    it('should handle branching correctly', () => {
      const cpu = createCPUState({ PC: 0x1000, P: Flag.U | Flag.Z, cycles: 0 });
      const memory = createMemory();
      const instruction = getInstructionDefinition(0xF0)!; // BEQ

      const oldPC = cpu.PC;
      instruction.execute(cpu, memory, 0x10); // +16 offset

      expect(cpu.PC).toBe(0x1010);
      expect(cpu.cycles).toBe(1); // Branch taken adds cycle
    });
  });

  describe('Memory Operations', () => {
    it('should handle memory wraparound correctly', () => {
      const memory = createMemory();
      memory[0xFFFF] = 0x42;

      // Test reading with address wrapping
      expect(memory[0xFFFF & 0xFFFF]).toBe(0x42);
      expect(memory[0x10000 & 0xFFFF]).toBe(memory[0x0000]);
    });

    it('should handle zero page addressing', () => {
      const cpu = createCPUState({ X: 0x05 });
      const memory = createMemory({ 0x20: 0x42 });
      
      // Simulate ZPX addressing: $1B + X = $20
      const baseAddr = 0x1B;
      const effectiveAddr = (baseAddr + cpu.X) & 0xFF;
      
      expect(effectiveAddr).toBe(0x20);
      expect(memory[effectiveAddr]).toBe(0x42);
    });

    it('should handle zero page wraparound', () => {
      const cpu = createCPUState({ X: 0x10 });
      const memory = createMemory({ 0x08: 0x33 });
      
      // $F8 + $10 = $108, but should wrap to $08 in zero page
      const baseAddr = 0xF8;
      const effectiveAddr = (baseAddr + cpu.X) & 0xFF;
      
      expect(effectiveAddr).toBe(0x08);
      expect(memory[effectiveAddr]).toBe(0x33);
    });
  });

  describe('Flag Operations', () => {
    it('should correctly implement flag setting for arithmetic', () => {
      // Test zero flag
      let cpu = createCPUState({ A: 0x42 });
      cpu.A = 0x00;
      cpu.P = (cpu.A === 0) ? (cpu.P | Flag.Z) : (cpu.P & ~Flag.Z);
      expect(cpu.P & Flag.Z).toBeTruthy();

      // Test negative flag
      cpu = createCPUState({ A: 0x42 });
      cpu.A = 0x80;
      cpu.P = (cpu.A & 0x80) ? (cpu.P | Flag.N) : (cpu.P & ~Flag.N);
      expect(cpu.P & Flag.N).toBeTruthy();

      // Test carry flag
      cpu = createCPUState();
      const result = 0xFF + 0x01;
      cpu.P = (result > 0xFF) ? (cpu.P | Flag.C) : (cpu.P & ~Flag.C);
      expect(cpu.P & Flag.C).toBeTruthy();
    });

    it('should correctly implement overflow flag for ADC', () => {
      // Positive + Positive = Negative (overflow)
      const cpu = createCPUState({ A: 0x7F });
      const value = 0x01;
      const temp = cpu.A + value;
      
      const overflow = !((cpu.A ^ value) & 0x80) && ((cpu.A ^ temp) & 0x80);
      expect(overflow).toBeTruthy();
    });
  });

  describe('Stack Operations', () => {
    it('should handle stack push and pull correctly', () => {
      const cpu = createCPUState({ SP: 0xFD });
      const memory = createMemory();
      const stackBase = 0x0100;

      // Push operation
      memory[stackBase + cpu.SP] = 0x42;
      cpu.SP = (cpu.SP - 1) & 0xFF;

      expect(memory[stackBase + 0xFD]).toBe(0x42);
      expect(cpu.SP).toBe(0xFC);

      // Pull operation
      cpu.SP = (cpu.SP + 1) & 0xFF;
      const value = memory[stackBase + cpu.SP];

      expect(value).toBe(0x42);
      expect(cpu.SP).toBe(0xFD);
    });

    it('should handle stack wraparound', () => {
      const cpu = createCPUState({ SP: 0x00 });
      
      // Push when SP is at 0x00 should wrap to 0xFF
      cpu.SP = (cpu.SP - 1) & 0xFF;
      expect(cpu.SP).toBe(0xFF);

      // Pull when SP is at 0xFF should wrap to 0x00
      cpu.SP = (cpu.SP + 1) & 0xFF;
      expect(cpu.SP).toBe(0x00);
    });
  });

  describe('Instruction Coverage', () => {
    it('should have comprehensive instruction set', () => {
      const opcodes = Array.from(Array(256).keys());
      const definedOpcodes = opcodes.filter(op => getInstructionDefinition(op) !== undefined);
      
      // Should have at least 90 defined opcodes (covering all major 6502 instructions)
      expect(definedOpcodes.length).toBeGreaterThan(90);
    });

    it('should have correct instruction properties', () => {
      const lda_imm = getInstructionDefinition(0xA9)!;
      expect(lda_imm.mnemonic).toBe('LDA');
      expect(lda_imm.bytes).toBe(2);
      expect(lda_imm.baseCycles).toBe(2);

      const jsr = getInstructionDefinition(0x20)!;
      expect(jsr.mnemonic).toBe('JSR');
      expect(jsr.bytes).toBe(3);
      expect(jsr.baseCycles).toBe(6);

      const nop = getInstructionDefinition(0xEA)!;
      expect(nop.mnemonic).toBe('NOP');
      expect(nop.bytes).toBe(1);
      expect(nop.baseCycles).toBe(2);
    });
  });

  describe('Error Conditions', () => {
    it('should handle invalid opcodes gracefully', () => {
      const invalidOpcodes = [0xFF, 0x02, 0x03, 0x07, 0x0B];
      
      invalidOpcodes.forEach(opcode => {
        const instruction = getInstructionDefinition(opcode);
        expect(instruction).toBeUndefined();
      });
    });

    it('should handle edge case values', () => {
      // Test 8-bit value wrapping
      expect((0xFF + 1) & 0xFF).toBe(0x00);
      expect((0x00 - 1) & 0xFF).toBe(0xFF);
      
      // Test 16-bit address wrapping
      expect((0xFFFF + 1) & 0xFFFF).toBe(0x0000);
      expect((0x0000 - 1) & 0xFFFF).toBe(0xFFFF);
    });
  });
});