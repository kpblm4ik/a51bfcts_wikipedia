/* Generated into js/ecm ONLY after successful compilation. One job per Worker. */
'use strict';
const configs = {"ai": "/cfg/encoder_intra_ecm.cfg", "ra": "/cfg/encoder_randomaccess_ecm.cfg", "ld": "/cfg/encoder_lowdelay_ecm.cfg"};
let started = false;
self.onmessage = async ({data: m}) => {
  if (started) return postMessage({type:'error', message:'Worker already used; create a new instance.'});
  started = true;
  try {
    if (!m || !['encode','decode'].includes(m.cmd)) throw new Error('Expected encode or decode');
    const encoding = m.cmd === 'encode';
    const base = new URL('./', self.location.href);
    importScripts(new URL(encoding ? 'EncoderApp.js' : 'DecoderApp.js', base).href);
    const factory = encoding ? self.createECMEncoder : self.createECMDecoder;
    const total = encoding && Array.isArray(m.frames) ? m.frames.length : 0;
    let done = 0;
    const emit = line => {
      const text = String(line);
      postMessage({type:'log', message:text});
      if (encoding && /^\s*POC\s+\d+\b/.test(text)) {
        done = Math.min(total, done + 1);
        postMessage({type:'progress', done, total});
      }
    };
    const mod = await factory({noInitialRun:true,
      locateFile:p => new URL(p, base).href, print:emit, printErr:emit});
    let args;
    if (encoding) {
      for (const key of ['width','height','fps','qp'])
        if (!Number.isSafeInteger(m[key])) throw new Error('Invalid parameter: '+key);
      if (m.width < 2 || m.height < 2 || m.width % 2 || m.height % 2 || m.fps < 1 ||
          m.qp < 0 || m.qp > 63 || !total || !configs[m.config]) throw new Error('Invalid encode parameters');
      const size = m.width*m.height*3/2;
      if (!Number.isSafeInteger(size)) throw new Error('Invalid frame size');
      for (const frame of m.frames)
        if (!(frame instanceof ArrayBuffer) || frame.byteLength !== size) throw new Error('I420 frame size mismatch');
      const stream = mod.FS.open('/input.yuv', 'w');
      try {
        let offset=0;
        for (const frame of m.frames) {
          const bytes=new Uint8Array(frame);
          mod.FS.write(stream, bytes, 0, bytes.length, offset);
          offset+=bytes.length;
        }
      } finally { mod.FS.close(stream); }
      m.frames.length=0;
      args=['-c',configs[m.config],'-i','/input.yuv','-b','/output.bin','-o','/dev/null',
        '-wdt',String(m.width),'-hgt',String(m.height),'-fr',String(m.fps),'-f',String(total),
        '-q',String(m.qp),'--InputBitDepth=8','--InputChromaFormat=420'];
      // threads is not used: this initial build is single-threaded inside each Worker.
      postMessage({type:'progress',done:0,total});
    } else {
      if (!(m.data instanceof ArrayBuffer) || !m.data.byteLength) throw new Error('Missing bitstream ArrayBuffer');
      mod.FS.writeFile('/input.bin',new Uint8Array(m.data));
      args=['-b','/input.bin','-o','/output.yuv'];
    }
    try {
      const code=mod.callMain(args);
      if (typeof code==='number' && code!==0) throw new Error('ECM exit code '+code);
    } catch (e) {
      if (!(e && e.name==='ExitStatus' && e.status===0)) throw e;
    }
    const bytes=mod.FS.readFile(encoding?'/output.bin':'/output.yuv').slice();
    if (!bytes.byteLength) throw new Error('Empty output');
    if (encoding) postMessage({type:'progress',done:total,total});
    postMessage({type:'done',data:bytes.buffer},[bytes.buffer]);
  } catch(e) { postMessage({type:'error',message:String(e.message||e)}); }
};
