const KEY = "et:anon_id";
function uuid() {
  // Prefer Web Crypto; fallback to simple method
  // @ts-ignore
  return (crypto?.randomUUID?.() ?? (Math.random().toString(16).slice(2) + Date.now())) as string;
}

let anonId = localStorage.getItem(KEY);
if (!anonId) { anonId = uuid(); localStorage.setItem(KEY, anonId); }

type Session = {
  anon_id: string; user_id?: number;
  utm_source?: string; utm_medium?: string; utm_campaign?: string; utm_term?: string; utm_content?: string;
};

const session: Session = { anon_id: anonId };
(() => {
  const url = new URL(location.href);
  session.utm_source   = url.searchParams.get("utm_source")   ?? undefined;
  session.utm_medium   = url.searchParams.get("utm_medium")   ?? undefined;
  session.utm_campaign = url.searchParams.get("utm_campaign") ?? undefined;
  session.utm_term     = url.searchParams.get("utm_term")     ?? undefined;
  session.utm_content  = url.searchParams.get("utm_content")  ?? undefined;
})();

type Event = {
  name: string; ts?: string; page?: string;
  election_id?: number; candidate_id?: number; value_num?: number;
  payload?: Record<string, unknown>;
};

const queue: Event[] = [];
let scheduled = false;

function flush() {
  if (!queue.length) { scheduled = false; return; }
  const events = [...queue];
  queue.length = 0;
  scheduled = false;
  
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session, events })
  }).catch(() => {}); // silent fail
}

function track(name: string, props?: Omit<Event, "name">) {
  queue.push({ name, ts: new Date().toISOString(), page: location.pathname, ...props });
  if (!scheduled) {
    scheduled = true;
    setTimeout(flush, 100);
  }
}

// Auto-track page views
track("page_view");
window.addEventListener("popstate", () => track("page_view"));

// Expose for use
export const analytics = { track, setUser: (id: number) => { session.user_id = id; } };