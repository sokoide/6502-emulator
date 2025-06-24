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

      it('should set overflow flag correctly', () => {
        const cpu = createCPUState({ A: 0x80, P: Flag.U | Flag.C }); // -128
        const memory = createMemory({ 0x00: 0x01 }); // +1
        const instruction = getInstructionDefinition(0xE5)!; // SBC zero page

        instruction.execute(cpu, memory, 0x00);

        expect(cpu.A).toBe(0x7F);
        expectFlags(cpu, { C: true, Z: false, N: false, V: true }); // Overflow: neg - pos = pos
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

    describe('BCS - Branch if Carry Set', () => {
      it('should branch when carry flag is set', () => {
        const cpu = createCPUState({ PC: 0x1000, P: Flag.U | Flag.C, cycles: 0 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0xB0)!; // BCS

        instruction.execute(cpu, memory, 0x08);

        expect(cpu.PC).toBe(0x1008);
        expect(cpu.cycles).toBe(1);
      });

      it('should not branch when carry flag is clear', () => {
        const cpu = createCPUState({ PC: 0x1000, P: Flag.U, cycles: 0 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0xB0)!; // BCS

        instruction.execute(cpu, memory, 0x08);

        expect(cpu.PC).toBe(0x1000);
        expect(cpu.cycles).toBe(0);
      });
    });

    describe('BCC - Branch if Carry Clear', () => {
      it('should branch when carry flag is clear', () => {
        const cpu = createCPUState({ PC: 0x1000, P: Flag.U, cycles: 0 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x90)!; // BCC

        instruction.execute(cpu, memory, 0x08);

        expect(cpu.PC).toBe(0x1008);
        expect(cpu.cycles).toBe(1);
      });

      it('should not branch when carry flag is set', () => {
        const cpu = createCPUState({ PC: 0x1000, P: Flag.U | Flag.C, cycles: 0 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x90)!; // BCC

        instruction.execute(cpu, memory, 0x08);

        expect(cpu.PC).toBe(0x1000);
        expect(cpu.cycles).toBe(0);
      });
    });

    describe('BMI - Branch if Minus', () => {
      it('should branch when negative flag is set', () => {
        const cpu = createCPUState({ PC: 0x1000, P: Flag.U | Flag.N, cycles: 0 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x30)!; // BMI

        instruction.execute(cpu, memory, 0x08);

        expect(cpu.PC).toBe(0x1008);
        expect(cpu.cycles).toBe(1);
      });

      it('should not branch when negative flag is clear', () => {
        const cpu = createCPUState({ PC: 0x1000, P: Flag.U, cycles: 0 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x30)!; // BMI

        instruction.execute(cpu, memory, 0x08);

        expect(cpu.PC).toBe(0x1000);
        expect(cpu.cycles).toBe(0);
      });
    });

    describe('BPL - Branch if Plus', () => {
      it('should branch when negative flag is clear', () => {
        const cpu = createCPUState({ PC: 0x1000, P: Flag.U, cycles: 0 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x10)!; // BPL

        instruction.execute(cpu, memory, 0x08);

        expect(cpu.PC).toBe(0x1008);
        expect(cpu.cycles).toBe(1);
      });

      it('should not branch when negative flag is set', () => {
        const cpu = createCPUState({ PC: 0x1000, P: Flag.U | Flag.N, cycles: 0 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x10)!; // BPL

        instruction.execute(cpu, memory, 0x08);

        expect(cpu.PC).toBe(0x1000);
        expect(cpu.cycles).toBe(0);
      });
    });

    describe('BVS - Branch if Overflow Set', () => {
      it('should branch when overflow flag is set', () => {
        const cpu = createCPUState({ PC: 0x1000, P: Flag.U | Flag.V, cycles: 0 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x70)!; // BVS

        instruction.execute(cpu, memory, 0x08);

        expect(cpu.PC).toBe(0x1008);
        expect(cpu.cycles).toBe(1);
      });

      it('should not branch when overflow flag is clear', () => {
        const cpu = createCPUState({ PC: 0x1000, P: Flag.U, cycles: 0 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x70)!; // BVS

        instruction.execute(cpu, memory, 0x08);

        expect(cpu.PC).toBe(0x1000);
        expect(cpu.cycles).toBe(0);
      });
    });

    describe('BVC - Branch if Overflow Clear', () => {
      it('should branch when overflow flag is clear', () => {
        const cpu = createCPUState({ PC: 0x1000, P: Flag.U, cycles: 0 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x50)!; // BVC

        instruction.execute(cpu, memory, 0x08);

        expect(cpu.PC).toBe(0x1008);
        expect(cpu.cycles).toBe(1);
      });

      it('should not branch when overflow flag is set', () => {
        const cpu = createCPUState({ PC: 0x1000, P: Flag.U | Flag.V, cycles: 0 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x50)!; // BVC

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

    describe('RTI - Return from Interrupt', () => {
      it('should pull status register and return address from stack', () => {
        const cpu = createCPUState({ SP: 0xFA });
        const memory = createMemory();
        memory[STACK_BASE + 0xFB] = Flag.Z | Flag.C | Flag.B; // Status register
        memory[STACK_BASE + 0xFC] = 0x00; // Low byte of return address
        memory[STACK_BASE + 0xFD] = 0x20; // High byte of return address
        const instruction = getInstructionDefinition(0x40)!; // RTI

        instruction.execute(cpu, memory, 0);

        expect(cpu.PC).toBe(0x2000);
        expect(cpu.SP).toBe(0xFD);
        expect(cpu.P).toBe(Flag.Z | Flag.C | Flag.U); // B flag not restored, U always set
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

    describe('INY - Increment Y Register', () => {
      it('should increment Y register and set flags', () => {
        const cpu = createCPUState({ Y: 0x10 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0xC8)!; // INY

        instruction.execute(cpu, memory, 0);

        expect(cpu.Y).toBe(0x11);
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

    describe('DEX - Decrement X Register', () => {
      it('should decrement X register and set flags', () => {
        const cpu = createCPUState({ X: 0x01 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0xCA)!; // DEX

        instruction.execute(cpu, memory, 0);

        expect(cpu.X).toBe(0x00);
        expectFlags(cpu, { Z: true, N: false });
      });
    });

    describe('DEY - Decrement Y Register', () => {
      it('should decrement Y register and set flags', () => {
        const cpu = createCPUState({ Y: 0x01 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x88)!; // DEY

        instruction.execute(cpu, memory, 0);

        expect(cpu.Y).toBe(0x00);
        expectFlags(cpu, { Z: true, N: false });
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

    describe('CPX - Compare X Register', () => {
      it('should set carry when X >= memory', () => {
        const cpu = createCPUState({ X: 0x50 });
        const memory = createMemory({ 0x10: 0x30 });
        const instruction = getInstructionDefinition(0xE4)!; // CPX zero page

        instruction.execute(cpu, memory, 0x10);

        expectFlags(cpu, { C: true, Z: false, N: false });
      });

      it('should clear carry when X < memory', () => {
        const cpu = createCPUState({ X: 0x30 });
        const memory = createMemory({ 0x10: 0x50 });
        const instruction = getInstructionDefinition(0xE4)!; // CPX zero page

        instruction.execute(cpu, memory, 0x10);

        expectFlags(cpu, { C: false, Z: false, N: true });
      });

      it('should set zero flag when X == memory', () => {
        const cpu = createCPUState({ X: 0x42 });
        const memory = createMemory({ 0x10: 0x42 });
        const instruction = getInstructionDefinition(0xE4)!; // CPX zero page

        instruction.execute(cpu, memory, 0x10);

        expectFlags(cpu, { C: true, Z: true, N: false });
      });
    });

    describe('CPY - Compare Y Register', () => {
      it('should set carry when Y >= memory', () => {
        const cpu = createCPUState({ Y: 0x50 });
        const memory = createMemory({ 0x10: 0x30 });
        const instruction = getInstructionDefinition(0xC4)!; // CPY zero page

        instruction.execute(cpu, memory, 0x10);

        expectFlags(cpu, { C: true, Z: false, N: false });
      });

      it('should clear carry when Y < memory', () => {
        const cpu = createCPUState({ Y: 0x30 });
        const memory = createMemory({ 0x10: 0x50 });
        const instruction = getInstructionDefinition(0xC4)!; // CPY zero page

        instruction.execute(cpu, memory, 0x10);

        expectFlags(cpu, { C: false, Z: false, N: true });
      });

      it('should set zero flag when Y == memory', () => {
        const cpu = createCPUState({ Y: 0x42 });
        const memory = createMemory({ 0x10: 0x42 });
        const instruction = getInstructionDefinition(0xC4)!; // CPY zero page

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

      it('should clear Z flag when A & memory != 0', () => {
        const cpu = createCPUState({ A: 0xFF });
        const memory = createMemory({ 0x10: 0x01 }); // Only bit 0 set
        const instruction = getInstructionDefinition(0x24)!; // BIT zero page

        instruction.execute(cpu, memory, 0x10);

        expectFlags(cpu, { Z: false, N: false, V: false }); // Z=0 (A&M!=0), N=0, V=0
      });

      it('should clear N flag when bit 7 is clear', () => {
        const cpu = createCPUState({ A: 0x00 });
        const memory = createMemory({ 0x10: 0x40 }); // Only bit 6 set
        const instruction = getInstructionDefinition(0x24)!; // BIT zero page

        instruction.execute(cpu, memory, 0x10);

        expectFlags(cpu, { Z: true, N: false, V: true }); // Z=1, N=0 (bit 7 clear), V=1 (bit 6 set)
      });

      it('should clear V flag when bit 6 is clear', () => {
        const cpu = createCPUState({ A: 0x00 });
        const memory = createMemory({ 0x10: 0x80 }); // Only bit 7 set
        const instruction = getInstructionDefinition(0x24)!; // BIT zero page

        instruction.execute(cpu, memory, 0x10);

        expectFlags(cpu, { Z: true, N: true, V: false }); // Z=1, N=1 (bit 7 set), V=0 (bit 6 clear)
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

      it('should shift memory right and set carry', () => {
        const cpu = createCPUState();
        const memory = createMemory({ 0x10: 0x01 });
        const instruction = getInstructionDefinition(0x46)!; // LSR zero page

        instruction.execute(cpu, memory, 0x10);

        expect(memory[0x10]).toBe(0x00);
        expectFlags(cpu, { C: true, Z: true, N: false });
      });

      it('should shift memory right without carry', () => {
        const cpu = createCPUState();
        const memory = createMemory({ 0x10: 0x80 });
        const instruction = getInstructionDefinition(0x46)!; // LSR zero page

        instruction.execute(cpu, memory, 0x10);

        expect(memory[0x10]).toBe(0x40);
        expectFlags(cpu, { C: false, Z: false, N: false });
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

      it('should rotate accumulator left without carry', () => {
        const cpu = createCPUState({ A: 0x40, P: Flag.U }); // Clear carry
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x2A)!; // ROL accumulator

        instruction.execute(cpu, memory, 0);

        expect(cpu.A).toBe(0x80);
        expectFlags(cpu, { C: false, Z: false, N: true });
      });

      it('should rotate memory left through carry', () => {
        const cpu = createCPUState({ P: Flag.U | Flag.C });
        const memory = createMemory({ 0x10: 0x80 });
        const instruction = getInstructionDefinition(0x26)!; // ROL zero page

        instruction.execute(cpu, memory, 0x10);

        expect(memory[0x10]).toBe(0x01);
        expectFlags(cpu, { C: true, Z: false, N: false });
      });

      it('should rotate memory left without carry', () => {
        const cpu = createCPUState({ P: Flag.U }); // Clear carry
        const memory = createMemory({ 0x10: 0x40 });
        const instruction = getInstructionDefinition(0x26)!; // ROL zero page

        instruction.execute(cpu, memory, 0x10);

        expect(memory[0x10]).toBe(0x80);
        expectFlags(cpu, { C: false, Z: false, N: true });
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

      it('should rotate accumulator right without carry', () => {
        const cpu = createCPUState({ A: 0x02, P: Flag.U }); // Clear carry
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x6A)!; // ROR accumulator

        instruction.execute(cpu, memory, 0);

        expect(cpu.A).toBe(0x01);
        expectFlags(cpu, { C: false, Z: false, N: false });
      });

      it('should rotate memory right through carry', () => {
        const cpu = createCPUState({ P: Flag.U | Flag.C });
        const memory = createMemory({ 0x10: 0x01 });
        const instruction = getInstructionDefinition(0x66)!; // ROR zero page

        instruction.execute(cpu, memory, 0x10);

        expect(memory[0x10]).toBe(0x80);
        expectFlags(cpu, { C: true, Z: false, N: true });
      });

      it('should rotate memory right without carry', () => {
        const cpu = createCPUState({ P: Flag.U }); // Clear carry
        const memory = createMemory({ 0x10: 0x02 });
        const instruction = getInstructionDefinition(0x66)!; // ROR zero page

        instruction.execute(cpu, memory, 0x10);

        expect(memory[0x10]).toBe(0x01);
        expectFlags(cpu, { C: false, Z: false, N: false });
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

    describe('TAY - Transfer A to Y', () => {
      it('should transfer accumulator to Y and set flags', () => {
        const cpu = createCPUState({ A: 0x80 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0xA8)!; // TAY

        instruction.execute(cpu, memory, 0);

        expect(cpu.Y).toBe(0x80);
        expectFlags(cpu, { Z: false, N: true });
      });
    });

    describe('TYA - Transfer Y to A', () => {
      it('should transfer Y to accumulator and set flags', () => {
        const cpu = createCPUState({ Y: 0x00 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x98)!; // TYA

        instruction.execute(cpu, memory, 0);

        expect(cpu.A).toBe(0x00);
        expectFlags(cpu, { Z: true, N: false });
      });
    });

    describe('TSX - Transfer Stack Pointer to X', () => {
      it('should transfer stack pointer to X and set flags', () => {
        const cpu = createCPUState({ SP: 0x80 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0xBA)!; // TSX

        instruction.execute(cpu, memory, 0);

        expect(cpu.X).toBe(0x80);
        expectFlags(cpu, { Z: false, N: true });
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

    describe('CLI - Clear Interrupt Disable', () => {
      it('should clear interrupt disable flag', () => {
        const cpu = createCPUState({ P: Flag.U | Flag.I });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x58)!; // CLI

        instruction.execute(cpu, memory, 0);

        expectFlags(cpu, { I: false });
      });
    });

    describe('CLD - Clear Decimal Mode', () => {
      it('should clear decimal mode flag', () => {
        const cpu = createCPUState({ P: Flag.U | Flag.D });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0xD8)!; // CLD

        instruction.execute(cpu, memory, 0);

        expectFlags(cpu, { D: false });
      });
    });

    describe('SED - Set Decimal Mode', () => {
      it('should set decimal mode flag', () => {
        const cpu = createCPUState({ P: Flag.U });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0xF8)!; // SED

        instruction.execute(cpu, memory, 0);

        expectFlags(cpu, { D: true });
      });
    });

    describe('CLV - Clear Overflow', () => {
      it('should clear overflow flag', () => {
        const cpu = createCPUState({ P: Flag.U | Flag.V });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0xB8)!; // CLV

        instruction.execute(cpu, memory, 0);

        expectFlags(cpu, { V: false });
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

  describe('Complete Instruction Coverage', () => {
    describe('All Load Instructions', () => {
      it('should load with all LDA addressing modes', () => {
        // LDA immediate
        let cpu = createCPUState();
        let memory = createMemory({ 0x1000: 0x42 });
        let instruction = getInstructionDefinition(0xA9)!;
        instruction.execute(cpu, memory, 0x1000);
        expect(cpu.A).toBe(0x42);

        // LDA indexed indirect (zp,X)
        cpu = createCPUState();
        memory = createMemory({ 0x1234: 0x55 });
        instruction = getInstructionDefinition(0xA1)!;
        instruction.execute(cpu, memory, 0x1234);
        expect(cpu.A).toBe(0x55);

        // LDA indirect indexed (zp),Y
        cpu = createCPUState();
        memory = createMemory({ 0x1234: 0x77 });
        instruction = getInstructionDefinition(0xB1)!;
        instruction.execute(cpu, memory, 0x1234);
        expect(cpu.A).toBe(0x77);

        // LDA absolute,X and absolute,Y
        cpu = createCPUState();
        memory = createMemory({ 0x1234: 0x88 });
        instruction = getInstructionDefinition(0xBD)!;
        instruction.execute(cpu, memory, 0x1234);
        expect(cpu.A).toBe(0x88);

        cpu = createCPUState();
        memory = createMemory({ 0x1234: 0x99 });
        instruction = getInstructionDefinition(0xB9)!;
        instruction.execute(cpu, memory, 0x1234);
        expect(cpu.A).toBe(0x99);
      });

      it('should load with all LDX addressing modes', () => {
        // LDX immediate, zero page Y, absolute, absolute Y
        const testCases = [
          { opcode: 0xA2, value: 0x33 },
          { opcode: 0xB6, value: 0x44 },
          { opcode: 0xAE, value: 0x55 },
          { opcode: 0xBE, value: 0x00 }
        ];

        testCases.forEach(({ opcode, value }) => {
          const cpu = createCPUState();
          const memory = createMemory({ 0x1234: value });
          const instruction = getInstructionDefinition(opcode)!;
          instruction.execute(cpu, memory, 0x1234);
          expect(cpu.X).toBe(value);
        });
      });

      it('should load with all LDY addressing modes', () => {
        // LDY immediate, zero page X, absolute, absolute X
        const testCases = [
          { opcode: 0xA0, value: 0x66 },
          { opcode: 0xB4, value: 0x77 },
          { opcode: 0xAC, value: 0x88 },
          { opcode: 0xBC, value: 0x80 }
        ];

        testCases.forEach(({ opcode, value }) => {
          const cpu = createCPUState();
          const memory = createMemory({ 0x1234: value });
          const instruction = getInstructionDefinition(opcode)!;
          instruction.execute(cpu, memory, 0x1234);
          expect(cpu.Y).toBe(value);
        });
      });
    });

    describe('All Store Instructions', () => {
      it('should store with all STA addressing modes', () => {
        const storeOpcodes = [0x95, 0x9D, 0x99, 0x81, 0x91]; // zp,X abs,X abs,Y (zp,X) (zp),Y
        storeOpcodes.forEach((opcode, index) => {
          const cpu = createCPUState({ A: 0x42 + index });
          const memory = createMemory();
          const instruction = getInstructionDefinition(opcode)!;
          instruction.execute(cpu, memory, 0x1234);
          expect(memory[0x1234]).toBe(0x42 + index);
        });
      });

      it('should store with all STX addressing modes', () => {
        // STX zp,Y and absolute
        [0x96, 0x8E].forEach((opcode, index) => {
          const cpu = createCPUState({ X: 0x99 + index });
          const memory = createMemory();
          const instruction = getInstructionDefinition(opcode)!;
          instruction.execute(cpu, memory, 0x1234);
          expect(memory[0x1234]).toBe(0x99 + index);
        });
      });

      it('should store with all STY addressing modes', () => {
        // STY zp,X and absolute
        [0x94, 0x8C].forEach((opcode, index) => {
          const cpu = createCPUState({ Y: 0xBB + index });
          const memory = createMemory();
          const instruction = getInstructionDefinition(opcode)!;
          instruction.execute(cpu, memory, 0x1234);
          expect(memory[0x1234]).toBe(0xBB + index);
        });
      });
    });

    describe('All Arithmetic Instructions', () => {
      it('should add with all ADC addressing modes', () => {
        const adcOpcodes = [0x69, 0x75, 0x6D, 0x7D, 0x79, 0x61, 0x71];
        adcOpcodes.forEach((opcode, index) => {
          const cpu = createCPUState({ A: 0x10 + index, P: Flag.U });
          const memory = createMemory({ 0x1234: 0x20 });
          const instruction = getInstructionDefinition(opcode)!;
          instruction.execute(cpu, memory, 0x1234);
          expect(cpu.A).toBe(0x30 + index);
        });
      });

      it('should subtract with all SBC addressing modes', () => {
        const sbcOpcodes = [0xE9, 0xF5, 0xED];
        sbcOpcodes.forEach((opcode, index) => {
          const cpu = createCPUState({ A: 0x50 + index * 0x10, P: Flag.U | Flag.C });
          const memory = createMemory({ 0x1234: 0x30 });
          const instruction = getInstructionDefinition(opcode)!;
          instruction.execute(cpu, memory, 0x1234);
          expect(cpu.A).toBe(0x20 + index * 0x10);
        });
      });
    });

    describe('All Branch Instructions', () => {
      it('should branch with all branch instructions', () => {
        const branches = [
          { opcode: 0x90, flag: Flag.C, flagSet: false, shouldBranch: true }, // BCC - branch when C clear
          { opcode: 0xB0, flag: Flag.C, flagSet: true, shouldBranch: true },  // BCS - branch when C set
          { opcode: 0x30, flag: Flag.N, flagSet: true, shouldBranch: true },  // BMI - branch when N set
          { opcode: 0x10, flag: Flag.N, flagSet: false, shouldBranch: true }, // BPL - branch when N clear
        ];

        branches.forEach(({ opcode, flag, flagSet, shouldBranch }) => {
          const cpu = createCPUState({ 
            PC: 0x1000, 
            P: flagSet ? (Flag.U | flag) : Flag.U, 
            cycles: 0 
          });
          const memory = createMemory();
          const instruction = getInstructionDefinition(opcode)!;
          instruction.execute(cpu, memory, 0x08);
          expect(cpu.PC).toBe(shouldBranch ? 0x1008 : 0x1000);
        });
      });
    });

    describe('All Logical Instructions', () => {
      it('should perform logical operations with all addressing modes', () => {
        // Test AND, ORA, EOR with immediate, zp,X, absolute modes
        const logicalTests = [
          { opcode: 0x29, initial: 0xFF, operand: 0x0F, expected: 0x0F }, // AND imm
          { opcode: 0x09, initial: 0x0F, operand: 0xF0, expected: 0xFF }, // ORA imm
          { opcode: 0x49, initial: 0xFF, operand: 0xFF, expected: 0x00 }, // EOR imm
        ];

        logicalTests.forEach(({ opcode, initial, operand, expected }) => {
          const cpu = createCPUState({ A: initial });
          const memory = createMemory({ 0x1000: operand });
          const instruction = getInstructionDefinition(opcode)!;
          instruction.execute(cpu, memory, 0x1000);
          expect(cpu.A).toBe(expected);
        });
      });

      it('should test bits with BIT instruction', () => {
        // BIT zero page and absolute
        [0x24, 0x2C].forEach(opcode => {
          const cpu = createCPUState({ A: 0x0F });
          const memory = createMemory({ 0x1234: 0xC0 });
          const instruction = getInstructionDefinition(opcode)!;
          instruction.execute(cpu, memory, 0x1234);
          expectFlags(cpu, { Z: true, N: true, V: true });
        });
      });
    });

    describe('All Compare Instructions', () => {
      it('should compare with all CMP addressing modes', () => {
        [0xC9, 0xD5, 0xCD].forEach(opcode => {
          const cpu = createCPUState({ A: 0x50 });
          const memory = createMemory({ 0x1234: 0x30 });
          const instruction = getInstructionDefinition(opcode)!;
          instruction.execute(cpu, memory, 0x1234);
          expectFlags(cpu, { C: true, Z: false, N: false });
        });
      });

      it('should compare with CPX and CPY', () => {
        // CPX immediate and absolute
        [0xE0, 0xEC].forEach(opcode => {
          const cpu = createCPUState({ X: 0x50 });
          const memory = createMemory({ 0x1234: 0x30 });
          const instruction = getInstructionDefinition(opcode)!;
          instruction.execute(cpu, memory, 0x1234);
          expectFlags(cpu, { C: true, Z: false, N: false });
        });

        // CPY immediate and absolute
        [0xC0, 0xCC].forEach(opcode => {
          const cpu = createCPUState({ Y: 0x42 });
          const memory = createMemory({ 0x1234: 0x42 });
          const instruction = getInstructionDefinition(opcode)!;
          instruction.execute(cpu, memory, 0x1234);
          expectFlags(cpu, { C: true, Z: true, N: false });
        });
      });
    });

    describe('All Shift/Rotate Memory Instructions', () => {
      it('should rotate memory with all ROL addressing modes', () => {
        const rolOpcodes = [0x36, 0x2E, 0x3E]; // zp,X abs abs,X
        rolOpcodes.forEach(opcode => {
          const cpu = createCPUState({ P: Flag.U | Flag.C });
          const memory = createMemory({ 0x1234: 0x80 });
          const instruction = getInstructionDefinition(opcode)!;
          instruction.execute(cpu, memory, 0x1234);
          expect(memory[0x1234]).toBe(0x01);
          expectFlags(cpu, { C: true, Z: false, N: false });
        });
      });

      it('should rotate memory with all ROR addressing modes', () => {
        const rorOpcodes = [0x76, 0x6E, 0x7E]; // zp,X abs abs,X
        rorOpcodes.forEach(opcode => {
          const cpu = createCPUState({ P: Flag.U | Flag.C });
          const memory = createMemory({ 0x1234: 0x01 });
          const instruction = getInstructionDefinition(opcode)!;
          instruction.execute(cpu, memory, 0x1234);
          expect(memory[0x1234]).toBe(0x80);
          expectFlags(cpu, { C: true, Z: false, N: true });
        });
      });

      it('should shift memory with all LSR addressing modes', () => {
        const lsrOpcodes = [0x56, 0x4E, 0x5E]; // zp,X abs abs,X
        lsrOpcodes.forEach(opcode => {
          const cpu = createCPUState();
          const memory = createMemory({ 0x1234: 0x03 });
          const instruction = getInstructionDefinition(opcode)!;
          instruction.execute(cpu, memory, 0x1234);
          expect(memory[0x1234]).toBe(0x01);
          expectFlags(cpu, { C: true, Z: false, N: false });
        });
      });

      it('should shift memory with all ASL addressing modes', () => {
        const aslOpcodes = [0x16, 0x0E, 0x1E]; // zp,X abs abs,X
        aslOpcodes.forEach(opcode => {
          const cpu = createCPUState();
          const memory = createMemory({ 0x1234: 0x40 });
          const instruction = getInstructionDefinition(opcode)!;
          instruction.execute(cpu, memory, 0x1234);
          expect(memory[0x1234]).toBe(0x80);
          expectFlags(cpu, { C: false, Z: false, N: true });
        });
      });
    });

    describe('All Inc/Dec Memory Instructions', () => {
      it('should increment memory with all INC addressing modes', () => {
        const incOpcodes = [0xF6, 0xEE, 0xFE]; // zp,X abs abs,X
        incOpcodes.forEach((opcode, index) => {
          const cpu = createCPUState();
          const memory = createMemory({ 0x1234: 0x7E + index });
          const instruction = getInstructionDefinition(opcode)!;
          instruction.execute(cpu, memory, 0x1234);
          expect(memory[0x1234]).toBe(0x7F + index);
        });
      });

      it('should decrement memory with all DEC addressing modes', () => {
        const decOpcodes = [0xD6, 0xCE, 0xDE]; // zp,X abs abs,X
        decOpcodes.forEach((opcode, index) => {
          const cpu = createCPUState();
          const memory = createMemory({ 0x1234: 0x01 + index });
          const instruction = getInstructionDefinition(opcode)!;
          instruction.execute(cpu, memory, 0x1234);
          expect(memory[0x1234]).toBe(0x00 + index);
        });
      });
    });

    describe('Missing Register Instructions', () => {
      it('should handle all increment/decrement register instructions', () => {
        // INY
        let cpu = createCPUState({ Y: 0x10 });
        let instruction = getInstructionDefinition(0xC8)!;
        instruction.execute(cpu, createMemory(), 0);
        expect(cpu.Y).toBe(0x11);

        // DEY
        cpu = createCPUState({ Y: 0x10 });
        instruction = getInstructionDefinition(0x88)!;
        instruction.execute(cpu, createMemory(), 0);
        expect(cpu.Y).toBe(0x0F);

        // DEX
        cpu = createCPUState({ X: 0x10 });
        instruction = getInstructionDefinition(0xCA)!;
        instruction.execute(cpu, createMemory(), 0);
        expect(cpu.X).toBe(0x0F);
      });

      it('should handle all transfer instructions', () => {
        // TAY
        let cpu = createCPUState({ A: 0x80 });
        let instruction = getInstructionDefinition(0xA8)!;
        instruction.execute(cpu, createMemory(), 0);
        expect(cpu.Y).toBe(0x80);
        expectFlags(cpu, { Z: false, N: true });

        // TYA
        cpu = createCPUState({ Y: 0x42 });
        instruction = getInstructionDefinition(0x98)!;
        instruction.execute(cpu, createMemory(), 0);
        expect(cpu.A).toBe(0x42);

        // TSX
        cpu = createCPUState({ SP: 0x80 });
        instruction = getInstructionDefinition(0xBA)!;
        instruction.execute(cpu, createMemory(), 0);
        expect(cpu.X).toBe(0x80);
        expectFlags(cpu, { Z: false, N: true });
      });
    });

    describe('Missing Flag Instructions', () => {
      it('should handle all flag clear/set instructions', () => {
        // CLI
        let cpu = createCPUState({ P: Flag.U | Flag.I });
        let instruction = getInstructionDefinition(0x58)!;
        instruction.execute(cpu, createMemory(), 0);
        expectFlags(cpu, { I: false });

        // CLD
        cpu = createCPUState({ P: Flag.U | Flag.D });
        instruction = getInstructionDefinition(0xD8)!;
        instruction.execute(cpu, createMemory(), 0);
        expectFlags(cpu, { D: false });

        // SED
        cpu = createCPUState({ P: Flag.U });
        instruction = getInstructionDefinition(0xF8)!;
        instruction.execute(cpu, createMemory(), 0);
        expectFlags(cpu, { D: true });

        // CLV
        cpu = createCPUState({ P: Flag.U | Flag.V });
        instruction = getInstructionDefinition(0xB8)!;
        instruction.execute(cpu, createMemory(), 0);
        expectFlags(cpu, { V: false });
      });
    });

    describe('Missing Jump Instructions', () => {
      it('should handle JMP indirect', () => {
        const cpu = createCPUState({ PC: 0x1000 });
        const memory = createMemory();
        const instruction = getInstructionDefinition(0x6C)!;
        instruction.execute(cpu, memory, 0x2000);
        expect(cpu.PC).toBe(0x2000);
      });

      it('should handle RTI', () => {
        const cpu = createCPUState({ SP: 0xFA });
        const memory = createMemory();
        memory[STACK_BASE + 0xFB] = Flag.Z | Flag.C;
        memory[STACK_BASE + 0xFC] = 0x34;
        memory[STACK_BASE + 0xFD] = 0x12;
        const instruction = getInstructionDefinition(0x40)!;
        instruction.execute(cpu, memory, 0);
        expect(cpu.PC).toBe(0x1234);
        expect(cpu.SP).toBe(0xFD);
      });
    });

    describe('Unofficial Instructions', () => {
      it('should handle unofficial NOP variants', () => {
        const nopOpcodes = [0x1A, 0x3A, 0x5A, 0x7A, 0xDA, 0xFA, 0x80, 0x04];
        nopOpcodes.forEach(opcode => {
          const cpu = createCPUState({ A: 0x42, X: 0x33, P: Flag.U | Flag.Z });
          const memory = createMemory();
          const instruction = getInstructionDefinition(opcode)!;
          instruction.execute(cpu, memory, 0x1000);
          expect(cpu.A).toBe(0x42); // Should not change
        });
      });
    });

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

    it('should have correct instruction properties', () => {
      expect(getInstructionDefinition(0xA9)?.bytes).toBe(2); // LDA immediate
      expect(getInstructionDefinition(0xAD)?.bytes).toBe(3); // LDA absolute
      expect(getInstructionDefinition(0xEA)?.bytes).toBe(1); // NOP
      expect(getInstructionDefinition(0x4C)?.bytes).toBe(3); // JMP absolute
      expect(getInstructionDefinition(0xA9)?.baseCycles).toBe(2); // LDA immediate
      expect(getInstructionDefinition(0xBD)?.baseCycles).toBe(4); // LDA absolute,X
      expect(getInstructionDefinition(0x20)?.baseCycles).toBe(6); // JSR
    });
  });
});