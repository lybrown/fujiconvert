// vim: ts=2:sts=2:sw=2
function getRadio(radio) {
  for (let i = 0; i < radio.length; ++i) {
    if (radio[i].checked) {
      return radio[i].value;
    }
  }
  return "NONE";
}
function setRadio(radio, value) {
  for (let i = 0; i < radio.length; ++i) {
    if (radio[i].value == value) {
      radio[i].checked = true;
    }
  }
}
function getSelected(select) {
  for (let i = 0; i < select.length; ++i) {
    if (select[i].selected) {
      return select[i].value;
    }
  }
  return "NONE";
}
function setSelected(select, value) {
  for (let i = 0; i < select.length; ++i) {
    if (select[i].value == value) {
      return select[i].selected = true;
    }
  }
  return "NONE";
}
function bar(name, fraction) {
  let bar = document.getElementById(name);
  bar.style.width = (fraction * 100) + "%";
}
function busy(name, state) {
  let busy = document.getElementById(name);
  if (state == 0) {
    busy.style.visibility = "hidden";
    busy.parentNode.style["background-color"] = "#ddd";
  } else if (state == 1) {
    busy.style.visibility = "visible";
    busy.style["background-color"] = "#0000";
  } else if (state == 2) {
    busy.style.visibility = "hidden";
    busy.parentNode.style["background-color"] = "#4CAF50";
  }
}
function text(name, msg) {
  let message = document.getElementById(name);
  message.innerText = msg;
}
function readLocalStorage() {
  if (!localStorage.getItem("method")) {
    return;
  }
  let form = document.getElementById("settings");
  let radios = ["method", "channels", "region", "frequency", "media"];
  let selects = ["maxsize"];
  let texts = ["gain", "offset", "duration", "title", "artist"];
  for (let i = 0; i < radios.length; ++i) {
    setRadio(form[radios[i]], localStorage.getItem(radios[i]));
  }
  for (let i = 0; i < selects.length; ++i) {
    setSelected(form[selects[i]], localStorage.getItem(selects[i]));
  }
  for (let i = 0; i < texts.length; ++i) {
    form[texts[i]].value = localStorage.getItem(texts[i]);
  }
  if (!form.gain.value) {
    form.gain.value = 1.5;
  }
  if (!form.offset.value) {
    form.offset.value = 0;
  }
  if (!form.offset.duration) {
    form.duration.value = -1;
  }
}
function writeLocalStorage() {
  let form = document.getElementById("settings");
  let radios = ["method", "channels", "region", "frequency", "media"];
  let selects = ["maxsize"];
  let texts = ["gain", "offset", "duration", "title", "artist"];
  for (let i = 0; i < radios.length; ++i) {
    localStorage.setItem(radios[i], getRadio(form[radios[i]]))
  }
  for (let i = 0; i < selects.length; ++i) {
    localStorage.setItem(selects[i], getSelected(form[selects[i]]))
  }
  for (let i = 0; i < texts.length; ++i) {
    localStorage.setItem(texts[i], form[texts[i]].value);
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
    "44kHz": 37,
    "34kHz": 48,
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
    "32M": 32 << 20,
    "64M": 64 << 20,
    "128M": 128 << 20,
    "unlimited": 1 << 30,
  };
  let settings = {
    method: getRadio(form["method"]),
    channels: getRadio(form["channels"]),
    region: getRadio(form["region"]),
    frequency: getRadio(form["frequency"]),
    media: getRadio(form["media"]),
    maxsize: getSelected(form["maxsize"]),
    gain: form["gain"].value,
    offset: form["offset"].value,
    duration: form["duration"].value,
    title: form["title"].value,
    artist: form["artist"].value,
  };

  // Constraints
  if (settings.media == "ide") {
    settings.method = "pcm44";
    settings.channels = "mono";
    settings.frequency = "44kHz";
  }
  settings.period = period[settings.frequency];
  if (settings.channels == "stereo") {
    settings.period = clamp(settings.period, period["34kHz"], 999);
  }
  if (settings.method == "pwm") {
    settings.period = clamp(settings.period, period["31kHz"], 999);
  }

  // Show cosntrained settings
  settings.freq = cycles[settings.region] / settings.period;
  settingsText.innerText = Object.keys(settings).sort().map(function(key) {
    return key + ": " + settings[key] + "\n";
  }).join("");

  // Derived settings
  settings.maxbytes = maxbytes[settings.maxsize] || (4<<20);

  return settings;
}
function readSingleFile(e) {
  let fileinput = document.getElementById("file-input");
  let file = fileinput.files[0];
  if (!file) {
    return;
  }
  let settings = getSettings();
  settings.filename = file.name;

  // Read as binary and offer download
  let binreader = new FileReader();

  // Reset indicators
  bar("readBar", 0);
  busy("decodeBusy", 0);
  bar("convertBar", 0);
  busy("zipBusy", 0);
  text("decodeMessage", "");
  text("convertMessage", "");
  text("readMessage", "");
  let download = document.getElementById("download");
  download.innerText = "";
  download.href = "";

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

function decode(contents, settings) {
  let c = new AudioContext();
  busy("decodeBusy", 1);
  c.decodeAudioData(contents,function(buffer) {
    myBuffer = buffer;
    let duration = settings.duration > 0 ?
        clamp(settings.duration, 0, buffer.duration) : buffer.duration;
    settings.duration = duration;
    let channels = settings.channels == "stereo" ? 2 : 1;
    let oc = new OfflineAudioContext(channels, settings.freq*duration, settings.freq);
    let source = oc.createBufferSource();
    let gainNode = oc.createGain();
    // gainNode.gain.setValueAtTime(settings.gain, c.currentTime);
    gainNode.gain.value = settings.gain;
    source.buffer = myBuffer;
    source.connect(gainNode);
    gainNode.connect(oc.destination);
    source.start(0, settings.offset, duration);
    oc.startRendering().then(function(renderedBuffer) {
      console.log("Rendering completed successfully");
      busy("decodeBusy", 2);
      convert(renderedBuffer, settings);
    });
  }, function(e) {
    busy("decodeBusy", 0);
    text("decodeMessage", "Decode Error: " + e);
  });
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
  return [hours, minutes, seconds].map(x => x.toString().padStart(2, "0")).join(":") +
      "." + msecs.toString().padStart(3, "0")
}

function splash(settings, labels) {
  //             0123456789012345678901234567890123456789
  let text = "";
  if (settings.title) {
    text = text + trunc(" Title: " + settings.title, 40);
  }
  if (settings.artist) {
    text = text + trunc(" Artist: " + settings.title, 40);
  }
  if (!settings.title && !settings.artist) {
    text = text + trunc(" File: " + settings.filename, 40);
  }
  let method = [settings.method, settings.channels,
    (settings.freq | 0)+"Hz", settings.media, settings.region].join(" ");
  settings.methodStr = method;
  text = text + trunc(" Method: " + method, 40);
  text = text + trunc(" Duration: " + timefmt(settings.duration), 40);
  text = text + "                                        ";
  text = text + " Generated by FujiConvert               ";
  text = text + "                                        ";
  if (settings.method == "pcm44" || settings.media != "emulator") {
    text = text + trunc(" Keys during playback:", 40);
  }
  if (settings.method == "pcm44") {
    text = text + trunc(" A - Toggle between Altirra/hardware", 40);
  }
  if (settings.media != "emulator") {
    text = text + trunc(" \x1E - Rewind", 40);
    text = text + trunc(" \x1F - Fast Forward", 40);
  }
  text = text + trunc(" Press any key to start playback", 40);
  text = trunc(text, labels.scrlen);

  console.log("text: " + text + " scrlen: " + labels.scrlen);

  //return Uint8Array.from(text, c => c.charCodeAt(0));
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
    megacart: 4 << 20,
    xegs: 4 << 20,
  };
  return max[media];
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
      length <= (4 << 20) ? 65 :
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
    settings.extension = ".pcm44";
    zip_and_offer(file, settings);
  };
  bar("convertBar", 0); // GUI: 0% progress
  let max = 255;
  let maxhalf = max/2;
  let i = 0; // source index
  let j = 0; // destination sector index
  let loop = function() {
    let k; // sector offset1
    let l; // sector offset2
    for (k = 0; k < 2; ++k) {
      for (l = k; l < 0x200; l+=2, ++i) {
        let ifix = i < data.length ? i : data.length-1;
        if (stereo) {
          file[j+l] = clamp(data[ifix], -1, 1) * maxhalf + maxhalf | 0; // MAC
          l+=2;
          file[j+l] = clamp(data2[ifix], -1, 1) * maxhalf + maxhalf | 0; // MAC
        } else {
          file[j+l] = clamp(data[ifix], -1, 1) * maxhalf + maxhalf | 0; // MAC
        }
      }
    }
    j += 0x200;
    bar("convertBar", i/data.length); // GUI: progress
    if (i < data.length) {
      setTimeout(loop, 0);
    } else {
      bar("convertBar", 1); // GUI: 100% progress
      setTimeout(done, 0);
    }
  };
  loop();
}
function convertSegments(renderedBuffer, settings) {
  let player_name = "player-" +
    settings.media + "-" +
    settings.method + "-" +
    settings.channels + "-" +
    settings.period;
  settings.player_name = player_name;
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
      let xex = concatenate(Uint8Array,
        player_u8, // player
        shead, stext, // patch screen info
        ...pieces, // sound segments
      );
      settings.extension = ".xex";
      zip_and_offer(xex, settings);
    } else if (cart) {
      console.log("scr: " + labels.scr +
        " relocated_start: " + labels.relocated_start);
      player_u8.set(stext, labels.scr - labels.relocated_start);
      let bin = concatenate(Uint8Array,
        player_u8, // player
        ...parts, // sound segments
      );
      let max = Math.min(carMax(settings.media), settings.maxbytes);
      bin = bin.slice(0, max); // XXX Should never trigger if limiter in loop() is working
      let type = getCarType(settings.media, bin.length);
      let car = makecar(type, bin);
      console.log("max: " + max +
        " type: " + type);
      settings.extension = ".car";
      zip_and_offer(car, settings);
    } else {
      text("convertMessage", "ERROR: Unsupported media: " + settings.media);
    }
  };
  bar("convertBar", 0); // GUI: 0% progress
  let max =
    settings.method == "pwm" ? Math.min(settings.period-4, 101) :
    settings.method == "pcm4" ? 15 :
    255;
  let maxhalf = max/2;
  console.log("max: " + max + " maxhalf: " + maxhalf);
  let maxbytes = Math.min(
    cart ? carMax(settings.media) : 1e999,
    settings.maxbytes,
    stereo ? data.length >> 1 : data.length);
  let maxsamples =
    (stereo ? maxbytes >> 1 : maxbytes) *
    (settings.method == "pcm4" ? 2 : 1);
  let i = 0; // source index
  let loop = function() {
    let k; // page offset
    let l; // destination index
    let part = new Uint8Array(buflen);
    if (settings.method == "pcm4") {
      for (k = 0; k < 0x100; ++k) {
        for (l = k; l < buflen; l+=0x100, ++i) {
          let ifix = i < data.length ? i : data.length-1;
          if (stereo) {
            hi = clamp(data[ifix], -1, 1) * maxhalf + maxhalf | 0; // MAC
            lo = clamp(data2[ifix], -1, 1) * maxhalf + maxhalf | 0; // MAC
            part[l] = hi << 4 | lo;
          } else {
            hi = clamp(data[ifix], -1, 1) * maxhalf + maxhalf | 0; // MAC
            ++ifix; ++i;
            lo = clamp(data[ifix], -1, 1) * maxhalf + maxhalf | 0; // MAC
            part[l] = hi << 4 | lo;
          }
        }
      }
    } else {
      for (k = 0; k < 0x100; ++k) {
        for (l = k; l < buflen; l+=0x100, ++i) {
          let ifix = i < data.length ? i : data.length-1;
          if (stereo) {
            part[l] = clamp(data[ifix], -1, 1) * maxhalf + maxhalf | 0; // MAC
            l+=0x100;
            part[l] = clamp(data2[ifix], -1, 1) * maxhalf + maxhalf | 0; // MAC
          } else {
            part[l] = clamp(data[ifix], -1, 1) * maxhalf + maxhalf | 0; // MAC
          }
        }
      }
    }
    parts.push(part); // part done
    bar("convertBar", i/maxsamples); // GUI: progress
    if (i < maxsamples) {
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
}

function init() {
  readLocalStorage();
  document.getElementById("reconvert").
    addEventListener("click", readSingleFile, false);
  document.getElementById("file-input").
    addEventListener("change", readSingleFile, false);
  document.getElementById("settings").
    addEventListener("change", getSettings, false);
  getSettings();
}

