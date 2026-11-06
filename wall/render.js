export function bricks(ctx){
  ctx.clearRect(0,0,1200,800);ctx.fillStyle='#231d30';ctx.fillRect(0,0,1200,800);ctx.fillStyle='#16121f';
  for(let y=0;y<800;y+=50){ctx.fillRect(0,y,1200,3);for(let x=y/50%2?60:0;x<1200;x+=120)ctx.fillRect(x,y,3,50);}
}
export function renderDrawing(ctx,drawing){
  for(const s of drawing.strokes){
    ctx.fillStyle=ctx.strokeStyle=s.color;ctx.lineCap=ctx.lineJoin='round';
    if(s.tool==='sticker'){ctx.font='90px serif';ctx.textAlign='center';ctx.textBaseline='middle';for(const [x,y] of s.points)ctx.fillText('♡',x,y);}
    else if(s.tool==='marker'){
      ctx.lineWidth=11;ctx.beginPath();ctx.moveTo(...s.points[0]);if(s.points.length===1){ctx.arc(...s.points[0],5.5,0,Math.PI*2);ctx.fill();}
      else{for(const p of s.points.slice(1))ctx.lineTo(...p);ctx.stroke();}
    }else{
      let seed=s.seed>>>0;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
      ctx.globalAlpha=.6;for(const [x,y] of s.points)for(let i=0;i<60;i++){const angle=random()*Math.PI*2,r=random()**1.6*34;ctx.fillRect(x+Math.cos(angle)*r,y+Math.sin(angle)*r,3,3);}ctx.globalAlpha=1;
    }
  }
}
