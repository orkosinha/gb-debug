import { hex2, hex4 } from './format.js';

const OPCODE_TABLE = buildOpcodeTable();
const CB_TABLE = buildCBTable();

function buildOpcodeTable() {
  const t = new Array(256);
  for (let i = 0; i < 256; i++) t[i] = { m: `DB $${hex2(i)}`, l: 1 };

  t[0x00] = { m: 'NOP', l: 1 };
  t[0x01] = { m: 'LD BC,d16', l: 3 };
  t[0x02] = { m: 'LD (BC),A', l: 1 };
  t[0x03] = { m: 'INC BC', l: 1 };
  t[0x04] = { m: 'INC B', l: 1 };
  t[0x05] = { m: 'DEC B', l: 1 };
  t[0x06] = { m: 'LD B,d8', l: 2 };
  t[0x07] = { m: 'RLCA', l: 1 };
  t[0x08] = { m: 'LD (a16),SP', l: 3 };
  t[0x09] = { m: 'ADD HL,BC', l: 1 };
  t[0x0a] = { m: 'LD A,(BC)', l: 1 };
  t[0x0b] = { m: 'DEC BC', l: 1 };
  t[0x0c] = { m: 'INC C', l: 1 };
  t[0x0d] = { m: 'DEC C', l: 1 };
  t[0x0e] = { m: 'LD C,d8', l: 2 };
  t[0x0f] = { m: 'RRCA', l: 1 };

  t[0x10] = { m: 'STOP', l: 2 };
  t[0x11] = { m: 'LD DE,d16', l: 3 };
  t[0x12] = { m: 'LD (DE),A', l: 1 };
  t[0x13] = { m: 'INC DE', l: 1 };
  t[0x14] = { m: 'INC D', l: 1 };
  t[0x15] = { m: 'DEC D', l: 1 };
  t[0x16] = { m: 'LD D,d8', l: 2 };
  t[0x17] = { m: 'RLA', l: 1 };
  t[0x18] = { m: 'JR r8', l: 2 };
  t[0x19] = { m: 'ADD HL,DE', l: 1 };
  t[0x1a] = { m: 'LD A,(DE)', l: 1 };
  t[0x1b] = { m: 'DEC DE', l: 1 };
  t[0x1c] = { m: 'INC E', l: 1 };
  t[0x1d] = { m: 'DEC E', l: 1 };
  t[0x1e] = { m: 'LD E,d8', l: 2 };
  t[0x1f] = { m: 'RRA', l: 1 };

  t[0x20] = { m: 'JR NZ,r8', l: 2 };
  t[0x21] = { m: 'LD HL,d16', l: 3 };
  t[0x22] = { m: 'LD (HL+),A', l: 1 };
  t[0x23] = { m: 'INC HL', l: 1 };
  t[0x24] = { m: 'INC H', l: 1 };
  t[0x25] = { m: 'DEC H', l: 1 };
  t[0x26] = { m: 'LD H,d8', l: 2 };
  t[0x27] = { m: 'DAA', l: 1 };
  t[0x28] = { m: 'JR Z,r8', l: 2 };
  t[0x29] = { m: 'ADD HL,HL', l: 1 };
  t[0x2a] = { m: 'LD A,(HL+)', l: 1 };
  t[0x2b] = { m: 'DEC HL', l: 1 };
  t[0x2c] = { m: 'INC L', l: 1 };
  t[0x2d] = { m: 'DEC L', l: 1 };
  t[0x2e] = { m: 'LD L,d8', l: 2 };
  t[0x2f] = { m: 'CPL', l: 1 };

  t[0x30] = { m: 'JR NC,r8', l: 2 };
  t[0x31] = { m: 'LD SP,d16', l: 3 };
  t[0x32] = { m: 'LD (HL-),A', l: 1 };
  t[0x33] = { m: 'INC SP', l: 1 };
  t[0x34] = { m: 'INC (HL)', l: 1 };
  t[0x35] = { m: 'DEC (HL)', l: 1 };
  t[0x36] = { m: 'LD (HL),d8', l: 2 };
  t[0x37] = { m: 'SCF', l: 1 };
  t[0x38] = { m: 'JR C,r8', l: 2 };
  t[0x39] = { m: 'ADD HL,SP', l: 1 };
  t[0x3a] = { m: 'LD A,(HL-)', l: 1 };
  t[0x3b] = { m: 'DEC SP', l: 1 };
  t[0x3c] = { m: 'INC A', l: 1 };
  t[0x3d] = { m: 'DEC A', l: 1 };
  t[0x3e] = { m: 'LD A,d8', l: 2 };
  t[0x3f] = { m: 'CCF', l: 1 };

  const regs = ['B', 'C', 'D', 'E', 'H', 'L', '(HL)', 'A'];
  for (let d = 0; d < 8; d++) {
    for (let s = 0; s < 8; s++) {
      const op = 0x40 + d * 8 + s;
      if (op === 0x76) {
        t[op] = { m: 'HALT', l: 1 };
        continue;
      }
      t[op] = { m: `LD ${regs[d]},${regs[s]}`, l: 1 };
    }
  }

  const alu = ['ADD A,', 'ADC A,', 'SUB', 'SBC A,', 'AND', 'XOR', 'OR', 'CP'];
  for (let a = 0; a < 8; a++) {
    for (let s = 0; s < 8; s++) {
      t[0x80 + a * 8 + s] = { m: `${alu[a]} ${regs[s]}`, l: 1 };
    }
  }

  t[0xc0] = { m: 'RET NZ', l: 1 };
  t[0xc1] = { m: 'POP BC', l: 1 };
  t[0xc2] = { m: 'JP NZ,a16', l: 3 };
  t[0xc3] = { m: 'JP a16', l: 3 };
  t[0xc4] = { m: 'CALL NZ,a16', l: 3 };
  t[0xc5] = { m: 'PUSH BC', l: 1 };
  t[0xc6] = { m: 'ADD A,d8', l: 2 };
  t[0xc7] = { m: 'RST 00H', l: 1 };
  t[0xc8] = { m: 'RET Z', l: 1 };
  t[0xc9] = { m: 'RET', l: 1 };
  t[0xca] = { m: 'JP Z,a16', l: 3 };
  t[0xcb] = { m: 'PREFIX CB', l: 1 };
  t[0xcc] = { m: 'CALL Z,a16', l: 3 };
  t[0xcd] = { m: 'CALL a16', l: 3 };
  t[0xce] = { m: 'ADC A,d8', l: 2 };
  t[0xcf] = { m: 'RST 08H', l: 1 };

  t[0xd0] = { m: 'RET NC', l: 1 };
  t[0xd1] = { m: 'POP DE', l: 1 };
  t[0xd2] = { m: 'JP NC,a16', l: 3 };
  t[0xd4] = { m: 'CALL NC,a16', l: 3 };
  t[0xd5] = { m: 'PUSH DE', l: 1 };
  t[0xd6] = { m: 'SUB d8', l: 2 };
  t[0xd7] = { m: 'RST 10H', l: 1 };
  t[0xd8] = { m: 'RET C', l: 1 };
  t[0xd9] = { m: 'RETI', l: 1 };
  t[0xda] = { m: 'JP C,a16', l: 3 };
  t[0xdc] = { m: 'CALL C,a16', l: 3 };
  t[0xde] = { m: 'SBC A,d8', l: 2 };
  t[0xdf] = { m: 'RST 18H', l: 1 };

  t[0xe0] = { m: 'LDH (a8),A', l: 2 };
  t[0xe1] = { m: 'POP HL', l: 1 };
  t[0xe2] = { m: 'LD (C),A', l: 1 };
  t[0xe5] = { m: 'PUSH HL', l: 1 };
  t[0xe6] = { m: 'AND d8', l: 2 };
  t[0xe7] = { m: 'RST 20H', l: 1 };
  t[0xe8] = { m: 'ADD SP,r8', l: 2 };
  t[0xe9] = { m: 'JP (HL)', l: 1 };
  t[0xea] = { m: 'LD (a16),A', l: 3 };
  t[0xee] = { m: 'XOR d8', l: 2 };
  t[0xef] = { m: 'RST 28H', l: 1 };

  t[0xf0] = { m: 'LDH A,(a8)', l: 2 };
  t[0xf1] = { m: 'POP AF', l: 1 };
  t[0xf2] = { m: 'LD A,(C)', l: 1 };
  t[0xf3] = { m: 'DI', l: 1 };
  t[0xf5] = { m: 'PUSH AF', l: 1 };
  t[0xf6] = { m: 'OR d8', l: 2 };
  t[0xf7] = { m: 'RST 30H', l: 1 };
  t[0xf8] = { m: 'LD HL,SP+r8', l: 2 };
  t[0xf9] = { m: 'LD SP,HL', l: 1 };
  t[0xfa] = { m: 'LD A,(a16)', l: 3 };
  t[0xfb] = { m: 'EI', l: 1 };
  t[0xfe] = { m: 'CP d8', l: 2 };
  t[0xff] = { m: 'RST 38H', l: 1 };

  return t;
}

function buildCBTable() {
  const t = new Array(256);
  const regs = ['B', 'C', 'D', 'E', 'H', 'L', '(HL)', 'A'];
  const ops = ['RLC', 'RRC', 'RL', 'RR', 'SLA', 'SRA', 'SWAP', 'SRL'];

  for (let i = 0; i < 8; i++) {
    for (let r = 0; r < 8; r++) {
      t[i * 8 + r] = { m: `${ops[i]} ${regs[r]}` };
    }
  }
  for (let bit = 0; bit < 8; bit++) {
    for (let r = 0; r < 8; r++) {
      t[0x40 + bit * 8 + r] = { m: `BIT ${bit},${regs[r]}` };
      t[0x80 + bit * 8 + r] = { m: `RES ${bit},${regs[r]}` };
      t[0xc0 + bit * 8 + r] = { m: `SET ${bit},${regs[r]}` };
    }
  }
  return t;
}

export function disassemble(readByte, pc, count) {
  const lines = [];
  let addr = pc;
  for (let i = 0; i < count; i++) {
    const opcode = readByte(addr);
    let info, length, text, rawBytes;

    if (opcode === 0xcb) {
      const cb = readByte(addr + 1);
      info = CB_TABLE[cb];
      length = 2;
      rawBytes = `${hex2(opcode)} ${hex2(cb)}`;
      text = info.m;
    } else {
      info = OPCODE_TABLE[opcode];
      length = info.l;
      const bytes = [opcode];
      for (let b = 1; b < length; b++) bytes.push(readByte(addr + b));
      rawBytes = bytes.map(hex2).join(' ');
      text = info.m;

      if (length === 2) {
        const val = bytes[1];
        if (text.includes('r8')) {
          const offset = val > 127 ? val - 256 : val;
          const target = (addr + length + offset) & 0xffff;
          text = text.replace('r8', `$${hex4(target)}`);
        } else if (text.includes('d8')) {
          text = text.replace('d8', `$${hex2(val)}`);
        } else if (text.includes('a8')) {
          text = text.replace('a8', `$FF${hex2(val)}`);
        }
      } else if (length === 3) {
        const val = bytes[1] | (bytes[2] << 8);
        if (text.includes('d16')) {
          text = text.replace('d16', `$${hex4(val)}`);
        } else if (text.includes('a16')) {
          text = text.replace('a16', `$${hex4(val)}`);
        }
      }
    }

    lines.push({ addr, rawBytes: rawBytes.padEnd(8), text, length });
    addr = (addr + length) & 0xffff;
  }
  return lines;
}
