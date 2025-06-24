
export const MEMORY_SIZE = 0x10000; // 64KB
export const DEFAULT_PROGRAM_LOAD_ADDRESS = 0x0200;
export const RESET_VECTOR_ADDRESS = 0xFFFC;
export const STACK_BASE = 0x0100;

export const FLAG_NAMES: { [key: number]: string } = {
  7: 'N', // Negative
  6: 'V', // Overflow
  5: '-', // Unused
  4: 'B', // Break
  3: 'D', // Decimal
  2: 'I', // Interrupt Disable
  1: 'Z', // Zero
  0: 'C', // Carry
};

// Default test program: Load values into registers, store to zero page, infinite loop
export const SIMPLE_PROGRAM_HEX = `A9 C0 A2 C1 A0 C2 85 00 86 01 84 02 4C 0C 02`;
// When loaded at $0200:
// $0200: A9 C0     LDA #$C0  - Load $C0 into accumulator
// $0202: A2 C1     LDX #$C1  - Load $C1 into X register  
// $0204: A0 C2     LDY #$C2  - Load $C2 into Y register
// $0206: 85 00     STA $00   - Store accumulator to zero page $00
// $0208: 86 01     STX $01   - Store X register to zero page $01
// $020A: 84 02     STY $02   - Store Y register to zero page $02
// $020C: 4C 0C 02  JMP $020C - Infinite loop
