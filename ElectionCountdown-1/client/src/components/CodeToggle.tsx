import { useState } from "react";

export default function CodeToggle({
  json,
  curl,
  response,
  defaultOpen = false,
}: { json?: unknown; curl?: string; response?: unknown; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [tab, setTab] = useState<'resp'|'json'|'curl'>('resp');

  if (!json && !curl && !response) return null;

  return (
    <div className="mt-3">
      <button className="text-sm text-primary underline" onClick={() => setOpen(!open)}>
        {open ? 'Hide code' : 'Show code'}
      </button>
      {open && (
        <div className="mt-2 rounded-lg border bg-muted/30">
          <div className="flex gap-2 p-2 text-xs">
            {response && <button className={tab==='resp'?'font-medium':''} onClick={()=>setTab('resp')}>Response</button>}
            {json && <button className={tab==='json'?'font-medium':''} onClick={()=>setTab('json')}>JSON</button>}
            {curl && <button className={tab==='curl'?'font-medium':''} onClick={()=>setTab('curl')}>cURL</button>}
          </div>
          <pre className="max-h-72 overflow-auto p-3 text-xs">
            {tab==='resp' && (typeof response === 'string' ? response : JSON.stringify(response, null, 2))}
            {tab==='json' && JSON.stringify(json, null, 2)}
            {tab==='curl' && curl}
          </pre>
        </div>
      )}
    </div>
  );
}