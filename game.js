// ===================== Lazman Sachs — the part that is definitely not in the SEC filing
// Hold A + S + D + W at the same time on the dashboard to declassify it.
// In-game:  W = jump · S = duck · D = accelerate · A = decelerate · Esc = back to work
//
// The banker leaps out of the square Revenue pie-chart cell, across the gap, and onto
// the long Share-Price cell — where the $LAZ line has gone all noodly. He runs across
// the flimsy line; the pie chart bounces over after him and gives chase.

(function () {
  const grid = document.getElementById('gridStage');
  const pieCard = document.querySelector('.pie-card');
  const lineCard = document.querySelector('.line-card');
  const canvas = document.getElementById('gameCanvas');
  const hud = document.getElementById('gameHud');
  const banner = document.getElementById('gameBanner');
  const scoreEl = document.getElementById('score');
  const speedEl = document.getElementById('speed');
  if (!canvas || !grid) return;
  const ctx = canvas.getContext('2d');

  // ---- world geometry (measured from the real cells at launch) ----
  let W = 900, H = 340, GROUND = 320;
  let left = { x0: 0, x1: 0 }, right = { x0: 0, x1: 0 };
  let platformY = 240, ropeBaseY = 236, manCenterX = 200;
  let emergeX = 120, emergeY = 150; // the pie chart's centre — where the banker springs out
  let rope = [];

  // ---- game state ----
  let state = 'off'; // off | intro | ready | playing | dead
  let player, obstacles, particles, score, speedMul, baseSpeed, dist, spawnT, frame, shakeT, readyT, introT, chaser;

  const DEATHS = [
    { big: 'MARGIN CALL', sub: 'A man in a vest is on the phone. He is not happy.' },
    { big: 'BEAR MARKET', sub: 'A literal bear ate your portfolio. And your briefcase.' },
    { big: 'AUDITED', sub: 'The forensic accountants have questions about "Vibes-as-a-Service".' },
    { big: 'CIRCUIT BREAKER', sub: 'Trading halted. So were you. By that obstacle.' },
    { big: 'SHAREHOLDER REVOLT', sub: 'They voted. The vote was "boooo".' },
    { big: 'FELL OFF THE LINE', sub: 'The $LAZ line was, in hindsight, alarmingly flimsy.' },
  ];
  const PIE = [
    { v: 38, c: '#092c61' }, { v: 27, c: '#446ea6' }, { v: 18, c: '#7297c5' },
    { v: 11, c: '#a9c1dd' }, { v: 6, c: '#5b7282' },
  ];

  // ---------------- measurement ----------------
  function measure() {
    const gr = grid.getBoundingClientRect();
    const pr = pieCard.getBoundingClientRect();
    const lr = lineCard.getBoundingClientRect();
    W = Math.max(640, Math.round(gr.width));
    H = Math.max(260, Math.round(gr.height));
    canvas.width = W; canvas.height = H;
    left = { x0: Math.round(pr.left - gr.left), x1: Math.round(pr.right - gr.left) };
    right = { x0: Math.round(lr.left - gr.left), x1: Math.round(lr.right - gr.left) };
    GROUND = H - 14;
    platformY = Math.round(H * 0.64);
    ropeBaseY = platformY - 6;
    manCenterX = right.x0 + Math.min(120, Math.round((right.x1 - right.x0) * 0.30));
    // where the banker springs from: the centre of the real pie chart in the Revenue cell
    const pieEl = document.getElementById('pieChart');
    if (pieEl) {
      const p = pieEl.getBoundingClientRect();
      emergeX = Math.round(p.left + p.width / 2 - gr.left);
      emergeY = Math.round(p.top + p.height / 2 - gr.top);
    } else {
      emergeX = (left.x0 + left.x1) / 2; emergeY = Math.round(H * 0.45);
    }
    buildRope();
    positionOverlays();
  }

  // keep the HUD and the game-over banner inside the Share-Price cell only
  function positionOverlays() {
    const gw = grid.clientWidth || W;
    const l = right.x0 + 'px', r = Math.max(0, gw - right.x1) + 'px';
    hud.style.left = l; hud.style.right = r;
    banner.style.left = l; banner.style.right = r;
  }
  function clearOverlayPos() {
    hud.style.left = hud.style.right = '';
    banner.style.left = banner.style.right = '';
  }

  // ---------------- the noodly $LAZ line ----------------
  function buildRope() {
    rope = [];
    const N = 30;
    for (let i = 0; i < N; i++) {
      const x = right.x0 + (right.x1 - right.x0) * (i / (N - 1));
      rope.push({ x, y: ropeRestY(x), vy: 0 });
    }
  }
  function ropeRestY(x) {
    const t = (x + (dist || 0) * 0.9) * 0.016;
    return ropeBaseY - (Math.sin(t) * 15 + Math.sin(t * 2.3) * 8);
  }
  function ropeYat(px) {
    if (rope.length === 0) return ropeBaseY;
    if (px <= rope[0].x) return rope[0].y;
    const last = rope.length - 1;
    if (px >= rope[last].x) return rope[last].y;
    const seg = (right.x1 - right.x0) / last;
    const i = Math.min(last - 1, Math.floor((px - right.x0) / seg));
    const a = rope[i], b = rope[i + 1];
    const f = (px - a.x) / (b.x - a.x);
    return a.y + (b.y - a.y) * f;
  }
  function applyLoad(px, force) {
    if (force <= 0 || rope.length === 0) return;
    const last = rope.length - 1;
    const seg = (right.x1 - right.x0) / last;
    const i = Math.round((px - right.x0) / seg);
    for (let d = -1; d <= 1; d++) {
      const j = i + d;
      if (j > 0 && j < last) rope[j].vy += force * (d === 0 ? 1 : 0.5);
    }
  }
  function updateRope() {
    const last = rope.length - 1;
    if (last < 2) return;
    // ends pinned to the cell edges (the line is bolted to both charts)
    rope[0].y = ropeRestY(rope[0].x); rope[0].vy = 0;
    rope[last].y = ropeRestY(rope[last].x); rope[last].vy = 0;
    for (let i = 1; i < last; i++) {
      const p = rope[i];
      const rest = ropeRestY(p.x);
      p.vy += (rest - p.y) * 0.05;                              // weak pull to rest = saggy
      p.vy += ((rope[i - 1].y + rope[i + 1].y) / 2 - p.y) * 0.55; // strong neighbor coupling = noodly
      p.vy += 0.22;                                             // gravity sag
      p.vy *= 0.84;                                             // light damping = wobbly/flimsy
    }
    applyLoad(manCenterX, player && player.grounded ? 3.0 : 0);
    if (chaser && chaser.active) applyLoad(chaser.x, 3.4);
    for (let i = 1; i < last; i++) rope[i].y += rope[i].vy;
  }

  function reset() {
    player = { x: manCenterX - 15, y: ropeBaseY, vy: 0, w: 30, h: 44, grounded: true, duck: false, run: 0, spin: 0, flip: 0 };
    obstacles = [];
    particles = [];
    score = 0; dist = 0; speedMul = 1; baseSpeed = 4.2; spawnT = 60; frame = 0; shakeT = 0; readyT = 90;
    introT = 0;
    chaser = { x: manCenterX - 70, y: ropeBaseY - 26, r: 26, rot: 0, active: true };
  }

  // ---------------- input ----------------
  const down = new Set();
  const pressT = {};        // last keydown time for each trigger key
  const TRIG = ['a', 's', 'd', 'w'];
  let armed = false;

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    down.add(k);

    if (state === 'off') {
      // Launch when a, s, d AND w are all pressed within a short window — NOT
      // necessarily held at the same instant. Many laptop keyboards (membrane
      // matrices) can't report 4 arbitrary keys held simultaneously (ghosting),
      // so the old "all four down at once" check never fired on them.
      if (TRIG.includes(k)) {
        const now = e.timeStamp || performance.now();
        pressT[k] = now;
        if (TRIG.every((key) => now - (pressT[key] || -1e9) <= 900)) startGame();
      }
      return;
    }

    if (['a', 's', 'd', 'w', ' ', 'escape', 'arrowup', 'arrowdown'].includes(k)) e.preventDefault();
    if (k === 'escape') { exitGame(); return; }
    if (armed) return;

    if (state === 'playing') {
      if (k === 'w' && player.grounded) jump();
    } else if (state === 'dead' && k === 'w') {
      state = 'ready'; banner.classList.add('hidden'); reset();
    }
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    down.delete(k);
    if (armed && !TRIG.some((key) => down.has(key))) armed = false;
  });

  function jump() {
    player.vy = -12.0;
    player.grounded = false;
    player.spin = 1;
    for (let i = 0; i < 8; i++) particles.push(puff(player.x + 4, player.y, '#7297c5'));
  }

  // ---------------- session control ----------------
  function startGame() {
    // ignore game input only for trigger keys still physically held
    armed = TRIG.some((key) => down.has(key));
    measure();
    reset();
    state = 'intro';
    // banker starts hidden inside the pie chart in the Revenue cell
    player.x = emergeX - player.w / 2;
    player.y = emergeY + player.h / 2;
    player.grounded = false;
    chaser.active = false;
    chaser.x = emergeX; chaser.y = emergeY;
    grid.classList.add('playing');
    canvas.classList.remove('hidden');
    hud.classList.remove('hidden');
    lineCard.classList.add('shake');
    setTimeout(() => lineCard.classList.remove('shake'), 400);
    loop();
  }
  function exitGame() {
    state = 'off';
    grid.classList.remove('playing');
    canvas.classList.add('hidden');
    hud.classList.add('hidden');
    banner.classList.add('hidden');
    clearOverlayPos();
    TRIG.forEach((k) => delete pressT[k]); // fresh window needed to relaunch
  }
  function die(custom) {
    state = 'dead';
    shakeT = 18;
    const d = custom || DEATHS[Math.floor(Math.random() * DEATHS.length)];
    for (let i = 0; i < 26; i++) particles.push(puff(player.x, player.y - 10, '#b2570d'));
    banner.innerHTML = `<div><span class="big">📉 ${d.big}</span>${d.sub}` +
      `<small>Final profit: <b style="color:#092c61">$${score.toLocaleString()}</b></small>` +
      `<small>press <b>W</b> to try again · <b>Esc</b> to go back to the spreadsheet</small></div>`;
    banner.classList.remove('hidden');
  }

  // ---------------- particles ----------------
  function puff(x, y, color) {
    return { x, y, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 5 - 1, life: 1, color, r: 2 + Math.random() * 3 };
  }
  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.life -= 0.03;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  // ---------------- obstacles (they ride the noodle) ----------------
  function spawn() {
    const high = Math.random() < 0.42;
    if (high) {
      const kinds = [
        { e: '🚁', label: 'AUDIT', h: 30, w: 46 },
        { e: '✈️', label: '', h: 26, w: 44 },
        { e: '📠', label: 'SUBPOENA', h: 28, w: 44 },
      ];
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      obstacles.push({ x: right.x1 + 24, w: kind.w, h: kind.h, high: true, e: kind.e, label: kind.label, bob: Math.random() * 6.28 });
    } else {
      const kinds = [
        { e: '🐻', w: 34, h: 38 }, { e: '💼', w: 30, h: 30 },
        { e: '🧾', w: 26, h: 34 }, { e: '🔻', w: 28, h: 30 },
      ];
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      obstacles.push({ x: right.x1 + 24, w: kind.w, h: kind.h, high: false, e: kind.e, bob: 0 });
    }
  }
  function obsTop(o) {
    const ry = ropeYat(o.x + o.w / 2);
    return o.high ? ry - 42 - o.h + Math.sin(o.bob) * 4 : ry - o.h;
  }

  // ---------------- main loop ----------------
  function loop() {
    if (state === 'off') return;
    frame++;
    update();
    render();
    requestAnimationFrame(loop);
  }

  // The reveal: the banker springs out of the Revenue pie chart and leaps across
  // the gap into the Share-Price cell — then the pie chart bounces over after him.
  // The two cells stay separate; only the leapers cross between them.
  function updateIntro() {
    introT++;
    updateRope();
    const ropeFeet = ropeYat(manCenterX);

    if (introT <= 48) {
      // A — banker leaps from the pie cell onto the noodly $LAZ line
      const t = introT / 48, e = t * t * (3 - 2 * t);
      const fromX = emergeX - player.w / 2, toX = manCenterX - player.w / 2;
      player.x = fromX + (toX - fromX) * e;
      const fromY = emergeY + player.h / 2, toY = ropeFeet;
      player.y = (fromY + (toY - fromY) * e) - 150 * Math.sin(Math.PI * t);
      player.flip = t * Math.PI * 2;
      player.grounded = false;
      if (introT === 48) { for (let i = 0; i < 12; i++) particles.push(puff(manCenterX, ropeFeet, '#7297c5')); applyLoad(manCenterX, 9); }
    } else if (introT <= 100) {
      // B — banker rides the line; the pie chart bounces out of its cell after him
      player.x = manCenterX - player.w / 2;
      player.y = ropeYat(manCenterX);
      player.grounded = true; player.flip = 0; player.run += 0.25;
      chaser.active = true;
      const t = (introT - 48) / 52, e = t * t * (3 - 2 * t);
      const fromX = emergeX, toX = manCenterX - 74;
      chaser.x = fromX + (toX - fromX) * e;
      chaser.rot += 0.4;
      chaser.y = (ropeYat(chaser.x) - chaser.r) - 130 * Math.sin(Math.PI * t);
      if (introT === 100) { for (let i = 0; i < 10; i++) particles.push(puff(chaser.x, ropeYat(chaser.x), '#5b7282')); applyLoad(chaser.x, 9); }
    } else {
      spawnT = 18;
      state = 'playing';
    }
    updateParticles();
  }

  function update() {
    if (state === 'intro') { updateIntro(); return; }
    if (state === 'ready') {
      updateRope();
      player.y = ropeYat(manCenterX); player.grounded = true;
      chaser.y = ropeYat(chaser.x) - chaser.r;
      readyT--;
      if (readyT <= 0) state = 'playing';
      return;
    }
    if (state === 'dead') {
      updateParticles();
      if (shakeT > 0) shakeT--;
      return;
    }

    // ---- speed control (hold D to accelerate, A to decelerate) ----
    if (!armed && down.has('d')) speedMul = Math.min(2.2, speedMul + 0.03);
    else if (!armed && down.has('a')) speedMul = Math.max(0.55, speedMul - 0.03);
    else speedMul += (1 - speedMul) * 0.02;
    player.duck = !armed && down.has('s') && player.grounded;

    const speed = baseSpeed * speedMul * (1 + dist / 12000);
    dist += speed;
    score += Math.round(speed * speedMul);
    scoreEl.textContent = score.toLocaleString();
    speedEl.textContent = speedMul.toFixed(1) + 'x';

    updateRope();

    // ---- banker rides the flimsy line ----
    player.x = manCenterX - player.w / 2;
    player.vy += 0.62;
    player.y += player.vy;
    const ry = ropeYat(manCenterX);
    if (player.y >= ry) { player.y = ry; player.vy = 0; player.grounded = true; }
    else player.grounded = false;
    if (player.spin > 0) player.spin = Math.max(0, player.spin - 0.08);
    if (player.grounded) player.run += speed * 0.12;

    // ---- the pie chart, rolling after you along the line ----
    const safeGap = -22 + (speedMul - 0.55) * 175;
    chaser.x += ((manCenterX - safeGap) - chaser.x) * 0.045;
    chaser.x = Math.max(right.x0 - 30, chaser.x);
    chaser.y = ropeYat(chaser.x) - chaser.r;
    chaser.rot += speed * 0.05;
    if (speedMul > 1.3 && frame % 5 === 0) particles.push(puff(chaser.x - chaser.r, chaser.y + chaser.r, 'rgba(91,114,130,0.6)'));
    if (chaser.x + chaser.r * 0.55 >= manCenterX) {
      die({ big: 'CONSUMED BY THE PIE CHART', sub: 'Your own revenue breakdown caught up and rolled right over you. Should have diversified.' });
      return;
    }

    // ---- obstacles ----
    spawnT -= speedMul;
    if (spawnT <= 0) {
      spawn();
      const minGap = Math.max(34, 78 - dist / 400);
      spawnT = minGap + Math.random() * 46;
    }
    const ph = player.duck ? player.h * 0.55 : player.h;
    const py = player.y - ph;
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.x -= speed;
      if (o.high) o.bob += 0.15;
      if (o.x + o.w < right.x0 - 30) { obstacles.splice(i, 1); continue; }
      const pad = 6;
      const oy = obsTop(o);
      if (player.x + pad < o.x + o.w && player.x + player.w - pad > o.x &&
          py + pad < oy + o.h && py + ph > oy + pad) {
        die();
        return;
      }
    }

    if (speedMul > 1.4 && frame % 6 === 0) {
      const p = puff(player.x + 10, player.y - 20, '#398025');
      p.vx = -speed * 0.6; p.vy = -1; particles.push(p);
    }
    updateParticles();
  }

  // ---------------- rendering ----------------
  function render() {
    ctx.save();
    ctx.clearRect(0, 0, W, H); // transparent — the Revenue cell keeps showing its real pie chart
    if (shakeT > 0) ctx.translate((Math.random() - 0.5) * shakeT, (Math.random() - 0.5) * shakeT);

    // ===== the game lives entirely inside the Share-Price cell (clipped to it) =====
    ctx.save();
    roundRect(right.x0, 0, right.x1 - right.x0, H, 4);
    ctx.clip();

    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#eef2f6');
    ctx.fillStyle = g;
    ctx.fillRect(right.x0 - 4, -4, (right.x1 - right.x0) + 8, H + 8);

    drawSkyline();
    drawRope();

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    obstacles.forEach((o) => {
      const oy = obsTop(o);
      ctx.font = (o.h + 6) + 'px serif';
      ctx.fillText(o.e, o.x + o.w / 2, oy + o.h / 2);
      if (o.label) {
        ctx.font = '500 9px Basis, sans-serif';
        ctx.fillStyle = '#c2170a';
        ctx.fillText(o.label, o.x + o.w / 2, oy - 6);
      }
    });
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';

    // once they've landed, the runners live inside the cell
    if (state === 'playing' || state === 'dead' || state === 'ready') {
      if (chaser && chaser.active) drawChaser();
      drawPlayer();
    }

    if (state === 'ready') {
      const cxm = (right.x0 + right.x1) / 2;
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      ctx.fillRect(right.x0, 0, right.x1 - right.x0, H);
      ctx.fillStyle = '#092c61'; ctx.textAlign = 'center';
      ctx.font = '500 28px Basis, sans-serif';
      const n = Math.ceil(readyT / 30);
      ctx.fillText(n > 0 ? n : 'GO', cxm, H / 2 - 6);
      ctx.fillStyle = '#5b7282'; ctx.font = '400 12px Basis, sans-serif';
      ctx.fillText('W jump · S duck · D faster · A slower', cxm, H / 2 + 22);
      ctx.textAlign = 'left';
    }
    ctx.restore(); // end Share-Price clip

    // ===== during the intro the leapers cross between the two cells (unclipped) =====
    if (state === 'intro') {
      if (chaser && chaser.active) drawChaser();
      drawPlayer();
    }

    particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.fill();
    });
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  function drawSkyline() {
    ctx.fillStyle = '#d7dee5';
    const base = GROUND;
    const cols = Math.ceil(W / 46) + 2;
    for (let i = 0; i < cols; i++) {
      const bx = ((i * 46) - (dist * 0.25 % 46)) - 30;
      const bh = 30 + ((i * 53) % 70);
      ctx.fillRect(bx, base - bh, 34, bh);
      ctx.fillStyle = 'rgba(114,151,197,0.5)';
      for (let wy = base - bh + 8; wy < base - 8; wy += 12) {
        if ((Math.floor(wy) + i) % 3 === 0) ctx.fillRect(bx + 6, wy, 5, 5);
      }
      ctx.fillStyle = '#d7dee5';
    }
  }

  // the right rectangle: the flimsy, scrolling $LAZ line they run across
  function drawRope() {
    if (rope.length < 2) return;
    const last = rope.length - 1;
    // faint area under the line
    ctx.beginPath();
    ctx.moveTo(rope[0].x, rope[0].y);
    for (let i = 1; i < rope.length; i++) {
      const a = rope[i - 1], b = rope[i];
      ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
    }
    ctx.lineTo(rope[last].x, H); ctx.lineTo(rope[0].x, H); ctx.closePath();
    ctx.fillStyle = 'rgba(114,151,197,0.08)'; ctx.fill();
    // the line itself
    ctx.beginPath();
    ctx.moveTo(rope[0].x, rope[0].y);
    for (let i = 1; i < rope.length; i++) {
      const a = rope[i - 1], b = rope[i];
      ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
    }
    ctx.lineTo(rope[last].x, rope[last].y);
    ctx.strokeStyle = '#446ea6'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.stroke();
    // anchor posts at both cell edges
    ctx.fillStyle = '#092c61';
    ctx.fillRect(rope[0].x - 2, rope[0].y, 4, H - rope[0].y);
    ctx.fillRect(rope[last].x - 2, rope[last].y, 4, H - rope[last].y);
    ctx.fillStyle = 'rgba(68,110,166,0.6)';
    ctx.font = '500 9px "Basis Mono", monospace';
    ctx.fillText('$LAZ', right.x0 + 6, ropeBaseY - 34);
  }

  function drawDonutAt(cx, cy, r, rot, withText) {
    if (r < 1) return;
    let a = rot;
    PIE.forEach((s) => {
      const a1 = a + (s.v / 100) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a, a1); ctx.closePath();
      ctx.fillStyle = s.c; ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6; ctx.stroke();
      a = a1;
    });
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.52, 0, 6.28); ctx.fillStyle = '#ffffff'; ctx.fill();
    if (withText && r > 28) {
      ctx.fillStyle = '#121212';
      ctx.font = '500 ' + Math.round(15 * (r / 50)) + 'px "Basis Mono", monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('$884M', cx, cy);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }
  }

  // the pie chart as a vengeful rolling wheel
  function drawChaser() {
    const r = chaser.r, cx = chaser.x, cy = chaser.y;
    if (cx < right.x0 - r * 2.5) return;
    let a = chaser.rot;
    PIE.forEach((s) => {
      const a1 = a + (s.v / 100) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a, a1); ctx.closePath();
      ctx.fillStyle = s.c; ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4; ctx.stroke();
      a = a1;
    });
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, 6.28); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.fillStyle = '#c2170a';
    ctx.beginPath(); ctx.arc(cx - 5, cy - 2, 2.6, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 5, cy - 2, 2.6, 0, 6.28); ctx.fill();
    ctx.strokeStyle = '#c2170a'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(cx - 8, cy - 7); ctx.lineTo(cx - 2, cy - 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 8, cy - 7); ctx.lineTo(cx + 2, cy - 4); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy + 6, 3, Math.PI + 0.4, -0.4); ctx.stroke();
  }

  function drawPlayer() {
    const ducking = player.duck;
    const h = ducking ? player.h * 0.55 : player.h;
    const x = player.x, y = player.y;
    ctx.save();
    ctx.translate(x + player.w / 2, y - h / 2);
    if (player.spin > 0) ctx.rotate(player.spin * 0.5 * Math.sin(player.spin * 3));
    if (player.flip) ctx.rotate(player.flip);

    if (player.grounded && !ducking) {
      const swing = Math.sin(player.run) * 6;
      ctx.strokeStyle = '#1a2238'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-4, h / 2 - 8); ctx.lineTo(-4 - swing, h / 2 + 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(5, h / 2 - 8); ctx.lineTo(5 + swing, h / 2 + 4); ctx.stroke();
    } else {
      ctx.strokeStyle = '#1a2238'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-4, h / 2 - 6); ctx.lineTo(-6, h / 2 + 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(5, h / 2 - 6); ctx.lineTo(7, h / 2 + 4); ctx.stroke();
    }

    ctx.fillStyle = '#092c61';
    roundRect(-player.w / 2 + 2, -h / 2 + 8, player.w - 4, h - 10, 5); ctx.fill();
    ctx.fillStyle = '#7297c5';
    ctx.beginPath();
    ctx.moveTo(0, -h / 2 + 10); ctx.lineTo(-3, -h / 2 + 16); ctx.lineTo(0, h / 2 - 6); ctx.lineTo(3, -h / 2 + 16);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#061d40'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-2, -h / 2 + 9); ctx.lineTo(-6, -h / 2 + 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2, -h / 2 + 9); ctx.lineTo(6, -h / 2 + 20); ctx.stroke();

    const armSwing = player.grounded ? Math.sin(player.run + 1) * 5 : -8;
    ctx.strokeStyle = '#092c61'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(player.w / 2 - 4, -h / 2 + 16); ctx.lineTo(player.w / 2 + 2, -h / 2 + 22 + armSwing); ctx.stroke();
    ctx.fillStyle = '#5b4632';
    roundRect(player.w / 2 - 4, -h / 2 + 22 + armSwing, 11, 9, 2); ctx.fill();
    ctx.fillStyle = '#7297c5'; ctx.fillRect(player.w / 2, -h / 2 + 22 + armSwing, 2, 2);

    ctx.fillStyle = '#f2cda0';
    ctx.beginPath(); ctx.arc(0, -h / 2 - 2, 9, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#2a2118';
    ctx.beginPath(); ctx.arc(0, -h / 2 - 4, 9, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-3, -h / 2 - 2, 2.6, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(4, -h / 2 - 2, 2.6, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#111';
    const look = ducking ? 1 : 1.6;
    ctx.beginPath(); ctx.arc(-3 + look, -h / 2 - 2, 1.2, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(4 + look, -h / 2 - 2, 1.2, 0, 6.28); ctx.fill();
    ctx.strokeStyle = '#7a3b3b'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0.5, -h / 2 + 4, 2.2, 0.2, Math.PI - 0.2); ctx.stroke();

    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
})();
