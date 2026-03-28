import { hex2, hex4, escapeHtml } from './format.js';
import { disassemble } from './disassembler.js';

export function createPanels(state, dom) {
  const buttonState = {
    right: false,
    left: false,
    up: false,
    down: false,
    a: false,
    b: false,
    select: false,
    start: false,
  };

  const $ = (id) => document.getElementById(id);

  function updateCPU() {
    const e = state.emulator;
    const f = e.cpu_f();

    $('r-af').textContent = hex2(e.cpu_a()) + hex2(f);
    $('r-bc').textContent = hex4(e.cpu_bc());
    $('r-de').textContent = hex4(e.cpu_de());
    $('r-hl').textContent = hex4(e.cpu_hl());
    $('r-sp').textContent = hex4(e.cpu_sp());
    $('r-pc').textContent = hex4(e.cpu_pc());
    $('r-flags').textContent =
      (f & 0x80 ? 'Z' : '-') +
      (f & 0x40 ? 'N' : '-') +
      (f & 0x20 ? 'H' : '-') +
      (f & 0x10 ? 'C' : '-');
    $('r-ime').textContent = e.cpu_ime() ? '1' : '0';
    $('r-halt').textContent = e.cpu_halted() ? '1' : '0';
  }

  function drawPaletteCanvas(canvasId, getFn) {
    const canvas = $(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(32, 1);
    for (let pal = 0; pal < 8; pal++) {
      for (let col = 0; col < 4; col++) {
        const rgb = getFn(pal, col);
        const i = (pal * 4 + col) * 4;
        img.data[i] = (rgb >> 16) & 0xff; // R
        img.data[i + 1] = (rgb >> 8) & 0xff; // G
        img.data[i + 2] = rgb & 0xff; // B
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function updatePPU() {
    const e = state.emulator;
    const mode = e.ppu_mode();
    const modes = ['HBL', 'VBL', 'OAM', 'DRW'];
    const cgb = e.is_cgb_mode();

    $('r-ly').textContent = String(e.ppu_line()).padStart(3);
    $('r-mode').textContent = `${mode} ${modes[mode] || '?'}`;
    $('r-lcdc').textContent = hex2(e.io_lcdc());
    $('r-stat').textContent = hex2(e.io_stat());
    $('r-scx').textContent = hex2(e.io_scx());
    $('r-scy').textContent = hex2(e.io_scy());
    $('r-wx').textContent = hex2(e.io_wx());
    $('r-wy').textContent = hex2(e.io_wy());

    $('cgb-badge').style.display = cgb ? '' : 'none';
    $('cgb-badge-vram').style.display = cgb ? '' : 'none';
    $('row-dmg-pal').style.display = cgb ? 'none' : '';
    $('row-cgb-regs').style.display = cgb ? '' : 'none';
    $('row-cgb-pal-idx').style.display = cgb ? '' : 'none';
    $('cgb-palettes').style.display = cgb ? '' : 'none';

    if (cgb) {
      $('r-vbk').textContent = String(e.io_vbk());
      $('r-svbk').textContent = String(e.io_svbk());
      const key1 = e.io_key1();
      $('r-key1').textContent = hex2(key1) + (key1 & 0x80 ? ' 2x' : ' 1x');
      $('r-opri').textContent = e.io_opri() & 1 ? 'OAM' : 'XY';

      const bcps = e.io_bcps();
      const ocps = e.io_ocps();
      $('r-bcps').textContent = hex2(bcps & 0x3f) + (bcps & 0x80 ? '+' : '');
      $('r-ocps').textContent = hex2(ocps & 0x3f) + (ocps & 0x80 ? '+' : '');

      const hdma5 = e.io_hdma5();
      $('r-hdma5').textContent = hdma5 === 0xff ? 'idle' : `HBL ${(hdma5 & 0x7f) + 1}blk`;

      drawPaletteCanvas('cgb-bg-pal', (p, c) => e.get_bg_palette_color(p, c));
      drawPaletteCanvas('cgb-obj-pal', (p, c) => e.get_obj_palette_color(p, c));
    } else {
      $('r-bgp').textContent = hex2(e.io_bgp());
      $('r-obp0').textContent = hex2(e.io_obp0());
      $('r-obp1').textContent = hex2(e.io_obp1());
    }
  }

  function updateDisassembly() {
    const e = state.emulator;
    const pc = e.cpu_pc();
    const read = (addr) => e.read_byte(addr & 0xffff);
    const lines = disassemble(read, pc, 16);

    let html = '';
    for (const l of lines) {
      const text = `${hex4(l.addr)} ${l.rawBytes} ${l.text}`;
      html +=
        l.addr === pc ? `<span class="pc">${escapeHtml(text)}</span>\n` : escapeHtml(text) + '\n';
    }
    dom.disPre.innerHTML = html;
  }

  function updateMemory() {
    const e = state.emulator;
    const base = state.memViewAddr & 0xfff0;
    const data = e.read_range(base, 256);

    let text = '      00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F\n';
    for (let row = 0; row < 16; row++) {
      const addr = (base + row * 16) & 0xffff;
      let line = hex4(addr) + ' ';
      let ascii = '';
      for (let col = 0; col < 16; col++) {
        const b = data[row * 16 + col];
        line += hex2(b) + (col === 7 ? '  ' : ' ');
        ascii += b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '.';
      }
      text += line + ascii + '\n';
    }
    dom.memPre.textContent = text;
  }

  function updateTimer() {
    const e = state.emulator;
    const tac = e.io_tac();

    $('r-div').textContent = hex2(e.io_div());
    $('r-tima').textContent = hex2(e.io_tima());
    $('r-tma').textContent = hex2(e.io_tma());
    $('r-tac').textContent = hex2(tac);
  }

  function updateInterrupts() {
    const e = state.emulator;
    const ie = e.io_ie(),
      ifl = e.io_if();

    $('r-ie').textContent = hex2(ie);
    $('r-if').textContent = hex2(ifl);

    const ids = ['vbl', 'lcd', 'tim', 'ser', 'joy'];
    for (let i = 0; i < 5; i++) {
      const en = (ie >> i) & 1,
        fl = (ifl >> i) & 1;
      // * = enabled+pending, + = enabled, ! = pending, - = off
      $(`r-int-${ids[i]}`).textContent = en ? (fl ? '*' : '+') : fl ? '!' : '-';
    }
  }

  function updateSerial() {
    const text = state.emulator.get_serial_output();
    if (text) dom.serialPre.textContent = text;
  }

  function midiNote(n) {
    if (n === 255) return '---';
    const N = ['C-', 'C#', 'D-', 'D#', 'E-', 'F-', 'F#', 'G-', 'G#', 'A-', 'A#', 'B-'];
    return N[n % 12] + (Math.floor(n / 12) - 1);
  }

  // Number of samples per channel in the WASM visualization ring buffer.
  const VIZ_SIZE = 512;

  // Draw the last canvas.width samples from channel chIdx out of the viz ring buffer.
  // vizBuf is a Uint8Array view of the full 4-channel buffer; each value is 0–15.
  function drawVizScope(canvas, vizBuf, wp, chIdx, color, active) {
    if (!canvas) return;
    const W = canvas.width, H = canvas.height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#060606';
    ctx.fillRect(0, 0, W, H);
    if (!active) return;

    const base = chIdx * VIZ_SIZE;
    const show = Math.min(W, VIZ_SIZE);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < show; i++) {
      const idx = (wp - show + i + VIZ_SIZE) % VIZ_SIZE;
      const val = vizBuf[base + idx]; // 0–15
      const x = Math.round((i / (show - 1)) * (W - 1));
      const y = Math.round(H - 2 - (val / 15) * (H - 4));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function updateAPU() {
    if (!$('apu-channels') || !state.emulator) return;
    const e = state.emulator;

    // Read the streaming visualization ring buffer from WASM memory.
    const vizPtr = e.apu_viz_ptr();
    const vizWp  = e.apu_viz_wp();
    const vizBuf = new Uint8Array(state.wasmMemory.buffer, vizPtr, 4 * VIZ_SIZE);

    const nr50 = e.apu_nr50();
    const nr51 = e.apu_nr51();
    const powered = e.apu_powered();

    // Status bar
    const pwrEl = $('apu-pwr');
    pwrEl.textContent = powered ? '● PWR' : '○ PWR';
    pwrEl.className = powered ? 'on' : 'off';
    $('apu-nr50').textContent = hex2(nr50);
    $('apu-nr51').textContent = hex2(nr51);
    $('apu-nr52').textContent = hex2(e.apu_nr52());
    $('apu-seq').textContent = e.apu_frame_seq_step();
    $('apu-vol-l').textContent = ((nr50 >> 4) & 7) + 1;
    $('apu-vol-r').textContent = (nr50 & 7) + 1;

    function pan(ch) {
      const i = ch - 1;
      return ((nr51 >> (i + 4)) & 1 ? 'L' : '·') + ((nr51 >> i) & 1 ? 'R' : '·');
    }
    function hzStr(f) {
      return f > 0 ? Math.round(f) + ' Hz' : '—';
    }
    function row(k, v) {
      return `<div class="apu-row"><span class="k">${k}</span><span class="v">${v}</span></div>`;
    }
    function setNote(id, midi, active) {
      const el = $(id);
      el.textContent = active ? midiNote(midi) : '---';
      el.className = 'apu-ch-note' + (active ? '' : ' dim');
    }
    const c1en = e.apu_ch1_enabled(),
      c1dac = e.apu_ch1_dac();
    const c1hz = e.apu_ch1_freq_hz(),
      c1vol = e.apu_ch1_volume();
    const c1duty = e.apu_ch1_duty();
    const c1len = e.apu_ch1_length(),
      c1le = e.apu_ch1_len_en();
    const c1ea = e.apu_ch1_env_add(),
      c1ep = e.apu_ch1_env_period();
    const c1sp = e.apu_ch1_sweep_period(),
      c1ss = e.apu_ch1_sweep_shift(),
      c1sn = e.apu_ch1_sweep_neg();

    setNote('apu-c1-note', e.apu_ch1_midi_note(), c1en);
    drawVizScope($('apu-scope-1'), vizBuf, vizWp, 0, '#6f6', c1en && c1dac);
    $('apu-c1-rows').innerHTML =
      row('HZ', hzStr(c1hz)) +
      row('VOL', c1vol + '/15') +
      row('PAN', pan(1)) +
      row('DTY', ['12%', '25%', '50%', '75%'][c1duty]) +
      row('LEN', c1len + (c1le ? '+' : '')) +
      row('ENV', (c1ea ? '↑' : '↓') + ' p' + c1ep) +
      row('SWP', c1sp + '/' + c1ss + (c1sn ? ' −' : ' +'));
    const c2en = e.apu_ch2_enabled(),
      c2dac = e.apu_ch2_dac();
    const c2hz = e.apu_ch2_freq_hz(),
      c2vol = e.apu_ch2_volume();
    const c2duty = e.apu_ch2_duty();
    const c2len = e.apu_ch2_length(),
      c2le = e.apu_ch2_len_en();
    const c2ea = e.apu_ch2_env_add(),
      c2ep = e.apu_ch2_env_period();

    setNote('apu-c2-note', e.apu_ch2_midi_note(), c2en);
    drawVizScope($('apu-scope-2'), vizBuf, vizWp, 1, '#6af', c2en && c2dac);
    $('apu-c2-rows').innerHTML =
      row('HZ', hzStr(c2hz)) +
      row('VOL', c2vol + '/15') +
      row('PAN', pan(2)) +
      row('DTY', ['12%', '25%', '50%', '75%'][c2duty]) +
      row('LEN', c2len + (c2le ? '+' : '')) +
      row('ENV', (c2ea ? '↑' : '↓') + ' p' + c2ep);
    const c3en = e.apu_ch3_enabled(),
      c3dac = e.apu_ch3_dac();
    const c3hz = e.apu_ch3_freq_hz(),
      c3vc = e.apu_ch3_vol_code();
    const c3len = e.apu_ch3_length(),
      c3le = e.apu_ch3_len_en();

    setNote('apu-c3-note', e.apu_ch3_midi_note(), c3en);
    drawVizScope($('apu-scope-3'), vizBuf, vizWp, 2, '#fa0', c3en && c3dac);
    $('apu-c3-rows').innerHTML =
      row('HZ', hzStr(c3hz)) +
      row('VOL', ['0%', '100%', '50%', '25%'][c3vc]) +
      row('PAN', pan(3)) +
      row('LEN', c3len + (c3le ? '+' : ''));
    const c4en = e.apu_ch4_enabled(),
      c4dac = e.apu_ch4_dac();
    const c4hz = e.apu_ch4_freq_hz(),
      c4vol = e.apu_ch4_volume();
    const c4sh = e.apu_ch4_clock_shift(),
      c4div = e.apu_ch4_clock_div();
    const c4ls = e.apu_ch4_lfsr_short();
    const c4len = e.apu_ch4_length(),
      c4le = e.apu_ch4_len_en();
    const c4ea = e.apu_ch4_env_add(),
      c4ep = e.apu_ch4_env_period();

    const c4noteEl = $('apu-c4-note');
    c4noteEl.textContent = c4en ? '♩' : '---';
    c4noteEl.className = 'apu-ch-note' + (c4en ? '' : ' dim');
    drawVizScope($('apu-scope-4'), vizBuf, vizWp, 3, '#c9f', c4en && c4dac);
    $('apu-c4-rows').innerHTML =
      row('HZ', hzStr(c4hz)) +
      row('VOL', c4vol + '/15') +
      row('PAN', pan(4)) +
      row('LFSR', c4ls ? '7bit' : '15bit') +
      row('SHF', c4sh + '/' + c4div) +
      row('LEN', c4len + (c4le ? '+' : '')) +
      row('ENV', (c4ea ? '↑' : '↓') + ' p' + c4ep);
  }

  function updateAll() {
    updateCPU();
    updatePPU();
    updateDisassembly();
    updateMemory();
    updateTimer();
    updateInterrupts();
    updateSerial();
    updateAPU();
  }

  return { updateAll, updateAPU, buttonState };
}
