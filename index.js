// vim: ts=2:sts=2:sw=2
function getRadio(radio) {
  for (var i = 0; i < radio.length; ++i) {
    if (radio[i].checked) {
      return radio[i].value;
    }
  }
  return "NONE";
}
function getSelected(select) {
  for (var i = 0; i < select.length; ++i) {
    if (select[i].selected) {
      return select[i].value;
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
function getSettings() {
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
  };

  // Constraints
  if (settings.media == "ide") {
    settings.method = "pcm4+4";
    settings.channels = "mono";
    settings.frequency = "15kHz";
  }
  settings.period = period[settings.frequency];
  if (settings.channels == "stereo") {
    settings.period = clamp(settings.period, period["34kHz"], 999);
  }
  if (settings.method == "pwm") {
    settings.period = clamp(settings.period, period["15kHz"], 999);
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

  // Read as binary and offer download
  var binreader = new FileReader();

  // Reset indicators
  bar("readBar", 0);
  busy("decodeBusy", 0);
  bar("convertBar", 0);
  busy("zipBusy", 0);
  var decodeMessage = document.getElementById("decodeMessage");
  decodeMessage.innerText = "";
  var readMessage = document.getElementById("readMessage");
  readMessage.innerText = "";
  var download = document.getElementById("download");
  download.innerText = "";
  download.href = "";

  binreader.onload = function(e) {
    bar("readBar", 1);
    var contents = e.target.result;
    file_to_a8(contents, settings, function(xex) {
      var xexname = file.name.replace(/\.[^\/.]+$/, "") + ".xex";
      var zipname = file.name.replace(/\.[^\/.]+$/, "") + ".zip";
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
    });
  };
  binreader.onprogress = function(event) {
    bar("readBar", event.loaded / event.total);
  };
  binreader.onerror = function(e) {
    readMessage.innerText = "ReadError";
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

function header(start, length) {
  var end = start + length - 1;
  return [start & 0xFF, start >> 8, end & 0xFF, end >> 8];
}

function file_to_a8(contents, settings, onConverted) {
  var c = new AudioContext();
  busy("decodeBusy", 1);
  c.decodeAudioData(contents,function(buffer) {
    myBuffer = buffer;
    var duration = settings.duration > 0 ?
        clamp(settings.duration, 0, buffer.duration) : buffer.duration;
    var oc = new OfflineAudioContext(1, settings.freq*duration, settings.freq);
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
      convert_to_xex(renderedBuffer, onConverted);
    });
  }, function(e) {
    busy("decodeBusy", 0);
    decodeMessage.innerText = "Decode Error: " + e;
  });
}

function convert_to_xex(renderedBuffer, onConverted) {
  var ini = [0xE2, 0x02, 0xE3, 0x02, 0x30, 0x03];
  var buf = 0x400;
  var bufend = 0xC000;
  var buflen = bufend - buf;
  var data = renderedBuffer.getChannelData(0);
  var parts = [];
  var i = 0;
  var done = function() {
    var player_b64 = "//8AA3YDeKkAjQ7SjQ7UjQDUqf+NDdCpD40S0KlQjQjSqQCNA9KpAI0F0qkAjQfSqf+NAtJgqa+NAdKpUI0I0qDArQAEjQrUjQDSjQnSGGlEjQDQ7j0D0OnuPgPMPgPQ4akAjT0DqQSNPgNgqQCNAdKNA9KNBdKNB9JMdAPiAuMCAAM=";
    var player_u8 = Uint8Array.from(atob(player_b64), c => c.charCodeAt(0))
    var quiet = new Uint8Array([0xE2, 0x02, 0xE3, 0x02, 0x66, 0x03]);
    var xex = concatenate(Uint8Array, player_u8, ...parts, quiet);
    onConverted(xex);
  };
  bar("convertBar", 0);
  var loop = function() {
    var end = clamp(i + buflen, 0, data.length);
    var len = end - i;
    var part = new Uint8Array(4 + buflen + 6);
    part.set(header(buf, buflen));
    for (j = 4, k = i; j < len + 4; ++j, ++k) {
      var audf = clamp(lerp(data[k], -1, 1, 0, 101), 0, 101);
      part[j] = audf;
    }
    for (;j < buflen + 4; ++j) {
      part[j] = 50;
    }
    part.set(ini, j);
    parts.push(part);
    // update progress bar
    bar("convertBar", i/data.length);
    if (end < data.length) {
      i = i + buflen;
      setTimeout(loop, 0);
    } else {
      bar("convertBar", 1);
      setTimeout(done, 0);
    }
  };
  loop();
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
  getSettings();
}

