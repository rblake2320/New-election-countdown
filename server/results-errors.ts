/** Shared server error identity; no report/health import cycle. */
export class ResultReportError extends Error {
 constructor(public readonly status:number,public readonly publicCode:string,message:string,public readonly details?:unknown){super(message);}
}
