# MOS Technology 6502 Microprocessor Emulator

A web-based emulator for the legendary MOS Technology 6502 microprocessor, built with React, TypeScript, and Vite. This emulator provides a complete implementation of the 6502 instruction set with real-time debugging capabilities.

## Demo Site

🚀 **Live Demo:** https://sokoide.github.io/6502-emulator/

## Features

- **Complete 6502 Instruction Set** - All official opcodes implemented with accurate cycle timing
- **Real-time Debugging** - Step-by-step execution with register and memory inspection
- **Interactive Memory Viewer** - Browse and modify memory contents in real-time
- **Disassembly Display** - Dynamic disassembly showing instructions around the current PC
- **Program Loading** - Load programs via hex strings with comprehensive error handling
- **Status Flag Visualization** - Real-time display of N, V, B, D, I, Z, C flags
- **Execution Logging** - Detailed logs of operations and errors
- **Stack Monitoring** - Visual stack pointer and stack memory inspection

## Architecture

### Core Components

- **CPU Emulation** (`services/use6502Emulator.ts`) - Main emulator hook managing CPU state and execution
- **Instruction Set** (`services/cpuInstructions.ts`) - Complete 6502 instruction implementations
- **Addressing Modes** (`services/cpuAddressingModes.ts`) - All 6502 addressing modes (immediate, zero page, absolute, etc.)
- **React Components** - Modular UI components for registers, memory, disassembly, and controls

### Memory Layout

- **64KB Address Space** - Full 16-bit addressing (0x0000-0xFFFF)
- **Zero Page** - 0x0000-0x00FF (fast addressing)
- **Stack** - 0x0100-0x01FF (standard 6502 stack page)
- **Program Memory** - Default load address at 0x0200
- **Reset Vector** - 0xFFFC-0xFFFF

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm

### Installation & Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Alternative Make Commands

```bash
# Development
make dev

# Production build
make build

# Build and deploy to docs/
make install

# Clean build artifacts
make clean
```

## Testing

The project includes comprehensive unit tests with 87%+ code coverage:

```bash
# Run tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests with interactive UI
npm run test:ui
```

### Test Coverage

- **CPU Instructions** - All 50+ instructions tested with edge cases
- **Addressing Modes** - Complete coverage of all 10 addressing modes  
- **Memory Operations** - Boundary conditions and wraparound behavior
- **Flag Operations** - Arithmetic and logic flag setting verification
- **Error Handling** - Invalid opcodes and memory access scenarios

## Usage Examples

### Loading a Simple Program

```assembly
LDA #$C0    ; Load $C0 into accumulator
LDX #$C1    ; Load $C1 into X register  
LDY #$C2    ; Load $C2 into Y register
STA $00     ; Store accumulator to zero page $00
STX $01     ; Store X register to zero page $01
STY $02     ; Store Y register to zero page $02
JMP $020C   ; Infinite loop
```

**Hex representation:** `A9 C0 A2 C1 A0 C2 85 00 86 01 84 02 4C 0C 02`

### Debugging Features

1. **Step Execution** - Execute one instruction at a time
2. **Continuous Run** - Run programs with configurable speed
3. **Memory Inspection** - View and modify any memory location
4. **Register Monitoring** - Real-time A, X, Y, PC, SP values
5. **Flag Status** - Visual indication of all processor flags

## Supported Instructions

The emulator implements the complete MOS 6502 instruction set:

- **Load/Store** - LDA, LDX, LDY, STA, STX, STY
- **Arithmetic** - ADC, SBC  
- **Logic** - AND, ORA, EOR, BIT
- **Shifts** - ASL, LSR, ROL, ROR
- **Branches** - BEQ, BNE, BCS, BCC, BMI, BPL, BVS, BVC
- **Jumps** - JMP, JSR, RTS, RTI
- **Stack** - PHA, PLA, PHP, PLP
- **Transfers** - TAX, TXA, TAY, TYA, TSX, TXS
- **Flags** - CLC, SEC, CLI, SEI, CLD, SED, CLV
- **System** - NOP, BRK
- **Increment/Decrement** - INC, DEC, INX, INY, DEX, DEY
- **Compare** - CMP, CPX, CPY

### Addressing Modes

- **Implied** - Instructions with no operands
- **Immediate** - `#$42` - Literal values
- **Zero Page** - `$80` - Fast 8-bit addressing
- **Zero Page,X/Y** - `$80,X` - Indexed zero page
- **Absolute** - `$1234` - 16-bit addressing
- **Absolute,X/Y** - `$1234,X` - Indexed absolute
- **Indirect** - `($1234)` - Pointer dereferencing
- **Indexed Indirect** - `($80,X)` - Pre-indexed
- **Indirect Indexed** - `($80),Y` - Post-indexed
- **Relative** - Branch target calculation

## Development

### Code Quality

- **TypeScript** - Strict typing with 100-character line limits
- **ESLint** - Code quality enforcement
- **Testing** - Comprehensive unit test coverage
- **Documentation** - JSDoc comments for all public APIs

### Contributing

1. Follow existing code style and patterns
2. Add tests for new functionality
3. Ensure 80%+ test coverage
4. Use conventional commit messages
5. Keep commits focused and minimal

## Debug Mode

For development debugging:

1. Start the development server:
   ```bash
   npm run dev
   ```

2. In VS Code, press **F5** to attach the debugger to Edge/Chrome

## Technical Details

- **Framework** - React 19+ with hooks
- **Build Tool** - Vite 6+ for fast development
- **Testing** - Vitest with jsdom environment
- **Styling** - CSS with Lucide React icons
- **Memory Model** - Uint8Array for accurate byte operations
- **Cycle Accuracy** - Proper instruction timing simulation

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

MIT License allows you to:
- ✅ Use commercially
- ✅ Modify and distribute
- ✅ Include in private projects
- ✅ Sublicense

## Acknowledgments

- MOS Technology 6502 microprocessor documentation
- 6502 programming community and resources
- React and TypeScript ecosystems
