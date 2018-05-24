// vim: ts=2:sts=2:sw=2
function getRadio(radio) {
  for (var i = 0; i < radio.length; ++i) {
    if (radio[i].checked) {
      return radio[i].value;
    }
  }
  return "NONE";
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
    gain: form["gain"].value,
    offset: form["offset"].value,
    duration: form["duration"].value,
  };
  settings.period = period[settings.frequency];
  if (settings.channels == "stereo") {
    settings.period = clamp(settings.period, period["34kHz"], 999);
  }
  if (settings.method == "pwm") {
    settings.period = clamp(settings.period, period["15kHz"], 999);
  }
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
  var readBar = document.getElementById("readBar");
  var zipBar = document.getElementById("zipBar");
  var convertBar = document.getElementById("convertBar");
  var download = document.getElementById("download");
  readBar.style.width = "0%";
  zipBar.style.width = "0%";
  convertBar.style.width = "0%";
  download.innerText = "";
  download.href = "";
  var readMessage = document.getElementById("readMessage");
  readMessage.innerText = "";
  binreader.onload = function(e) {
    readBar.style.width = "100%";
    var contents = e.target.result;
    file_to_a8(contents, settings, function(xex) {
      var xexname = file.name.replace(/\.[^\/.]+$/, "") + ".xex";
      var zipname = file.name.replace(/\.[^\/.]+$/, "") + ".zip";
      var zip = new JSZip();
      zip.file(xexname, xex);
      zip.generateAsync({type: "blob", compression: "DEFLATE"},
        function updateCallback(metadata) {
          //console.log("zip: " + metadata.percent);
          zipBar.style.width = metadata.percent + '%';
      }).then(function (blob) {
        offerDownload(zipname, blob);
      });
    });
  };
  binreader.onprogress = function(event) {
    readBar.style.width = (event.loaded * 100 / event.total) + "%";
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
  var decodeWheel = document.getElementById("decodeWheel");
  var decodeMessage = document.getElementById("decodeMessage");
  decodeWheel.style.visibility = "visible";
  decodeMessage.innerText = "";
  c.decodeAudioData(contents,function(buffer) {
    decodeWheel.style.visibility = "hidden";
    myBuffer = buffer;
    var duration = settings.duration > 0 ?
        clamp(settings.duration, 0, buffer.duration) : buffer.duration;
    var oc = new OfflineAudioContext(1, 15600*duration, 15600);
    var source = oc.createBufferSource();
    var gainNode = oc.createGain();
    gainNode.gain.setValueAtTime(settings.gain, c.currentTime);
    source.buffer = myBuffer;
    source.connect(gainNode);
    gainNode.connect(oc.destination);
    source.start(0, settings.offset, duration);
    oc.startRendering().then(function(renderedBuffer) {
      console.log("Rendering completed successfully");
      convert_to_xex(renderedBuffer, onConverted);
    });
  }, function(e) {
    decodeWheel.style.visibility = "hidden";
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
  var bar = document.getElementById("convertBar");
  bar.style.width = "0%";
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
      part[j] = 0;
    }
    part.set(ini, j);
    parts.push(part);
    // update progress bar
    bar.style.width = (i*100/data.length) + "%";
    if (end < data.length) {
      i = i + buflen;
      setTimeout(loop, 0);
    } else {
      bar.style.width = "100%";
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

