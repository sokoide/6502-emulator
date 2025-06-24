import { describe, it, expect } from 'vitest';
import * as AM from '../../../src/lib/cpuAddressingModes';
import { createCPUState, createMemory } from '../testHelpers';

describe('CPU Addressing Modes', () => {
  describe('fetchByte', () => {
    it('should fetch byte from memory at PC and increment PC', () => {
      const cpu = createCPUState({ PC: 0x1000 });
      const memory = createMemory({ 0x1000: 0x42 });

      const result = AM.fetchByte(cpu, memory);

      expect(result).toBe(0x42);
      expect(cpu.PC).toBe(0x1001);
    });

    it('should wrap PC around 16-bit boundary', () => {
      const cpu = createCPUState({ PC: 0xFFFF });
      const memory = createMemory({ 0xFFFF: 0x33 });

      const result = AM.fetchByte(cpu, memory);

      expect(result).toBe(0x33);
      expect(cpu.PC).toBe(0x0000);
    });
  });

  describe('fetchWord', () => {
    it('should fetch word in little-endian format and increment PC by 2', () => {
      const cpu = createCPUState({ PC: 0x1000 });
      const memory = createMemory({ 0x1000: 0x34, 0x1001: 0x12 });

      const result = AM.fetchWord(cpu, memory);

      expect(result).toBe(0x1234);
      expect(cpu.PC).toBe(0x1002);
    });

    it('should handle wrap-around at 16-bit boundary', () => {
      const cpu = createCPUState({ PC: 0xFFFF });
      const memory = createMemory({ 0xFFFF: 0x78, 0x0000: 0x56 });

      const result = AM.fetchWord(cpu, memory);

      expect(result).toBe(0x5678);
      expect(cpu.PC).toBe(0x0001);
    });
  });

  describe('IMM - Immediate', () => {
    it('should return PC as address and increment PC', () => {
      const cpu = createCPUState({ PC: 0x1000 });

      const result = AM.IMM(cpu);

      expect(result.address).toBe(0x1000);
      expect(cpu.PC).toBe(0x1001);
    });

    it('should wrap PC around 16-bit boundary', () => {
      const cpu = createCPUState({ PC: 0xFFFF });

      const result = AM.IMM(cpu);

      expect(result.address).toBe(0xFFFF);
      expect(cpu.PC).toBe(0x0000);
    });
  });

  describe('ZP - Zero Page', () => {
    it('should return zero page address', () => {
      const cpu = createCPUState({ PC: 0x1000 });
      const memory = createMemory({ 0x1000: 0x80 });

      const result = AM.ZP(cpu, memory);

      expect(result.address).toBe(0x80);
      expect(cpu.PC).toBe(0x1001);
    });

    it('should always return address in zero page', () => {
      const cpu = createCPUState({ PC: 0x1000 });
      const memory = createMemory({ 0x1000: 0xFF });

      const result = AM.ZP(cpu, memory);

      expect(result.address).toBe(0xFF);
      expect(cpu.PC).toBe(0x1001);
    });
  });

  describe('ZPX - Zero Page, X', () => {
    it('should return zero page address plus X register', () => {
      const cpu = createCPUState({ PC: 0x1000, X: 0x05 });
      const memory = createMemory({ 0x1000: 0x80 });

      const result = AM.ZPX(cpu, memory);

      expect(result.address).toBe(0x85);
      expect(cpu.PC).toBe(0x1001);
    });

    it('should wrap within zero page', () => {
      const cpu = createCPUState({ PC: 0x1000, X: 0x10 });
      const memory = createMemory({ 0x1000: 0xF8 });

      const result = AM.ZPX(cpu, memory);

      expect(result.address).toBe(0x08);
      expect(cpu.PC).toBe(0x1001);
    });
  });

  describe('ZPY - Zero Page, Y', () => {
    it('should return zero page address plus Y register', () => {
      const cpu = createCPUState({ PC: 0x1000, Y: 0x03 });
      const memory = createMemory({ 0x1000: 0x90 });

      const result = AM.ZPY(cpu, memory);

      expect(result.address).toBe(0x93);
      expect(cpu.PC).toBe(0x1001);
    });

    it('should wrap within zero page', () => {
      const cpu = createCPUState({ PC: 0x1000, Y: 0x20 });
      const memory = createMemory({ 0x1000: 0xF0 });

      const result = AM.ZPY(cpu, memory);

      expect(result.address).toBe(0x10);
      expect(cpu.PC).toBe(0x1001);
    });
  });

  describe('ABS - Absolute', () => {
    it('should return absolute address', () => {
      const cpu = createCPUState({ PC: 0x1000 });
      const memory = createMemory({ 0x1000: 0x34, 0x1001: 0x12 });

      const result = AM.ABS(cpu, memory);

      expect(result.address).toBe(0x1234);
      expect(cpu.PC).toBe(0x1002);
    });
  });

  describe('ABSX - Absolute, X', () => {
    it('should return absolute address plus X register', () => {
      const cpu = createCPUState({ PC: 0x1000, X: 0x05 });
      const memory = createMemory({ 0x1000: 0x00, 0x1001: 0x20 });

      const result = AM.ABSX(cpu, memory);

      expect(result.address).toBe(0x2005);
      expect(result.pageCrossed).toBe(false);
      expect(cpu.PC).toBe(0x1002);
    });

    it('should detect page crossing', () => {
      const cpu = createCPUState({ PC: 0x1000, X: 0x05 });
      const memory = createMemory({ 0x1000: 0xFF, 0x1001: 0x20 });

      const result = AM.ABSX(cpu, memory);

      expect(result.address).toBe(0x2104);
      expect(result.pageCrossed).toBe(true);
      expect(cpu.PC).toBe(0x1002);
    });

    it('should wrap at 16-bit boundary', () => {
      const cpu = createCPUState({ PC: 0x1000, X: 0x05 });
      const memory = createMemory({ 0x1000: 0xFF, 0x1001: 0xFF });

      const result = AM.ABSX(cpu, memory);

      expect(result.address).toBe(0x0004);
      expect(result.pageCrossed).toBe(true);
      expect(cpu.PC).toBe(0x1002);
    });
  });

  describe('ABSY - Absolute, Y', () => {
    it('should return absolute address plus Y register', () => {
      const cpu = createCPUState({ PC: 0x1000, Y: 0x03 });
      const memory = createMemory({ 0x1000: 0x00, 0x1001: 0x30 });

      const result = AM.ABSY(cpu, memory);

      expect(result.address).toBe(0x3003);
      expect(result.pageCrossed).toBe(false);
      expect(cpu.PC).toBe(0x1002);
    });

    it('should detect page crossing', () => {
      const cpu = createCPUState({ PC: 0x1000, Y: 0x10 });
      const memory = createMemory({ 0x1000: 0xF8, 0x1001: 0x30 });

      const result = AM.ABSY(cpu, memory);

      expect(result.address).toBe(0x3108);
      expect(result.pageCrossed).toBe(true);
      expect(cpu.PC).toBe(0x1002);
    });
  });

  describe('IND - Indirect', () => {
    it('should return address from indirect pointer', () => {
      const cpu = createCPUState({ PC: 0x1000 });
      const memory = createMemory({ 
        0x1000: 0x20, 0x1001: 0x30,  // Pointer to $3020
        0x3020: 0x60, 0x3021: 0x40   // Indirect address $4060
      });

      const result = AM.IND(cpu, memory);

      expect(result.address).toBe(0x4060);
      expect(cpu.PC).toBe(0x1002);
    });

    it('should handle 6502 indirect bug (JMP bug)', () => {
      const cpu = createCPUState({ PC: 0x1000 });
      const memory = createMemory({ 
        0x1000: 0xFF, 0x1001: 0x30,  // Pointer to $30FF
        0x30FF: 0x80,                // Low byte
        0x3100: 0x50,                // This would be normal high byte
        0x3000: 0x40                 // But 6502 bug reads high byte from $3000
      });

      const result = AM.IND(cpu, memory);

      expect(result.address).toBe(0x4080);
      expect(cpu.PC).toBe(0x1002);
    });
  });

  describe('IZX - Indexed Indirect, X', () => {
    it('should return address from zero page pointer plus X', () => {
      const cpu = createCPUState({ PC: 0x1000, X: 0x04 });
      const memory = createMemory({ 
        0x1000: 0x20,        // Base zero page address
        0x24: 0x60,          // $20 + X = $24, contains low byte
        0x25: 0x40           // $25 contains high byte
      });

      const result = AM.IZX(cpu, memory);

      expect(result.address).toBe(0x4060);
      expect(cpu.PC).toBe(0x1001);
    });

    it('should wrap within zero page for pointer calculation', () => {
      const cpu = createCPUState({ PC: 0x1000, X: 0x10 });
      const memory = createMemory({ 
        0x1000: 0xF8,        // Base zero page address
        0x08: 0x34,          // $F8 + $10 = $08 (wrapped), contains low byte
        0x09: 0x12           // $09 contains high byte
      });

      const result = AM.IZX(cpu, memory);

      expect(result.address).toBe(0x1234);
      expect(cpu.PC).toBe(0x1001);
    });

    it('should wrap pointer address within zero page', () => {
      const cpu = createCPUState({ PC: 0x1000, X: 0x01 });
      const memory = createMemory({ 
        0x1000: 0xFF,        // Base zero page address
        0x00: 0x78,          // $FF + $01 = $00 (wrapped), contains low byte
        0x01: 0x56           // $01 contains high byte
      });

      const result = AM.IZX(cpu, memory);

      expect(result.address).toBe(0x5678);
      expect(cpu.PC).toBe(0x1001);
    });
  });

  describe('IZY - Indirect Indexed, Y', () => {
    it('should return address from zero page pointer plus Y', () => {
      const cpu = createCPUState({ PC: 0x1000, Y: 0x05 });
      const memory = createMemory({ 
        0x1000: 0x20,        // Zero page address
        0x20: 0x00,          // Low byte of base address
        0x21: 0x30           // High byte of base address ($3000)
      });

      const result = AM.IZY(cpu, memory);

      expect(result.address).toBe(0x3005);
      expect(result.pageCrossed).toBe(false);
      expect(cpu.PC).toBe(0x1001);
    });

    it('should detect page crossing', () => {
      const cpu = createCPUState({ PC: 0x1000, Y: 0x10 });
      const memory = createMemory({ 
        0x1000: 0x20,        // Zero page address
        0x20: 0xF8,          // Low byte of base address
        0x21: 0x30           // High byte of base address ($30F8)
      });

      const result = AM.IZY(cpu, memory);

      expect(result.address).toBe(0x3108);
      expect(result.pageCrossed).toBe(true);
      expect(cpu.PC).toBe(0x1001);
    });

    it('should wrap pointer address within zero page', () => {
      const cpu = createCPUState({ PC: 0x1000, Y: 0x02 });
      const memory = createMemory({ 
        0x1000: 0xFF,        // Zero page address
        0xFF: 0x00,          // Low byte of base address
        0x00: 0x40           // High byte wrapped to $00
      });

      const result = AM.IZY(cpu, memory);

      expect(result.address).toBe(0x4002);
      expect(result.pageCrossed).toBe(false);
      expect(cpu.PC).toBe(0x1001);
    });
  });

  describe('REL - Relative', () => {
    it('should return positive offset', () => {
      const cpu = createCPUState({ PC: 0x1000 });
      const memory = createMemory({ 0x1000: 0x10 });

      const result = AM.REL(cpu, memory);

      expect(result.address).toBe(0x10);
      expect(cpu.PC).toBe(0x1001);
    });

    it('should convert negative offset correctly', () => {
      const cpu = createCPUState({ PC: 0x1000 });
      const memory = createMemory({ 0x1000: 0x80 });

      const result = AM.REL(cpu, memory);

      expect(result.address).toBe(-128);
      expect(cpu.PC).toBe(0x1001);
    });

    it('should handle boundary values', () => {
      const cpu1 = createCPUState({ PC: 0x1000 });
      const memory1 = createMemory({ 0x1000: 0x7F });

      const result1 = AM.REL(cpu1, memory1);
      expect(result1.address).toBe(127);

      const cpu2 = createCPUState({ PC: 0x1000 });
      const memory2 = createMemory({ 0x1000: 0xFF });

      const result2 = AM.REL(cpu2, memory2);
      expect(result2.address).toBe(-1);
    });
  });
});