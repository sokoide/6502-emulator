import { CPUState, Flag } from '../../src/types';
import { MEMORY_SIZE } from '../../src/constants';

/**
 * Creates a default CPU state for testing
 */
export const createCPUState = (overrides: Partial<CPUState> = {}): CPUState => ({
  A: 0,
  X: 0,
  Y: 0,
  PC: 0x0200,
  SP: 0xFD,
  P: Flag.U | Flag.I,
  cycles: 0,
  halted: false,
  ...overrides,
});

/**
 * Creates a memory array initialized with zeros
 */
export const createMemory = (data: { [address: number]: number } = {}): Uint8Array => {
  const memory = new Uint8Array(MEMORY_SIZE);
  Object.entries(data).forEach(([address, value]) => {
    memory[parseInt(address)] = value;
  });
  return memory;
};

/**
 * Checks if a CPU flag is set
 */
export const isFlagSet = (cpu: CPUState, flag: Flag): boolean => {
  return (cpu.P & flag) !== 0;
};

/**
 * Creates a hex program string from bytes
 */
export const createHexProgram = (bytes: number[]): string => {
  return bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
};

/**
 * Asserts that CPU registers match expected values
 */
export const expectCPUState = (
  cpu: CPUState,
  expected: Partial<CPUState>
): void => {
  Object.entries(expected).forEach(([key, value]) => {
    const actualValue = cpu[key as keyof CPUState];
    if (actualValue !== value) {
      throw new Error(`Expected ${key} to be ${value}, but got ${actualValue}`);
    }
  });
};

/**
 * Asserts that specific flags are set or cleared
 */
export const expectFlags = (
  cpu: CPUState,
  flags: { [key in keyof typeof Flag]?: boolean }
): void => {
  Object.entries(flags).forEach(([flagName, shouldBeSet]) => {
    const flag = Flag[flagName as keyof typeof Flag];
    const isSet = isFlagSet(cpu, flag);
    if (isSet !== shouldBeSet) {
      throw new Error(`Expected flag ${flagName} to be ${shouldBeSet ? 'set' : 'cleared'}, but it was ${isSet ? 'set' : 'cleared'}`);
    }
  });
};

/**
 * Asserts that memory contains expected values
 */
export const expectMemory = (
  memory: Uint8Array,
  expected: { [address: number]: number }
): void => {
  Object.entries(expected).forEach(([address, value]) => {
    const addr = parseInt(address);
    const actualValue = memory[addr];
    if (actualValue !== value) {
      throw new Error(`Expected memory[${addr}] to be ${value}, but got ${actualValue}`);
    }
  });
};

/**
 * Creates a CPU state with specific flags set
 */
export const createCPUWithFlags = (flags: Flag[], overrides: Partial<CPUState> = {}): CPUState => {
  const flagValue = flags.reduce((acc, flag) => acc | flag, Flag.U);
  return createCPUState({ P: flagValue, ...overrides });
};