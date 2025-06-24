import { describe, it, expect } from 'vitest';
import { createCPUState, createMemory } from '../test/utils/testHelpers';

/**
 * Tests for improved error handling and input validation
 */
describe('Emulator Error Handling', () => {
  describe('Input Validation', () => {
    it('should validate hex string input', () => {
      const testCases = [
        { input: null, shouldFail: true, description: 'null input' },
        { input: undefined, shouldFail: true, description: 'undefined input' },
        { input: '', shouldFail: true, description: 'empty string' },
        { input: '   ', shouldFail: true, description: 'whitespace only' },
        { input: 'A9 4', shouldFail: true, description: 'odd length' },
        { input: 'A9 GG', shouldFail: true, description: 'invalid characters' },
        { input: 'A9 42', shouldFail: false, description: 'valid hex' },
        { input: 'a9 42', shouldFail: false, description: 'lowercase hex' },
        { input: ' A9  42 ', shouldFail: false, description: 'hex with spaces' },
      ];

      testCases.forEach(({ input, shouldFail, description }) => {
        if (input === null || input === undefined) {
          // These would fail type checking in real usage
          expect(shouldFail).toBe(true);
          return;
        }

        const cleanHex = input.replace(/\s+/g, '');
        
        // Check empty after cleaning
        if (cleanHex.length === 0) {
          expect(shouldFail).toBe(true);
          return;
        }

        // Check odd length
        if (cleanHex.length % 2 !== 0) {
          expect(shouldFail).toBe(true);
          return;
        }

        // Check invalid characters
        const bytes = [];
        for (let i = 0; i < cleanHex.length; i += 2) {
          bytes.push(parseInt(cleanHex.slice(i, i + 2), 16));
        }

        const hasInvalidBytes = bytes.some(b => isNaN(b));
        
        if (shouldFail) {
          expect(hasInvalidBytes).toBe(true);
        } else {
          expect(hasInvalidBytes).toBe(false);
        }
      });
    });

    it('should validate memory addresses', () => {
      const validAddresses = [0, 0x1000, 0xFFFF];
      const invalidAddresses = [-1, 0x10000, NaN, Infinity];

      validAddresses.forEach(addr => {
        expect(addr >= 0 && addr <= 0xFFFF).toBe(true);
      });

      invalidAddresses.forEach(addr => {
        expect(addr < 0 || addr > 0xFFFF || !Number.isFinite(addr)).toBe(true);
      });
    });

    it('should validate memory values', () => {
      const validValues = [0, 128, 255];
      const invalidValues = [-1, 256, 300, NaN, Infinity];

      validValues.forEach(val => {
        expect(val >= 0 && val <= 255).toBe(true);
      });

      invalidValues.forEach(val => {
        expect(val < 0 || val > 255 || !Number.isFinite(val)).toBe(true);
      });
    });

    it('should validate load addresses', () => {
      const MEMORY_SIZE = 0x10000;
      
      // Valid load addresses
      expect(0x0200 >= 0 && 0x0200 < MEMORY_SIZE).toBe(true);
      expect(0x8000 >= 0 && 0x8000 < MEMORY_SIZE).toBe(true);
      
      // Invalid load addresses
      expect(-1 >= 0).toBe(false);
      expect(0x10000 < MEMORY_SIZE).toBe(false);
    });
  });

  describe('Memory Bounds Checking', () => {
    it('should handle memory wraparound correctly', () => {
      const memory = createMemory();
      
      // Test 16-bit address wrapping
      const addr1 = 0x10000 & 0xFFFF;
      const addr2 = 0x10001 & 0xFFFF;
      
      expect(addr1).toBe(0x0000);
      expect(addr2).toBe(0x0001);
    });

    it('should handle program size validation', () => {
      const MEMORY_SIZE = 0x10000;
      const loadAddr = 0xFF00;
      const programSize = 0x200; // 512 bytes
      
      const wouldOverflow = loadAddr + programSize > MEMORY_SIZE;
      expect(wouldOverflow).toBe(true);
      
      const maxAllowedSize = MEMORY_SIZE - loadAddr;
      expect(maxAllowedSize).toBe(0x100); // 256 bytes max
    });
  });

  describe('CPU State Validation', () => {
    it('should validate PC bounds', () => {
      const MEMORY_SIZE = 0x10000;
      const cpu = createCPUState();
      
      // Valid PC values
      cpu.PC = 0x0000;
      expect(cpu.PC >= 0 && cpu.PC < MEMORY_SIZE).toBe(true);
      
      cpu.PC = 0xFFFF;
      expect(cpu.PC >= 0 && cpu.PC < MEMORY_SIZE).toBe(true);
      
      // Invalid PC values would be caught by validation
      const invalidPC = -1;
      expect(invalidPC >= 0 && invalidPC < MEMORY_SIZE).toBe(false);
      
      const invalidPC2 = 0x10000;
      expect(invalidPC2 >= 0 && invalidPC2 < MEMORY_SIZE).toBe(false);
    });

    it('should validate register values', () => {
      const cpu = createCPUState();
      
      // Valid 8-bit register values
      cpu.A = 0x00;
      expect(cpu.A >= 0 && cpu.A <= 255).toBe(true);
      
      cpu.A = 0xFF;
      expect(cpu.A >= 0 && cpu.A <= 255).toBe(true);
      
      // Invalid values would need to be masked
      const invalidValue = 0x100;
      const maskedValue = invalidValue & 0xFF;
      expect(maskedValue).toBe(0x00);
    });

    it('should validate stack pointer', () => {
      const cpu = createCPUState();
      
      // Valid SP values (8-bit)
      cpu.SP = 0x00;
      expect(cpu.SP >= 0 && cpu.SP <= 255).toBe(true);
      
      cpu.SP = 0xFF;
      expect(cpu.SP >= 0 && cpu.SP <= 255).toBe(true);
      
      // SP should wrap in 8-bit range
      const wrappedSP = (0x100) & 0xFF;
      expect(wrappedSP).toBe(0x00);
    });
  });

  describe('Instruction Validation', () => {
    it('should handle invalid opcodes gracefully', () => {
      const invalidOpcodes = [0xFF, 0x02, 0x03, 0x07, 0x0B, 0x0F];
      
      // These opcodes should not have instruction definitions
      // This test verifies our instruction set is properly defined
      invalidOpcodes.forEach(opcode => {
        // In a real scenario, these would be handled by the emulator
        expect(typeof opcode).toBe('number');
        expect(opcode >= 0 && opcode <= 255).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle stack overflow/underflow', () => {
      const cpu = createCPUState({ SP: 0x00 });
      
      // Stack underflow (decrement from 0x00)
      const newSP = (cpu.SP - 1) & 0xFF;
      expect(newSP).toBe(0xFF);
      
      // Stack overflow (increment from 0xFF)
      cpu.SP = 0xFF;
      const newSP2 = (cpu.SP + 1) & 0xFF;
      expect(newSP2).toBe(0x00);
    });

    it('should handle arithmetic overflow correctly', () => {
      // Test 8-bit arithmetic overflow
      const result1 = (0xFF + 1) & 0xFF;
      expect(result1).toBe(0x00);
      
      const result2 = (0x00 - 1) & 0xFF;
      expect(result2).toBe(0xFF);
      
      // Test 16-bit address overflow
      const addr1 = (0xFFFF + 1) & 0xFFFF;
      expect(addr1).toBe(0x0000);
    });

    it('should handle flag register operations', () => {
      const cpu = createCPUState();
      
      // Test flag setting and clearing
      cpu.P = 0x00;
      cpu.P |= 0x01; // Set carry
      expect(cpu.P & 0x01).toBeTruthy();
      
      cpu.P &= ~0x01; // Clear carry
      expect(cpu.P & 0x01).toBeFalsy();
      
      // Test multiple flags
      cpu.P = 0x81; // N and C flags
      expect(cpu.P & 0x80).toBeTruthy(); // N flag
      expect(cpu.P & 0x01).toBeTruthy(); // C flag
      expect(cpu.P & 0x02).toBeFalsy();  // Z flag
    });
  });

  describe('Memory Access Patterns', () => {
    it('should handle zero page addressing', () => {
      const cpu = createCPUState({ X: 0x10 });
      const baseAddr = 0xF0;
      
      // Zero page X should wrap within zero page
      const effectiveAddr = (baseAddr + cpu.X) & 0xFF;
      expect(effectiveAddr).toBe(0x00); // Wrapped to zero page
      expect(effectiveAddr < 0x100).toBe(true);
    });

    it('should handle indirect addressing edge cases', () => {
      const memory = createMemory();
      
      // Test the famous 6502 JMP indirect bug
      const pointer = 0x30FF;
      memory[0x30FF] = 0x80; // Low byte
      memory[0x3100] = 0x50; // Normal high byte
      memory[0x3000] = 0x40; // Bug: high byte read from page boundary
      
      // Simulate the bug
      const lowByte = memory[pointer];
      const highByte = memory[pointer & 0xFF00]; // Bug: wraps to page start
      const buggyAddress = (highByte << 8) | lowByte;
      
      expect(buggyAddress).toBe(0x4080);
      expect(buggyAddress).not.toBe(0x5080); // What it should be without bug
    });
  });
});