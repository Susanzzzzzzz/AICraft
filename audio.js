// Audio module — procedurally generated BGM + SFX using Web Audio API
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.bgmGain = null;
    this.bgmVolume = 0.5;
    this.sfxVolume = 0.8;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
      this._playBGM();
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }

  // ===== Helpers =====

  _noise(duration) {
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  _createReverbIR(duration) {
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(2, length, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-3 * i / length);
      }
    }
    return buffer;
  }

  _randomPitch() {
    return 0.9 + Math.random() * 0.2;
  }

  // ===== BGM Layers =====

  _playMelody(data, sampleRate) {
    const notes = [262, 294, 330, 392, 440, 392, 330, 294, 262, 330, 392, 440, 494, 440, 392, 330];
    const totalSamples = data.length;
    const noteLen = totalSamples / notes.length;
    for (let i = 0; i < totalSamples; i++) {
      const noteIdx = Math.floor(i / noteLen);
      const freq = notes[noteIdx];
      const localT = (i - noteIdx * noteLen) / noteLen;
      const env = Math.sin(localT * Math.PI) * 0.3;
      data[i] += Math.sin(2 * Math.PI * freq * i / sampleRate) * env * 0.15;
    }
  }

  _playChords(data, sampleRate) {
    // Triads: C major, F major, G major, A minor
    const chords = [
      [262, 330, 392],   // C major
      [349, 440, 523],   // F major
      [392, 494, 587],   // G major
      [440, 523, 659],   // A minor
    ];
    const totalSamples = data.length;
    // 2 bars per chord (= 4 seconds per chord at 120 BPM), 8 total chord changes
    const chordSamples = totalSamples / 8;
    for (let i = 0; i < totalSamples; i++) {
      const chordIdx = Math.floor(i / chordSamples) % chords.length;
      const freqs = chords[chordIdx];
      for (const freq of freqs) {
        data[i] += Math.sin(2 * Math.PI * freq * i / sampleRate) * 0.08;
      }
    }
  }

  _playBass(data, sampleRate) {
    // Root notes one octave below melody
    const notes = [131, 147, 165, 196, 220, 196, 165, 147, 131, 165, 196, 220, 247, 220, 196, 165];
    const totalSamples = data.length;
    const noteLen = totalSamples / notes.length;
    for (let i = 0; i < totalSamples; i++) {
      const noteIdx = Math.floor(i / noteLen);
      const freq = notes[noteIdx];
      const localT = (i - noteIdx * noteLen) / noteLen;
      const env = Math.sin(localT * Math.PI) * 0.3;
      data[i] += Math.sin(2 * Math.PI * freq * i / sampleRate) * env * 0.1;
    }
  }

  _playPercussion(data, sampleRate) {
    const totalSamples = data.length;
    const beatSamples = Math.floor(sampleRate * 0.5); // beat = 0.5s at 120 BPM
    const kickLen = Math.floor(sampleRate * 0.05);   // 50ms
    const hihatLen = Math.floor(sampleRate * 0.02);  // 20ms
    for (let i = 0; i < totalSamples; i++) {
      const beat = Math.floor(i / beatSamples);
      const posInBeat = i - beat * beatSamples;
      // Kick on every beat
      if (posInBeat < kickLen) {
        data[i] += (Math.random() * 2 - 1) * 0.12 * (1 - posInBeat / kickLen);
      }
      // Hi-hat every 2 beats
      if (beat % 2 === 0 && posInBeat < hihatLen) {
        data[i] += (Math.random() * 2 - 1) * 0.08 * (1 - posInBeat / hihatLen);
      }
    }
  }

  _playAmbient(data, sampleRate) {
    const totalSamples = data.length;
    // Wind: low-pass filtered noise
    let prev = 0;
    for (let i = 0; i < totalSamples; i++) {
      const noise = Math.random() * 2 - 1;
      prev = prev * 0.99 + noise * 0.01;
      data[i] += prev * 0.05;
    }
    // Water drips: random short sine pings
    const dripCount = 14;
    for (let d = 0; d < dripCount; d++) {
      const dripStart = Math.floor(totalSamples * (d / dripCount + 0.02));
      const dripLen = Math.floor(sampleRate * (0.04 + (d % 5) * 0.008));
      for (let i = dripStart; i < Math.min(dripStart + dripLen, totalSamples); i++) {
        const t = (i - dripStart) / dripLen;
        const env = Math.sin(t * Math.PI);
        data[i] += Math.sin(2 * Math.PI * (700 + d * 40) * i / sampleRate) * env * 0.025;
      }
    }
  }

  // ===== BGM =====

  _playBGM() {
    if (!this.initialized) return;

    const sampleRate = this.ctx.sampleRate;
    const duration = 32;
    const length = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    this._playMelody(data, sampleRate);
    this._playChords(data, sampleRate);
    this._playBass(data, sampleRate);
    this._playPercussion(data, sampleRate);
    this._playAmbient(data, sampleRate);

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = this.bgmVolume;

    source.connect(this.bgmGain);
    this.bgmGain.connect(this.ctx.destination);
    source.start();
  }

  // ===== SFX =====

  playSFX(name, pan = 0) {
    if (!this.initialized) return;

    const t = this.ctx.currentTime;
    const pitch = this._randomPitch();

    // Helper: connect a node chain to output, optionally through a stereo panner
    const connectToOutput = (node) => {
      if (pan !== 0) {
        try {
          const panner = this.ctx.createStereoPanner();
          panner.pan.value = pan;
          node.connect(panner);
          panner.connect(this.ctx.destination);
          return;
        } catch (e) {
          // StereoPanner not supported — fall through to direct connect
        }
      }
      node.connect(this.ctx.destination);
    };

    switch (name) {
      // --- Existing 7 SFX (kept with pitch randomization) ---
      case 'break': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(200 * pitch, t);
        osc.frequency.exponentialRampToValueAtTime(80 * pitch, t + 0.15);
        gain.gain.value = this.sfxVolume * 0.3;
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc.connect(gain);
        connectToOutput(gain);
        osc.start(t); osc.stop(t + 0.15);
        break;
      }
      case 'place': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(300 * pitch, t);
        osc.frequency.exponentialRampToValueAtTime(400 * pitch, t + 0.1);
        gain.gain.value = this.sfxVolume * 0.3;
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc.connect(gain);
        connectToOutput(gain);
        osc.start(t); osc.stop(t + 0.1);
        break;
      }
      case 'jump': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150 * pitch, t);
        osc.frequency.exponentialRampToValueAtTime(400 * pitch, t + 0.15);
        gain.gain.value = this.sfxVolume * 0.3;
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc.connect(gain);
        connectToOutput(gain);
        osc.start(t); osc.stop(t + 0.15);
        break;
      }
      case 'craft': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400 * pitch, t);
        osc.frequency.setValueAtTime(500 * pitch, t + 0.1);
        osc.frequency.setValueAtTime(600 * pitch, t + 0.2);
        gain.gain.value = this.sfxVolume * 0.3;
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        osc.connect(gain);
        connectToOutput(gain);
        osc.start(t); osc.stop(t + 0.3);
        break;
      }
      case 'damage': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100 * pitch, t);
        osc.frequency.exponentialRampToValueAtTime(50 * pitch, t + 0.2);
        gain.gain.value = this.sfxVolume * 0.3;
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
        osc.connect(gain);
        connectToOutput(gain);
        osc.start(t); osc.stop(t + 0.25);
        break;
      }
      case 'attack': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(300 * pitch, t);
        osc.frequency.exponentialRampToValueAtTime(600 * pitch, t + 0.1);
        gain.gain.value = this.sfxVolume * 0.3;
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        osc.connect(gain);
        connectToOutput(gain);
        osc.start(t); osc.stop(t + 0.12);
        break;
      }
      case 'death': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400 * pitch, t);
        osc.frequency.exponentialRampToValueAtTime(30 * pitch, t + 0.6);
        gain.gain.value = this.sfxVolume * 0.3;
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
        osc.connect(gain);
        connectToOutput(gain);
        osc.start(t); osc.stop(t + 0.6);
        break;
      }

      // --- 8 New SFX ---
      case 'footstep': {
        // Short noise burst x2, 50ms each
        const buf1 = this._noise(0.05);
        const src1 = this.ctx.createBufferSource();
        src1.buffer = buf1;
        const g1 = this.ctx.createGain();
        g1.gain.setValueAtTime(this.sfxVolume * 0.2, t);
        g1.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
        src1.connect(g1);
        connectToOutput(g1);
        src1.start(t); src1.stop(t + 0.05);

        const buf2 = this._noise(0.05);
        const src2 = this.ctx.createBufferSource();
        src2.buffer = buf2;
        const g2 = this.ctx.createGain();
        g2.gain.setValueAtTime(this.sfxVolume * 0.2, t + 0.05);
        g2.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        src2.connect(g2);
        connectToOutput(g2);
        src2.start(t + 0.05); src2.stop(t + 0.1);
        break;
      }
      case 'pickup': {
        // Sine 600 -> 900 Hz, 0.15s, clean rise
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600 * pitch, t);
        osc.frequency.exponentialRampToValueAtTime(900 * pitch, t + 0.15);
        gain.gain.setValueAtTime(this.sfxVolume * 0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc.connect(gain);
        connectToOutput(gain);
        osc.start(t); osc.stop(t + 0.15);
        break;
      }
      case 'levelup': {
        // Arpeggio C5 -> E5 -> G5 -> C6, sine, 0.4s
        const freqs = [523 * pitch, 659 * pitch, 784 * pitch, 1047 * pitch];
        const noteDur = 0.1;
        for (let i = 0; i < 4; i++) {
          const note = this.ctx.createOscillator();
          const noteGain = this.ctx.createGain();
          note.type = 'sine';
          note.frequency.value = freqs[i];
          noteGain.gain.setValueAtTime(this.sfxVolume * 0.25, t + i * noteDur);
          noteGain.gain.exponentialRampToValueAtTime(0.01, t + (i + 1) * noteDur);
          note.connect(noteGain);
          connectToOutput(noteGain);
          note.start(t + i * noteDur);
          note.stop(t + (i + 1) * noteDur);
        }
        break;
      }
      case 'skill': {
        // Filter sweep: oscillator through BiquadFilterNode with frequency ramp, 0.3s
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        osc.type = 'sawtooth';
        osc.frequency.value = 200 * pitch;
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(100, t);
        filter.frequency.exponentialRampToValueAtTime(5000, t + 0.3);
        gain.gain.setValueAtTime(this.sfxVolume * 0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        osc.connect(filter);
        filter.connect(gain);
        connectToOutput(gain);
        osc.start(t); osc.stop(t + 0.3);
        break;
      }
      case 'block': {
        // Low thud 80 -> 40 Hz + reverb, 0.3s
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80 * pitch, t);
        osc.frequency.exponentialRampToValueAtTime(40 * pitch, t + 0.3);
        gain.gain.setValueAtTime(this.sfxVolume * 0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        osc.connect(gain);
        // Reverb with try/catch for ConvolverNode support
        try {
          const convolver = this.ctx.createConvolver();
          convolver.buffer = this._createReverbIR(0.3);
          gain.connect(convolver);
          connectToOutput(convolver);
        } catch (e) {
          connectToOutput(gain);
        }
        osc.start(t); osc.stop(t + 0.3);
        break;
      }
      case 'bow': {
        // Sine 300 -> 800 Hz ramp, 0.5s
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300 * pitch, t);
        osc.frequency.exponentialRampToValueAtTime(800 * pitch, t + 0.5);
        gain.gain.setValueAtTime(this.sfxVolume * 0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
        osc.connect(gain);
        connectToOutput(gain);
        osc.start(t); osc.stop(t + 0.5);
        break;
      }
      case 'enemy_death': {
        // Sawtooth 200 -> 30 Hz + noise, 0.5s
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200 * pitch, t);
        osc.frequency.exponentialRampToValueAtTime(30 * pitch, t + 0.5);
        gain.gain.setValueAtTime(this.sfxVolume * 0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
        osc.connect(gain);
        connectToOutput(gain);
        osc.start(t); osc.stop(t + 0.5);
        // Noise layer
        const noiseBuf = this._noise(0.5);
        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = noiseBuf;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(this.sfxVolume * 0.1, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
        noiseSrc.connect(noiseGain);
        connectToOutput(noiseGain);
        noiseSrc.start(t); noiseSrc.stop(t + 0.5);
        break;
      }
      case 'explosion': {
        // Noise burst + low sine 60 -> 20 Hz sweep, 0.6s
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(60 * pitch, t);
        osc.frequency.exponentialRampToValueAtTime(20 * pitch, t + 0.6);
        oscGain.gain.setValueAtTime(this.sfxVolume * 0.3, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
        osc.connect(oscGain);

        const noiseBuf = this._noise(0.6);
        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = noiseBuf;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(this.sfxVolume * 0.2, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
        noiseSrc.connect(noiseGain);

        const mixGain = this.ctx.createGain();
        mixGain.gain.value = this.sfxVolume;
        oscGain.connect(mixGain);
        noiseGain.connect(mixGain);

        // Reverb with try/catch for ConvolverNode support
        try {
          const convolver = this.ctx.createConvolver();
          convolver.buffer = this._createReverbIR(0.5);
          mixGain.connect(convolver);
          connectToOutput(convolver);
        } catch (e) {
          connectToOutput(mixGain);
        }

        osc.start(t); osc.stop(t + 0.6);
        noiseSrc.start(t); noiseSrc.stop(t + 0.6);
        break;
      }
    }
  }

  setBGMVolume(v) {
    this.bgmVolume = v;
    if (this.bgmGain) this.bgmGain.gain.value = v;
  }

  setSFXVolume(v) {
    this.sfxVolume = v;
  }
}
