import { parseOfficialSourcePacket,loadReviewedPacketBytes } from '../../server/official-result-adapters/packet';
if(typeof parseOfficialSourcePacket!=='function'||typeof loadReviewedPacketBytes!=='function')throw new Error('Canonical library export absent');
if(process.exitCode!==undefined)throw new Error('Library import mutated server exitCode');
console.log(JSON.stringify({outcome:'Worked',marker:'server-style entrypoint imports canonical loader without CLI execution',exitCodeUnchanged:true}));
