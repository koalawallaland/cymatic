(() => {
  "use strict";

  for (const opener of document.querySelectorAll("[data-desk-toy]")) {
    const dialog = document.getElementById(opener.getAttribute("aria-controls"));
    opener.addEventListener("click", () => {
      if (dialog.open) return;
      opener.focus({ preventScroll: true });
      dialog.showModal();
    });
  }

  const symbols = {
    circle: "Circle",
    cross: "Cross",
    waves: "Waves",
    square: "Square",
    star: "Star",
  };
  const symbolIds = Object.keys(symbols);
  const turn = 2 * Math.PI;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

  function drawFoilBack(canvas) {
    const context = canvas.getContext("2d");
    const x = canvas.width / 2;
    const y = canvas.height / 2;

    context.strokeStyle = "#322048b8";
    context.lineWidth = 1.9;
    context.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
    context.strokeStyle = "#ffecffcf";
    context.lineWidth = 1;
    context.strokeRect(19, 19, canvas.width - 38, canvas.height - 38);

    context.beginPath();
    context.moveTo(28, y);
    context.lineTo(canvas.width - 28, y);
    context.moveTo(x, 43);
    context.lineTo(x, canvas.height - 43);
    context.strokeStyle = "#50376460";
    context.stroke();

    const etchedInk = context.createLinearGradient(39, 96, 188, 239);
    etchedInk.addColorStop(0, "#29153fa8");
    etchedInk.addColorStop(.45, "#4a295cda");
    etchedInk.addColorStop(.65, "#1d234cf0");
    etchedInk.addColorStop(1, "#6d3767c9");
    context.strokeStyle = etchedInk;
    context.lineWidth = 1.9;
    for (let line = 0; line < 9; line++) {
      const radius = 15 + line * 8.1;
      context.beginPath();
      for (let step = 0; step <= 192; step++) {
        const angle = step * turn / 192;
        const distance = radius * (1 + .09 * Math.cos(6 * angle - line * .23) + .035 * Math.cos(2 * angle));
        const px = x + distance * Math.cos(angle);
        const py = y + distance * Math.sin(angle) * 1.04;
        if (step === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }
      context.stroke();
    }

    context.fillStyle = "#fffcffd9";
    context.strokeStyle = "#4e316f84";
    for (let dot = 0; dot < 6; dot++) {
      const angle = dot * turn / 6;
      disc(context, x + 14 * Math.cos(angle), y + 14 * Math.sin(angle), 3);
      context.fill();
      context.stroke();
    }

    context.fillStyle = "#f9effacd";
    for (const cap of [40, canvas.height - 40]) {
      context.beginPath();
      context.moveTo(x, cap - 8);
      context.lineTo(x + 5, cap);
      context.lineTo(x, cap + 8);
      context.lineTo(x - 5, cap);
      context.closePath();
      context.fill();
      context.stroke();
    }
  }

  for (const foil of document.querySelectorAll("[data-dt-back]")) {
    drawFoilBack(foil);
    const surface = foil.parentElement;
    surface.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse" || reduceMotion.matches) return;
      const rect = surface.getBoundingClientRect();
      const position = (event.clientX - rect.left) / rect.width - .5;
      surface.style.setProperty("--dt-foil-angle", `${138 + 58 * position}deg`);
    });
    surface.addEventListener("pointerleave", () => surface.style.removeProperty("--dt-foil-angle"));
  }

  function drawSymbol(canvas, symbol, ink) {
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.scale(canvas.width / 96, canvas.height / 96);
    context.lineWidth = 6.5;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = ink;
    context.beginPath();

    if (symbol === "circle") {
      context.arc(48, 48, 28, 0, turn);
    } else if (symbol === "cross") {
      context.moveTo(48, 19);
      context.lineTo(48, 77);
      context.moveTo(19, 48);
      context.lineTo(77, 48);
    } else if (symbol === "waves") {
      for (const y of [31, 48, 65]) {
        context.moveTo(15, y);
        context.bezierCurveTo(26, y - 15, 37, y - 15, 48, y);
        context.bezierCurveTo(59, y + 15, 70, y + 15, 81, y);
      }
    } else if (symbol === "square") {
      context.rect(22, 22, 52, 52);
    } else {
      context.moveTo(48, 13);
      for (let point = 1; point < 10; point++) {
        const angle = point * Math.PI / 5 - Math.PI / 2;
        const radius = point % 2 === 0 ? 35 : 15;
        context.lineTo(48 + radius * Math.cos(angle), 48 + radius * Math.sin(angle));
      }
      context.closePath();
    }

    context.stroke();
    context.restore();
  }

  const zener = document.getElementById("desk-zener");
  const guesses = [...zener.querySelectorAll("[data-dt-guess]")];
  const card = zener.querySelector(".dt-draw-card");
  const cardBack = card.querySelector("[data-dt-back]");
  const cardFace = card.querySelector("[data-dt-face]");
  const faceName = card.querySelector(".dt-face-name");
  const roundLabel = zener.querySelector("[data-dt-round]");
  const matchLabel = zener.querySelector("[data-dt-matches]");
  const result = zener.querySelector("[data-dt-result]");
  const nextCard = zener.querySelector("[data-dt-next]");
  const totalRounds = 25;
  const randomByte = new Uint8Array(1);
  const uniformLimit = 256 - (256 % symbolIds.length);

  let round = 1;
  let matches = 0;
  let revealed = false;
  let target;

  function deal() {
    // Select before showing the choices. Reject the incomplete range for equal odds.
    do {
      crypto.getRandomValues(randomByte);
    } while (randomByte[0] >= uniformLimit);
    target = symbolIds[randomByte[0] % symbolIds.length];
    revealed = false;
    card.classList.remove("is-revealed");
    cardBack.hidden = false;
    cardFace.hidden = true;
    faceName.hidden = true;
    faceName.textContent = "";
    roundLabel.textContent = `Round ${round} of ${totalRounds}`;
    matchLabel.textContent = matches === 1 ? "1 match" : `${matches} matches`;
    result.textContent = "The card is face down.";
    nextCard.textContent = "Next card";
    nextCard.disabled = true;
    for (const guess of guesses) {
      guess.disabled = false;
      guess.setAttribute("aria-pressed", "false");
    }
  }

  for (const guess of guesses) {
    const symbol = guess.dataset.dtGuess;
    drawSymbol(guess.querySelector("canvas"), symbol, "#fff0fa");
    guess.addEventListener("click", () => {
      if (revealed) return;
      revealed = true;
      const isMatch = symbol === target;
      if (isMatch) matches++;
      matchLabel.textContent = matches === 1 ? "1 match" : `${matches} matches`;
      for (const button of guesses) button.disabled = true;
      guess.setAttribute("aria-pressed", "true");
      drawSymbol(cardFace, target, "#392649");
      faceName.textContent = symbols[target];
      cardBack.hidden = true;
      cardFace.hidden = false;
      faceName.hidden = false;
      card.classList.add("is-revealed");
      result.textContent = isMatch
        ? `Match. The card was ${symbols[target]}.`
        : `You picked ${symbols[symbol]}. The card was ${symbols[target]}.`;
      nextCard.textContent = round === totalRounds ? "Play again" : "Next card";
      nextCard.disabled = false;
      nextCard.focus({ preventScroll: true });
    });
  }

  nextCard.addEventListener("click", () => {
    if (round === totalRounds) {
      round = 1;
      matches = 0;
    } else {
      round++;
    }
    deal();
    guesses[0].focus({ preventScroll: true });
  });
  deal();

  // The wheel rolls inside a fixed ring. The tooth ratio controls how quickly it turns.
  const ringTeeth = 96;

  function penPosition(angle, ring, wheel, hole) {
    const distance = ring - wheel;
    const rotation = angle * distance / wheel;
    return [
      distance * Math.sin(angle) - hole * Math.sin(rotation),
      -distance * Math.cos(angle) - hole * Math.cos(rotation),
    ];
  }

  function curve(context, from, to, center, ring, wheel, hole) {
    const steps = Math.max(1, Math.ceil(Math.abs(to - from) / .014));
    const [startX, startY] = penPosition(from, ring, wheel, hole);
    context.beginPath();
    context.moveTo(center + startX, center + startY);
    for (let step = 1; step <= steps; step++) {
      const point = from + (to - from) * (step / steps);
      const [x, y] = penPosition(point, ring, wheel, hole);
      context.lineTo(center + x, center + y);
    }
    context.stroke();
  }

  function disc(context, x, y, radius) {
    context.beginPath();
    context.arc(x, y, radius, 0, turn);
  }

  function metalFinish(context, x, y, radius) {
    const finish = context.createLinearGradient(x - radius, y - radius * .82, x + radius, y + radius * .85);
    finish.addColorStop(0, "#2b285c");
    finish.addColorStop(.12, "#7351a8");
    finish.addColorStop(.24, "#bc82d2");
    finish.addColorStop(.32, "#5baed7");
    finish.addColorStop(.43, "#65d4c8");
    finish.addColorStop(.55, "#bacf73");
    finish.addColorStop(.64, "#efc16d");
    finish.addColorStop(.76, "#bf526c");
    finish.addColorStop(.86, "#8840a3");
    finish.addColorStop(1, "#222a56");
    return finish;
  }

  function addCogPath(context, x, y, radius, teeth, rotation, depth) {
    for (let i = 0; i < teeth * 4; i++) {
      const point = rotation + i * turn / (teeth * 4);
      const edge = i % 4 < 2 ? radius : radius + depth;
      const dx = x + edge * Math.cos(point);
      const dy = y + edge * Math.sin(point);
      if (i === 0) context.moveTo(dx, dy);
      else context.lineTo(dx, dy);
    }
    context.closePath();
  }

  function drawMetalRing(context, center, innerRadius, thickness) {
    const edge = innerRadius + thickness;
    const toothDepth = thickness * .19;
    disc(context, center, center, edge);
    addCogPath(context, center, center, innerRadius, ringTeeth, 0, toothDepth);
    context.fillStyle = metalFinish(context, center, center, edge);
    context.fill("evenodd");

    disc(context, center, center, edge);
    context.strokeStyle = "#29253f";
    context.lineWidth = thickness * .11;
    context.stroke();
    disc(context, center, center, edge - thickness * .14);
    context.strokeStyle = "#fff9";
    context.lineWidth = thickness * .055;
    context.stroke();
    disc(context, center, center, edge - thickness * .26);
    context.strokeStyle = "#23273d66";
    context.stroke();

    context.beginPath();
    for (let tick = 0; tick < ringTeeth; tick++) {
      const theta = tick * turn / ringTeeth;
      const outer = edge - thickness * .29;
      const inner = outer - thickness * (tick % 8 === 0 ? .39 : .16);
      const x = Math.cos(theta);
      const y = Math.sin(theta);
      context.moveTo(center + inner * x, center + inner * y);
      context.lineTo(center + outer * x, center + outer * y);
    }
    context.strokeStyle = "#f5f2feaa";
    context.lineWidth = thickness * .045;
    context.stroke();

    context.beginPath();
    addCogPath(context, center, center, innerRadius, ringTeeth, 0, toothDepth);
    context.strokeStyle = "#3a314ea8";
    context.lineWidth = thickness * .055;
    context.stroke();
  }

  function drawPlot(context, center, radius) {
    context.beginPath();
    context.moveTo(center - radius, center);
    context.lineTo(center + radius, center);
    context.moveTo(center, center - radius);
    context.lineTo(center, center + radius);
    context.lineWidth = 1.35;
    context.strokeStyle = "#635c7b64";
    context.stroke();
    context.setLineDash([3, 5]);
    context.lineWidth = 1;
    context.strokeStyle = "#7f728150";
    for (const proportion of [.25, .5, .75]) {
      disc(context, center, center, radius * proportion);
      context.stroke();
    }
    context.setLineDash([]);
  }

  for (const example of document.querySelectorAll("[data-dt-example]")) {
    const context = example.getContext("2d");
    context.save();
    context.scale(example.width / 192, example.height / 192);
    disc(context, 96, 96, 79);
    context.fillStyle = "#332646";
    context.fill();
    disc(context, 96, 96, 65);
    context.fillStyle = "#f2edf2";
    context.fill();
    drawPlot(context, 96, 63);
    context.lineWidth = 1.6;
    context.strokeStyle = "#673986";
    curve(context, 0, turn * 3, 96, 58, 58 * 36 / ringTeeth, 19);
    context.lineWidth = 1.4;
    context.strokeStyle = "#276f79";
    curve(context, .22, turn + .22, 96, 52, 52 / 3, 14);
    drawMetalRing(context, 96, 63, 21);

    context.translate(124, 139);
    context.rotate(-.66);
    context.fillStyle = "#442f5b63";
    context.fillRect(-20, 2, 62, 8);
    context.fillStyle = "#d8a0d4";
    context.fillRect(-18, -4, 60, 8);
    context.fillStyle = "#f8cfeb";
    context.fillRect(-18, -3, 60, 2);
    context.fillStyle = "#5a4b76";
    context.fillRect(39, -4, 5, 8);
    context.beginPath();
    context.moveTo(-27, 0);
    context.lineTo(-18, -4);
    context.lineTo(-18, 4);
    context.fillStyle = "#826c74";
    context.fill();
    context.restore();
  }

  const spiro = document.getElementById("desk-spiro");
  const paper = spiro.querySelector(".dt-paper");
  const inkCanvas = spiro.querySelector("[data-dt-ink]");
  const ink = inkCanvas.getContext("2d");
  const plate = spiro.querySelector("[data-dt-plate]").getContext("2d");
  const guide = spiro.querySelector("[data-dt-guide]").getContext("2d");
  const gear = spiro.querySelector("[data-dt-teeth]");
  const penHole = spiro.querySelector("[data-dt-offset]");
  const trace = spiro.querySelector("[data-dt-trace]");
  const clear = spiro.querySelector("[data-dt-clear]");
  const traceStatus = spiro.querySelector("[data-dt-spiro-status]");
  const size = inkCanvas.width;
  const center = size / 2;
  const ring = 246;

  drawPlot(plate, center, ring);
  drawMetalRing(plate, center, ring, 31);

  let angle = 0;
  let frame = null;
  let pointer = null;

  function renderGuide() {
    const teeth = Number(gear.value);
    const wheel = ring * teeth / ringTeeth;
    const distance = ring - wheel;
    const roll = -angle * distance / wheel - Math.PI / 2;
    const wheelX = center + distance * Math.sin(angle);
    const wheelY = center - distance * Math.cos(angle);

    const slotX = Math.cos(roll);
    const slotY = Math.sin(roll);
    const alloy = metalFinish(guide, wheelX, wheelY, wheel);
    guide.clearRect(0, 0, size, size);
    guide.beginPath();
    addCogPath(guide, wheelX, wheelY, wheel - 4, teeth, roll, 5);
    const cutout = wheel * .78;
    guide.moveTo(wheelX + cutout, wheelY);
    guide.arc(wheelX, wheelY, cutout, 0, turn);
    guide.fillStyle = alloy;
    guide.fill("evenodd");
    guide.strokeStyle = "#45375ea6";
    guide.lineWidth = 1.6;
    guide.stroke();

    disc(guide, wheelX, wheelY, wheel * .86);
    guide.strokeStyle = "#faf6ffd9";
    guide.lineWidth = 1.55;
    guide.stroke();
    guide.beginPath();
    guide.moveTo(wheelX, wheelY);
    guide.lineTo(wheelX + wheel * .89 * slotX, wheelY + wheel * .89 * slotY);
    guide.strokeStyle = alloy;
    guide.lineWidth = wheel * .16;
    guide.stroke();
    disc(guide, wheelX, wheelY, wheel * .098);
    guide.fillStyle = alloy;
    guide.fill();

    const activeInk = spiro.querySelector("input:checked").value;
    for (const option of penHole.options) {
      const hole = wheel * Number(option.value);
      disc(guide, wheelX + hole * slotX, wheelY + hole * slotY, option.selected ? 5.9 : 3.3);
      guide.fillStyle = option.selected ? activeInk : "#f7f5fa";
      guide.fill();
      guide.strokeStyle = "#4f3a6f";
      guide.lineWidth = 1;
      guide.stroke();
    }
  }

  function drawTo(nextAngle) {
    if (nextAngle === angle) return;
    const wheel = ring * Number(gear.value) / ringTeeth;
    ink.lineJoin = "round";
    ink.lineCap = "round";
    ink.lineWidth = 2.7;
    ink.strokeStyle = spiro.querySelector("input:checked").value;
    curve(ink, angle, nextAngle, center, ring, wheel, wheel * Number(penHole.value));
    angle = nextAngle;
    clear.disabled = false;
    renderGuide();
  }

  function stopTrace() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    trace.textContent = "Trace";
  }

  function gcd(a, b) {
    while (b !== 0) [a, b] = [b, a % b];
    return a;
  }

  trace.addEventListener("click", () => {
    if (frame !== null) {
      stopTrace();
      traceStatus.textContent = "Trace paused.";
      return;
    }
    const teeth = Number(gear.value);
    const laps = teeth / gcd(ringTeeth, teeth);
    const start = angle;
    const totalAngle = turn * laps;
    if (reduceMotion.matches) {
      drawTo(start + totalAngle);
      traceStatus.textContent = "Pattern traced.";
      return;
    }

    const duration = Math.min(3100, 1200 + laps * 270);
    trace.textContent = "Stop";
    traceStatus.textContent = "Tracing the pattern.";
    let startTime;
    function animate(time) {
      startTime ??= time;
      const progress = Math.min(1, (time - startTime) / duration);
      drawTo(start + totalAngle * progress);
      if (progress < 1) frame = requestAnimationFrame(animate);
      else {
        stopTrace();
        traceStatus.textContent = "Pattern traced.";
      }
    }
    frame = requestAnimationFrame(animate);
  });

  function pointerAngle(event) {
    const rect = paper.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    return Math.hypot(x, y) < rect.width * .085 ? null : Math.atan2(y, x);
  }

  function shortestTurn(radians) {
    return Math.atan2(Math.sin(radians), Math.cos(radians));
  }

  function engageGear(contact) {
    // Pick up the gear at the touch bearing without inking the jump.
    angle += shortestTurn(contact + Math.PI / 2 - angle);
    renderGuide();
    paper.classList.add("is-dragging");
    traceStatus.textContent = "Gear locked. Drag to draw.";
  }

  paper.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || pointer !== null) return;
    stopTrace();
    const contact = pointerAngle(event);
    pointer = { id: event.pointerId, angle: contact, engaged: contact !== null, moved: false };
    paper.setPointerCapture(event.pointerId);
    if (pointer.engaged) engageGear(contact);
  });
  paper.addEventListener("pointermove", (event) => {
    if (pointer?.id !== event.pointerId) return;
    const current = pointerAngle(event);
    const previous = pointer.angle;
    pointer.angle = current;
    if (current === null) return;
    if (!pointer.engaged) {
      pointer.engaged = true;
      engageGear(current);
      return;
    }
    // Near the center a bearing is ambiguous. Resume from the next valid sample.
    if (previous === null) return;
    const delta = shortestTurn(current - previous);
    if (delta === 0) return;
    drawTo(angle + delta);
    pointer.moved = true;
  });

  function releasePointer(event) {
    if (pointer?.id !== event.pointerId) return;
    if (pointer.engaged) traceStatus.textContent = pointer.moved ? "Drawing updated." : "Gear positioned.";
    pointer = null;
    paper.classList.remove("is-dragging");
  }
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    paper.addEventListener(type, releasePointer);
  }

  spiro.addEventListener("desk-magnetic-turn", (event) => {
    if (!paper.hidden && frame === null && pointer === null && !reduceMotion.matches) drawTo(angle + event.detail);
  });

  for (const control of [gear, penHole, ...spiro.querySelectorAll('input[type="radio"]')]) {
    control.addEventListener("change", () => {
      stopTrace();
      traceStatus.textContent = "";
      renderGuide();
    });
  }

  clear.addEventListener("click", () => {
    stopTrace();
    angle = 0;
    ink.clearRect(0, 0, size, size);
    clear.disabled = true;
    renderGuide();
    traceStatus.textContent = "Fresh paper.";
    trace.focus({ preventScroll: true });
  });


  // Geometric study presets: each component is its own automatically colored layer.
  const studies = [
    ["Seed of Life", "seed"], ["Flower of Life", "flower"],
    ["Metatron's Cube", "metatron"], ["Sri Yantra", "yantra"],
    ["Golden Spiral", "spiral"], ["Vesica Piscis", "vesica"],
    ["Torus", "torus"], ["Merkaba", "merkaba"],
    ["Triquetra", "triquetra"], ["Vector Equilibrium", "vector"],
    ["Circle Grid", "grid"], ["Nested Geometry", "nested"]
  ];
  const palette = ["#ff6aa9","#69d9f8","#f7c56c","#a78bfa","#83e6ac","#ff9479","#c4b5fd","#72d6ca","#f7a5d4","#e2db87"];
  const toolsPanel = spiro.querySelector(".dt-spiro-tools");
  const presetPanel = document.createElement("div");
  presetPanel.className = "dt-field dt-sacred-presets";
  presetPanel.style.cssText = "display:grid;gap:8px;margin:10px 0";
  const presetLabel = document.createElement("label");
  presetLabel.textContent = "Sacred geometry study";
  const presetSelect = document.createElement("select");
  presetSelect.setAttribute("aria-label","Choose geometric study");
  presetSelect.innerHTML = '<option value="">Freehand Spirograph</option>' + studies.map(([name,id]) => '<option value="'+id+'">'+name+'</option>').join("");
  const layerButton = document.createElement("button");
  layerButton.type = "button";
  layerButton.className = "dt-button";
  layerButton.textContent = "Add colored study";
  const colorNote = document.createElement("small");
  colorNote.textContent = "Each added geometric layer gets a different rainbow ink automatically.";
  presetPanel.append(presetLabel,presetSelect,layerButton,colorNote);
  toolsPanel.insertBefore(presetPanel, toolsPanel.firstChild);
  let layerCount = 0;
  function strokeLayer(draw) {
    ink.save();
    ink.strokeStyle = palette[layerCount++ % palette.length];
    ink.lineWidth = 1.75;
    ink.lineCap = "round";
    ink.lineJoin = "round";
    ink.beginPath();
    draw();
    ink.stroke();
    ink.restore();
  }
  const point = (x,y) => [center+x,center+y];
  function line(x1,y1,x2,y2) { ink.moveTo(...point(x1,y1)); ink.lineTo(...point(x2,y2)); }
  function circle(x,y,r) { ink.moveTo(center+x+r,center+y); ink.arc(center+x,center+y,r,0,turn); }
  function polygon(n,r,rotation=-Math.PI/2,cx=0,cy=0) {
    const pts=Array.from({length:n},(_,i)=>[cx+r*Math.cos(rotation+i*turn/n),cy+r*Math.sin(rotation+i*turn/n)]);
    pts.forEach((p,i)=>line(...p,...pts[(i+1)%n]));
    return pts;
  }
  function seed(scale=100,outer=false) {
    const positions=[[0,0],...Array.from({length:6},(_,i)=>[scale*Math.cos(i*turn/6),scale*Math.sin(i*turn/6)])];
    positions.forEach(([x,y])=>strokeLayer(()=>circle(x,y,scale)));
    if(outer) strokeLayer(()=>circle(0,0,scale*2));
  }
  function drawStudy(id) {
    stopTrace();
    const R=178;
    if(id==="seed") seed(91,true);
    if(id==="flower" || id==="grid") {
      const s=id==="flower"?62:51;
      for(let q=-3;q<=3;q++) for(let r=-3;r<=3;r++) {
        const x=s*(q+r/2),y=s*Math.sqrt(3)*r/2;
        if(Math.hypot(x,y)<200) strokeLayer(()=>circle(x,y,s));
      }
      strokeLayer(()=>circle(0,0,226));
    }
    if(id==="vesica") {strokeLayer(()=>circle(-78,0,137));strokeLayer(()=>circle(78,0,137));}
    if(id==="metatron") {
      const pts=[[0,0],...Array.from({length:6},(_,i)=>[85*Math.cos(i*turn/6),85*Math.sin(i*turn/6)]),...Array.from({length:6},(_,i)=>[170*Math.cos(i*turn/6),170*Math.sin(i*turn/6)])];
      pts.forEach(([x,y])=>strokeLayer(()=>circle(x,y,34)));
      for(let i=0;i<pts.length;i++) strokeLayer(()=>{for(let j=i+1;j<pts.length;j++)line(...pts[i],...pts[j]);});
    }
    if(id==="merkaba") {
      strokeLayer(()=>polygon(3,R,-Math.PI/2));
      strokeLayer(()=>polygon(3,R,Math.PI/2));
      strokeLayer(()=>polygon(6,R*.86));
      strokeLayer(()=>polygon(3,R*.62,-Math.PI/2));
      strokeLayer(()=>polygon(3,R*.62,Math.PI/2));
    }
    if(id==="yantra") {
      for(let i=0;i<9;i++) strokeLayer(()=>polygon(3,175-i*15,i%2?Math.PI/2:-Math.PI/2));
      strokeLayer(()=>circle(0,0,14));
      strokeLayer(()=>circle(0,0,196));
    }
    if(id==="spiral") {
      const phi=(1+Math.sqrt(5))/2;
      strokeLayer(()=>{for(let t=0;t<6*Math.PI;t+=.018){let r=3*Math.pow(phi,t/(Math.PI/2));if(r>230)break;let x=r*Math.cos(t),y=r*Math.sin(t);if(t===0)ink.moveTo(...point(x,y));else ink.lineTo(...point(x,y));}});
      for(let i=0;i<7;i++)strokeLayer(()=>circle(0,0,7*Math.pow(phi,i)));
    }
    if(id==="torus") {
      for(let i=0;i<20;i++)strokeLayer(()=>{ink.save();ink.translate(center,center);ink.rotate(i*Math.PI/20);ink.ellipse(0,0,190,62,0,0,turn);ink.restore();});
      strokeLayer(()=>circle(0,0,190));
    }
    if(id==="triquetra") {
      for(let i=0;i<3;i++)strokeLayer(()=>{const a=i*turn/3-Math.PI/2;ink.arc(center+90*Math.cos(a),center+90*Math.sin(a),145,a+.45,a+Math.PI*1.62);});
      strokeLayer(()=>circle(0,0,193));
    }
    if(id==="vector") {
      const a=polygon(6,175);
      const b=Array.from({length:6},(_,i)=>[115*Math.cos(i*turn/6),115*Math.sin(i*turn/6)]);
      strokeLayer(()=>{b.forEach((p,i)=>line(...p,...b[(i+1)%6]));});
      for(let i=0;i<6;i++)strokeLayer(()=>{line(...a[i],...a[(i+2)%6]);line(...a[i],...a[(i+3)%6]);});
    }
    if(id==="nested") {
      for(let i=0;i<7;i++)strokeLayer(()=>polygon(i%2?6:3,195-i*25,i%2?0:-Math.PI/2));
      seed(42);
    }
    clear.disabled=false;
    traceStatus.textContent="Added "+studies.find(x=>x[1]===id)[0]+" in separate rainbow-colored layers.";
  }
  layerButton.addEventListener("click",()=>{if(presetSelect.value)drawStudy(presetSelect.value);else traceStatus.textContent="Choose a geometric study first.";});


  // Liquid Geometry: convert the *current* ink raster into a planar dipping frame.
  // A flood fill distinguishes closed compartments from the open exterior.
  // The optics approximate reflected thin-film interference, not a full fluid solver.
  const liquidStyle = document.createElement("style");
  liquidStyle.textContent = `
    #desk-spiro .dt-liquid-entry { grid-column:1/-1; display:grid; gap:6px; padding:11px; border:1px solid #af9dcb; border-radius:10px; background:linear-gradient(125deg,#493956,#24394e); }
    #desk-spiro .dt-liquid-entry small, #desk-spiro .dt-liquid-tools small { color:#d2c9dd; line-height:1.4; }
    #desk-spiro .dt-liquid-entry button { background:linear-gradient(115deg,#e8c0ec,#b7f2f2,#f6deb4); color:#292339; font-weight:750; border-color:#efd5f0; }
    #desk-spiro .dt-liquid-entry button:hover { background:#f4dcf4; }
    #desk-spiro .dt-liquid-stage { position:relative; min-width:0; align-self:start; aspect-ratio:1; border:1px solid #84749c; border-radius:16px; overflow:hidden; background:#100e1a; box-shadow:0 12px 25px #0f0819a0; }
    #desk-spiro .dt-liquid-stage canvas { display:block; width:100%; height:100%; touch-action:none; cursor:crosshair; }
    #desk-spiro .dt-liquid-stage .dt-liquid-tag { position:absolute; top:12px; left:12px; pointer-events:none; font:600 9px/1.3 ui-monospace,monospace; color:#eadbfa; letter-spacing:.16em; background:#100e1ab8; border:1px solid #9d8cb46b; padding:6px 8px; border-radius:7px; }
    #desk-spiro .dt-liquid-tools { min-width:0; display:grid; gap:9px; align-content:start; }
    #desk-spiro .dt-liquid-tools h3 { font-size:1.03rem; margin:0; color:#ffe2fa; letter-spacing:.04em; }
    #desk-spiro .dt-liquid-tools label { display:grid; gap:3px; font-size:.8rem; }
    #desk-spiro .dt-liquid-tools input[type=range] { width:100%; margin:0; accent-color:#f5b8f1; min-height:27px; }
    #desk-spiro .dt-liquid-tools .dt-liquid-actions { display:grid; grid-template-columns:1fr 1fr; gap:5px; }
    #desk-spiro .dt-liquid-tools button { min-height:40px; font-size:.82rem; }
    #desk-spiro .dt-liquid-tools button[aria-pressed=true] { background:#765289; border-color:#f2c7ff; }
    #desk-spiro .dt-liquid-tools .dt-liquid-status { margin:0; min-height:3em; color:#d9f3f3; font-size:.8rem; line-height:1.4; }
    #desk-spiro .dt-liquid-tools details { color:#d4c7df; font-size:.72rem; line-height:1.45; }
    #desk-spiro .dt-liquid-tools a { color:#ffe0f7; }
    #desk-spiro [hidden] { display:none!important; }
    #desk-spiro.dt-liquid-active .dt-magnetic { display:none; }
    @media(max-width:600px) {
      #desk-spiro .dt-liquid-tools { gap:8px; }
      #desk-spiro .dt-liquid-tools .dt-liquid-sliders { display:grid; grid-template-columns:1fr 1fr; gap:6px 12px; }
    }
  `;
  document.head.append(liquidStyle);

  const liquidEntry = document.createElement("div");
  liquidEntry.className = "dt-liquid-entry";
  liquidEntry.innerHTML = '<button type="button" class="dt-button" data-dt-liquid-open>✧ Liquid Geometry</button><small>Turn your drawn shape into an openwork frame. Dip it in iridescent bubble solution.</small>';
  toolsPanel.prepend(liquidEntry);
  const liquidOpen = liquidEntry.querySelector("button");
  const liquidStage = document.createElement("div");
  liquidStage.className = "dt-liquid-stage";
  liquidStage.hidden = true;
  liquidStage.innerHTML = '<canvas width="640" height="640" aria-label="Liquid-film dish: drag to stir, or tap an enclosed cell in pop mode"></canvas><span class="dt-liquid-tag">KT / LIQUID GEOMETRY</span>';
  const liquidTools = document.createElement("section");
  liquidTools.className = "dt-liquid-tools";
  liquidTools.hidden = true;
  liquidTools.innerHTML = `
    <h3>Liquid Geometry</h3>
    <small>01 Draw a shape · 02 Dip · 03 Lift &amp; play</small>
    <button type="button" class="dt-button dt-primary" data-liquid-dip>Lift frame</button>
    <p class="dt-liquid-status" data-liquid-status role="status" aria-live="polite"></p>
    <div class="dt-liquid-actions">
      <button type="button" class="dt-button" data-liquid-stir aria-pressed="true">Stir / drag</button>
      <button type="button" class="dt-button" data-liquid-pop aria-pressed="false">Pop cells</button>
    </div>
    <div class="dt-liquid-sliders">
      <label>Film thickness <span data-liquid-thickness-label></span><input type="range" min="100" max="1050" value="510" step="10" data-liquid-thickness></label>
      <label>Viscosity<input type="range" min="0" max="100" value="62" data-liquid-viscosity></label>
      <label>Flow<input type="range" min="0" max="100" value="45" data-liquid-flow></label>
      <label>Light angle<input type="range" min="0" max="65" value="18" data-liquid-angle></label>
    </div>
    <label>Frame finish<select data-liquid-finish><option value="gold">Anodized gold</option><option value="chrome">Rainbow chrome</option><option value="pink">Hot pink</option></select></label>
    <div class="dt-liquid-actions">
      <button type="button" class="dt-button" data-liquid-pause aria-pressed="false">Freeze</button>
      <button type="button" class="dt-button" data-liquid-save>Save PNG</button>
    </div>
    <button type="button" class="dt-button" data-liquid-back>← Return to drawing</button>
    <details><summary>How it works / credits</summary>Planar closed regions retain a film; open lines do not. The simulated film drains, ripples and reflects different wavelengths as its thickness changes. This is an interactive optical approximation, not a physical fluid solver. Inspired by <a href="https://www.instagram.com/liquid_tapestry/" target="_blank" rel="noopener noreferrer">@liquid_tapestry</a> and <a href="https://natureofflowers.com/" target="_blank" rel="noopener noreferrer">Nature of Flowers</a>. Learn about <a href="https://sciencedemonstrations.fas.harvard.edu/presentations/thin-film-interference" target="_blank" rel="noopener noreferrer">thin-film interference</a>.</details>
  `;
  paper.after(liquidStage);
  toolsPanel.after(liquidTools);

  const liquidCanvas = liquidStage.querySelector("canvas");
  const lc = liquidCanvas.getContext("2d");
  const filmBuffer = document.createElement("canvas");
  const N = 320;
  filmBuffer.width = filmBuffer.height = N;
  const fc = filmBuffer.getContext("2d");
  const filmImage = fc.createImageData(N, N);
  const frameBuffer = document.createElement("canvas");
  frameBuffer.width = frameBuffer.height = size;
  const fctx = frameBuffer.getContext("2d");
  const snapshot = document.createElement("canvas");
  snapshot.width = snapshot.height = size;
  const snap = snapshot.getContext("2d", {willReadFrequently:true});

  const L = selector => liquidTools.querySelector("[data-liquid-" + selector + "]");
  const dipBtn = L("dip"), liquidStatus = L("status"), stirBtn = L("stir"), popBtn = L("pop");
  const thickness = L("thickness"), viscosity = L("viscosity"), flow = L("flow");
  const light = L("angle"), finish = L("finish"), pauseBtn = L("pause"), saveBtn = L("save");
  const originalHint = document.getElementById("desk-spiro-hint");
  const savedHint = originalHint.textContent;
  let liquidActive = false, dipped = false, wet = false, paused = false, mode = "stir";
  let liquidRAF = null, previousTime = 0, lastPaint = 0, elapsedFilm = 0, simTime = 0;
  let cells = new Int32Array(N*N), numCells = 0, framePixels = 0;
  let activePixels = [], popped = new Set(), ripples = [], liquidPointer = null;
  let filmSeed = 0;
  function captureGeometry() {
    snap.clearRect(0,0,size,size);
    snap.drawImage(inkCanvas,0,0);
    const pixels = snap.getImageData(0,0,size,size).data;
    const boundary = new Uint8Array(size*size);
    const tags = new Int32Array(size*size);
    framePixels = 0;
    for(let y=0;y<size;y++) for(let x=0;x<size;x++){
      const i=y*size+x;
      if(pixels[i*4+3] > 48){
        framePixels++;
        boundary[i]=1;
        if(x>0) boundary[i-1]=1;
        if(x+1<size) boundary[i+1]=1;
        if(y>0) boundary[i-size]=1;
        if(y+1<size) boundary[i+size]=1;
      }
    }
    const queue = new Int32Array(size*size);
    function flood(start,tag){
      let head=0,tail=0;
      if(boundary[start] || tags[start]) return 0;
      tags[start]=tag; queue[tail++]=start;
      while(head<tail){
        const i=queue[head++], x=i%size;
        if(x>0) add(i-1);
        if(x+1<size) add(i+1);
        if(i>=size) add(i-size);
        if(i+size<tags.length) add(i+size);
      }
      return tail;
      function add(j){if(!boundary[j]&&!tags[j]){tags[j]=tag;queue[tail++]=j;}}
    }
    for(let i=0;i<size;i++){
      flood(i,-1); flood((size-1)*size+i,-1);
      flood(i*size,-1); flood(i*size+size-1,-1);
    }
    numCells=0;
    for(let i=0;i<tags.length;i++){
      if(boundary[i]||tags[i]) continue;
      const count=flood(i,numCells+1);
      if(count>=12) numCells++;
      else for(let k=0;k<count;k++) tags[queue[k]]=-2;
    }
    cells = new Int32Array(N*N);
    activePixels = [];
    const visible = new Set();
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){
      const src=Math.floor(y*size/N)*size+Math.floor(x*size/N);
      const id=tags[src];
      if(id>0){
        const i=y*N+x;
        cells[i]=id; visible.add(id);
        activePixels.push({i,id,x:x/N,y:y/N,phase:(id*.61803398875)%1});
      }
    }
    // Renumber cells so the displayed count matches the visible film cells.
    const remap=new Map([...visible].map((id,i)=>[id,i+1]));
    numCells=remap.size;
    for(const p of activePixels){p.id=remap.get(p.id);cells[p.i]=p.id;}
    paintFrame();
  }
  function paintFrame() {
    fctx.clearRect(0,0,size,size);
    fctx.drawImage(snapshot,0,0);
    fctx.globalCompositeOperation="source-in";
    const metal=fctx.createLinearGradient(30,0,size,size*.92);
    const stops=finish.value==="chrome"
      ? ["#93d8fd","#ecb4ff","#fff5da","#97ffcf","#af91ff","#f8d0ef"]
      : finish.value==="pink"
      ? ["#ffc7fa","#ff5dcf","#a62e9c","#ffd0f7","#f680d8","#f9aeeb"]
      : ["#fff4c8","#ffc84e","#a66b25","#ffe9a1","#e5a236","#fff4cc"];
    stops.forEach((s,i)=>metal.addColorStop(i/(stops.length-1),s));
    fctx.fillStyle=metal; fctx.fillRect(0,0,size,size);
    fctx.globalCompositeOperation="source-over";
  }
  function circlePath(ctx,x,y,r) { ctx.beginPath();ctx.arc(x,y,r,0,turn); }
  function drawDish() {
    lc.clearRect(0,0,size,size);
    const bg=lc.createRadialGradient(220,120,24,center,center,center*1.4);
    bg.addColorStop(0,"#393048");bg.addColorStop(.65,"#131320");bg.addColorStop(1,"#090912");
    lc.fillStyle=bg;lc.fillRect(0,0,size,size);
    lc.save();
    lc.shadowColor="#000";lc.shadowBlur=20;lc.shadowOffsetY=8;
    circlePath(lc,center,center,center*.965);
    const rim=lc.createLinearGradient(75,5,540,620);
    rim.addColorStop(0,"#abb9c9");rim.addColorStop(.2,"#464154");rim.addColorStop(.37,"#f1d5f4");rim.addColorStop(.55,"#44495c");rim.addColorStop(.83,"#a9c7d3");rim.addColorStop(1,"#252333");
    lc.fillStyle=rim;lc.fill();
    lc.restore();
    circlePath(lc,center,center,center*.925);
    const bath=lc.createRadialGradient(150,130,25,center,center,center*.95);
    bath.addColorStop(0,dipped?"#253d4d":"#1a2531");bath.addColorStop(.6,"#101924");bath.addColorStop(1,"#050910");
    lc.fillStyle=bath;lc.fill();
    lc.save();circlePath(lc,center,center,center*.924);lc.clip();
    lc.strokeStyle="#c7e7ef33";lc.lineWidth=1.6;
    for(let k=0;k<4;k++){
      lc.beginPath();lc.ellipse(center,center+3,center*(.88-k*.026),center*(.88-k*.026),0,3.55,5.22);lc.stroke();
    }
    if(dipped){
      const reflections=lc.createLinearGradient(0,0,size,size);
      reflections.addColorStop(0,"#b1f7ee16");reflections.addColorStop(.32,"#e2affb37");reflections.addColorStop(.43,"#a1d9ff08");reflections.addColorStop(.58,"#eec8f11c");reflections.addColorStop(1,"#a9f7e512");
      lc.fillStyle=reflections;lc.fillRect(0,0,size,size);
    }
    for(const r of ripples){
      const age=simTime-r.t;
      if(age<2.8){
        lc.strokeStyle="rgba(189,231,255,"+Math.max(0,.28*(1-age/2.8))+")";
        circlePath(lc,r.x*size,r.y*size,(age*.13+.02)*size);lc.stroke();
      }
    }
    lc.restore();
  }
  function paintLiquid() {
    drawDish();
    if(wet && !dipped){
      const data=filmImage.data;
      data.fill(0);
      const base=Number(thickness.value);
      const visc=Number(viscosity.value)/100;
      const speed=Number(flow.value)/100;
      const phase=simTime*(.1+.85*speed)*(1-.65*visc)+filmSeed;
      const cosAngle=Math.cos(Number(light.value)*Math.PI/180);
      const drain=elapsedFilm*(1.5+6*(1-visc));
      const waveList=ripples.slice(-5);
      for(const p of activePixels){
        if(popped.has(p.id)) continue;
        const x=p.x,y=p.y, i=p.i*4;
        let h=base+(y-.5)*230
          +78*Math.sin(x*15+y*7+phase+2.7*Math.sin(y*13-phase*.7))
          +52*Math.sin(y*28-x*8+phase*.8+4*Math.sin(x*8+phase*.4))
          +35*Math.sin(x*25+y*18+phase*1.2+p.phase*turn)-drain;
        for(const r of waveList){
          const age=simTime-r.t;
          if(age>2.8) continue;
          const d=Math.hypot(x-r.x,y-r.y), envelope=Math.max(0,1-age/2.8)*Math.exp(-d*5);
          h+=92*Math.sin(d*85-age*12)*envelope;
        }
        h=Math.max(9,h);
        // Reflections at the air/film interfaces: phase shift gives sin²(2πnt cosθ/λ).
        const optical=2*Math.PI*1.34*h*cosAngle;
        const brightness=.80+.16*Math.sin(y*4+x*3);
        const red=Math.sin(optical/630), green=Math.sin(optical/530), blue=Math.sin(optical/460);
        data[i]=Math.min(255,11+245*brightness*red*red);
        data[i+1]=Math.min(255,12+245*brightness*green*green);
        data[i+2]=Math.min(255,19+245*brightness*blue*blue);
        data[i+3]=237;
      }
      fc.putImageData(filmImage,0,0);
      lc.drawImage(filmBuffer,0,0,size,size);
    }
    lc.save();
    lc.globalAlpha=dipped?.82:1;
    lc.shadowColor=dipped?"#dfcbf457":"#f1caff99";
    lc.shadowBlur=dipped?3:6;
    lc.drawImage(frameBuffer,0,0);
    lc.shadowBlur=0;
    lc.drawImage(frameBuffer,0,0);
    lc.restore();
    if(dipped){
      // Specular veil suggests the frame is still just below the bath surface.
      lc.save();circlePath(lc,center,center,center*.924);lc.clip();
      const veil=lc.createLinearGradient(0,0,size,size);
      veil.addColorStop(0,"#d5c3f016");veil.addColorStop(.48,"#9defeb10");veil.addColorStop(1,"#b4c8ff08");
      lc.fillStyle=veil;lc.fillRect(0,0,size,size);lc.restore();
    }
  }
  function setLiquidStatus(prefix) {
    liquidStatus.textContent=prefix+" · "+(numCells-popped.size)+" / "+numCells+" film cells";
  }
  function simulateLiquid(time){
    liquidRAF=null;
    if(!liquidActive||!spiro.open||paused||document.hidden||reduceMotion.matches)return;
    if(previousTime===0) previousTime=time;
    const dt=Math.min(.1,(time-previousTime)/1000);previousTime=time;
    simTime+=dt;
    if(wet&&!dipped) elapsedFilm+=dt;
    ripples=ripples.filter(r=>simTime-r.t<2.8);
    if(time-lastPaint>32){paintLiquid();lastPaint=time;}
    liquidRAF=requestAnimationFrame(simulateLiquid);
  }
  function startLiquid(){
    if(liquidRAF!==null||!liquidActive||paused||document.hidden||reduceMotion.matches)return;
    previousTime=0;lastPaint=0;liquidRAF=requestAnimationFrame(simulateLiquid);
  }
  function stopLiquid(){if(liquidRAF!==null)cancelAnimationFrame(liquidRAF);liquidRAF=null;previousTime=0;}
  function addRipple(x,y){
    const last=ripples[ripples.length-1];
    if(last&&Math.hypot(x-last.x,y-last.y)<.022&&simTime-last.t<.14) return;
    ripples.push({x,y,t:simTime});if(ripples.length>10)ripples.shift();
  }
  function dipFrame(){
    dipped=true;wet=false;elapsedFilm=0;popped.clear();ripples=[];
    filmSeed=Math.random()*turn;
    dipBtn.textContent="Lift frame";
    setLiquidStatus(numCells?"Submerged. Lift to reveal the film":"Submerged; no closed cells in this drawing");
    paintLiquid();
  }
  function liftFrame(){
    dipped=false;wet=true;elapsedFilm=0;dipBtn.textContent="Dip again";
    setLiquidStatus(numCells?"Film retained — drag to swirl or pop a cell":"Open strokes cannot retain film; draw a closed curve or add a study");
    paintLiquid();
  }
  function enterLiquid(){
    stopTrace();
    captureGeometry();
    if(framePixels===0){traceStatus.textContent="Trace a pattern or add a geometric study first.";return;}
    liquidActive=true;paused=reduceMotion.matches;
    pauseBtn.textContent=paused?"Resume":"Freeze";pauseBtn.setAttribute("aria-pressed",String(paused));
    paper.hidden=true;toolsPanel.hidden=true;liquidStage.hidden=false;liquidTools.hidden=false;
    spiro.classList.add("dt-liquid-active");
    originalHint.textContent="Dip your own drawing in a virtual bath, then lift it to catch the light.";
    dipFrame();startLiquid();dipBtn.focus({preventScroll:true});
  }
  function exitLiquid(restoreFocus=true){
    if(!liquidActive)return;
    stopLiquid();liquidActive=false;liquidPointer=null;
    paper.hidden=false;toolsPanel.hidden=false;liquidStage.hidden=true;liquidTools.hidden=true;
    spiro.classList.remove("dt-liquid-active");originalHint.textContent=savedHint;
    if(restoreFocus)liquidOpen.focus({preventScroll:true});
  }
  liquidOpen.addEventListener("click",enterLiquid);
  L("back").addEventListener("click",()=>exitLiquid());
  dipBtn.addEventListener("click",()=>dipped?liftFrame():dipFrame());
  function setMode(next){
    mode=next;stirBtn.setAttribute("aria-pressed",String(mode==="stir"));popBtn.setAttribute("aria-pressed",String(mode==="pop"));
    liquidCanvas.style.cursor=mode==="pop"?"crosshair":"grab";
  }
  stirBtn.addEventListener("click",()=>setMode("stir"));popBtn.addEventListener("click",()=>setMode("pop"));
  function liquidXY(e){
    const r=liquidCanvas.getBoundingClientRect();
    return {x:Math.max(0,Math.min(.9999,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(.9999,(e.clientY-r.top)/r.height))};
  }
  function interactLiquid(e){
    const {x,y}=liquidXY(e);
    if(mode==="pop"&&wet&&!dipped){
      const id=cells[Math.floor(y*N)*N+Math.floor(x*N)];
      if(id&&!popped.has(id)){popped.add(id);setLiquidStatus("Cell released");paintLiquid();}
    }else if(mode==="stir"){
      addRipple(x,y);paintLiquid();
    }
  }
  liquidCanvas.addEventListener("pointerdown",e=>{
    if(e.button!==0||liquidPointer!==null)return;
    liquidPointer=e.pointerId;liquidCanvas.setPointerCapture(e.pointerId);interactLiquid(e);
  });
  liquidCanvas.addEventListener("pointermove",e=>{if(e.pointerId===liquidPointer&&mode==="stir")interactLiquid(e);});
  for(const type of ["pointerup","pointercancel","lostpointercapture"])liquidCanvas.addEventListener(type,e=>{if(e.pointerId===liquidPointer)liquidPointer=null;});
  for(const input of [thickness,viscosity,flow,light]){
    input.addEventListener("input",()=>{L("thickness-label").textContent=thickness.value+" nm";if(input===thickness)elapsedFilm=0;paintLiquid();});
  }
  L("thickness-label").textContent=thickness.value+" nm";
  finish.addEventListener("change",()=>{paintFrame();paintLiquid();});
  pauseBtn.addEventListener("click",()=>{
    paused=!paused;pauseBtn.textContent=paused?"Resume":"Freeze";pauseBtn.setAttribute("aria-pressed",String(paused));
    if(paused)stopLiquid();else if(!reduceMotion.matches)startLiquid();else{paused=true;pauseBtn.textContent="Freeze (motion reduced)";pauseBtn.setAttribute("aria-pressed","true");}
    paintLiquid();
  });
  saveBtn.addEventListener("click",()=>{
    paintLiquid();liquidCanvas.toBlob(blob=>{if(!blob)return;const a=document.createElement("a");const url=URL.createObjectURL(blob);a.href=url;a.download="KT-liquid-geometry.png";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},"image/png");
  });
  document.addEventListener("visibilitychange",()=>{if(document.hidden)stopLiquid();else startLiquid();});
  reduceMotion.addEventListener("change",()=>{if(reduceMotion.matches){stopLiquid();paused=true;pauseBtn.textContent="Freeze (motion reduced)";pauseBtn.setAttribute("aria-pressed","true");}});
  spiro.addEventListener("close",()=>exitLiquid(false));

  spiro.addEventListener("close", () => {
    stopTrace();
    if (pointer !== null) {
      if (paper.hasPointerCapture(pointer.id)) paper.releasePointerCapture(pointer.id);
      pointer = null;
      paper.classList.remove("is-dragging");
    }
    traceStatus.textContent = "";
  });

  renderGuide();
})();

