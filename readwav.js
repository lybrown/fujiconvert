// vim: ts=2:sts=2:sw=2:et
"use strict";

function readwav(buffer) {
  // Parse header
  if (buffer.length < 44) {
    throw "Wave file: not long enough";
  }
  let text = function(buf) {
    return (new TextDecoder("utf-8")).decode(buf);
  };
  let view = new DataView(buffer);
  const LE = true; // RIFF files are little-endian
  let wav = {};
  wav.buffer = buffer;
  wav.view = view;
  wav.chunkID = text(buffer.slice(0, 4));
  wav.chunkSize = view.getUint32(4, LE);
  wav.format = text(buffer.slice(8, 12));
  wav.subChunk1ID = text(buffer.slice(12, 16));
  wav.subChunk1Size = view.getUint32(16, LE);
  wav.audioFormat = view.getUint16(20, LE);
  wav.numChannels = view.getUint16(22, LE);
  wav.sampleRate = view.getUint32(24, LE);
  wav.byteRate = view.getUint32(28, LE);
  wav.blockAlign = view.getUint16(32, LE);
  wav.bitsPerSample = view.getUint16(34, LE);
  if (wav.chunkID != "RIFF") {
    throw "Wave file: No RIFF chunk";
  }
  if (wav.format != "WAVE") {
    throw "Wave file: Format not WAVE: " + wav.format;
  }
  if (wav.subChunk1ID != "fmt ") {
    throw "Wave file: No fmt chunk";
  }
  if (wav.subChunk1Size != 16) {
    throw "Wave file: Not PCM chunk size: " + wav.subChunk1Size;
  }
  if (wav.audioFormat != 1) {
    throw "Wave file: Not PCM: " + wav.audioFormat;
  }
  if (![8, 16, 24, 32].includes(wav.bitsPerSample)) {
    throw "Wave file: Unsupported bit depth: " + wav.bitsPerSample;
  }
  for (let i = 36; i < buffer.byteLength;) {
    let chunkID = text(buffer.slice(i, i+4)); i+=4;
    let chunkSize = view.getUint32(i, LE); i+=4;
    if (chunkID == "data") {
      wav.dataOffset = i;
      wav.dataSize = chunkSize;
      break;
    }
    i += chunkSize;
  }
  if (!wav.dataOffset) {
    throw "Wave file: No data chunk";
  }
  return wav;
}

function wavToBuffer(wav, context) {
  // Convert PCM data to AudioBuffer
  let view = wav.view;
  let framecount = wav.dataSize / wav.blockAlign | 0;
  let buf = context.createBuffer(wav.numChannels, framecount, wav.sampleRate);
  const LE = true; // RIFF files are little-endian
  for (let c = 0; c < wav.numChannels; ++c) {
    let ch = buf.getChannelData(c);
    let x = wav.dataOffset + c*wav.bitsPerSample/8;
    if (wav.bitsPerSample == 8) {
      for (let i = 0; i < framecount; ++i, x += wav.blockAlign) {
        ch[i] = view.getUint8(x) / 128 - 255/256;
      }
    } else if (wav.bitsPerSample == 16) {
      for (let i = 0; i < framecount; ++i, x += wav.blockAlign) {
        ch[i] = view.getInt16(x, LE) / 32768;
      }
    } else if (wav.bitsPerSample == 24) {
      for (let i = 0; i < framecount; ++i, x += wav.blockAlign) {
        // Shift out high 8 bits then shift back with sign extension.
        // Assumes 32-bit bitops.
        ch[i] = (view.getUInt32(x, LE) << 8 >> 8) / (1<<23)
      }
    } else if (wav.bitsPerSample == 32) {
      for (let i = 0; i < framecount; ++i, x += wav.blockAlign) {
        ch[i] = view.getInt32(x, LE) / (1<<31);
      }
    }
  }
  return buf;
}
