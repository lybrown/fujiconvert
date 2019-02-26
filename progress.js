// vim: ts=2:sts=2:sw=2:et
//
// USAGE:
//
// let p = new Progress(100, x => console.log("Ticks received: " + x));
// task(p.sub(0, 2));
// task(p.sub(1, 2));
//
// function task(p) {
//   let icount = 17;
//   p.init(icount);
//   for (let i = 0; i < icount; ++i) {
//     ...
//     p.report(i+1);
//   }
// }
//
// NOTE: Incurs closure call for report() so avoid putting in tight inner loop
//
// Design goals:
// - Caller X declares it wants X ticks to be sent
// - Callee Y sends ticks individually or in packets
// - Caller Y can further call Z and ask it to send some of the ticks

function Progress(ticks, ontick) {
  this.ticks = ticks;
  this.sent = 0;
  this.ontick = ontick;
  this.allotted = 0;
  this.sub = function(frac) {
    let curr = this.allotted * this.ticks | 0;
    this.allotted += frac;
    if (this.allotted > 0.999) {
      this.allotted = 1;
    }
    let next = this.allotted * this.ticks | 0;
    let subticks = next - curr;
    return new Progress(subticks, this.ontick);
  };
  this.init = function(icount) {
    this.nexti = icount / this.ticks;
    this.icount = icount;
  };
  this.report = function(i) {
    if (i < this.nexti) return;
    let newsent = i * this.ticks / this.icount | 0;
    this.ontick(newsent - this.sent);
    this.sent = newsent;
    this.nexti = this.icount * (this.sent + 1) / this.ticks;
  };
  this.done = () => this.ontick(this.ticks - this.sent);
}

async function delay(msec) {
  return await new Promise(function(resolve, reject) {
    setTimeout(x => resolve(), msec);
  });
}
async function testprogress() {
  let bar = document.getElementById("progressbar");
  let ticks = 0;
  let p = new Progress(100, function(newticks) {
    ticks += newticks;
    bar.innerText = '#'.repeat(ticks) + '-'.repeat(100 - ticks);
    console.log("newticks=" + newticks + " ticks=" + ticks);
  });
  p.ontick(0);
  let icount = 3;
  let psub = [];
  for (let j = 0; j < 3; ++j) {
    psub[j] = p.sub(1/3);
    psub[j].init(icount);
  }
  for (let i = 0; i < icount; ++i) {
    console.log("REPORT i=" + i);
    for (let j = 0; j < 3; ++j) {
      await delay(300);
      psub[j].report(i+1);
    }
  };
  console.log("DONE!");
  await delay(1000);
  console.log("TEST2");
  ticks = 0;
  p.init(10);
  p.ontick(0);
  p.report(5);
  await delay(1000);
  p.done();
  console.log("DONE2!");
}
