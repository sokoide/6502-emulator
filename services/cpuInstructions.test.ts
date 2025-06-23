import { describe, it, expect } from 'vitest';
import { getInstructionDefinition, instructionSet } from './cpuInstructions';
import { createCPUState, createMemory, expectFlags, expectMemory } from '../test/utils/testHelpers';
import { Flag } from '../types';
import { STACK_BASE } from '../constants';

describe('CPU Instructions', () => {
  describe('getInstructionDefinition', () => {
    it('should return instruction definition for valid opcode', () => {
      const instruction = getInstructionDefinition(0xA9); // LDA immediate
      expect(instruction).toBeDefined();
      expect(instruction?.mnemonic).toBe('LDA');
      expect(instruction?.opCode).toBe(0xA9);
    });

    it('should return undefined for invalid opcode', () => {
      const instruction = getInstructionDefinition(0xFF); // Invalid opcode
      expect(instruction).toBeUndefined();
    });
  });

  describe('Load Instructions', () => {
    describe('LDA - Load Accumulator', () => {
      it('should load value into accumulator and set flags', () => {
        const cpu = createCPUState();
        const memory = createMemory({ 0x00: 0x42 });
        const instruction = getInstructionDefinition(0xA5)!; // LDA zero page

        instruction.execute(cpu, memory, 0x00);

        expect(cpu.A).toBe(0x42);
        expectFlags(cpu, { Z: false, N: false });
      });

      it('should set zero flag when loading zero', () => {
        const cpu = createCPUState();
        const memory = createMemory({ 0x00: 0x00 });
        const instruction = getInstructionDefinition(0xA5)!; // LDA zero page

        instruction.execute(cpu, memory, 0x00);

        expect(cpu.A).toBe(0x00);
        expectFlags(cpu, { Z: true, N: false });
      });

      it('should set negative flag when loading negative value', () => {
        const cpu = createCPUState();
        const memory = createMemory({ 0x00: 0x80 });
        const instruction = getInstructionDefinition(0xA5)!; // LDA zero page

        instruction.execute(cpu, memory, 0x00);

        expect(cpu.A).toBe(0x80);
        expectFlags(cpu, { Z: false, N: true });
      });
    });

    describe('LDX - Load X Register', () => {
      it('should load value into X register and set flags', () => {
        const cpu = createCPUState();
        const memory = createMemory({ 0x00: 0x33 });
        const instruction = getInstructionDefinition(0xA6)!; // LDX zero page

        instruction.execute(cpu, memory, 0x00);

        expect(cpu.X).toBe(0x33);
        expectFlags(cpu, { Z: false, N: false });
      });
    });

    describe('LDY - Load Y Register', () => {
      it('should load value into Y register and set flags', () => {
        const cpu = createCPUState();
        const memory = createMemory({ 0x00: 0x44 });
        const instruction = getInstructionDefinition(0xA4)!; // LDY zero page

        instruction.execute(cpu, memory, 0x00);

        expect(cpu.Y).toBe(0x44);
        expectFlags(cpu, { Z: false, N: false });
      });
    });
  });

  describe('Store Instructions', () => {
    describe('STA - Store Accumulator', () => {
      it('should store accumulator value to memory', () => {
        const cpu = createCPUState({ A: 0x55 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x85)!; // STA zero page

        instruction.execute(cpu, memory, 0x10);

        expect(memory[0x10]).toBe(0x55);
      });
    });

    describe('STX - Store X Register', () => {
      it('should store X register value to memory', () => {
        const cpu = createCPUState({ X: 0x66 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x86)!; // STX zero page

        instruction.execute(cpu, memory, 0x10);

        expect(memory[0x10]).toBe(0x66);
      });
    });

    describe('STY - Store Y Register', () => {
      it('should store Y register value to memory', () => {
        const cpu = createCPUState({ Y: 0x77 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x84)!; // STY zero page

        instruction.execute(cpu, memory, 0x10);

        expect(memory[0x10]).toBe(0x77);
      });
    });
  });

  describe('Arithmetic Instructions', () => {
    describe('ADC - Add with Carry', () => {
      it('should add without carry', () => {
        const cpu = createCPUState({ A: 0x50, P: Flag.U }); // Clear carry
        const memory = createMemory({ 0x00: 0x30 });
        const instruction = getInstructionDefinition(0x65)!; // ADC zero page

        instruction.execute(cpu, memory, 0x00);

        expect(cpu.A).toBe(0x80);
        expectFlags(cpu, { C: false, Z: false, N: true, V: true }); // V should be set (pos + pos = neg)
      });

      it('should add with carry', () => {
        const cpu = createCPUState({ A: 0x50, P: Flag.U | Flag.C }); // Set carry
        const memory = createMemory({ 0x00: 0x30 });
        const instruction = getInstructionDefinition(0x65)!; // ADC zero page

        instruction.execute(cpu, memory, 0x00);

        expect(cpu.A).toBe(0x81);
        expectFlags(cpu, { C: false, Z: false, N: true, V: true }); // V should be set (pos + pos = neg)
      });

      it('should set carry flag on overflow', () => {
        const cpu = createCPUState({ A: 0xFF, P: Flag.U });
        const memory = createMemory({ 0x00: 0x01 });
        const instruction = getInstructionDefinition(0x65)!; // ADC zero page

        instruction.execute(cpu, memory, 0x00);

        expect(cpu.A).toBe(0x00);
        expectFlags(cpu, { C: true, Z: true, N: false, V: false });
      });

      it('should set overflow flag correctly', () => {
        const cpu = createCPUState({ A: 0x7F, P: Flag.U }); // +127
        const memory = createMemory({ 0x00: 0x01 }); // +1
        const instruction = getInstructionDefinition(0x65)!; // ADC zero page

        instruction.execute(cpu, memory, 0x00);

        expect(cpu.A).toBe(0x80);
        expectFlags(cpu, { C: false, Z: false, N: true, V: true });
      });
    });

    describe('SBC - Subtract with Carry', () => {
      it('should subtract without borrow', () => {
        const cpu = createCPUState({ A: 0x50, P: Flag.U | Flag.C }); // Set carry (no borrow)
        const memory = createMemory({ 0x00: 0x30 });
        const instruction = getInstructionDefinition(0xE5)!; // SBC zero page

        instruction.execute(cpu, memory, 0x00);

        expect(cpu.A).toBe(0x20);
        expectFlags(cpu, { C: true, Z: false, N: false, V: false });
      });

      it('should subtract with borrow', () => {
        const cpu = createCPUState({ A: 0x50, P: Flag.U }); // Clear carry (borrow)
        const memory = createMemory({ 0x00: 0x30 });
        const instruction = getInstructionDefinition(0xE5)!; // SBC zero page

        instruction.execute(cpu, memory, 0x00);

        expect(cpu.A).toBe(0x1F);
        expectFlags(cpu, { C: true, Z: false, N: false, V: false });
      });

      it('should set borrow flag when result is negative', () => {
        const cpu = createCPUState({ A: 0x20, P: Flag.U | Flag.C });
        const memory = createMemory({ 0x00: 0x30 });
        const instruction = getInstructionDefinition(0xE5)!; // SBC zero page

        instruction.execute(cpu, memory, 0x00);

        expect(cpu.A).toBe(0xF0);
        expectFlags(cpu, { C: false, Z: false, N: true, V: false });
      });
    });
  });

  describe('Branch Instructions', () => {
    describe('BEQ - Branch if Equal', () => {
      it('should branch when zero flag is set', () => {
        const cpu = createCPUState({ PC: 0x1000, P: Flag.U | Flag.Z, cycles: 0 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0xF0)!; // BEQ

        instruction.execute(cpu, memory, 0x10); // +16 offset

        expect(cpu.PC).toBe(0x1010);
        expect(cpu.cycles).toBe(1); // Branch taken adds cycle
      });

      it('should not branch when zero flag is clear', () => {
        const cpu = createCPUState({ PC: 0x1000, P: Flag.U, cycles: 0 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0xF0)!; // BEQ

        instruction.execute(cpu, memory, 0x10);

        expect(cpu.PC).toBe(0x1000);
        expect(cpu.cycles).toBe(0);
      });

      it('should add extra cycle when crossing page boundary', () => {
        const cpu = createCPUState({ PC: 0x10F0, P: Flag.U | Flag.Z, cycles: 0 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0xF0)!; // BEQ

        instruction.execute(cpu, memory, 0x20); // +32 offset, crosses page

        expect(cpu.PC).toBe(0x1110);
        expect(cpu.cycles).toBe(2); // Branch taken + page crossing
      });

      it('should handle negative branch offset', () => {
        const cpu = createCPUState({ PC: 0x1000, P: Flag.U | Flag.Z, cycles: 0 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0xF0)!; // BEQ

        instruction.execute(cpu, memory, -16); // -16 offset

        expect(cpu.PC).toBe(0x0FF0);
        expect(cpu.cycles).toBe(2); // Branch taken + page crossing
      });
    });

    describe('BNE - Branch if Not Equal', () => {
      it('should branch when zero flag is clear', () => {
        const cpu = createCPUState({ PC: 0x1000, P: Flag.U, cycles: 0 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0xD0)!; // BNE

        instruction.execute(cpu, memory, 0x08);

        expect(cpu.PC).toBe(0x1008);
        expect(cpu.cycles).toBe(1);
      });

      it('should not branch when zero flag is set', () => {
        const cpu = createCPUState({ PC: 0x1000, P: Flag.U | Flag.Z, cycles: 0 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0xD0)!; // BNE

        instruction.execute(cpu, memory, 0x08);

        expect(cpu.PC).toBe(0x1000);
        expect(cpu.cycles).toBe(0);
      });
    });
  });

  describe('Jump Instructions', () => {
    describe('JMP - Jump', () => {
      it('should set PC to target address', () => {
        const cpu = createCPUState({ PC: 0x1000 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x4C)!; // JMP absolute

        instruction.execute(cpu, memory, 0x2000);

        expect(cpu.PC).toBe(0x2000);
      });
    });

    describe('JSR - Jump to Subroutine', () => {
      it('should push return address and jump', () => {
        const cpu = createCPUState({ PC: 0x1003, SP: 0xFD });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x20)!; // JSR

        instruction.execute(cpu, memory, 0x2000);

        expect(cpu.PC).toBe(0x2000);
        expect(cpu.SP).toBe(0xFB);
        expect(memory[STACK_BASE + 0xFC]).toBe(0x02); // High byte of return address - 1
        expect(memory[STACK_BASE + 0xFD]).toBe(0x10); // Low byte of return address - 1
      });
    });

    describe('RTS - Return from Subroutine', () => {
      it('should pull return address and jump', () => {
        const cpu = createCPUState({ SP: 0xFB });
        const memory = createMemory();
        memory[STACK_BASE + 0xFC] = 0x02; // Low byte
        memory[STACK_BASE + 0xFD] = 0x10; // High byte
        const instruction = getInstructionDefinition(0x60)!; // RTS

        instruction.execute(cpu, memory, 0);

        expect(cpu.PC).toBe(0x1003); // Return address + 1
        expect(cpu.SP).toBe(0xFD);
      });
    });
  });

  describe('Increment/Decrement Instructions', () => {
    describe('INC - Increment Memory', () => {
      it('should increment memory value and set flags', () => {
        const cpu = createCPUState();
        const memory = createMemory({ 0x10: 0x7F });
        const instruction = getInstructionDefinition(0xE6)!; // INC zero page

        instruction.execute(cpu, memory, 0x10);

        expect(memory[0x10]).toBe(0x80);
        expectFlags(cpu, { Z: false, N: true });
      });

      it('should wrap from FF to 00 and set zero flag', () => {
        const cpu = createCPUState();
        const memory = createMemory({ 0x10: 0xFF });
        const instruction = getInstructionDefinition(0xE6)!; // INC zero page

        instruction.execute(cpu, memory, 0x10);

        expect(memory[0x10]).toBe(0x00);
        expectFlags(cpu, { Z: true, N: false });
      });
    });

    describe('INX - Increment X Register', () => {
      it('should increment X register and set flags', () => {
        const cpu = createCPUState({ X: 0x10 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0xE8)!; // INX

        instruction.execute(cpu, memory, 0);

        expect(cpu.X).toBe(0x11);
        expectFlags(cpu, { Z: false, N: false });
      });
    });

    describe('DEC - Decrement Memory', () => {
      it('should decrement memory value and set flags', () => {
        const cpu = createCPUState();
        const memory = createMemory({ 0x10: 0x01 });
        const instruction = getInstructionDefinition(0xC6)!; // DEC zero page

        instruction.execute(cpu, memory, 0x10);

        expect(memory[0x10]).toBe(0x00);
        expectFlags(cpu, { Z: true, N: false });
      });

      it('should wrap from 00 to FF and set negative flag', () => {
        const cpu = createCPUState();
        const memory = createMemory({ 0x10: 0x00 });
        const instruction = getInstructionDefinition(0xC6)!; // DEC zero page

        instruction.execute(cpu, memory, 0x10);

        expect(memory[0x10]).toBe(0xFF);
        expectFlags(cpu, { Z: false, N: true });
      });
    });
  });

  describe('Compare Instructions', () => {
    describe('CMP - Compare Accumulator', () => {
      it('should set carry when A >= memory', () => {
        const cpu = createCPUState({ A: 0x50 });
        const memory = createMemory({ 0x10: 0x30 });
        const instruction = getInstructionDefinition(0xC5)!; // CMP zero page

        instruction.execute(cpu, memory, 0x10);

        expectFlags(cpu, { C: true, Z: false, N: false });
      });

      it('should clear carry when A < memory', () => {
        const cpu = createCPUState({ A: 0x30 });
        const memory = createMemory({ 0x10: 0x50 });
        const instruction = getInstructionDefinition(0xC5)!; // CMP zero page

        instruction.execute(cpu, memory, 0x10);

        expectFlags(cpu, { C: false, Z: false, N: true });
      });

      it('should set zero flag when A == memory', () => {
        const cpu = createCPUState({ A: 0x42 });
        const memory = createMemory({ 0x10: 0x42 });
        const instruction = getInstructionDefinition(0xC5)!; // CMP zero page

        instruction.execute(cpu, memory, 0x10);

        expectFlags(cpu, { C: true, Z: true, N: false });
      });
    });
  });

  describe('Logical Instructions', () => {
    describe('AND - Logical AND', () => {
      it('should perform bitwise AND and set flags', () => {
        const cpu = createCPUState({ A: 0xF0 });
        const memory = createMemory({ 0x10: 0x0F });
        const instruction = getInstructionDefinition(0x25)!; // AND zero page

        instruction.execute(cpu, memory, 0x10);

        expect(cpu.A).toBe(0x00);
        expectFlags(cpu, { Z: true, N: false });
      });

      it('should set negative flag when result has high bit', () => {
        const cpu = createCPUState({ A: 0xFF });
        const memory = createMemory({ 0x10: 0x80 });
        const instruction = getInstructionDefinition(0x25)!; // AND zero page

        instruction.execute(cpu, memory, 0x10);

        expect(cpu.A).toBe(0x80);
        expectFlags(cpu, { Z: false, N: true });
      });
    });

    describe('ORA - Logical OR', () => {
      it('should perform bitwise OR and set flags', () => {
        const cpu = createCPUState({ A: 0xF0 });
        const memory = createMemory({ 0x10: 0x0F });
        const instruction = getInstructionDefinition(0x05)!; // ORA zero page

        instruction.execute(cpu, memory, 0x10);

        expect(cpu.A).toBe(0xFF);
        expectFlags(cpu, { Z: false, N: true });
      });
    });

    describe('EOR - Exclusive OR', () => {
      it('should perform bitwise XOR and set flags', () => {
        const cpu = createCPUState({ A: 0xFF });
        const memory = createMemory({ 0x10: 0xFF });
        const instruction = getInstructionDefinition(0x45)!; // EOR zero page

        instruction.execute(cpu, memory, 0x10);

        expect(cpu.A).toBe(0x00);
        expectFlags(cpu, { Z: true, N: false });
      });
    });

    describe('BIT - Bit Test', () => {
      it('should test bits and set flags correctly', () => {
        const cpu = createCPUState({ A: 0x0F });
        const memory = createMemory({ 0x10: 0xC0 }); // Bits 7,6 set
        const instruction = getInstructionDefinition(0x24)!; // BIT zero page

        instruction.execute(cpu, memory, 0x10);

        expectFlags(cpu, { Z: true, N: true, V: true }); // Z=1 (A&M=0), N=1 (bit 7), V=1 (bit 6)
      });
    });
  });

  describe('Shift Instructions', () => {
    describe('ASL - Arithmetic Shift Left', () => {
      it('should shift accumulator left and set carry', () => {
        const cpu = createCPUState({ A: 0x80 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x0A)!; // ASL accumulator

        instruction.execute(cpu, memory, 0);

        expect(cpu.A).toBe(0x00);
        expectFlags(cpu, { C: true, Z: true, N: false });
      });

      it('should shift memory left', () => {
        const cpu = createCPUState();
        const memory = createMemory({ 0x10: 0x40 });
        const instruction = getInstructionDefinition(0x06)!; // ASL zero page

        instruction.execute(cpu, memory, 0x10);

        expect(memory[0x10]).toBe(0x80);
        expectFlags(cpu, { C: false, Z: false, N: true });
      });
    });

    describe('LSR - Logical Shift Right', () => {
      it('should shift accumulator right and set carry', () => {
        const cpu = createCPUState({ A: 0x01 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x4A)!; // LSR accumulator

        instruction.execute(cpu, memory, 0);

        expect(cpu.A).toBe(0x00);
        expectFlags(cpu, { C: true, Z: true, N: false });
      });
    });

    describe('ROL - Rotate Left', () => {
      it('should rotate accumulator left through carry', () => {
        const cpu = createCPUState({ A: 0x80, P: Flag.U | Flag.C });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x2A)!; // ROL accumulator

        instruction.execute(cpu, memory, 0);

        expect(cpu.A).toBe(0x01);
        expectFlags(cpu, { C: true, Z: false, N: false });
      });
    });

    describe('ROR - Rotate Right', () => {
      it('should rotate accumulator right through carry', () => {
        const cpu = createCPUState({ A: 0x01, P: Flag.U | Flag.C });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x6A)!; // ROR accumulator

        instruction.execute(cpu, memory, 0);

        expect(cpu.A).toBe(0x80);
        expectFlags(cpu, { C: true, Z: false, N: true });
      });
    });
  });

  describe('Stack Instructions', () => {
    describe('PHA - Push Accumulator', () => {
      it('should push accumulator to stack', () => {
        const cpu = createCPUState({ A: 0x42, SP: 0xFD });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x48)!; // PHA

        instruction.execute(cpu, memory, 0);

        expect(memory[STACK_BASE + 0xFD]).toBe(0x42);
        expect(cpu.SP).toBe(0xFC);
      });
    });

    describe('PLA - Pull Accumulator', () => {
      it('should pull accumulator from stack and set flags', () => {
        const cpu = createCPUState({ SP: 0xFC });
        const memory = createMemory();
        memory[STACK_BASE + 0xFD] = 0x80;
        const instruction = getInstructionDefinition(0x68)!; // PLA

        instruction.execute(cpu, memory, 0);

        expect(cpu.A).toBe(0x80);
        expect(cpu.SP).toBe(0xFD);
        expectFlags(cpu, { Z: false, N: true });
      });
    });

    describe('PHP - Push Processor Status', () => {
      it('should push status register with B and U flags set', () => {
        const cpu = createCPUState({ P: Flag.Z | Flag.C, SP: 0xFD });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x08)!; // PHP

        instruction.execute(cpu, memory, 0);

        expect(memory[STACK_BASE + 0xFD]).toBe(Flag.Z | Flag.C | Flag.B | Flag.U);
        expect(cpu.SP).toBe(0xFC);
      });
    });

    describe('PLP - Pull Processor Status', () => {
      it('should pull status register but not restore B flag', () => {
        const cpu = createCPUState({ SP: 0xFC });
        const memory = createMemory();
        memory[STACK_BASE + 0xFD] = Flag.Z | Flag.C | Flag.B;
        const instruction = getInstructionDefinition(0x28)!; // PLP

        instruction.execute(cpu, memory, 0);

        expect(cpu.P).toBe(Flag.Z | Flag.C | Flag.U); // B not restored, U always set
        expect(cpu.SP).toBe(0xFD);
      });
    });
  });

  describe('Transfer Instructions', () => {
    describe('TAX - Transfer A to X', () => {
      it('should transfer accumulator to X and set flags', () => {
        const cpu = createCPUState({ A: 0x80 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0xAA)!; // TAX

        instruction.execute(cpu, memory, 0);

        expect(cpu.X).toBe(0x80);
        expectFlags(cpu, { Z: false, N: true });
      });
    });

    describe('TXA - Transfer X to A', () => {
      it('should transfer X to accumulator and set flags', () => {
        const cpu = createCPUState({ X: 0x00 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x8A)!; // TXA

        instruction.execute(cpu, memory, 0);

        expect(cpu.A).toBe(0x00);
        expectFlags(cpu, { Z: true, N: false });
      });
    });

    describe('TXS - Transfer X to Stack Pointer', () => {
      it('should transfer X to stack pointer without setting flags', () => {
        const cpu = createCPUState({ X: 0x80, P: Flag.U });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x9A)!; // TXS

        instruction.execute(cpu, memory, 0);

        expect(cpu.SP).toBe(0x80);
        expect(cpu.P).toBe(Flag.U); // Flags unchanged
      });
    });
  });

  describe('Flag Instructions', () => {
    describe('CLC - Clear Carry', () => {
      it('should clear carry flag', () => {
        const cpu = createCPUState({ P: Flag.U | Flag.C });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x18)!; // CLC

        instruction.execute(cpu, memory, 0);

        expectFlags(cpu, { C: false });
      });
    });

    describe('SEC - Set Carry', () => {
      it('should set carry flag', () => {
        const cpu = createCPUState({ P: Flag.U });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x38)!; // SEC

        instruction.execute(cpu, memory, 0);

        expectFlags(cpu, { C: true });
      });
    });

    describe('SEI - Set Interrupt Disable', () => {
      it('should set interrupt disable flag', () => {
        const cpu = createCPUState({ P: Flag.U });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x78)!; // SEI

        instruction.execute(cpu, memory, 0);

        expectFlags(cpu, { I: true });
      });
    });
  });

  describe('System Instructions', () => {
    describe('NOP - No Operation', () => {
      it('should do nothing', () => {
        const cpu = createCPUState({ A: 0x42, X: 0x33, P: Flag.U | Flag.Z });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0xEA)!; // NOP

        instruction.execute(cpu, memory, 0);

        expect(cpu.A).toBe(0x42);
        expect(cpu.X).toBe(0x33);
        expect(cpu.P).toBe(Flag.U | Flag.Z);
      });
    });

    describe('BRK - Break', () => {
      it('should halt CPU and push state to stack', () => {
        const cpu = createCPUState({ PC: 0x1002, P: Flag.U | Flag.Z, SP: 0xFD });
        const memory = createMemory({ 0x1002: 0x00 }); // BRK padding byte
        const instruction = getInstructionDefinition(0x00)!; // BRK

        instruction.execute(cpu, memory, 0);

        expect(cpu.halted).toBe(true);
        expectFlags(cpu, { I: true }); // Interrupt disable set
        expect(cpu.SP).toBe(0xFA); // Stack pointer decremented by 3
        expect(memory[STACK_BASE + 0xFB]).toBe(Flag.U | Flag.Z | Flag.B | Flag.U); // Status with B flag
      });
    });
  });

  describe('Instruction Set Coverage', () => {
    it('should have all major instruction opcodes defined', () => {
      const majorOpcodes = [
        0xA9, 0xA5, 0xB5, 0xAD, 0xBD, 0xB9, 0xA1, 0xB1, // LDA
        0xA2, 0xA6, 0xB6, 0xAE, 0xBE,                   // LDX
        0xA0, 0xA4, 0xB4, 0xAC, 0xBC,                   // LDY
        0x85, 0x95, 0x8D, 0x9D, 0x99, 0x81, 0x91,       // STA
        0x86, 0x96, 0x8E,                               // STX
        0x84, 0x94, 0x8C,                               // STY
        0x69, 0x65, 0x75, 0x6D, 0x7D, 0x79, 0x61, 0x71, // ADC
        0xE9, 0xE5, 0xF5, 0xED, 0xFD, 0xF9, 0xE1, 0xF1, // SBC
        0x4C, 0x6C,                                     // JMP
        0x20,                                           // JSR
        0x60,                                           // RTS
        0xEA,                                           // NOP
        0x00,                                           // BRK
      ];

      majorOpcodes.forEach(opcode => {
        const instruction = getInstructionDefinition(opcode);
        expect(instruction).toBeDefined(`Opcode 0x${opcode.toString(16)} should be defined`);
      });
    });

    it('should have correct instruction lengths', () => {
      expect(getInstructionDefinition(0xA9)?.bytes).toBe(2); // LDA immediate
      expect(getInstructionDefinition(0xAD)?.bytes).toBe(3); // LDA absolute
      expect(getInstructionDefinition(0xEA)?.bytes).toBe(1); // NOP
      expect(getInstructionDefinition(0x4C)?.bytes).toBe(3); // JMP absolute
    });

    it('should have correct cycle counts', () => {
      expect(getInstructionDefinition(0xA9)?.baseCycles).toBe(2); // LDA immediate
      expect(getInstructionDefinition(0xBD)?.baseCycles).toBe(4); // LDA absolute,X
      expect(getInstructionDefinition(0x20)?.baseCycles).toBe(6); // JSR
    });
  });
});