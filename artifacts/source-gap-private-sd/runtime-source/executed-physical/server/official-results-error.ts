// Only these operator-facing messages are safe to print without DB credentials.
export class OfficialResultsError extends Error {
  readonly code = 'C6_REFUSED';
  constructor(message: string) { super(message); this.name = 'OfficialResultsError'; }
}
