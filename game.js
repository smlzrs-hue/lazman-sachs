// ===================== Lazman Sachs — the part that is definitely not in the SEC filing
// Hold A + S + D + W at the same time on the dashboard to declassify it.
// In-game:  W = jump · S = duck · D = accelerate · A = decelerate · Esc = back to work

(function () {
  const wrap = document.getElementById('pieWrap');
  const canvas = document.getElementById('gameCanvas');
  const hud = document.getElementById('gameHud');
  const banner = document.getElementById('gameBanner');
  const scoreEl = document.getElementById('score');
  const speedEl = document.getElementById('speed');
  const pieCard = wrap ? wrap.closest('.pie-card') : null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const GROUND = H - 54;

  // ---- global key state ----
  const down = new Set();
  let armed = false; // ignore in-game input until trigger keys released once

  // ---- game state ----
  let state = 'off'; // off | intro | ready | playing | dead
  let player, obstacles, particles, clouds, score, speedMul, baseSpeed, dist, spawnT, frame, shakeT, readyT, introT, donut, chaser;
  const DEATHS = [
    { big: 'MARGIN CALL', sub: 'A man in a vest is on the phone. He is not happy.' },
    { big: 'BEAR MARKET', sub: 'A literal bear ate your portfolio. And your briefcase.' },
    { big: 'AUDITED', sub: 'The forensic accountants have questions about "Vibes-as-a-Service".' },
    { big: 'CIRCUIT BREAKER', sub: 'Trading halted. So were you. By that obstacle.' },
    { big: 'SHAREHOLDER REVOLT', sub: 'They voted. The vote was "boooo".' },
  ];

  function reset() {
    player = { x: 90, y: GROUND, vy: 0, w: 30, h: 44, grounded: true, duck: false, run: 0, spin: 0, flip: 0 };
    obstacles = [];
    particles = [];
    clouds = [];
    for (let i = 0; i < 4; i++) clouds.push({ x: Math.random() * W, y: 20 + Math.random() * 70, s: 0.3 + Math.random() * 0.4, w: 40 + Math.random() * 50 });
    score = 0; dist = 0; speedMul = 1; baseSpeed = 4.2; spawnT = 60; frame = 0; shakeT = 0; readyT = 90;
    introT = 0;
    donut = { cx: W / 2, cy: 150, r: 66, rot: 0, scale: 1, show: false };
    chaser = { x: -80, rot: 0, r: 26 }; // the pie chart, out for revenge
  }

  // ---------------- input ----------------
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    down.add(k);

    // secret handshake — hold all four on the dashboard
    if (state === 'off' && down.has('a') && down.has('s') && down.has('d') && down.has('w')) {
      startGame();
      return;
    }

    if (state === 'off') return;
    // while a game session is open, eat asdw + esc so the page never scrolls
    if (['a', 's', 'd', 'w', ' ', 'escape', 'arrowup', 'arrowdown'].includes(k)) e.preventDefault();

    if (k === 'escape') { exitGame(); return; }
    if (armed) return; // still waiting for trigger keys to be released

    if (state === 'playing') {
      if (k === 'w' && player.grounded) jump();
    } else if (state === 'dead' && k === 'w') {
      state = 'ready'; banner.classList.add('hidden'); reset();
    }
  });

  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    down.delete(k);
    if (armed && !down.has('a') && !down.has('s') && !down.has('d') && !down.has('w')) armed = false;
  });

  function jump() {
    player.vy = -12.2;
    player.grounded = false;
    player.spin = 1;
    for (let i = 0; i < 8; i++) particles.push(puff(player.x + 4, GROUND, '#7297c5'));
  }

  // ---------------- session control ----------------
  function startGame() {
    state = 'intro';
    armed = true;
    reset();
    wrap.classList.add('playing');
    canvas.classList.remove('hidden');
    hud.classList.remove('hidden');
    if (pieCard) pieCard.classList.add('shake');
    setTimeout(() => pieCard && pieCard.classList.remove('shake'), 400);
    loop();
  }

  function exitGame() {
    state = 'off';
    wrap.classList.remove('playing');
    canvas.classList.add('hidden');
    hud.classList.add('hidden');
    banner.classList.add('hidden');
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

  // ---------------- obstacles ----------------
  function spawn() {
    const high = Math.random() < 0.42; // high => must DUCK ; low => must JUMP
    if (high) {
      // flying hazards you duck under
      const kinds = [
        { e: '🚁', label: 'AUDIT', h: 30, w: 46 },
        { e: '✈️', label: '', h: 26, w: 44 },
        { e: '📠', label: 'SUBPOENA', h: 28, w: 44 },
      ];
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      obstacles.push({ x: W + 30, y: GROUND - 46, w: kind.w, h: kind.h, type: 'high', e: kind.e, label: kind.label, bob: Math.random() * 6.28 });
    } else {
      const kinds = [
        { e: '🐻', w: 34, h: 38 },
        { e: '💼', w: 30, h: 30 },
        { e: '🧾', w: 26, h: 34 },
        { e: '🔻', w: 28, h: 30 },
      ];
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      obstacles.push({ x: W + 30, y: GROUND - kind.h, w: kind.w, h: kind.h, type: 'low', e: kind.e, bob: 0 });
    }
  }

  // ---------------- main loop ----------------
  function loop() {
    if (state === 'off') return;
    frame++;
    update();
    render();
    requestAnimationFrame(loop);
  }

  // The grand reveal: banker leaps into the chart, the chart spins the world
  // into motion, then the obstacles roll in.
  function updateIntro() {
    introT++;
    const cx = donut.cx, cy = donut.cy, feet = cy + 22;
    donut.show = true;

    if (introT <= 42) {
      // PHASE 1 — leap into the middle of the chart (with a full flip)
      const t = introT / 42;
      const e = 1 - (1 - t) * (1 - t);
      player.x = 40 + (cx - 40) * e;
      const baseY = GROUND + (feet - GROUND) * e;
      player.y = baseY - 150 * Math.sin(Math.PI * t);
      player.flip = t * Math.PI * 2;
      player.grounded = false;
      donut.scale = 1; donut.rot = 0;
      if (introT === 42) for (let i = 0; i < 14; i++) particles.push(puff(cx, cy, '#7297c5'));
    } else if (introT <= 96) {
      // PHASE 2 — the chart spins up and drags the whole world into motion
      const k = (introT - 42) / 54;
      donut.rot += 0.12 + k * 0.5;
      donut.scale = 1 - k;
      const spd = k * baseSpeed;
      dist += spd;
      clouds.forEach((c) => { c.x -= c.s * spd * 0.4; if (c.x < -c.w) c.x = W + 20; });
      player.x = cx;
      player.y = feet + Math.sin(introT * 0.35) * 5;
      player.flip = 0;
      player.grounded = false;
    } else {
      // PHASE 3 — banker drops onto the track and the obstacles appear
      if (introT === 97) spawnT = 16;
      const m = Math.min(1, (introT - 96) / 28);
      donut.scale = 0; donut.show = false;
      player.x = cx + (90 - cx) * (1 - (1 - m) * (1 - m));
      player.vy += 0.62; player.y += player.vy;
      if (player.y >= GROUND) { player.y = GROUND; player.vy = 0; player.grounded = true; }
      const spd = baseSpeed;
      dist += spd;
      clouds.forEach((c) => { c.x -= c.s * spd * 0.4; if (c.x < -c.w) c.x = W + 20; });
      spawnT -= 1;
      if (spawnT <= 0) { spawn(); spawnT = 56 + Math.random() * 30; }
      obstacles.forEach((o) => { o.x -= spd; if (o.type === 'high') o.bob += 0.15; });
      if (introT >= 124) { state = 'playing'; player.x = 90; }
    }
    updateParticles();
  }

  function update() {
    if (state === 'intro') { updateIntro(); return; }
    if (state === 'ready') {
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
    else speedMul += (1 - speedMul) * 0.02; // ease back to cruise
    player.duck = !armed && down.has('s') && player.grounded;

    const speed = baseSpeed * speedMul * (1 + dist / 9000);
    dist += speed;
    // profit scales with distance AND how recklessly fast you're going
    score += Math.round(speed * speedMul);
    scoreEl.textContent = score.toLocaleString();
    speedEl.textContent = speedMul.toFixed(1) + 'x';

    // ---- player physics ----
    player.vy += 0.62;
    player.y += player.vy;
    if (player.y >= GROUND) { player.y = GROUND; player.vy = 0; player.grounded = true; }
    if (player.spin > 0) player.spin = Math.max(0, player.spin - 0.08);
    if (player.grounded) player.run += speed * 0.12;

    // ---- clouds parallax ----
    clouds.forEach((c) => { c.x -= c.s * speed * 0.4; if (c.x < -c.w) { c.x = W + 20; c.y = 20 + Math.random() * 70; } });

    // ---- the pie chart, rolling after you ----
    // slow down too long and your own revenue breakdown rolls over you.
    const safeGap = -22 + (speedMul - 0.55) * 175; // low speed => it closes in
    chaser.x += ((player.x - safeGap) - chaser.x) * 0.045;
    chaser.rot += speed * 0.05;
    if (speedMul > 1.3 && frame % 5 === 0) particles.push(puff(chaser.x - chaser.r, GROUND, 'rgba(91,114,130,0.6)'));
    if (chaser.x + chaser.r * 0.55 >= player.x) {
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
      if (o.type === 'high') o.bob += 0.15;
      if (o.x + o.w < -10) { obstacles.splice(i, 1); continue; }
      // collision (with a little forgiveness)
      const pad = 6;
      const oy = o.y + (o.type === 'high' ? Math.sin(o.bob) * 4 : 0);
      if (player.x + pad < o.x + o.w && player.x + player.w - pad > o.x &&
          py + pad < oy + o.h && py + ph > oy + pad) {
        die();
        return;
      }
    }

    // money particles for flair while running fast
    if (speedMul > 1.4 && frame % 6 === 0) {
      const p = puff(player.x + 10, player.y - 20, '#398025');
      p.vx = -speed * 0.6; p.vy = -1; particles.push(p);
    }
    updateParticles();
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.life -= 0.03;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  // ---------------- rendering ----------------
  function render() {
    ctx.save();
    if (shakeT > 0) ctx.translate((Math.random() - 0.5) * shakeT, (Math.random() - 0.5) * shakeT);

    // sky — clean Goldman white-to-mist
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#eef2f6');
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, W + 40, H + 40);

    // clouds (Wall St "smoke")
    clouds.forEach((c) => {
      ctx.fillStyle = 'rgba(114,151,197,0.14)';
      roundRect(c.x, c.y, c.w, 14, 7); ctx.fill();
    });

    // skyline
    drawSkyline();

    // the $LAZ share-price line scrolling across the backdrop
    drawShareLine();

    // ground
    ctx.fillStyle = '#f2f5f7';
    ctx.fillRect(-20, GROUND, W + 40, H - GROUND + 20);
    ctx.strokeStyle = '#092c61';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-20, GROUND); ctx.lineTo(W + 20, GROUND); ctx.stroke();
    // moving dollar lane markers
    ctx.fillStyle = 'rgba(91,114,130,0.55)';
    ctx.font = '12px Inter';
    for (let i = 0; i < 12; i++) {
      const x = (i * 70 - (dist % 70));
      ctx.fillText('$', x, GROUND + 26);
    }

    // the chart itself — visible only while it's spinning the world to life
    if (state === 'intro' && donut.show && donut.scale > 0.02) drawDonut();

    // obstacles
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    obstacles.forEach((o) => {
      const oy = o.y + (o.type === 'high' ? Math.sin(o.bob) * 4 : 0);
      ctx.font = (o.h + 6) + 'px serif';
      ctx.fillText(o.e, o.x + o.w / 2, oy + o.h / 2);
      if (o.label) {
        ctx.font = '500 9px Basis, sans-serif';
        ctx.fillStyle = '#c2170a';
        ctx.fillText(o.label, o.x + o.w / 2, oy - 6);
      }
    });
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // the pie chart rolling in pursuit (behind the runner)
    if (state === 'playing' || state === 'dead') drawChaser();

    drawPlayer();

    // particles
    particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // ready overlay
    if (state === 'ready') {
      ctx.fillStyle = 'rgba(255,255,255,0.74)';
      ctx.fillRect(-20, -20, W + 40, H + 40);
      ctx.fillStyle = '#092c61';
      ctx.textAlign = 'center';
      ctx.font = '500 30px Basis, sans-serif';
      const n = Math.ceil(readyT / 30);
      ctx.fillText(n > 0 ? n : 'GO', W / 2, H / 2 - 6);
      ctx.fillStyle = '#5b7282';
      ctx.font = '400 12px Basis, sans-serif';
      ctx.fillText('W jump · S duck · D faster · A slower · Esc quit', W / 2, H / 2 + 22);
      ctx.textAlign = 'left';
    }

    ctx.restore();
  }

  const PIE = [
    { v: 38, c: '#092c61' }, { v: 27, c: '#446ea6' }, { v: 18, c: '#7297c5' },
    { v: 11, c: '#a9c1dd' }, { v: 6, c: '#5b7282' },
  ];
  function drawDonut() {
    const cx = donut.cx, cy = donut.cy, r = donut.r * donut.scale;
    if (r < 1) return;
    let a = donut.rot;
    PIE.forEach((s) => {
      const a1 = a + (s.v / 100) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a, a1);
      ctx.closePath();
      ctx.fillStyle = s.c;
      ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
      a = a1;
    });
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.52, 0, 6.28);
    ctx.fillStyle = '#ffffff'; ctx.fill();
    if (donut.scale > 0.55) {
      ctx.fillStyle = '#121212';
      ctx.font = '500 ' + Math.round(16 * donut.scale) + 'px "Basis Mono", monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('$884M', cx, cy);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }
  }

  // a faint, scrolling $LAZ share-price line living in the backdrop
  function drawShareLine() {
    const baseY = GROUND - 46;
    ctx.beginPath();
    for (let x = -10; x <= W + 10; x += 14) {
      const t = (x + dist * 0.6) * 0.018;
      const y = baseY - (Math.sin(t) * 16 + Math.sin(t * 2.7) * 7);
      if (x === -10) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(68,110,166,0.35)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = 'rgba(68,110,166,0.45)';
    ctx.font = '500 9px "Basis Mono", monospace';
    ctx.fillText('$LAZ', 6, baseY - 26);
  }

  // the pie chart, now a vengeful rolling wheel hunting the banker
  function drawChaser() {
    const r = chaser.r, cx = chaser.x, cy = GROUND - r;
    if (cx < -r * 2) return;
    let a = chaser.rot;
    PIE.forEach((s) => {
      const a1 = a + (s.v / 100) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a, a1); ctx.closePath();
      ctx.fillStyle = s.c; ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4; ctx.stroke();
      a = a1;
    });
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, 6.28); ctx.fillStyle = '#ffffff'; ctx.fill();
    // furious little face (kept upright while the wheel spins)
    ctx.fillStyle = '#c2170a';
    ctx.beginPath(); ctx.arc(cx - 5, cy - 2, 2.6, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 5, cy - 2, 2.6, 0, 6.28); ctx.fill();
    ctx.strokeStyle = '#c2170a'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(cx - 8, cy - 7); ctx.lineTo(cx - 2, cy - 4); ctx.stroke(); // angry brow
    ctx.beginPath(); ctx.moveTo(cx + 8, cy - 7); ctx.lineTo(cx + 2, cy - 4); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy + 6, 3, Math.PI + 0.4, -0.4); ctx.stroke(); // frown
  }

  function drawSkyline() {
    ctx.fillStyle = '#d7dee5';
    const base = GROUND;
    for (let i = 0; i < 16; i++) {
      const bx = ((i * 46) - (dist * 0.25 % 46)) - 30;
      const bh = 40 + ((i * 53) % 80);
      ctx.fillRect(bx, base - bh, 34, bh);
      // windows
      ctx.fillStyle = 'rgba(114,151,197,0.55)';
      for (let wy = base - bh + 8; wy < base - 8; wy += 12) {
        if ((Math.floor(wy) + i) % 3 === 0) ctx.fillRect(bx + 6, wy, 5, 5);
      }
      ctx.fillStyle = '#d7dee5';
    }
  }

  function drawPlayer() {
    const ducking = player.duck;
    const h = ducking ? player.h * 0.55 : player.h;
    const x = player.x, y = player.y; // y is feet
    ctx.save();
    ctx.translate(x + player.w / 2, y - h / 2);
    if (player.spin > 0) ctx.rotate(player.spin * 0.5 * Math.sin(player.spin * 3));
    if (player.flip) ctx.rotate(player.flip);

    // legs (animate while grounded)
    if (player.grounded && !ducking) {
      const swing = Math.sin(player.run) * 6;
      ctx.strokeStyle = '#1a2238';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-4, h / 2 - 8); ctx.lineTo(-4 - swing, h / 2 + 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(5, h / 2 - 8); ctx.lineTo(5 + swing, h / 2 + 4); ctx.stroke();
    } else {
      ctx.strokeStyle = '#1a2238';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-4, h / 2 - 6); ctx.lineTo(-6, h / 2 + 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(5, h / 2 - 6); ctx.lineTo(7, h / 2 + 4); ctx.stroke();
    }

    // body — Goldman navy suit
    ctx.fillStyle = '#092c61';
    roundRect(-player.w / 2 + 2, -h / 2 + 8, player.w - 4, h - 10, 5); ctx.fill();
    // signature-blue tie
    ctx.fillStyle = '#7297c5';
    ctx.beginPath();
    ctx.moveTo(0, -h / 2 + 10); ctx.lineTo(-3, -h / 2 + 16); ctx.lineTo(0, h / 2 - 6); ctx.lineTo(3, -h / 2 + 16);
    ctx.closePath(); ctx.fill();
    // lapels
    ctx.strokeStyle = '#061d40'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-2, -h / 2 + 9); ctx.lineTo(-6, -h / 2 + 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2, -h / 2 + 9); ctx.lineTo(6, -h / 2 + 20); ctx.stroke();

    // arm + briefcase swinging
    const armSwing = player.grounded ? Math.sin(player.run + 1) * 5 : -8;
    ctx.strokeStyle = '#092c61'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(player.w / 2 - 4, -h / 2 + 16); ctx.lineTo(player.w / 2 + 2, -h / 2 + 22 + armSwing); ctx.stroke();
    ctx.fillStyle = '#5b4632';
    roundRect(player.w / 2 - 4, -h / 2 + 22 + armSwing, 11, 9, 2); ctx.fill();
    ctx.fillStyle = '#7297c5'; ctx.fillRect(player.w / 2, -h / 2 + 22 + armSwing, 2, 2);

    // head
    ctx.fillStyle = '#f2cda0';
    ctx.beginPath(); ctx.arc(0, -h / 2 - 2, 9, 0, 6.28); ctx.fill();
    // hair
    ctx.fillStyle = '#2a2118';
    ctx.beginPath(); ctx.arc(0, -h / 2 - 4, 9, Math.PI, 0); ctx.fill();
    // panicked eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-3, -h / 2 - 2, 2.6, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(4, -h / 2 - 2, 2.6, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#111';
    const look = ducking ? 1 : 1.6;
    ctx.beginPath(); ctx.arc(-3 + look, -h / 2 - 2, 1.2, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(4 + look, -h / 2 - 2, 1.2, 0, 6.28); ctx.fill();
    // worried mouth
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
