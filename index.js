// vim: ts=2:sts=2:sw=2:et
let version = "0.2.4";
let global = {};
function setElement(element, value) {
  if (element[0] && element[0].type == "radio") {
    for (let i = 0; i < element.length; ++i) {
      if (element[i].value == value) {
        element[i].checked = true;
      }
    }
  } else if (element.type == "select-one") {
    for (let i = 0; i < element.length; ++i) {
      if (element[i].value == value) {
        element[i].selected = true;
      }
    }
    return "NONE";
  } else if (element.type == "checkbox") {
    element.checked = value == "true";
  } else if (element.type == "text") {
    element.value = value;
  }
}
function getElement(element) {
  if (element[0] && element[0].type == "radio") {
    for (let i = 0; i < element.length; ++i) {
      if (element[i].checked) {
        return element[i].value;
      }
    }
    return "NONE";
  } else if (element.type == "select-one") {
    for (let i = 0; i < element.length; ++i) {
      if (element[i].selected) {
        return element[i].value;
      }
    }
    return "NONE";
  } else if (element.type == "checkbox") {
    return element.checked;
  } else if (element.type == "text") {
    return element.value;
  }
}
function bar(name, fraction) {
  let msg = document.getElementById(name);
  let width = 80;
  let percent = clamp(fraction * width | 0, 0, width);
  msg.innerHTML = "#".repeat(percent) + "-".repeat(width-percent);
}
function busy(name, state) {
  let msg = document.getElementById(name);
  msg.innerHTML = state == 1 ? "Busy" : state == 2 ? "Done" : "----";
}
function text(name, msg) {
  let message = document.getElementById(name);
  message.innerText = msg;
}
function formElements() {
  return [
    "method", "channels", "region", "frequency", "resampling_effort",
    "media",
    "maxsize",
    "dither",
    "gain", "offset", "duration", "title", "artist",
  ];
}
function readLocalStorage() {
  if (!localStorage.getItem("method")) {
    return;
  }
  let form = document.getElementById("settings");
  let elements = formElements();
  for (let i = 0; i < elements.length; ++i) {
    setElement(form[elements[i]], localStorage.getItem(elements[i]));
  }
  if (!form.gain.value) {
    form.gain.value = 1;
  }
  if (!form.offset.value) {
    form.offset.value = 0;
  }
  if (!form.duration.value) {
    form.duration.value = -1;
  }
}
function writeLocalStorage() {
  let form = document.getElementById("settings");
  let elements = formElements();
  for (let i = 0; i < elements.length; ++i) {
    localStorage.setItem(elements[i], getElement(form[elements[i]]));
  }
}
function get_player_name(settings) {
  return "player-" +
    settings.media + "-" +
    settings.method + "-" +
    settings.channels + "-" +
    settings.period;
}
function getSettings() {
  writeLocalStorage();
  let form = document.getElementById("settings");
  let settingsText = document.getElementById("settingsText");
  let cycles = {
    ntsc: 262*105*60,
    pal: 312*105*50,
  };
  let period = {
    "58kHz": 28,
    "48kHz": 34,
    "47kHz": 35,
    "44kHz": 37,
    "33kHz": 50,
    "31kHz": 52,
    "22kHz": 74,
    "15kHz": 105,
    "8kHz": 210,
  };
  let maxbytes = {
    "16K": 16 << 10,
    "80K": 80 << 10,
    "256K": 256 << 10,
    "512K": 512 << 10,
    "1M": 1 << 20,
    "2M": 2 << 20,
    "4M": 4 << 20,
    "32M": 32 << 20,
    "64M": 64 << 20,
    "128M": 128 << 20,
    "unlimited": 1 << 32,
  };
  let settings = {};
  let elements = formElements();
  for (let i = 0; i < elements.length; ++i) {
    settings[elements[i]] = getElement(form[elements[i]]);
  }

  // Constraints
  if (settings.media == "ide") {
    settings.method = "pcm4+4";
    if (settings.channels == "stereo") {
      settings.frequency = "22kHz";
    } else {
      settings.frequency = "44kHz";
    }
  }
  settings.period = period[settings.frequency];
//  if (settings.method == "pwm") {
//    settings.period = clamp(settings.period, period["31kHz"], 999);
//  }

  if (settings.media != "ide") {
    // Don't use players with missed cycles
    let valid_periods = Object.values(period).sort();
    for (;;) {
      settings.player_name = get_player_name(settings);
      console.log(`player_name: ${settings.player_name}`);
      let labels = players[settings.player_name].labels;
      if ((!labels.slow_cycles || labels.slow_cycles <= 5) &&
          (!labels.fast_cycles || labels.fast_cycles <= 5)) {
        break;
      }
      let next = valid_periods.indexOf(settings.period) + 1;
      if (next < valid_periods.length) {
        settings.period = valid_periods[next];
      } else {
        break;
      }
    }
  }

  // Show constrained settings
  settings.freq = cycles[settings.region] / settings.period;
  if (settings.period == 52) {
    // Adjust frequency since player actually plays exactly 2 frames per scan line
    settings.freq = cycles[settings.region] / 52.5;
  }
  settingsText.innerText = Object.keys(settings).sort().map(function(key) {
    return key + ": " + settings[key] + "\n";
  }).join("");

  // Derived settings
  settings.maxbytes = maxbytes[settings.maxsize] || (4<<20);

  return settings;
}
function resetIndicators() {
  bar("readBar", 0);
  bar("decodeBar", 0);
  bar("convertBar", 0);
  busy("zipBusy", 0);
  text("decodeMessage", "");
  text("convertMessage", "");
  text("readMessage", "");
  let download = document.getElementById("download");
  download.innerText = "";
  download.href = "";
  document.getElementById("controls").style.visibility = "hidden";
}
function readSingleFile(e) {
  let fileinput = document.getElementById("file-input");
  let file = fileinput.files[0];
  if (!file) {
    return;
  }
  stop(0);
  let settings = getSettings();
  settings.filename = file.name;

  resetIndicators();

  // Read as binary
  let binreader = new FileReader();
  binreader.onload = function(e) {
    bar("readBar", 1);
    let contents = e.target.result;
    decode(contents, settings);
  };
  binreader.onprogress = function(event) {
    bar("readBar", event.loaded / event.total);
  };
  binreader.onerror = function(e) {
    text("readMessage", "ReadError");
  };
  binreader.readAsArrayBuffer(file);
}

function clamp(num, min, max) {
  return num <= min ? min : num >= max ? max : num;
}

function lerp(x, slo, shi, dlo, dhi) {
  return dlo + (x-slo)/(shi-slo) * (dhi-dlo);
}

// http://2ality.com/2015/10/concatenating-typed-arrays.html
function concatenate(resultConstructor, ...arrays) {
  let totalLength = 0;
  for (let arr of arrays) {
    totalLength += arr.length;
  }
  let result = new resultConstructor(totalLength);
  let offset = 0;
  for (let arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

function getRamCapacity(settings) {
  let labels = players[settings.player_name].labels;
  let buflen = 0x100 * labels.pages;
  let bytes = (1 << 20) - buflen;
  return bytes;
}
function getCartCapacity(settings) {
  let labels = players[settings.player_name].labels;
  let buflen = 0x100 * labels.pages;
  let bytes = carMax(settings.media) - buflen;
  return bytes;
}
function getMediaCapacity(settings) {
  switch (settings.media) {
    case "ram": return getRamCapacity(settings);
    case "emulator": return 1<<32;
    case "ide": return 1<<32;
    default: return getCartCapacity(settings);
  }
}
function getBytesPerFrame(settings) {
  let stereo = settings.channels == "stereo";
  let fourbit = settings.method == "pcm4";
  return fourbit ?
    stereo ? 1 : 0.5 :
    stereo ? 2 : 1;
}
function bytesToFrames(settings, bytecount) {
  let bytesperframe = getBytesPerFrame(settings);
  let framecount = bytecount / bytesperframe;
  return framecount;
}
function framesToBytes(settings, framecount) {
  let bytesperframe = getBytesPerFrame(settings);
  let bytecount = framecount * bytesperframe;
  return bytecount;
}
function framesToDuration(settings, framecount) {
  return framecount / settings.freq;
}
function durationToFrames(settings, duration) {
  return duration * settings.freq;
}
function getUserLimit(settings) {
  let maxbytes = settings.maxbytes;
  let labels = players[settings.player_name].labels;
  if (labels.pages) {
    return maxbytes - 0x100 * labels.pages;
  }
  return maxbytes;
}
function getFrameCount(settings, buffer) {
  // Frame count is limited by:
  //   Media capacity
  //   Song duration
  //   User byte limit
  //   User duration limit

  let mediacapacity = getMediaCapacity(settings);
  let mediaframecount = bytesToFrames(settings, mediacapacity);

  let usercapacity = getUserLimit(settings);
  let userframecount = bytesToFrames(settings, usercapacity);

  let songframecount = buffer ? buffer.length : 1 << 32;

  let remainingduration = Math.max(buffer.duration - settings.offset, 0);
  let userduration = settings.duration > 0 ?
    Math.min(settings.duration, remainingduration) : 1000 * 60;
  let userdurationframecount = durationToFrames(settings, userduration);

  return Math.min(
    mediaframecount,
    userframecount,
    songframecount,
    userdurationframecount);
}
function extractBuffer(context, inbuf, offset, framecount, width) {
  let chancount = inbuf.numberOfChannels;
  let samplerate = inbuf.sampleRate;
  let outbuf = context.createBuffer(chancount, framecount + width, samplerate);
  for (let i = 0; i < chancount; ++i) {
    let inchan = inbuf.getChannelData(i);
    let outchan = outbuf.getChannelData(i);
    outchan.set(inchan.subarray(offset, framecount), width/2);
  }
  return outbuf;
}
function get_window_width(settings) {
  let width =
    settings.resampling_effort == "ultra" ? 1024 :
    settings.resampling_effort == "high" ? 256 :
    settings.resampling_effort == "medium" ? 128 :
    settings.resampling_effort == "low" ? 16 :
    1;
  return width;
}
function decode(contents, settings) {
  bar("decodeBar", 0.02);

  // Create OfflineAudioContext
  let channelcount = settings.channels == "stereo" ? 2 : 1;
  let length = 1000;
  let samplerate = 48000;
  let wavefile = new wav(contents);
  if (wavefile.sampleRate !== undefined) {
    console.log("Found RIFF WAVE with sample rate: " + wavefile.sampleRate);
    samplerate = wavefile.sampleRate;
  }
  console.log(`Creating OfflineAudioContext(${channelcount}, ${length}, ${samplerate})`);
  let context = new OfflineAudioContext(channelcount, length, samplerate);
  settings.context = context;

  context.decodeAudioData(contents, function(buffer) {
    bar("decodeBar", 1); // GUI: 100% progress

    global.outrate = settings.freq;
    global.outbuffer = buffer;
    if (0) {
      convert(buffer, settings);
    } else {
      let duration = buffer.duration - settings.offset;
      if (duration < 0) {
        text("decodeMessage", "Offset (" + settings.offset +
          ") is larger than sound duration (" + buffer.duration + ")");
        return;
      }

      let framecount = getFrameCount(settings, buffer);
      let width = get_window_width(settings);

      let newbuf = extractBuffer(context, buffer, settings.offset, framecount, width);
      resample(newbuf, settings);
    }
  }, function(e) {
    text("decodeMessage", "Decode Error: " + e);
  });
}
function resample(inbuffer, settings) {
  let inrate = inbuffer.sampleRate;
  let outrate = settings.freq;
  global.outrate = outrate;
  let outchannels = settings.channels == "stereo" ? 2 : 1;
  let outframecount = inbuffer.duration * outrate;
  let outlength = outframecount; // * outchannels?
  let outbuffer = settings.context.createBuffer(outchannels, outlength, outrate); // outrate!
  let xstep = inrate / outrate;
  let fmax = Math.min(inrate, outrate) * 0.49; // Max frequency allowed
  let inchannels = inbuffer.numberOfChannels;
  let alim = inbuffer.length;
  let indata = inbuffer.getChannelData(0);
  let indata2 = inchannels > 1 ? inbuffer.getChannelData(1) : undefined;
  let outdata = outbuffer.getChannelData(0);
  let outdata2 = outchannels > 1 ? outbuffer.getChannelData(1) : undefined;
  let gain = settings.gain;
  let width = get_window_width(settings);
  let oi = 0;
  let oo = settings.offset * inrate;
  console.log({
    inrate:inrate,
    outrate:outrate,
    outchannels:outchannels,
    outframecount:outframecount,
    outlength:outlength,
    xstep:xstep,
    fmax:fmax,
    inchannels:inchannels,
    alim:alim,
    gain:gain,
    width:width,
  });
  let done = function() {
    console.log("Resampling completed successfully");
    global.outbuffer = outbuffer;
    convert(outbuffer, settings);
  };
  let func = width == 1 ? (i, data) => data[i|0] : resamp;
  let loop = function() {
    let chunksteps = Math.min(outframecount - oi, 10000);
    if (outchannels > 1 && inchannels > 1) {
      for (let i = 0; i < chunksteps; ++i) {
        let ii = oo + oi * xstep;
        outdata[oi] = gain * func(ii, indata, alim, fmax, inrate, width);
        outdata2[oi] = gain * func(ii, indata2, alim, fmax, inrate, width);
        ++oi;
      }
    } else if (outchannels > 1) {
      for (let i = 0; i < chunksteps; ++i) {
        let ii = oo + oi * xstep;
        outdata[oi] = outdata2[oi] =
          gain * func(ii, indata, alim, fmax, inrate, width);
        ++oi;
      }
    } else if (inchannels > 1) {
      for (let i = 0; i < chunksteps; ++i) {
        let ii = oo + oi * xstep;
        outdata[oi] = 0.5 * gain * (
          func(ii, indata, alim, fmax, inrate, width) + 
          func(ii, indata2, alim, fmax, inrate, width));
        ++oi;
      }
    } else {
      for (let i = 0; i < chunksteps; ++i) {
        let ii = oo + oi * xstep;
        outdata[oi] = gain * func(ii, indata, alim, fmax, inrate, width);
        ++oi;
      }
    }
    bar("decodeBar", oi/outframecount); // GUI: progress
    if (oi < outframecount) {
      setTimeout(loop, 0);
    } else {
      bar("decodeBar", 1); // GUI: 100% progress
      setTimeout(done, 0);
    }
  };
  loop();
}

function ascii2internal(c) {
  let ch = c.charCodeAt(0);
  return ch < 32 ? ch + 64 : ch < 96 ? ch - 32 : ch;
}
function trunc(str, len) {
  return str.slice(0, len).padEnd(len);
}
function timefmt(secs) {
  let s = secs*1000 | 0;
  let hours = s / 3600000 | 0;
  let minutes = s % 360000 / 60000 | 0;
  let seconds = s % 60000 / 1000 | 0;
  let msecs = s % 1000;
  return [hours, minutes, seconds].
    map(x => x.toString().padStart(2, "0")).join(":") +
      "." + msecs.toString().padStart(3, "0")
}

function splash(settings, labels) {
  //             0123456789012345678901234567890123456789
  let text = "";
  if (settings.title) {
    text = text + trunc(" Title: " + settings.title, 40);
  }
  if (settings.artist) {
    text = text + trunc(" Artist: " + settings.artist, 40);
  }
  if (!settings.title && !settings.artist) {
    text = text + trunc(" File: " + settings.filename, 40);
  }
  let method = [settings.method, settings.channels,
    (settings.freq | 0)+"Hz", settings.media, settings.region].join(" ");
  settings.methodStr = method;
  text = text + trunc(" Method: " + method, 40);
  text = text + trunc(" Duration: " + timefmt(settings.duration), 40);
  text = text + trunc("", 40);
  text = text + trunc(" Generated by FujiConvert " + version, 40)
  if (settings.media != "emulator") {
    text = text + trunc("", 40);
    text = text + trunc(" L - Toggle loop/stop", 40);
  }
  text = text + trunc("", 40);
  if (settings.method == "pcm4+4" || settings.media != "emulator") {
    text = text + trunc(" Keys during playback:", 40);
  }
  if (settings.method == "pcm4+4") {
    text = text + trunc(" A - Toggle hardware/Altirra 3.10-test27", 40);
  }
  if (settings.media != "emulator") {
    text = text + trunc(" \x1E - Rewind", 40);
    text = text + trunc(" \x1F - Fast Forward", 40);
    text = text + trunc(" Space - Pause/Play", 40);
    text = text + trunc(" Del - Play from beginning", 40);
    text = text + trunc(" Esc - Return to this splash screen", 40);
  }
  text = text + trunc(" Press any key to start playback", 40);
  text = trunc(text, labels.scrlen);

  console.log("text: " + text + " scrlen: " + labels.scrlen);

  return Uint8Array.from(text, ascii2internal);
}

function header(start, length) {
  let end = start + length - 1;
  return [start & 0xFF, start >> 8, end & 0xFF, end >> 8];
}
function ini(addr) {
  return new Uint8Array([0xE2, 0x02, 0xE3, 0x02, addr & 0xFF, addr >> 8]);
}
function run(addr) {
  return new Uint8Array([0xE0, 0x02, 0xE1, 0x02, addr & 0xFF, addr >> 8]);
}
function checksum(bin) {
  return bin.reduce(function(x, y) { return (x + y) & 0xFFFFFFFF });
}
function ord(c) {
  return c.charCodeAt(0);
}
function makecar(type, bin) {
  let buffer = new ArrayBuffer(16);
  let view = new DataView(buffer);
  view.setUint8(0, ord("C"));
  view.setUint8(1, ord("A"));
  view.setUint8(2, ord("R"));
  view.setUint8(3, ord("T"));
  view.setUint32(4, type);
  view.setUint32(8, checksum(bin));
  view.setUint32(12, 0);
  return concatenate(Uint8Array, new Uint8Array(buffer), bin);
}
function carMax(media) {
  let max = {
    thecart: 128 << 20,
    sic: 512 << 10,
    megamax: 2 << 20,
    atarimax: 1 << 20,
    megacart: 2 << 20, // TODO support 4MB?
    xegs: 1 << 20,
  };
  return max[media];
}
function cartSize(type) {
  let sizes = {
    23: 256 << 10,
    24: 512 << 10,
    25: 1 << 20,
    26: 16 << 10,
    27: 32 << 10,
    28: 64 << 10,
    29: 128 << 10,
    30: 256 << 10,
    31: 512 << 10,
    32: 1 << 20,
    41: 127 << 10,
    42: 1 << 20,
    54: 128 << 10,
    55: 256 << 10, 
    56: 512 << 10,
    61: 2 << 20,
    62: 128 << 20,
    //63: 4 << 20,
    64: 2 << 20,
    65: 32 << 20,
    66: 64 << 20, 
  }
  return sizes[type] || 0;
}
function getCarType(media, length) {
  if (media == "thecart") {
    return length <= (32 << 20) ? 65 :
      length <= (64 << 20) ? 66 : 
      length <= (128 << 20) ? 62 :
      0;
  } else if (media == "sic") {
    return length <= (128 << 10) ? 54 :
      length <= (256 << 10) ? 55 : 
      length <= (512 << 10) ? 56 :
      0;
  } else if (media == "megamax") {
    return length <= (2 << 20) ? 61 :
      0;
  } else if (media == "atarimax") {
    return length <= (127 << 10) ? 41 :
      length <= (1 << 20) ? 42 :
      0;
  } else if (media == "megacart") {
    return length <= (16 << 10) ? 26 :
      length <= (32 << 10) ? 27 :
      length <= (64 << 10) ? 28 :
      length <= (128 << 10) ? 29 :
      length <= (256 << 10) ? 30 :
      length <= (512 << 10) ? 31 :
      length <= (1 << 20) ? 32 :
      length <= (2 << 20) ? 64 :
      //length <= (4 << 20) ? 63 :
      0;
  } else if (media == "xegs") {
    return length <= (256 << 10) ? 23 :
      length <= (512 << 10) ? 24 :
      length <= (1 << 20) ? 25 :
      0;
  }
  return 0;
}
function convert(renderedBuffer, settings) {
  if (settings.media == "ide") {
    convertIDE(renderedBuffer, settings);
  } else {
    convertSegments(renderedBuffer, settings);
  }
}
function convertIDE(renderedBuffer, settings) {
  let method = [settings.method, settings.channels,
    (settings.freq | 0)+"Hz", settings.media, settings.region].join(" ");
  settings.methodStr = method;
  let stereo = settings.channels == "stereo";
  let data = renderedBuffer.getChannelData(0);
  let data2 = stereo ? renderedBuffer.getChannelData(1) : undefined;
  let len = stereo ? data.length * 2 : data.length;
  let file = new Uint8Array(len);
  let done = function() {
    settings.extension = ".pdm";
    zip_and_offer(file, settings);
  };
  bar("convertBar", 0); // GUI: 0% progress
  let max = 255;
  let map_sample = settings.dither ? function(sample) {
    let dither = Math.random()-0.5;
    let samp = (sample * (max+1) + (max+1) + dither) >> 1;
    return clamp(samp, 0, max);
  } : function(sample) {
    let samp = (sample * (max+1) + (max+1)) >> 1;
    return clamp(samp, 0, max);
  };
  let maxbytes = settings.maxbytes;
  let maxframes = Math.min(
    (stereo ? maxbytes >> 1 : maxbytes) *
    (settings.method == "pcm4" ? 2 : 1),
    data.length);
  console.log("maxbytes: " + maxbytes + " maxframes: " + maxframes);
  let i = 0; // source index
  let j = 0; // destination sector index
  let loop = function() {
    let k; // sector offset1
    let l; // sector offset2
    let m; // destination index
    for (k = 0; k < 2; ++k) {
      for (l = k, m = j + k; l < 0x200; l+=2, ++i, m+=2) {
        let ifix = i < data.length ? i : data.length-1;
        if (stereo) {
          file[m] = map_sample(data[ifix]);
          l+=2; m+=2;
          file[m] = map_sample(data2[ifix]);
        } else {
          file[m] = map_sample(data[ifix]);
        }
      }
    }
    j += 0x200;
    bar("convertBar", i/maxframes); // GUI: progress
    if (i < maxframes) {
      setTimeout(loop, 0);
    } else {
      bar("convertBar", 1); // GUI: 100% progress
      setTimeout(done, 0);
    }
  };
  loop();
}
function convertSegments(renderedBuffer, settings) {
  settings.player_name = player_name = get_player_name(settings);
  console.log("player_name: " + player_name);
  if (!players[player_name]) {
    text("convertMessage", "ERROR: Unsupported player: " + player_name);
  }
  let player_bin = players[player_name].player;
  let labels = players[player_name].labels;
  let cart = labels.cartstart ? 1 : 0;
  let stereo = settings.channels == "stereo";
  let buf = labels.window;
  let buflen = 0x100 * labels.pages;
  console.log("buflen: " + buflen + " buf: " + buf);
  let data = renderedBuffer.getChannelData(0);
  let data2 = stereo ? renderedBuffer.getChannelData(1) : undefined;
  data.fill(0, data.length-2);
  if (data2) { data2.fill(0, data.length-2); }
  let parts = [];
  let done = function() {
    let player_b64 = players[player_name].player;
    let player_u8 = Uint8Array.from(atob(player_b64), c => c.charCodeAt(0))
    let shead = header(labels.scr, labels.scrlen);
    let stext = splash(settings, labels);
    if (settings.media == "emulator") {
      console.log("main: " + labels.main +
        " continue: " + labels.continue +
        " quiet: " + labels.quiet);
      let contini = ini(labels.continue);
      let pieces = [];
      for (let i = 0; i < parts.length; ++i) {
        pieces.push(header(buf, buflen));
        pieces.push(parts[i]);
        pieces.push(contini);
      }
      let xex = concatenate(Uint8Array,
        player_u8, // player
        shead, stext, // patch screen info
        ini(labels.main), // splash + setup
        ...pieces, // sound segments
        ini(labels.quiet) // quiet, shutdown
      );
      settings.extension = ".xex";
      zip_and_offer(xex, settings);
    } else if (settings.media == "ram") {
      console.log("main: " + labels.main +
        " prepnextbank: " + labels.prepnextbank);
      let prepini = ini(labels.prepnextbank);
      let pieces = [];
      for (let i = 0; i < parts.length; ++i) {
        pieces.push(prepini);
        pieces.push(header(buf, buflen));
        pieces.push(parts[i]);
      }
      let endbank = parts.length;
      let xex = concatenate(Uint8Array,
        player_u8, // player
        shead, stext, // patch screen info
        header(labels.endlo+1, 1), [endbank & 0xFF],
        header(labels.endhi+1, 1), [endbank >> 8],
        ...pieces, // sound segments
      );
      settings.extension = ".xex";
      zip_and_offer(xex, settings);
    } else if (cart) {
      // patch splash screen
      console.log("scr: " + labels.scr +
        " relocated_start: " + labels.relocated_start);
      player_u8.set(stext, labels.scr - labels.relocated_start);
      let player0 =
        settings.media == "atarimax" ? 0 :
        settings.media == "megamax" ? 1 :
        settings.media == "sic" ? 1 :
        settings.media == "megacart" ? 1 :
        settings.media == "xegs" ? 0 :
        settings.media == "thecart" ? 1 :
        1;
      let datalen = (parts.length + 1) * buflen;
      let max = Math.min(carMax(settings.media), settings.maxbytes, datalen);
      let type = getCarType(settings.media, max);
      let fullsize = cartSize(type);
      let size = player0 ? datalen : fullsize;
      let mediaoffset = player0 ? buflen : 0;
      let mediaend = player0 ? size : size - buflen;
      let player_offset = player0 ? 0 : size - buflen;
      if (settings.media == "sic") {
        player_offset = 0x2000;
      }
      let bin = new Uint8Array(size);
      for (let part of parts) {
        bin.set(part, mediaoffset);
        mediaoffset += buflen;
        if (mediaoffset >= mediaend) {
          break;
        }
      }
      // patch end bank
      let endbank = parts.length + (player0 ? 1 : 0);
      player_u8[labels.endlo+1 - labels.relocated_start] = endbank & 0xFF;
      player_u8[labels.endhi+1 - labels.relocated_start] = endbank >> 8;
      bin.set(player_u8, player_offset);
      console.log({
        endbank:endbank,
        datalen:datalen,
        max:max,
        type:type,
        fullsize:fullsize,
        size:size,
        mediaoffset:mediaoffset,
        mediaend:mediaend,
        player_offset:player_offset,
      });
      if (!player0 && bin.length > size) {
        text("convertMessage", "ERROR: Internal error: bad size");
        bin = bin.slice(0, size); // XXX Should never trigger if limiter in loop() is working
      }
      car = makecar(type, bin);
      console.log("max: " + max + " size: " + size +
        " type: " + type);
      settings.extension = ".car";
      zip_and_offer(car, settings);
    } else {
      text("convertMessage", "ERROR: Unsupported media: " + settings.media);
    }
  };
  bar("convertBar", 0); // GUI: 0% progress
  let max =
    settings.method == "pwm" ? Math.min(settings.period-5, 101) :
    settings.method == "pcm4" ? 15 :
    255;
  console.log("max: " + max);
  let map_sample = settings.dither ? function(sample) {
    let dither = Math.random()-0.5;
    let samp = (sample * (max+1) + (max+1) + dither) >> 1;
    return clamp(samp, 0, max);
  } : function(sample) {
    let samp = (sample * (max+1) + (max+1)) >> 1;
    return clamp(samp, 0, max);
  };
  let maxbytes = Math.min(
    cart ? carMax(settings.media) : 1e999,
    settings.media == "ram" ? 1 << 20 :
    settings.maxbytes);
  let maxframes = Math.min(
    (stereo ? maxbytes >> 1 : maxbytes) *
    (settings.method == "pcm4" ? 2 : 1),
    data.length);
  console.log("maxbytes: " + maxbytes + " maxframes: " + maxframes);
  let i = 0; // source index
  let loop = function() {
    let k; // page offset
    let l; // destination index
    let part = new Uint8Array(buflen);
    if (settings.method == "pcm4") {
      for (k = 0; k < 0x100; ++k) {
        for (l = k; l < buflen; l+=0x100, ++i) {
          if (stereo) {
            let ifix = i < data.length ? i : data.length-1;
            hi = map_sample(data[ifix]);
            lo = map_sample(data2[ifix]);
            part[l] = hi << 4 | lo;
          } else {
            let ifix = i < data.length-1 ? i : data.length-2;
            hi = map_sample(data[ifix]);
            ++ifix; ++i;
            lo = map_sample(data[ifix]);
            part[l] = hi << 4 | lo;
          }
        }
      }
    } else {
      for (k = 0; k < 0x100; ++k) {
        for (l = k; l < buflen; l+=0x100, ++i) {
          let ifix = i < data.length ? i : data.length-1;
          if (stereo) {
            part[l] = map_sample(data[ifix]);
            l+=0x100;
            part[l] = map_sample(data2[ifix]);
          } else {
            part[l] = map_sample(data[ifix]);
          }
        }
      }
    }
    parts.push(part); // part done
    bar("convertBar", i/maxframes); // GUI: progress
    if (i < maxframes) {
      setTimeout(loop, 0);
    } else {
      bar("convertBar", 1); // GUI: 100% progress
      setTimeout(done, 0);
    }
  };
  loop();
}

function zip_and_offer(file, settings) {
  let base = settings.filename.replace(/\.[^\/.]+$/, "");
  let method = settings.methodStr;
  let filename = base + " " + method + settings.extension;
  let zipname = base + " " + method + ".zip";
  global.wavename = base + " " + method + ".wav";
  let zip = new JSZip();
  zip.file(filename, file);
  busy("zipBusy", 1);
  zip.generateAsync({type: "blob", compression: "DEFLATE"},
    function updateCallback(metadata) {
      //console.log("zip: " + metadata.percent);
  }).then(function (blob) {
    busy("zipBusy", 2);
    offerDownload(zipname, blob);
  });
}

function offerDownload(name, blob) {
  let element = document.getElementById("download");
  element.innerText = name;
  element.download = name;

  // data: fails for files over 2MB
  // https://stackoverflow.com/questions/16761927/aw-snap-when-data-uri-is-too-large
  //element.href = "data:;base64," + btoa(contents);

  // createObjectURL works on Blobs and Files
  element.href = window.URL.createObjectURL(blob);
  // Lifetime is tied to browser window object

  document.getElementById("controls").style.visibility = "visible";

  setTimeout(offerWave, 0);
}

async function audioBufferToWaveBlob(audioBuffer) {
  return new Promise(function(resolve, reject) {
    let worker = new Worker('./waveWorker.js');
    worker.onmessage = function( e ) {
      let blob = new Blob([e.data.buffer], {type:"audio/wav"});
      resolve(blob);
    };
    let pcmArrays = [];
    for(let i = 0; i < audioBuffer.numberOfChannels; i++) {
      pcmArrays.push(audioBuffer.getChannelData(i));
    }
    worker.postMessage({
      pcmArrays,
      config: {sampleRate: global.outrate, bitDepth: 8}
    });
  });
}
async function offerWave() {
  let wave = await audioBufferToWaveBlob(global.outbuffer);
  let element = document.getElementById("preview");
  let name = global.wavename;
  element.innerText = name;
  element.download = name;
  element.href = window.URL.createObjectURL(wave);
}

function play(e) {
  stop(e);
  global.context = global.context || new AudioContext();
  global.testSource = global.context.createBufferSource();
  global.testSource.buffer = global.outbuffer;
  global.testSource.connect(global.context.destination);
  global.testSource.start(0);
}
function stop(e) {
  if (global.testSource) {
    global.testSource.stop(0);
  }
}
function init() {
  readLocalStorage();
  document.getElementById("reconvert").
    addEventListener("click", readSingleFile);
  document.getElementById("play").
    addEventListener("click", play);
  document.getElementById("stop").
    addEventListener("click", stop);
  document.getElementById("file-input").
    addEventListener("change", readSingleFile);
  document.getElementById("settings").
    addEventListener("change", getSettings);
  document.getElementById("version").
    innerText = version;
  getSettings();
  resetIndicators();
}
