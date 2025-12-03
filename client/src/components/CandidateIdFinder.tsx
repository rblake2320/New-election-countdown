import {useEffect, useState} from 'react';

type Suggestion = {
  id: string;            // our canonical id
  name: string;
  party?: string;
  state?: string;
  fec_id?: string;
  bioguide_id?: string;
  votesmart_id?: string;
};

const ID_PATTERNS = [
  {key:'fec_id', rx:/\b([HSMP]\d{7}|P\d{5}|C\d{8})\b/i},
  {key:'bioguide_id', rx:/\b[A-Z]{1}\d{6}\b/},
  {key:'votesmart_id', rx:/\b\d{4,7}\b/},
  {key:'wikidata_id', rx:/\bQ\d+\b/i},
];

export default function CandidateIdFinder({
  onSelect,
  placeholder = "Search name, paste FEC/BioGuide/VoteSmart/Wikidata/URL…",
  initial = [],
}: {onSelect:(s:Suggestion)=>void; placeholder?:string; initial?:Suggestion[]}) {
  const [q, setQ] = useState('');
  const [list, setList] = useState<Suggestion[]>(initial);

  // Try to extract an ID if user pasted one
  useEffect(()=>{
    const trimmed = q.trim();
    if (!trimmed) return;
    for (const p of ID_PATTERNS) {
      const m = trimmed.match(p.rx);
      if (m) {
        fetch(`/api/candidates/resolve-id?${p.key}=${encodeURIComponent(m[1])}`)
          .then(r=>r.json()).then((res:Suggestion[])=> setList(res));
        return;
      }
    }
    // name search fallback
    const ctrl = new AbortController();
    fetch(`/api/candidates/search?q=${encodeURIComponent(q)}`, {signal: ctrl.signal})
      .then(r=>r.json()).then((res:Suggestion[])=> setList(res));
    return ()=>ctrl.abort();
  }, [q]);

  return (
    <div>
      <input
        value={q}
        onChange={e=>setQ(e.target.value)}
        className="w-full rounded-md border px-3 py-2 text-sm"
        placeholder={placeholder}
      />
      {!!list.length && (
        <ul className="mt-2 max-h-64 overflow-auto rounded-lg border bg-background">
          {list.map(s => (
            <li key={s.id} className="flex items-center justify-between gap-2 border-b p-2 last:border-0">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{s.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {s.party || '—'} · {s.state || '—'} · {s.fec_id || s.bioguide_id || s.votesmart_id || s.id}
                </div>
              </div>
              <button className="text-sm underline" onClick={()=>onSelect(s)}>Select</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}