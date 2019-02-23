// vim: ts=2:sts=2:sw=2:et
"use strict";

importScripts("./progress.js");

// Exchange messages with main thread
this.onmessage = function (msg) {
  let d = msg.data;
  let progress = new Progress(d.progress.ticks, function(newticks) {
    postMessage({"newticks": newticks});
  });
  let inbuf = new Float32Array(d.inbuf);
  let inframecount = inbuf.length;
  let outframecount = inframecount * d.outrate / d.inrate | 0;
  let outbuf = new Float32Array(outframecount);
  resample_mono(inbuf, d.inrate, d.inwidth, outbuf, d.outrate, progress);
  postMessage({"result": 1, outbuf: outbuf.buffer}, [outbuf.buffer]);
}

function find_cycle(inrate, outrate) {
  for (let i = 1; i < 1024; ++i) {
    if (inrate * i % outrate == 0) {
      return i;
    }
  }
  return 0;
}

// Based on Ron Nicholson's QDSS Windowed-Sinc ReSampling subroutine in Basic
// http://www.nicholson.com/rhn/dsp.html#3
function resample_mono(inbuf, inrate, inwidth, outbuf, outrate, progress) {
  let fmax = Math.min(inrate, outrate) * 0.45; // Cutoff frequency
  let r_g = 2 * fmax / inrate; // Gain Correction factor
  let halfinwidth = inwidth >> 1; // Half of convolution window width
  let inframecount = inbuf.length;
  let outframecount = inframecount * outrate / inrate | 0;
  let cycle = find_cycle(inrate, outrate);
  console.log({
    fmax,
    r_g,
    inwidth,
    halfinwidth,
    inframecount,
    outframecount,
    cycle,
  });
  if (inwidth < 2) {
    console.log("Using nearest neighbor since inwidth=" + inwidth);
    for (let oi = 0; oi < outframecount; ++oi) {
      //let ii = oi * inrate / outrate | 0;
      let ii = Math.round(oi * inrate / outrate);
      outbuf[oi] = inbuf[ii];
    }
    progress.done();
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
    progress.init(cycle + outframecount);
    for (let ti = 0; ti < cycle; ++ti) {
      progress.report(ti);
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
      progress.report(cycle + oi);
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
    let inwidth1 = inwidth + 1;
    let coeffs = new Float32Array((tablesize + 1) * (inwidth1));
    progress.init(tablesize + outframecount);
    for (let ti = 0; ti <= tablesize; ++ti) {
      progress.report(ti);
      let ii = ti / tablesize;
      let wi = -halfinwidth - ii;
      for (let ci = 0; ci < inwidth1; ++ci, ++wi) {
        // calculate von Hann Window. Scale and calculate Sinc
        let r_w = 0.5 - 0.5 * Math.cos(2*Math.PI*(0.5 + wi/inwidth));
        let r_a = Math.PI*wi*r_g;
        let r_snc = r_a ? Math.sin(r_a)/r_a : 1;
        coeffs[ti*inwidth1 + ci] = r_g * r_w * r_snc;
      }
    }
    let section = outframecount / 50;
    let numerator = 0;
    for (let oi = 0; oi < outframecount; ++oi, numerator += inrate) {
      progress.report(tablesize + oi);
      let ii = numerator / outrate;
      let frac = numerator % outrate / outrate * tablesize;
      // Compute coefficient table offsets
      let ti0 = frac | 0;
      let ti1 = ti0 + 1;
      let offset0 = ti0 * inwidth1;
      let offset1 = ti1 * inwidth1;
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
  progress.done();
}
