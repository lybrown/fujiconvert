// vim: ts=2:sts=2:sw=2
function getRadio(radio) {
  for (var i = 0; i < radio.length; ++i) {
    if (radio[i].checked) {
      return radio[i].value;
    }
  }
  return "NONE";
}
function setRadio(radio, value) {
  for (var i = 0; i < radio.length; ++i) {
    if (radio[i].value == value) {
      radio[i].checked = true;
    }
  }
}
function getSelected(select) {
  for (var i = 0; i < select.length; ++i) {
    if (select[i].selected) {
      return select[i].value;
    }
  }
  return "NONE";
}
function setSelected(select, value) {
  for (var i = 0; i < select.length; ++i) {
    if (select[i].value == value) {
      return select[i].selected = true;
    }
  }
  return "NONE";
}
function bar(name, fraction) {
  var bar = document.getElementById(name);
  bar.style.width = (fraction * 100) + "%";
}
function busy(name, state) {
  var busy = document.getElementById(name);
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
  var message = document.getElementById(name);
  message.innerText = msg;
}
function readLocalStorage() {
  if (!localStorage.getItem("method")) {
    return;
  }
  var form = document.getElementById("settings");
  var radios = ["method", "channels", "region", "frequency", "media"];
  var selects = ["maxsize"];
  var texts = ["gain", "offset", "duration", "title", "artist"];
  for (var i = 0; i < radios.length; ++i) {
    setRadio(form[radios[i]], localStorage.getItem(radios[i]));
  }
  for (var i = 0; i < selects.length; ++i) {
    setSelected(form[selects[i]], localStorage.getItem(selects[i]));
  }
  for (var i = 0; i < texts.length; ++i) {
    form[texts[i]].value = localStorage.getItem(texts[i]);
  }
}
function writeLocalStorage() {
  var form = document.getElementById("settings");
  var radios = ["method", "channels", "region", "frequency", "media"];
  var selects = ["maxsize"];
  var texts = ["gain", "offset", "duration", "title", "artist"];
  for (var i = 0; i < radios.length; ++i) {
    localStorage.setItem(radios[i], getRadio(form[radios[i]]))
  }
  for (var i = 0; i < selects.length; ++i) {
    localStorage.setItem(selects[i], getRadio(form[selects[i]]))
  }
  for (var i = 0; i < texts.length; ++i) {
    localStorage.setItem(texts[i], form[texts[i]].value);
  }
}
function getSettings() {
  writeLocalStorage();
  var form = document.getElementById("settings");
  var settingsText = document.getElementById("settingsText");
  var cycles = {
    ntsc: 262*105*60,
    pal: 312*105*50,
  };
  var period = {
    "58kHz": 28,
    "48kHz": 34,
    "44kHz": 37,
    "34kHz": 48,
    "31kHz": 52,
    "22kHz": 74,
    "15kHz": 105,
    "8kHz": 210,
  };
  var settings = {
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
  var pretty = JSON.stringify(settings, null, 4);
  settingsText.innerText = pretty.replace(/[{}]\n?/gm, "");

  return settings;
}
function readSingleFile(e) {
  var file = e.target.files[0];
  if (!file) {
    return;
  }
  var settings = getSettings();
  settings.filename = file.name;

  // Read as binary and offer download
  var binreader = new FileReader();

  // Reset indicators
  bar("readBar", 0);
  busy("decodeBusy", 0);
  bar("convertBar", 0);
  busy("zipBusy", 0);
  text("decodeMessage", "");
  text("convertMessage", "");
  text("readMessage", "");
  var download = document.getElementById("download");
  download.innerText = "";
  download.href = "";

  binreader.onload = function(e) {
    bar("readBar", 1);
    var contents = e.target.result;
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
  var c = new AudioContext();
  busy("decodeBusy", 1);
  c.decodeAudioData(contents,function(buffer) {
    myBuffer = buffer;
    var duration = settings.duration > 0 ?
        clamp(settings.duration, 0, buffer.duration) : buffer.duration;
    settings.duration = duration;
    var channels = settings.channels == "stereo" ? 2 : 1;
    var oc = new OfflineAudioContext(channels, settings.freq*duration, settings.freq);
    var source = oc.createBufferSource();
    var gainNode = oc.createGain();
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
  var ch = c.charCodeAt(0);
  return ch < 32 ? ch + 64 : ch < 96 ? ch - 32 : ch;
}
function trunc(str, len) {
  return str.slice(0, len).padEnd(len);
}
function timefmt(seconds) {
  var s = seconds*1000 | 0;
  var hours = s / 3600000 | 0;
  var minutes = s % 360000 / 60000 | 0;
  var seconds = s % 60000 / 1000 | 0;
  var msecs = s % 1000;
  return [hours, minutes, seconds].map(x => x.toString().padStart(2, "0")).join(":") +
      "." + msecs.toString().padStart(3, "0")
}

function splash(settings, labels) {
  //             0123456789012345678901234567890123456789
  var text = "";
  if (settings.title) {
    text = text + trunc(" Title: " + settings.title, 40);
  }
  if (settings.artist) {
    text = text + trunc(" Artist: " + settings.title, 40);
  }
  if (!settings.title && !settings.artist) {
    text = text + trunc(" File: " + settings.filename, 40);
  }
  var method = [settings.method, settings.channels, settings.freq, settings.media].join(" ");
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
  var end = start + length - 1;
  return [start & 0xFF, start >> 8, end & 0xFF, end >> 8];
}
function ini(addr) {
    return new Uint8Array([0xE2, 0x02, 0xE3, 0x02, addr & 0xFF, addr >> 8]);
}
function run(addr) {
    return new Uint8Array([0xE0, 0x02, 0xE1, 0x02, addr & 0xFF, addr >> 8]);
}

function convert(renderedBuffer, settings) {
  var player_name = "player-" +
    settings.media + "-" +
    settings.method + "-" +
    settings.channels + "-" +
    settings.period;
  settings.player_name = player_name;
  console.log("player_name: " + player_name);
  if (!players[player_name]) {
    text("convertMessage", "ERROR: Unsupported player: " + player_name);
  }
  var player_bin = players[player_name].player;
  var labels = players[player_name].labels;
  var stereo = settings.channels == "stereo";
  if (labels.cartstart) {
  } else if (settings.media == "ram") {
  } else if (settings.media == "emulator") {
    var contini = ini(labels.continue);
    var buf = labels.window;
    var buflen = 0x100 * labels.pages;
    console.log("buflen: " + buflen + " buf: " + buf);
    var data = renderedBuffer.getChannelData(0);
    var data2 = stereo ? renderedBuffer.getChannelData(1) : undefined;
    var parts = [];
    var done = function() {
      var player_b64 = players[player_name].player;
      var player_u8 = Uint8Array.from(atob(player_b64), c => c.charCodeAt(0))
      var shead = header(labels.scr, labels.scrlen);
      var stext = splash(settings, labels);
      var quiet = labels.quiet;
      var quietini = ini(quiet);
      console.log("main: " + labels.main + " continue: " + labels.continue);
      var xex = concatenate(Uint8Array,
        player_u8, // player
        shead, stext, // patch screen info
        ini(labels.main), // splash + setup
        ...parts, // sound segments
        quietini // quiet, shutdown
      );
      zip_and_offer(xex, settings);
    };
    bar("convertBar", 0); // GUI: 0% progress
    var max = settings.method == "pwm" ?
      (settings.period == 52 ? 48 : 101) :
      settings.method == "pcm4" ? 15 : 255;
    var maxhalf = max/2;
    var i = 0; // source index
    var loop = function() {
      var k; // page offset
      var l; // destination index
      var part = new Uint8Array(4 + buflen + 6); // data segment, ini segment
      part.set(header(buf, buflen));
      if (settings.method == "pcm4") {
        for (k = 0; k < 0x100; ++k) {
          for (l = k + 4; l < buflen + 4; l+=0x100, ++i) {
            var ifix = i < data.length ? i : data.length-1;
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
          for (l = k + 4; l < buflen + 4; l+=0x100, ++i) {
            var ifix = i < data.length ? i : data.length-1;
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
      part.set(contini, l-0xFF); // ini
      parts.push(part); // part done
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
}

function zip_and_offer(xex, settings) {
  var xexname = settings.filename.replace(/\.[^\/.]+$/, "") + ".xex";
  var zipname = settings.filename.replace(/\.[^\/.]+$/, "") + ".zip";
  var zip = new JSZip();
  zip.file(xexname, xex);
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
  var element = document.getElementById("download");
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
  document.getElementById("file-input").
    addEventListener("change", readSingleFile, false);
  document.getElementById("settings").
    addEventListener("change", getSettings, false);
  readLocalStorage();
  getSettings();
}

