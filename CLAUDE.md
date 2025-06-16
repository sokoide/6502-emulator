# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build production version
- `npm run preview` - Preview built version
- `make dev` - Alternative to npm run dev
- `make build` - Build the project
- `make install` - Build and copy to docs/ directory for GitHub Pages deployment
- `make clean` - Clean build artifacts and node_modules

## Architecture Overview

This is a web-based MOS Technology 6502 microprocessor emulator built with React, TypeScript, and Vite. The architecture follows a modular design:

### Core Emulation Logic
- `services/use6502Emulator.ts` - Main emulator hook managing CPU state, memory, and execution
- `services/cpuInstructions.ts` - 6502 instruction implementations and opcode definitions
- `services/cpuAddressingModes.ts` - Addressing mode implementations (immediate, zero page, absolute, etc.)
- `types.ts` - TypeScript interfaces for CPU state, instruction definitions, and flags
- `constants.ts` - Memory layout constants and default programs

### React Components
- `App.tsx` - Main application component coordinating all views
- `components/CpuControls.tsx` - Control panel (run, step, reset, load program)
- `components/CpuRegistersView.tsx` - CPU register display (A, X, Y, PC, SP)
- `components/CpuFlagsView.tsx` - Status flags display (N, V, B, D, I, Z, C)
- `components/MemoryView.tsx` - Memory dump visualization
- `components/DisassemblyView.tsx` - Real-time disassembly display
- `components/LogView.tsx` - Execution log and messages

### Key Design Patterns
- The emulator uses a custom React hook (`use6502Emulator`) that manages all CPU state and provides methods for stepping, running, and disassembly
- CPU state is immutable - each step creates a new state object
- Memory is represented as a Uint8Array with 64KB capacity
- Instructions are defined with addressing mode functions and execution functions
- The disassembler dynamically shows context around the current Program Counter
- Real-time execution uses setInterval for continuous running with configurable speed

### Memory Layout
- Stack: $0100-$01FF (typical 6502 stack page)
- Default program load address: defined in constants
- Reset vector: $FFFC-$FFFD

The emulator supports loading custom programs via hex strings and provides comprehensive debugging views including registers, flags, memory, disassembly, and execution logs.