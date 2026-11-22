/** Syntax and relative-import scan only; NOT a substitute for full tsc or runtime tests. */
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const root=path.resolve(import.meta.dirname,'..');
let count=0,errors=[];
function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){
 const name=path.join(dir,item.name);
 if(item.isDirectory()){if(!['node_modules','.expo','.next','.git'].includes(item.name))walk(name);}else if(/\.(ts|tsx)$/.test(item.name))check(name);
}}
function check(filename){
 const source=fs.readFileSync(filename,'utf8');const file=ts.createSourceFile(filename,source,ts.ScriptTarget.Latest,true,filename.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 count++;
 for(const diagnostic of file.parseDiagnostics){const point=file.getLineAndCharacterOfPosition(diagnostic.start??0);errors.push(`${path.relative(root,filename)}:${point.line+1} ${ts.flattenDiagnosticMessageText(diagnostic.messageText,' ')}`);}
 for(const m of source.matchAll(/(?:from\s*|import\s*\(|require\s*\()\s*['"](\.{1,2}\/[^'"\r\n]+)['"]/g)){
  const destination=path.resolve(path.dirname(filename),m[1]);
  if(![destination,destination+'.ts',destination+'.tsx',destination+'.js',destination+'.mjs',path.join(destination,'index.ts'),path.join(destination,'index.tsx')].some(fs.existsSync)){
   errors.push(`${path.relative(root,filename)}: unresolved relative import ${m[1]}`);
  }
 }
}
walk(root);
if(errors.length){console.error(`FAILED (${count} files):\n${errors.join('\n')}`);process.exitCode=1;}
else console.log(`PASS: ${count} TypeScript/TSX sources parse and relative imports resolve. Dependencies and SQL are not checked.`);
