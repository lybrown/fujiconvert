// vim: ts=2:sts=2:sw=2:et
// Based on Ron Nicholson's QDSS Windowed-Sinc ReSampling subroutine in Basic
// http://www.nicholson.com/rhn/dsp.html#3

"use strict";

function resample_buf(inbuf, inwidth, outrate) {
  let inbufs = []
  for (let i = 0; i < inbuf.numberOfChannels; ++i) {
    inbufs[i] = inbuf.getChannelData(i);
  }
  return resample_raw(inbufs, inwidth, inbuf.sampleRate, outrate);
}

function resample_raw(inbufs, inwidth, inrate, outrate) {
  //let worker = new Worker("resample.js");
  let outbufs = [];
  let inframecount = inbufs[0].length;
  let outframecount = inframecount * outrate / inrate | 0;
  for (let i = 0; i < inbufs.length; ++i) {
    outbufs[i] = new Float32Array(outframecount + 1);
    resample_mono(inbufs[i], inrate, inwidth, outbufs[i], outrate);
  }
  return outbufs;
}

this.onmessage = function (m, t) {
  let d = m.data;
  let [inbuf, outbuf] = t;
  resample_mono(inbuf, d.inrate, d.inwidth, outbuf, d.outrate);
  postMessage("result", t);
}

function find_cycle(inrate, outrate) {
  for (let i = 1; i < 1024; ++i) {
    if (inrate * i % outrate == 0) {
      return i;
    }
  }
  return 0;
}

function resample_mono(inbuf, inrate, inwidth, outbuf, outrate) {
  let fmax = Math.min(inrate, outrate) * 0.49; // Cutoff frequency
  let r_g = 2 * fmax / inrate; // Gain Correction factor
  let halfinwidth = inwidth/2;
  let inframecount = inbuf.length;
  let outframecount = inframecount * outrate / inrate | 0;
  let cycle = find_cycle(inrate, outrate);
  console.log({
    fmax:fmax,
    r_g:r_g,
    halfinwidth:halfinwidth,
    inframecount:inframecount,
    outframecount:outframecount,
    cycle:cycle,
  });
  // c = fractional index
  // x = inbuf index
  // i = convolution window index
  // y = outbuf index
  if (cycle) {
    // cycle
    let coeffs = [];
    for (let c = 0; c < cycle; ++c) {
      let x = c * inrate / outrate;
      for (let i = 0; i < inwidth; ++i) {
        let j = x + i - halfinwidth | 0;
        // calculate von Hann Window. Scale and calculate Sinc
        let r_w = 0.5 - 0.5 * Math.cos(2*Math.PI*(0.5 + (j - x)/inwidth));
        let r_a = Math.PI*(j - x)*r_g;
        let r_snc = Math.abs(r_a) < 1e-10 ? 1 : Math.sin(r_a)/r_a;
        coeffs[c*inwidth + i] = r_g * r_w * r_snc;
      }
    }
    for (let y = 0, numerator = 0; y < outframecount; ++y, numerator += inrate) {
      let x = numerator / outrate;
      // Compute factor table offset
      let cmod = y % cycle;
      let offset = cmod * inwidth;
      // Adjust the convolution window at the edges of the buffer
      // *-->------------------|
      // <*-->-----------------|
      // <-*-->----------------|
      // <--*-->---------------|
      // |<--*-->--------------|
      // |-------<--*-->-------|
      // |--------------<--*-->|
      // |---------------<--*-->
      // |----------------<--*->
      // |-----------------<--*>
      // |------------------<--*
      let start = x > halfinwidth ? 0 : halfinwidth - x | 0;
      let count = x < inframecount - halfinwidth ?
        inwidth : x - (inframecount - halfinwidth) | 0;
      let j = x + start - halfinwidth | 0;
      let r_y = 0;
      for (let i = start; i < count; ++i, ++j) {
        r_y += coeffs[offset + i] * inbuf[j];
      }
      outbuf[y] = r_y;
    }
  } else {
    // interpolate
    let coeffs = [];
    let tablesize = 1024;
    for (let c = 0; c <= tablesize; ++c) {
      let x = c / tablesize;
      for (let i = 0; i < inwidth; ++i) {
        let j = x + i - halfinwidth | 0;
        // calculate von Hann Window. Scale and calculate Sinc
        let r_w = 0.5 - 0.5 * Math.cos(2*Math.PI*(0.5 + (j - x)/inwidth));
        let r_a = Math.PI*(j - x)*r_g;
        let r_snc = Math.abs(r_a) < 1e-10 ? 1 : Math.sin(r_a)/r_a;
        coeffs[c*inwidth + i] = r_g * r_w * r_snc;
      }
    }
    let numerator = 0;
    for (; numerator / outrate < halfinwidth;) {
      numerator += inrate;
    }
    for (let y = 0; y < outframecount; ++y, numerator += inrate) {
      let x = numerator / outrate;
      let c = numerator % outrate / outrate * tablesize;
      // Compute coefficient table offsets
      let c0 = c | 0;
      let c1 = c0 + 1;
      let offset0 = c0 * inwidth;
      let offset1 = c1 * inwidth;
      // Compute linear interpolation coeffs;
      let f0 = c1 - c;
      let f1 = c - c0;
      let r_y = 0;
      let start = x > halfinwidth ? 0 : halfinwidth - x | 0;
      let count = x < inframecount - halfinwidth ?
        inwidth : x - (inframecount - halfinwidth) | 0;
      let j = x + start - halfinwidth | 0;
      for (let i = start; i < count; ++i, ++j) {
        r_y += f0 * coeffs[offset0 + i] + f1 * coeffs[offset1 + i] * inbuf[j];
      }
      outbuf[y] = r_y;
    }
  }
}
