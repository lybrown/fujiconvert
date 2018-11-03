// vim: ts=2:sts=2:sw=2:et
// Based on Ron Nicholson's QDSS Windowed-Sinc ReSampling subroutine in Basic
// http://www.nicholson.com/rhn/dsp.html#3

"use strict";

function resample_buf(inbuf, inwidth, outrate, context) {
  let channelcount = inbuf.numberOfChannels;
  let inframecount = inbuf.length;
  let inrate = inbuf.sampleRate;
  let outframecount = inframecount * outrate / inrate | 0;
  let outbuf = context.createBuffer(channelcount, outframecount, outrate);
  for (let i = 0; i < channelcount; ++i) {
    let inch = inbuf.getChannelData(i);
    let outch = outbuf.getChannelData(i);
    resample_mono(inch, inrate, inwidth, outch, outrate, () => 0);
  }
  return outbuf;
}

async function resample_raw(inbufs, inwidth, inrate, outbufs, outrate) {
  let worker = new Worker("resample.js");
  for (let i = 0; i < inbufs.length; ++i) {
    let msg = {inrate:inrate, inwidth:inwidth, outrate:outrate};
    worker.postMessage(msg, [inbuf[i], outbuf[i]]);
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

function resample_mono(inbuf, inrate, inwidth, outbuf, outrate, onprogress) {
  let fmax = Math.min(inrate, outrate) * 0.45; // Cutoff frequency
  let r_g = 2 * fmax / inrate; // Gain Correction factor
  let halfinwidth = inwidth >> 1; // Half of convolution window width
  let inframecount = inbuf.length;
  let outframecount = inframecount * outrate / inrate | 0;
  let cycle = find_cycle(inrate, outrate);
  console.log({
    fmax:fmax,
    r_g:r_g,
    inwidth:inwidth,
    halfinwidth:halfinwidth,
    inframecount:inframecount,
    outframecount:outframecount,
    cycle:cycle,
  });
  if (inwidth < 2) {
    console.log("Using nearest neighbor since inwidth=" + inwidth);
    for (let oi = 0; oi < outframecount; ++oi) {
      let ii = oi * inrate / outrate | 0;
      outbuf[oi] = inbuf[ii];
    }
    return;
  }
  // ii = inbuf index
  // ci = convolution window cardinal index (0, 1, 2 .. N)
  // wi = convolution window centered index (-width/2 + frac .. width/2 + frac)
  // ai = convolution window absolute index (ii - width/2 .. ii + width/2)
  // ti = coefficient table index
  // oi = outbuf index
  if (cycle) {
    // If there is a cycle, then we can compute an exact coefficient table
    let coeffs = new Float32Array(cycle * inwidth);
    for (let ti = 0; ti < cycle; ++ti) {
      let ii = ti * inrate / outrate;
      let wi = -halfinwidth - ti * inrate % outrate / outrate;
      for (let ci = 0; ci < inwidth; ++ci, ++wi) {
        // calculate von Hann Window. Scale and calculate Sinc
        let r_w = 0.5 - 0.5 * Math.cos(2*Math.PI*(0.5 + wi/inwidth));
        let r_a = Math.PI*wi*r_g;
        let r_snc = r_a ? Math.sin(r_a)/r_a : 1;
        coeffs[ti*inwidth + ci] = r_g * r_w * r_snc;
      }
    }
    let section = outframecount / 50;
    let numerator = 0;
    for (let oi = 0; oi < outframecount; ++oi, numerator += inrate) {
      if (oi > section) {
        onprogress(oi / outframecount);
        section += outframecount / 50;
      }
      let ii = numerator / outrate;
      // Compute factor table offset
      let ti = oi % cycle;
      let offset = ti * inwidth;
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
      let instart = Math.max(ii - halfinwidth | 0, 0);
      let inend = Math.min(ii + halfinwidth | 0, inframecount);
      let ci = instart - (ii - halfinwidth | 0);
      let r_y = 0;
      for (let ai = instart; ai < inend; ++ai, ++ci) {
        r_y += coeffs[offset + ci] * inbuf[ai];
      }
      outbuf[oi] = r_y;
    }
  } else {
    // No cycle, so compute 1K window offsets (overkill?) and interpolate
    let tablesize = 1024;
    let coeffs = new Float32Array((tablesize + 1) * inwidth);
    for (let ti = 0; ti <= tablesize; ++ti) {
      let ii = ti / tablesize;
      let wi = -halfinwidth - ii;
      for (let ci = 0; ci < inwidth; ++ci, ++wi) {
        // calculate von Hann Window. Scale and calculate Sinc
        let r_w = 0.5 - 0.5 * Math.cos(2*Math.PI*(0.5 + wi/inwidth));
        let r_a = Math.PI*wi*r_g;
        let r_snc = r_a ? Math.sin(r_a)/r_a : 1;
        coeffs[ti*inwidth + ci] = r_g * r_w * r_snc;
      }
    }
    let section = outframecount / 50;
    let numerator = 0;
    for (let oi = 0; oi < outframecount; ++oi, numerator += inrate) {
      if (oi > section) {
        onprogress(oi / outframecount);
        section += outframecount / 50;
      }
      let ii = numerator / outrate;
      let frac = numerator % outrate / outrate * tablesize;
      // Compute coefficient table offsets
      let ti0 = frac | 0;
      let ti1 = ti0 + 1;
      let offset0 = ti0 * inwidth;
      let offset1 = ti1 * inwidth;
      // Compute linear interpolation coeffs;
      let f0 = ti1 - frac;
      let f1 = frac - ti0;
      let instart = Math.max(ii - halfinwidth | 0, 0);
      let inend = Math.min(ii + halfinwidth | 0, inframecount);
      let ci = instart - (ii - halfinwidth | 0);
      let r_y = 0;
      for (let ai = instart; ai < inend; ++ai, ++ci) {
        r_y += (f0 * coeffs[offset0 + ci] + f1 * coeffs[offset1 + ci]) * inbuf[ai];
      }
      outbuf[oi] = r_y;
    }
  }
}
