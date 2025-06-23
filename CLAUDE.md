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

# Development Guidelines

## Error Handling Patterns

- All errors must be wrapped with contextual information using `throw new Error("context: " + originalError.message)`
- HTTP client libraries (e.g., `axios`) should use interceptors for retry logic and consistent error formatting
- Authentication errors from Azure SDKs must be propagated clearly
- Type and model conversion failures should be handled with null-safe operations (`?.` and optional chaining)

### Package Management

- **ONLY** use `npm` for dependency management (never mix it with `pnpm`)
- All dependencies must have **explicit version pinning** in `package.json`
- No implicit peer dependencies or version ranges (`^` or `~`)

---

### Code Quality Standards

- All exported functions, classes, and interfaces must include **JSDoc comments**
- Maximum line length: **100 characters**
- Prefer `type` over `interface` unless extending other interfaces
- Interfaces must be minimal and specific to their usage context
- Avoid any usage of `any` type; prefer strict typing
- ESLint must pass with no errors or warnings (`npm run lint`)
- Use Prettier for formatting (`npm run format`)

---

### Testing Requirements

- Every public function must be covered by comprehensive **unit tests**
- Use mocks for Azure credentials and Graph API where applicable
- Place mocks under `test/mocks/`
- Use `jest` for unit and integration testing
- Integration tests must use real Microsoft Graph credentials (via `.env`)
- Use `ts-jest` for testing TypeScript directly
- Target **80%+ code coverage** across all modules
- Run tests with concurrency: `npm test -- --runInBand=false`

---

### Commit Guidelines

- Follow **Conventional Commits** format (e.g., `feat:`, `fix:`, `chore:`)
- Add commit trailers for issue tracking:
  - Bug reports: `git commit --trailer "Reported-by:<name>"`
  - GitHub issues: `git commit --trailer "Github-Issue:#<number>"`
- **NEVER** reference AI tools or automated code generation in commit messages

---

### Pull Request Requirements

- Every PR must include:
  - Clear problem statement
  - Explanation of the solution approach
- Keep PRs **focused and minimal**
# Development Guidelines

## Error Handling Patterns

- All errors must be wrapped with contextual information using `throw new Error("context: " + originalError.message)`
- HTTP client libraries (e.g., `axios`) should use interceptors for retry logic and consistent error formatting
- Authentication errors from Azure SDKs must be propagated clearly
- Type and model conversion failures should be handled with null-safe operations (`?.` and optional chaining)

### Package Management

- **ONLY** use `npm` for dependency management (never mix it with `pnpm`)
- All dependencies must have **explicit version pinning** in `package.json`
- No implicit peer dependencies or version ranges (`^` or `~`)

---

### Code Quality Standards

- All exported functions, classes, and interfaces must include **JSDoc comments**
- Maximum line length: **100 characters**
- Prefer `type` over `interface` unless extending other interfaces
- Interfaces must be minimal and specific to their usage context
- Avoid any usage of `any` type; prefer strict typing
- ESLint must pass with no errors or warnings (`npm run lint`)
- Use Prettier for formatting (`npm run format`)

---

### Testing Requirements

- Every public function must be covered by comprehensive **unit tests**
- Use mocks for Azure credentials and Graph API where applicable
- Place mocks under `test/mocks/`
- Use `jest` for unit and integration testing
- Integration tests must use real Microsoft Graph credentials (via `.env`)
- Use `ts-jest` for testing TypeScript directly
- Target **80%+ code coverage** across all modules
- Run tests with concurrency: `npm test -- --runInBand=false`

---

### Commit Guidelines

- Follow **Conventional Commits** format (e.g., `feat:`, `fix:`, `chore:`)
- Add commit trailers for issue tracking:
  - Bug reports: `git commit --trailer "Reported-by:<name>"`
  - GitHub issues: `git commit --trailer "Github-Issue:#<number>"`
- **NEVER** reference AI tools or automated code generation in commit messages

---

### Pull Request Requirements

- Every PR must include:
  - Clear problem statement
  - Explanation of the solution approach
- Keep PRs **focused and minimal**
