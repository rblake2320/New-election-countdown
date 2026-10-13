import { parseOfficialSourcePacket } from './manual-id-fix/old-runtime.mjs';
if(typeof parseOfficialSourcePacket!=='function')throw new Error('Old loader export absent');
console.log(JSON.stringify({marker:'server-style entrypoint continuation',exitCode:process.exitCode??null}));
