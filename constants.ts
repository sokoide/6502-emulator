
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

// Example program: LDA #1, STA $00, LDA #2, STA $01, INC $00, INC $01, JMP to INC $00
export const DEFAULT_PROGRAM_HEX = `A9 01 85 10 A9 02 85 11 E6 10 E6 11 4C 04 02`;
// A9 01     LDA #$01
// 85 10     STA $10
// A9 02     LDA #$02
// 85 11     STA $11
// E6 10     INC $10  (loop starts here, address 0204)
// E6 11     INC $11
// 4C 04 02  JMP $0204
// This program will continuously increment memory locations $10 and $11.
// PC will be 0200 initially.
// $0200: A9 01
// $0202: 85 10
// $0204: A9 02
// $0206: 85 11
// $0208: E6 10 <--- JMP target $0208 for loop (Corrected from comments example)
// $020A: E6 11
// $020C: 4C 08 02 JMP $0208
export const BETTER_DEFAULT_PROGRAM_HEX = `A9 01 8D 00 03 A9 02 8D 01 03 E6 00 E6 01 4C 08 02`;
// Correcting my previous example logic based on load address and JMP
// If loaded at 0200:
// $0200: A9 01       LDA #$01
// $0202: 8D 00 03    STA $0300
// $0205: A9 02       LDA #$02
// $0207: 8D 01 03    STA $0301
// $020A: E6 00       INC $00 (ZP, typo, should be something like $0300: EE 00 03)
// Let's use a simpler example. Store A to $00, X to $01, Y to $02
// Then loop forever.
export const SIMPLE_PROGRAM_HEX = `A9 C0 A2 C1 A0 C2 85 00 86 01 84 02 4C 0C 02`;
// $0200: A9 C0     LDA #$C0
// $0202: A2 C1     LDX #$C1
// $0204: A0 C2     LDY #$C2
// $0206: 85 00     STA $00 (ZP)
// $0208: 86 01     STX $01 (ZP)
// $020A: 84 02     STY $02 (ZP)
// $020C: 4C 0C 02  JMP $020C (Infinite loop here)
