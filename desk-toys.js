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
    if (frame === null && pointer === null && !reduceMotion.matches) drawTo(angle + event.detail);
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
