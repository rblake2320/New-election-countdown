import { Router } from "express";
import type { Request, Response } from "express";
import { storageFactory } from "../storage-factory";
import { requireHealthyDatabase } from "../middleware/health-guard";

export const trackRouter = Router();

type TrackBody = {
  session: {
    anon_id: string;
    user_id?: number | null;
    utm_source?: string; utm_medium?: string; utm_campaign?: string; utm_term?: string; utm_content?: string;
  };
  events: Array<{
    name: string; ts?: string; page?: string;
    election_id?: number; candidate_id?: number; value_num?: number;
    payload?: Record<string, unknown>;
  }>;
};

trackRouter.post("/", async (req: Request, res: Response) => {
  try {
    const body = req.body as TrackBody;
    if (!body?.session?.anon_id || !Array.isArray(body.events)) return res.status(400).json({ ok: false });

    // Use storage interface for analytics logging which handles health checks internally
    await storageFactory.logInteraction({
      type: 'analytics_track',
      session: body.session,
      events: body.events,
      meta: {
        userAgent: req.headers["user-agent"],
        referrer: req.headers.referer,
        ip: req.ip
      }
    });

    return res.status(202).json({ 
      ok: true,
      events_received: body.events.length,
      message: 'Analytics events processed'
    });
  } catch (error) {
    // Log error message only, no stack traces for expected database issues
    console.log('Analytics tracking error:', error instanceof Error ? error.message : String(error));
    
    // Return 202 for any error to maintain analytics fault tolerance
    return res.status(202).json({ 
      ok: true, 
      message: 'Analytics processing deferred',
      events_received: req.body?.events?.length || 0
    });
  }
});