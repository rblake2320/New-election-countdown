import express, { type Express } from 'express';

/** Shared production parser registration, also exercised by real HTTP tests. */
export function registerRequestBodyParsers(app: Express): void {
  const parsers = express.Router();
  // Leave the stream untouched for the evidence route's authenticated raw parser.
  // Express performs the same case/trailing-slash/query matching as that route.
  // next('router') skips only this parser router, not later guards or routes.
  parsers.post('/api/admin/results-evidence', (_req, _res, next) => next('router'));
  // rawBody is required for provider webhook signature verification.
  parsers.use(express.json({ verify: (req: any, _res, buf) => { req.rawBody = buf; } }));
  parsers.use(express.urlencoded({ extended: false }));
  app.use(parsers);
}
