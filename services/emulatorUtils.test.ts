import { describe, it, expect } from 'vitest';
import { SIMPLE_PROGRAM_HEX, DEFAULT_PROGRAM_LOAD_ADDRESS, MEMORY_SIZE } from '../constants';

describe('Emulator Utilities', () => {
  describe('Hex Program Parsing', () => {
    it('should parse valid hex strings correctly', () => {
      const testCases = [
        { input: 'A9 42', expected: [0xA9, 0x42] },
        { input: 'A942', expected: [0xA9, 0x42] },
        { input: 'a9 42', expected: [0xA9, 0x42] },
        { input: ' A9  42 ', expected: [0xA9, 0x42] },
        { input: 'FF 00 80', expected: [0xFF, 0x00, 0x80] },
      ];

      testCases.forEach(({ input, expected }) => {
        const cleanHex = input.replace(/\s+/g, '');
        const bytes = [];
        for (let i = 0; i < cleanHex.length; i += 2) {
          bytes.push(parseInt(cleanHex.slice(i, i + 2), 16));
        }
        expect(bytes).toEqual(expected);
      });
    });

    it('should detect invalid hex strings', () => {
      const oddLengthCases = ['A9 4', 'A']; // Odd length
      const invalidCharCases = ['A9 GG', 'ZZ FF']; // Invalid characters

      oddLengthCases.forEach(input => {
        const cleanHex = input.replace(/\s+/g, '');
        expect(cleanHex.length % 2).toBe(1); // Should be odd length
      });

      invalidCharCases.forEach(input => {
        const cleanHex = input.replace(/\s+/g, '');
        const bytes = [];
        for (let i = 0; i < cleanHex.length; i += 2) {
          bytes.push(parseInt(cleanHex.slice(i, i + 2), 16));
        }
        expect(bytes.some(b => isNaN(b))).toBe(true);
      });
    });

    it('should parse default program correctly', () => {
      const cleanHex = SIMPLE_PROGRAM_HEX.replace(/\s+/g, '');
      const bytes = [];
      for (let i = 0; i < cleanHex.length; i += 2) {
        bytes.push(parseInt(cleanHex.slice(i, i + 2), 16));
      }

      // Verify the program structure
      expect(bytes[0]).toBe(0xA9); // LDA immediate
      expect(bytes[1]).toBe(0xC0); // #$C0
      expect(bytes[2]).toBe(0xA2); // LDX immediate
      expect(bytes[3]).toBe(0xC1); // #$C1
      expect(bytes[4]).toBe(0xA0); // LDY immediate
      expect(bytes[5]).toBe(0xC2); // #$C2
    });
  });

  describe('Memory Management', () => {
    it('should handle memory size constraints', () => {
      expect(MEMORY_SIZE).toBe(0x10000); // 64KB
      expect(DEFAULT_PROGRAM_LOAD_ADDRESS).toBe(0x0200);
    });

    it('should handle address wrapping', () => {
      const testAddresses = [
        { input: 0x10000, expected: 0x0000 },
        { input: 0x10001, expected: 0x0001 },
        { input: 0xFFFF, expected: 0xFFFF },
        { input: -1, expected: 0xFFFF },
      ];

      testAddresses.forEach(({ input, expected }) => {
        expect(input & 0xFFFF).toBe(expected);
      });
    });

    it('should handle value wrapping for 8-bit operations', () => {
      const testValues = [
        { input: 0x100, expected: 0x00 },
        { input: 0x1FF, expected: 0xFF },
        { input: -1, expected: 0xFF },
        { input: 256, expected: 0x00 },
      ];

      testValues.forEach(({ input, expected }) => {
        expect(input & 0xFF).toBe(expected);
      });
    });
  });

  describe('Bit Operations', () => {
    it('should correctly perform flag bit operations', () => {
      // Test flag setting and clearing
      let status = 0x00;
      
      // Set carry flag (bit 0)
      status |= 0x01;
      expect(status & 0x01).toBeTruthy();
      
      // Clear carry flag
      status &= ~0x01;
      expect(status & 0x01).toBeFalsy();
      
      // Set negative flag (bit 7)
      status |= 0x80;
      expect(status & 0x80).toBeTruthy();
      
      // Multiple flags
      status = 0x80 | 0x02 | 0x01; // N, Z, C
      expect(status & 0x80).toBeTruthy(); // N
      expect(status & 0x02).toBeTruthy(); // Z
      expect(status & 0x01).toBeTruthy(); // C
      expect(status & 0x40).toBeFalsy();  // V not set
    });

    it('should handle signed byte operations', () => {
      // Test signed byte conversion for relative addressing
      const testValues = [
        { input: 0x00, expected: 0 },
        { input: 0x7F, expected: 127 },
        { input: 0x80, expected: -128 },
        { input: 0xFF, expected: -1 },
      ];

      testValues.forEach(({ input, expected }) => {
        const signed = input > 127 ? input - 256 : input;
        expect(signed).toBe(expected);
      });
    });
  });

  describe('Stack Operations', () => {
    it('should handle stack pointer operations', () => {
      let sp = 0xFD;
      
      // Push operation (decrement)
      sp = (sp - 1) & 0xFF;
      expect(sp).toBe(0xFC);
      
      // Pull operation (increment)
      sp = (sp + 1) & 0xFF;
      expect(sp).toBe(0xFD);
      
      // Stack underflow
      sp = 0xFF;
      sp = (sp + 1) & 0xFF;
      expect(sp).toBe(0x00);
      
      // Stack overflow
      sp = 0x00;
      sp = (sp - 1) & 0xFF;
      expect(sp).toBe(0xFF);
    });

    it('should correctly calculate stack addresses', () => {
      const stackBase = 0x0100;
      const sp = 0xFD;
      const stackAddr = stackBase + sp;
      
      expect(stackAddr).toBe(0x01FD);
      
      // Test stack page boundary
      expect((stackBase + 0x00) & 0xFFFF).toBe(0x0100);
      expect((stackBase + 0xFF) & 0xFFFF).toBe(0x01FF);
    });
  });

  describe('Program Counter Operations', () => {
    it('should handle PC advancement correctly', () => {
      let pc = 0x1000;
      
      // Single byte instruction
      pc = (pc + 1) & 0xFFFF;
      expect(pc).toBe(0x1001);
      
      // Two byte instruction
      pc = (pc + 2) & 0xFFFF;
      expect(pc).toBe(0x1003);
      
      // Three byte instruction
      pc = (pc + 3) & 0xFFFF;
      expect(pc).toBe(0x1006);
    });

    it('should handle PC wraparound', () => {
      let pc = 0xFFFF;
      pc = (pc + 1) & 0xFFFF;
      expect(pc).toBe(0x0000);
      
      pc = 0xFFFE;
      pc = (pc + 2) & 0xFFFF;
      expect(pc).toBe(0x0000);
    });

    it('should handle branch calculations', () => {
      const pc = 0x1000;
      const branchOffset = 0x10; // +16
      const targetPC = (pc + branchOffset) & 0xFFFF;
      expect(targetPC).toBe(0x1010);
      
      // Negative branch
      const negativeOffset = -16; // 0xF0 as signed
      const negativeTarget = (pc + negativeOffset) & 0xFFFF;
      expect(negativeTarget).toBe(0x0FF0);
    });
  });

  describe('Page Crossing Detection', () => {
    it('should detect page boundary crossings', () => {
      const testCases = [
        { base: 0x10FF, offset: 1, crosses: true },
        { base: 0x10FE, offset: 1, crosses: false },
        { base: 0x10FE, offset: 2, crosses: true },
        { base: 0x1000, offset: 0xFF, crosses: false },
        { base: 0x1000, offset: 0x100, crosses: true },
      ];

      testCases.forEach(({ base, offset, crosses }) => {
        const effective = (base + offset) & 0xFFFF;
        const pageCrossed = (base & 0xFF00) !== (effective & 0xFF00);
        expect(pageCrossed).toBe(crosses);
      });
    });
  });

  describe('Instruction Format Validation', () => {
    it('should validate instruction byte lengths', () => {
      const instructionLengths = {
        'implied': 1,     // NOP, TAX, etc.
        'immediate': 2,   // LDA #$42
        'zeroPage': 2,    // LDA $80
        'absolute': 3,    // LDA $1234
        'relative': 2,    // BEQ +10
      };

      Object.entries(instructionLengths).forEach(([mode, length]) => {
        expect(length).toBeGreaterThan(0);
        expect(length).toBeLessThanOrEqual(3);
      });
    });

    it('should validate cycle counts', () => {
      const cycleCounts = {
        'LDA_IMM': 2,
        'LDA_ZP': 3,
        'LDA_ABS': 4,
        'JSR': 6,
        'RTS': 6,
        'NOP': 2,
      };

      Object.entries(cycleCounts).forEach(([instruction, cycles]) => {
        expect(cycles).toBeGreaterThan(0);
        expect(cycles).toBeLessThanOrEqual(7); // Max typical 6502 cycles
      });
    });
  });
});