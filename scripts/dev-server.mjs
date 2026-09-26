import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
spawnSync(process.execPath,['scripts/build.mjs'],{stdio:'inherit'});const root=path.join(process.cwd(),'dist');
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.xml':'application/xml','.txt':'text/plain'};
http.createServer((req,res)=>{let p=decodeURIComponent((req.url||'/').split('?')[0]);if(p.endsWith('/'))p+='index.html';let file=path.join(root,p);if(!fs.existsSync(file)){res.statusCode=404;file=path.join(root,'404.html')}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res)}).listen(3000,()=>console.log('Downstate test site: http://localhost:3000'));
