/* Minimal codec round-trip. This is NOT a browser, memory or segmentation test. */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const base=path.resolve(__dirname,'../../ecm-dist/js/ecm');
const configs=JSON.parse(fs.readFileSync(path.join(base,'configs.json'),'utf8'));
async function load(app) {
  const factory=require(path.join(base,app+'.js'));
  return factory({noInitialRun:true,wasmBinary:fs.readFileSync(path.join(base,app+'.wasm')),
    print:console.log,printErr:console.error});
}
function run(mod,args) {
  try {
    const code=mod.callMain(args);
    if (typeof code==='number' && code!==0) throw Error('Exit code '+code);
  } catch(e) { if (!(e && e.name==='ExitStatus' && e.status===0)) throw e; }
}
(async()=>{
  const width=128,height=128;
  const source=new Uint8Array(width*height*3/2).fill(128);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)source[y*width+x]=16+((x+y)%220);
  const enc=await load('EncoderApp');
  enc.FS.writeFile('/input.yuv',source);
  run(enc,['-c',configs.ai,'-i','/input.yuv','-b','/output.bin','-o','/dev/null',
    '-wdt',String(width),'-hgt',String(height),'-fr','1','-f','1','-q','37',
    '--InputBitDepth=8','--InputChromaFormat=420']);
  const stream=enc.FS.readFile('/output.bin').slice();
  if(!stream.length)throw Error('Empty encoded stream');
  const dec=await load('DecoderApp');
  dec.FS.writeFile('/input.bin',stream);
  // Set decoder output to 8 bit for a known YUV420 byte count.
  run(dec,['-b','/input.bin','-o','/decoded.yuv','--OutputBitDepth=8']);
  const result=dec.FS.readFile('/decoded.yuv');
  if(result.length!==source.length)throw Error('Decoded size mismatch: '+result.length+' vs '+source.length);
  const report={test:'one-frame AI round-trip, 128x128 YUV420 8-bit',
    encodedBytes:stream.length,decodedBytes:result.length,
    decodedSHA256:crypto.createHash('sha256').update(result).digest('hex'),
    limitations:['RA/LD untested','multi-segment concatenation untested',
      'browser Worker untested','resource limits unvalidated','no native parity test']};
  fs.writeFileSync(path.join(base,'smoke-test.json'),JSON.stringify(report,null,2));
  const info=JSON.parse(fs.readFileSync(path.join(base,'build-info.json'),'utf8'));
  info.status='compiled; one-frame Node AI round-trip passed; experimental';
  fs.writeFileSync(path.join(base,'build-info.json'),JSON.stringify(info,null,2));
  console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
