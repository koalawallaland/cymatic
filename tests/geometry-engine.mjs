import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
// Works without changing the static site's package/module configuration.
const code=await readFile(new URL('../geometry-engine.js',import.meta.url),'utf8');
const {families,makeStudy,equilibrium,omega,mohr,studySVG}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
for(const f of families){
 const m=makeStudy(f.id);
 assert.ok(m.paths.length,f.id);
 for(const p of m.paths)for(const point of p.pts)assert.ok(point.every(Number.isFinite),f.id);
 assert.match(studySVG(m),/^<svg /);
}
for(const mu of [.005,.01215,.08,.5])for(const [x,y] of equilibrium(mu)){
 const h=1e-6,dx=(omega(x+h,y,mu)-omega(x-h,y,mu))/(2*h),dy=(omega(x,y+h,mu)-omega(x,y-h,mu))/(2*h);
 assert.ok(Math.hypot(dx,dy)<1e-5,'equilibrium residual '+mu);
}
for(const theta of [0,35,90,180]){
 const m=mohr(80,-20,30,theta);
 assert.ok(Math.abs(Math.hypot(m.sigma-m.c,m.tau)-m.r)<1e-9);
}
assert.equal(mohr(80,-20,30,0).sigma,80);
assert.equal(mohr(80,-20,30,0).tau,30);
console.log('All geometry families, Lagrange equilibria, Mohr circle and SVG tests passed.');
