// vim: ts=2:sts=2:sw=2:et
"use strict";
let version = "0.3.3";
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
async function delay(msec) {
  await new Promise((resolve, reject) => setTimeout(msec, resolve));
}
function progressbar(name) {
  let ticks = 0;
  let progress = new Progress(80, function(newticks) {
    ticks += newticks;
    bar(name, ticks / 80);
    delay(0); // Yield to page renderer to allow repaint?
  });
  return progress;
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
    "method", "channels", "region", "frequency", "resampling_window",
    "media",
    "maxsize",
    "preset", "finelevels", "coarselevels", "bump", "dc", "linpulse", "nonlinpulse",
    "dither", "autogain",
    "cart_type", "wav",
    "gain", "speed", "offset", "duration", "title", "artist",
  ];
}
function readLocalStorage() {
  if (!localStorage.getItem("method")) {
    return;
  }
  let form = document.getElementById("settings");
  let elements = formElements();
  for (let i = 0; i < elements.length; ++i) {
    if (form[elements[i]]) {
      setElement(form[elements[i]], localStorage.getItem(elements[i]));
    } else {
      // Remove old or unknown settings
      localStorage.removeItem(elements[i]);
    }
  }
  if (!form.gain.value) {
    form.gain.value = 1;
  }
  if (!form.speed.value) {
    form.speed.value = 1;
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
function restoreDefaults() {
  localStorage.clear();
  location.reload();
}
function get_player_name(settings) {
  return "player-" +
    settings.media + "-" +
    settings.method + "-" +
    settings.channels + "-" +
    settings.period;
}
function constrainedSettings(settings) {
  let keys = Object.keys(settings).sort();
  let first = ["title", "artist", "player_name", "resampling_window"];
  first.forEach(k => keys.splice(keys.indexOf(k), 1));
  keys.unshift(...first);
  let lines = keys.map(key => (key + ": ").padEnd(13) + settings[key]);
  let left = lines.splice(0, (lines.length+1) >> 1);
  let lwidth = Math.max(...left.map(l => l.length));
  let rwidth = Math.max(...lines.map(l => l.length));
  let pad = lwidth + Math.max(2, 80 - lwidth - rwidth);
  lines.push("");
  return left.map((line, i) => line.padEnd(pad) + lines[i] + "\n").join("");
}
function getPresetSettings() {
  let preset = settings.preset.value;
  let form = document.getElementById("settings");
  if (preset == "16 14 1") {
    setElement(form["dc"], "-7");
    setElement(form["finelevels"], "14");
    setElement(form["coarselevels"], "16");
    setElement(form["bump"], "1");
    setElement(form["nonlinpulse"], "2/4");
    setElement(form["linpulse"], "3/5");
  } else if (preset == "16 16 0") {
    setElement(form["dc"], "-8");
    setElement(form["finelevels"], "16");
    setElement(form["coarselevels"], "16");
    setElement(form["bump"], "0");
    setElement(form["nonlinpulse"], "4/6");
    setElement(form["linpulse"], "4/6");
  } else if (preset == "8 8 0") {
    setElement(form["dc"], "-4");
    setElement(form["finelevels"], "8");
    setElement(form["coarselevels"], "8");
    setElement(form["bump"], "0");
    setElement(form["nonlinpulse"], "8/11");
    setElement(form["linpulse"], "0/2");
  } else if (preset == "16 8 0") {
    setElement(form["dc"], "-4");
    setElement(form["finelevels"], "16");
    setElement(form["coarselevels"], "8");
    setElement(form["bump"], "0");
    setElement(form["nonlinpulse"], "4/6");
    setElement(form["linpulse"], "4/6");
  }
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
    "8M": 8 << 20,
    "16M": 16 << 20,
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
    settings.method = "pdm";
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
      if ((!labels.slow_cycles || labels.slow_cycles <= 15) &&
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
  settingsText.innerText = constrainedSettings(settings);

  // Derived settings
  settings.maxbytes = maxbytes[settings.maxsize] || (4<<20);

  // Use .car if neither .car or .raw are selected
  if (!settings.cart_type) {
    settings.cart_type = "car";
  }

  // Grey out cart types if not a cart
  if (["ide", "emulator", "ram"].indexOf(settings.media) >= 0) {
    document.getElementById("cart_type").style.visibility = "hidden";
  } else {
    document.getElementById("cart_type").style.visibility = "visible";
  }

  // Pulse
  if (!settings.nonlinpulse || !settings.nonlinpulse.match(/^\d+\/\d+$/)) {
    settings.nonlinpulse = "2/4";
  }
  if (!settings.linpulse || !settings.linpulse.match(/^\d+\/\d+$/)) {
    settings.linpulse = "3/5";
  }

  return settings;
}
function resetIndicators() {
  bar("readBar", 0);
  bar("resampleBar", 0);
  bar("convertBar", 0);
  bar("zipBar", 0);
  text("readMessage", "");
  text("resampleMessage", "");
  text("convertMessage", "");
  let download = document.getElementById("download");
  download.innerText = "";
  download.href = "";
  document.getElementById("controls").style.visibility = "hidden";
  //document.getElementById("convert").style.visibility = "hidden";
}
function fakeAudio(...args) {
  if (typeof args[0] == "object") {
    this.numberOfChannels = args[0].numberOfChannels;
    this.length = args[0].length;
    this.sampleRate = args[0].sampleRate;
    this.duration = args[0].duration;
    this.chan = [];
    for (let i = 0; i < this.numberOfChannels; ++i) {
      this.chan[i] = args[0].getChannelData(i);
    }
  } else {
    this.numberOfChannels = args[0];
    this.length = args[1];
    this.sampleRate = args[2];
    this.duration = this.length / this.sampleRate;
    this.chan = [];
    for (let i = 0; i < this.numberOfChannels; ++i) {
      this.chan[i] = new Float32Array(this.length);
    }
  }
  this.getChannelData = i => this.chan[i];
  this.copyToChannel = function(ch, i) {
    this.chan[i] = ch;
  };
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

  let progress = progressbar("readBar");
  let readprogress = progress.sub(0.3);
  let decodeprogress = progress.sub(0.7);
  readprogress.init(100);

  // Read as binary
  let binreader = new FileReader();
  binreader.onload = function(e) {
    readprogress.done();
    let contents = e.target.result;
    decode(contents, settings, decodeprogress);
  };
  binreader.onprogress = function(event) {
    readprogress.report(100 * event.loaded / event.total);
  };
  binreader.onerror = function(e) {
    text("readMessage", "ReadError");
  };
  binreader.readAsArrayBuffer(file);
}

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
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
    case "emulator": return (1<<30);
    case "ide": return (1<<30);
    default: return getCartCapacity(settings);
  }
}
function getBytesPerFrame(settings) {
  let stereo = settings.channels == "stereo";
  let fourbit = settings.method == "pcm";
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
function durationToFrames(buffer, duration) {
  return duration * buffer.sampleRate;
}
function getUserLimit(settings) {
  let maxbytes = settings.maxbytes;
  if (settings.media == "ide") return maxbytes;
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

  let inrate = buffer.sampleRate;
  let outrate = settings.freq;

  let mediacapacity = getMediaCapacity(settings);
  let mediaframecount = parseInt(inrate / outrate * bytesToFrames(settings, mediacapacity));
  console.log("mediacapacity: " + mediacapacity);
  console.log("mediaframecount: " + mediaframecount);

  let usercapacity = getUserLimit(settings);
  let userframecount = parseInt(inrate / outrate * bytesToFrames(settings, usercapacity))
  console.log("usercapacity: " + usercapacity);
  console.log("userframecount: " + userframecount);

  let songframecount = buffer ? buffer.length : 1 << 32;
  console.log("songframecount: " + songframecount);

  let remainingduration = Math.max(buffer.duration - settings.offset, 0);
  let userduration = settings.duration > 0 ?
    Math.min(settings.duration, remainingduration) : 1000 * 60;
  let userdurationframecount = durationToFrames(buffer, userduration);
  console.log("userdurationframecount: " + userdurationframecount);

  return Math.min(
    mediaframecount,
    userframecount,
    songframecount,
    userdurationframecount);
}
function cropBuffer(context, inbuf, frameoffset, framecount) {
  let chancount = inbuf.numberOfChannels;
  let outbuf = new fakeAudio(chancount, framecount, inbuf.sampleRate);
  for (let i = 0; i < chancount; ++i) {
    let inchan = inbuf.getChannelData(i);
    let outchan = outbuf.getChannelData(i);
    outchan.set(inchan.subarray(frameoffset, frameoffset + framecount));
  }
  return outbuf;
}
function get_window_width(settings) {
  switch (settings.resampling_window) {
    case "2048": return 2048;
    case "1024": return 1024;
    case "256": return 256;
    case "32": return 32;
    case "none": return 1;
    default: return 1;
  }
}

function pdmToBuffer(pdm, context, stereo, region) {
  // Convert PDM data to AudioBuffer
  let numChannels = stereo ? 2 : 1;
  let abuf = new Uint8Array(pdm);
  let framecount = abuf.length / numChannels;
  let cycles = {
    ntsc: 262*105*60,
    pal: 312*105*50,
  };
  let frequency = cycles[region] / 37;
  let buf = context.createBuffer(numChannels, framecount, frequency);
  let ch0 = buf.getChannelData(0);
  let ch1 = stereo ? buf.getChannelData(1) : null;
  for (let i = 0, x = 0; i < framecount;) {
    if (stereo && x&1) {
      ch1[i] = abuf[x] / 127.5 - 1;
      ++i;
    } else {
      ch0[i] = abuf[x] / 127.5 - 1;
      if (!stereo) ++i;
    }
    if ((x&0x1FF) == 0x1FE) {
      x -= 0x1FD;
    } else if ((x&0x1FF) == 0x1FF) {
      x += 1;
    } else {
      x += 2;
    }
  }
  return buf;
}

function decode(contents, settings, progress) {

  // Create OfflineAudioContext
  let channelcount = settings.channels == "stereo" ? 2 : 1;
  let length = 1000;
  let samplerate = 48000;
  let context = new OfflineAudioContext(channelcount, length, samplerate);
  settings.context = context;

  let done = function(buffer) {
    progress.done();
    mix_and_resample(buffer, context, settings);
  }

  if (settings.filename.match(/\.pdm$/i)) {
    let stereo = !!settings.filename.match(/stereo/i);
    let region = settings.region;
    let buf = pdmToBuffer(contents, context, stereo, region);
    done(buf);
    return;
  }

  try {
    let wav = readwav(contents);
    console.log("WAVE sampleRate: " + wav.sampleRate);
    console.log(wav);
    let buf = wavToBuffer(wav, context);
    done(buf);
  } catch (e) {
    console.log("Not a simple WAVE file: " + e);
    console.log("Trying WebAudio decode");
    context.decodeAudioData(contents, done, function(e) {
      text("readMessage", "Decode Error: " + e);
    });
  }
}
function mix_and_resample(buffer, context, settings) {
  let progress = progressbar("resampleBar");
  global.outrate = settings.freq;

  let duration = buffer.duration - settings.offset;
  if (duration < 0) {
    text("readMessage", "Offset (" + settings.offset +
      ") is larger than sound duration (" + buffer.duration + ")");
    return;
  }

  if (settings.speed != 1) {
    buffer = new fakeAudio(buffer);
    buffer.sampleRate /= settings.speed;
  }

  let framecount = settings.framecount = getFrameCount(settings, buffer);
  let frameoffset = settings.offset * buffer.sampleRate;
  console.log("framecount: " + framecount + " frameoffset: " + frameoffset);
  let cropbuf = cropBuffer(context, buffer, frameoffset, framecount);
  console.log("cropbuf.length: " + cropbuf.length);
  progress.sub(0.1).done();
  let mixbuf = mix(cropbuf, settings);
  console.log("mixbuf.length: " + mixbuf.length);
  progress.sub(0.1).done();
  resample(mixbuf, settings, progress.sub(0.8));
};

function autogain(buf) {
  let min = 1, max = -1;
  for (let i = 0; i < buf.numberOfChannels; ++i) {
    let data = buf.getChannelData(i);
    for (let j = 0; j < data.length; ++j) {
      if (data[j] < min) {
        min = data[j];
      } else if (data[j] > max) {
        max = data[j];
      }
    }
  }
  console.log("Auto-gain max: " + max + " min: " + min);
  let gain = 1 / Math.max(-min, max);
  return gain;
}

function mix(inbuf, settings) {
  // Mix
  let outchannels = settings.channels == "stereo" ? 2 : 1;
  let inchannels = inbuf.numberOfChannels;
  let inframecount = inbuf.length;
  let inrate = inbuf.sampleRate;
  let outbuf = new fakeAudio(outchannels, inframecount, inrate);
  let gain = settings.gain;
  let inchs = [];
  for (let i = 0; i < inchannels; ++i) {
    inchs[i] = inbuf.getChannelData(i);
  }
  if (inchannels == outchannels) {
    for (let i = 0; i < inchannels; ++i) {
      outbuf.copyToChannel(inchs[i], i);
    }
  } else if (inchannels < outchannels) {
    for (let i = 0; i < outchannels; ++i) {
      outbuf.copyToChannel(inchs[0], i);
    }
  } else {
    let outch = outbuf.getChannelData(0);
    inchs[0].forEach((v, i) => outch[i] = v + inchs[1][i]);
    gain *= 0.5;
  }
  if (settings.autogain) {
    settings.gain = gain = autogain(outbuf);
    let dispgain = inchannels > outchannels ? 2 * gain : gain;
    console.log("Auto-gain: " + dispgain);
    text("resampleHeader", "Mix and Resample (Auto-gain=" + dispgain.toFixed(3) + ")");
  }
  delay(0);
  // Apply gain
  for (let i = 0; i < outchannels; ++i) {
    outbuf.getChannelData(i).forEach((v, j, a) => a[j] = gain * v);
  }
  return outbuf;
}

async function resample_buf(inbuf, inwidth, outrate, context, progress) {
  let channelcount = inbuf.numberOfChannels;
  let inframecount = inbuf.length;
  let inrate = inbuf.sampleRate;
  let outframecount = parseInt(inframecount * outrate / inrate);
  let outbuf = context.createBuffer(channelcount, outframecount, outrate);
  let ch = [{}, {}];
  for (let i = 0; i < channelcount; ++i) {
    let subprogress = progress.sub(1/channelcount);
    ch[i].promise = new Promise(function(resolve, reject) {
      ch[i].resolve = resolve;
      ch[i].reject = reject;
    });
    ch[i].worker = new Worker("resample.js");
    ch[i].worker.onmessage = function(msg) {
      let d = msg.data;
      if (d.newticks != undefined) {
        subprogress.ontick(d.newticks);
      } else if (d.result) {
        outbuf.copyToChannel(new Float32Array(d.outbuf), i);
        ch[i].resolve();
      }
    };
    ch[i].worker.onerrormessage = function(msg) {
      ch[i].reject();
    }
    let msg = {
      inrate,
      inwidth,
      outrate,
      progress: {ticks: subprogress.ticks},
      inbuf: inbuf.getChannelData(i).buffer.slice(0),
    };
    ch[i].worker.postMessage(msg, [msg.inbuf]);
  }
  await Promise.all(ch.map(x => x.promise));
  ch.forEach(v => v.worker && v.worker.terminate());
  return outbuf;
}
async function resample(inbuf, settings, progress) {
  let inrate = inbuf.sampleRate;
  let outrate = global.outrate = settings.freq;
  // Skip resample if input and output sample rates are the same
  if (Math.abs(inrate - outrate) < 1) {
    progress.done();
    convert(inbuf, settings);
  } else {
    let width = get_window_width(settings);
    let outbuf = await resample_buf(inbuf, width, outrate, settings.context, progress);
    progress.done();
    convert(outbuf, settings);
  }
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
  settings.methodStr = method.replace(/^pdm/,
    "pdm" +
    settings.coarselevels + "_" +
    settings.finelevels + "_" +
    settings.bump);
  text = text + trunc(" Method: " + method, 40);
  console.log("framecount: " + settings.framecount);
  text = text + trunc(" Duration: " +
    timefmt(framesToDuration(settings, settings.framecount)), 40);
  text = text + trunc("", 40);
  text = text + trunc(" Generated by FujiConvert " + version, 40)
  if (settings.media != "emulator") {
    text = text + trunc("", 40);
    text = text + trunc(" L - Toggle loop/stop", 40);
  }
  text = text + trunc("", 40);
  if (settings.method == "pdm" || settings.media != "emulator") {
    text = text + trunc(" Keys during playback:", 40);
  }
  if (settings.method == "pdm") {
    text = text + trunc(" A - Toggle linear/non-linear mixing", 40);
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
    41: 128 << 10,
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
    return length <= (128 << 10) ? 41 :
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
  global.outbuffer = renderedBuffer;
  if (settings.media == "ide") {
    convertIDE(renderedBuffer, settings);
  } else {
    convertSegments(renderedBuffer, settings);
  }
}
function get_map_sample(max, settings) {
  if (settings.method == "pdm") {
    const finelevels = parseInt(settings.finelevels);
    const coarselevels = parseInt(settings.coarselevels);
    const dc = parseInt(settings.dc);
    const levels = finelevels*coarselevels;
    const adjust = 16-finelevels;
    const bump = adjust ? Math.min(parseInt(settings.bump), adjust) : 0;
    return settings.dither ? function (sample) {
      let dither = Math.random()>0.5;
      let samp = ((sample*levels + levels) >> 1) + dc + dither;
      let mapped = samp + bump + adjust*(samp / finelevels | 0);
      return clamp(mapped, bump, 255);
    } : function (sample) {
      let samp = ((sample*levels + levels) >> 1) + dc;
      let mapped = samp + bump + adjust*(samp / finelevels | 0);
      return clamp(mapped, bump, 255);
    };
  } else {
    const levels = max+1;
    return settings.dither ? function(sample) {
      let dither = Math.random()>0.5;
      let samp = ((sample*levels + levels) >> 1) + dither;
      return clamp(samp, 0, max);
    } : function(sample) {
      let samp = ((sample*levels + levels) >> 1);
      return clamp(samp, 0, max);
    };
  }
}
function convertIDE(renderedBuffer, settings) {
  let method = [settings.method, settings.channels,
    (settings.freq | 0)+"Hz", settings.media, settings.region].join(" ");
  settings.methodStr = method.replace(/^pdm/, "pdm" + settings.finelevels);
  let stereo = settings.channels == "stereo";
  let data = renderedBuffer.getChannelData(0);
  let data2 = stereo ? renderedBuffer.getChannelData(1) : undefined;
  let len = stereo ? data.length * 2 : data.length;
  let file = new Uint8Array(len);
  let done = function() {
    zip_and_offer([file, ".pdm"], settings);
  };
  let max = 255;
  let map_sample = get_map_sample(max, settings);
  let maxbytes = settings.maxbytes;
  let maxframes = Math.min(
    (stereo ? maxbytes >> 1 : maxbytes) *
    (settings.method == "pcm" ? 2 : 1),
    data.length);
  console.log("maxbytes: " + maxbytes + " maxframes: " + maxframes +
    " data.length: " + data.length);
  let progress = progressbar("convertBar");
  progress.init(maxframes);
  let i = 0; // source index
  let j = 0; // destination sector index
  while (i < maxframes) {
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
  }
  progress.done();
  done();
}
function convertSegments(renderedBuffer, settings) {
  let player_name = settings.player_name = get_player_name(settings);
  console.log("player_name: " + player_name);
  if (!players[player_name]) {
    text("convertMessage", "ERROR: Unsupported player: " + player_name);
  }
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
    let paudf_segment = [];
    if (settings.method == "pdm") {
      let nl = settings.nonlinpulse.split("/");
      let l = settings.linpulse.split("/");
      let paudf = [nl[0], l[0], nl[1], l[1]].map(x => parseInt(x));
      paudf_segment = [...header(labels.paudf1, 4), ...paudf];
      if (cart) {
        player_u8.set(paudf, labels.paudf1 - labels.relocated_start);
      }
    }
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
        paudf_segment, // patch paudf table
        shead, stext, // patch screen info
        ini(labels.main), // splash + setup
        ...pieces, // sound segments
        ini(labels.quiet) // quiet, shutdown
      );
      zip_and_offer([xex, ".xex"], settings);
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
        paudf_segment, // patch paudf table
        shead, stext, // patch screen info
        header(labels.endlo+1, 1), [endbank & 0xFF],
        header(labels.endhi+1, 1), [endbank >> 8],
        ...pieces, // sound segments
      );
      zip_and_offer([xex, ".xex"], settings);
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
      if (type == 41) { // 128K Atarimax
        player0 = 1;
        // Patch init bank
        player_u8[labels.initbank + 1 - labels.relocated_start] = 1;
      }
      let fullsize = cartSize(type);
      let size = player0 ? datalen : fullsize;
      if (settings.media == "thecart" && (size & 0x1FFF)) {
        // Round up to next 8K boundary
        size = ((size >> 13) + 1) << 13;
      }
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
      let endbank = Math.max(2, parts.length-1) + (player0 ? 1 : 0);
      player_u8[labels.endlo+1 - labels.relocated_start] = endbank & 0xFF;
      player_u8[labels.endhi+1 - labels.relocated_start] = endbank >> 8;
      bin.set(player_u8, player_offset);
      console.log({
        endbank,
        datalen,
        max,
        type,
        fullsize,
        size,
        mediaoffset,
        mediaend,
        player_offset,
        player0,
      });
      if (!player0 && bin.length > size) {
        text("convertMessage", "ERROR: Internal error: bad size");
        bin = bin.slice(0, size); // XXX Should never trigger if limiter in loop() is working
      }
      let files = [];
      if (settings.cart_type == "car") {
        let car = makecar(type, bin);
        files.push(car, ".car");
      } else {
        files.push(bin, ".raw");
      }
      zip_and_offer(files, settings);
    } else {
      text("convertMessage", "ERROR: Unsupported media: " + settings.media);
    }
  };
  let max =
    settings.method == "pwm" ? settings.period >= 105 ? 100 : settings.period-8 :
    settings.method == "pcm" ? 15 :
    settings.method == "pdm" ? 255 :
    255;
  let map_sample = get_map_sample(max, settings);
  let maxbytes = Math.min(
    cart ? carMax(settings.media) : 1e999,
    settings.media == "ram" ? 1 << 20 :
    settings.maxbytes);
  let maxframes = Math.min(
    (stereo ? maxbytes >> 1 : maxbytes) *
    (settings.method == "pcm" ? 2 : 1),
    data.length);
  let progress = progressbar("convertBar");
  progress.init(maxframes);
  let i = 0; // source index
  while (i < maxframes) {
    progress.report(i);
    let k; // page offset
    let l; // destination index
    let part = new Uint8Array(buflen);
    if (settings.method == "pcm") {
      for (k = 0; k < 0x100; ++k) {
        for (l = k; l < buflen; l+=0x100, ++i) {
          if (stereo) {
            let ifix = i < data.length ? i : data.length-1;
            let hi = map_sample(data[ifix]);
            let lo = map_sample(data2[ifix]);
            part[l] = hi << 4 | lo;
          } else {
            let ifix = i < data.length-1 ? i : data.length-2;
            let hi = map_sample(data[ifix]);
            ++ifix; ++i;
            let lo = map_sample(data[ifix]);
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
  }
  progress.done();
  done();
}

function get_filename(ext, settings) {
  let base = settings.filename.replace(/\.[^\/.]+$/, "");
  let method = settings.methodStr;
  return base + " " + method + ext;
}

function zip_and_offer(files, settings) {
  global.wavename = get_filename(".wav", settings);
  let zipname = get_filename(".zip", settings);
  let zip = new JSZip();
  let rawsize = 0;
  for (let i = 0; i < files.length; i += 2) {
    zip.file(get_filename(files[i+1], settings), files[i]);
    rawsize += files[i].length;
  }
  document.getElementById("rawsize").innerText = rawsize;
  bar("zipBar", 0);
  zip.generateAsync({type: "blob", compression: "DEFLATE"},
    function updateCallback(metadata) {
      bar("zipBar", metadata.percent / 100);
      delay(0);
  }).then(function (blob) {
    bar("zipBar", 1);
    offerDownload(zipname, blob, settings);
  });
}

function offerDownload(name, blob, settings) {
  let element = document.getElementById("download");
  element.innerText = name;
  element.download = name;

  // createObjectURL works on Blobs and Files
  element.href = window.URL.createObjectURL(blob);
  // Lifetime is tied to browser window object

  document.getElementById("controls").style.visibility = "visible";

  if (settings.wav) {
    setTimeout(offerWave, 0);
  }
}

function audioBufferToWaveBlob(audioBuffer) {
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
  document.getElementById("preset").
    addEventListener("change", getPresetSettings);
  document.getElementById("settings").
    addEventListener("change", getSettings);
  document.getElementById("restoreDefaults").
    addEventListener("click", restoreDefaults);
  document.getElementById("version").
    innerText = version;
  getSettings();
  resetIndicators();
}
