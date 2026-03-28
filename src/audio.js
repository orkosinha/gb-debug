const RING_SIZE = 16384;

export function createAudio(state) {
  let audioCtx = null;
  let scriptNode = null;
  let enabled = false;

  const ring = new Float32Array(RING_SIZE);
  let wp = 0; // write pointer (f32 index)
  let rp = 0; // read  pointer (f32 index)

  function ringAvail() {
    return (wp - rp + RING_SIZE) & (RING_SIZE - 1);
  }

  function ringFree() {
    return (RING_SIZE - 1) - ringAvail();
  }

  function initCtx() {
    if (audioCtx) return;
    const sr = state.emulator ? state.emulator.audio_sample_rate() : 44100;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: sr });
    } catch {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    scriptNode = audioCtx.createScriptProcessor(4096, 0, 2);
    scriptNode.onaudioprocess = (evt) => {
      const L = evt.outputBuffer.getChannelData(0);
      const R = evt.outputBuffer.getChannelData(1);
      let avail = ringAvail();
      for (let i = 0; i < L.length; i++) {
        if (avail >= 2) {
          L[i] = ring[rp];
          R[i] = ring[(rp + 1) & (RING_SIZE - 1)];
          rp = (rp + 2) & (RING_SIZE - 1);
          avail -= 2;
        } else {
          L[i] = R[i] = 0;
        }
      }
    };
    scriptNode.connect(audioCtx.destination);
  }

  function pushSamples() {
    if (!enabled || !state.emulator) return;
    const len = state.emulator.audio_sample_buffer_len();
    if (!len) {
      state.emulator.audio_clear_samples();
      return;
    }
    const ptr = state.emulator.audio_sample_buffer_ptr();
    const src = new Float32Array(state.wasmMemory.buffer, ptr, len);
    const free = ringFree();
    const toPush = Math.min(len, free);
    for (let i = 0; i < toPush; i++) {
      ring[wp] = src[i];
      wp = (wp + 1) & (RING_SIZE - 1);
    }
    state.emulator.audio_clear_samples();
  }

  function toggle() {
    initCtx();
    if (enabled) {
      enabled = false;
      audioCtx.suspend();
    } else {
      enabled = true;
      wp = rp = 0; // flush stale samples
      if (state.emulator) state.emulator.audio_clear_samples();
      audioCtx.resume();
    }
    return enabled;
  }

  function reset() {
    wp = rp = 0;
    if (state.emulator) state.emulator.audio_clear_samples();
  }

  return { pushSamples, toggle, reset, isEnabled: () => enabled };
}
