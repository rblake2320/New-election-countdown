import ts from 'typescript';
import path from 'node:path';

const root = process.cwd();
const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config ?? {}, ts.sys, root,
  { incremental: false, noEmit: true });
// This bounded mechanism gate is additional to the full-project release gate.
// It exercises the actual schema inference, omitted/required/nullable fields and iteration.
const program = ts.createProgram([path.join(root, 'tests/types/compiler-contract.ts')], parsed.options);
const diagnostics = [config.error, ...parsed.errors, ...ts.getPreEmitDiagnostics(program)]
  .filter(Boolean).filter(d=>d.category===ts.DiagnosticCategory.Error);
if (diagnostics.length) console.error(ts.formatDiagnostics(diagnostics, {
  getCanonicalFileName:f=>f, getCurrentDirectory:()=>root, getNewLine:()=> '\n',
}));
console.log(JSON.stringify({scope:'actual schema compiler contracts, not full-project readiness', errors:diagnostics.length,
  strictNullChecks:parsed.options.strictNullChecks, target:ts.ScriptTarget[parsed.options.target],
  useDefineForClassFields:parsed.options.useDefineForClassFields}));
process.exitCode = diagnostics.length ? 1 : 0;
