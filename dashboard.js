// ===================== Lazman Sachs — dashboard chrome =====================
// Builds the (entirely fabricated) charts so the terminal looks legit.

(function () {
  // ---- Animated KPI counters ----
  function animateCount(el) {
    const target = parseFloat(el.dataset.count);
    const prefix = el.dataset.prefix || '';
    const isMoney = el.dataset.money === '1';
    const dur = 1400;
    const start = performance.now();
    function fmt(n) {
      if (isMoney) {
        if (n >= 1e9) return prefix + (n / 1e9).toFixed(1) + 'B';
        if (n >= 1e6) return prefix + (n / 1e6).toFixed(1) + 'M';
        return prefix + Math.round(n).toLocaleString();
      }
      return prefix + Math.round(n).toLocaleString();
    }
    function tick(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt(target * eased);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  document.querySelectorAll('.kpi-value[data-count]').forEach(animateCount);

  // ---- Line chart (share price walk) ----
  const linePath = document.getElementById('linePath');
  const lineArea = document.getElementById('lineArea');
  if (linePath) {
    const W = 600, H = 240, N = 48;
    let v = 120;
    const pts = [];
    for (let i = 0; i < N; i++) {
      v += (Math.random() - 0.46) * 26;
      v = Math.max(30, Math.min(H - 20, v));
      const x = (i / (N - 1)) * W;
      pts.push([x, H - v]);
    }
    // bias the last few points up so the line always ends green & smug
    for (let i = N - 6; i < N; i++) pts[i][1] -= (i - (N - 6)) * 6;
    const ptStr = pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    linePath.setAttribute('points', ptStr);
    lineArea.setAttribute('points', '0,' + H + ' ' + ptStr + ' ' + W + ',' + H);
  }

  // ---- Pie chart (revenue by division) ----
  const pie = document.getElementById('pieChart');
  const legend = document.getElementById('pieLegend');
  const slices = [
    { label: 'Trading Desk', value: 38, color: '#d4af37' },
    { label: 'Wealth (Mis)mgmt', value: 27, color: '#5b8cff' },
    { label: 'Frozen Assets 🍦', value: 18, color: '#3ad29f' },
    { label: 'Bass Derivatives 🎸', value: 11, color: '#ff6b6b' },
    { label: 'Vibes-as-a-Service', value: 6, color: '#c084fc' },
  ];
  if (pie) {
    const cx = 100, cy = 100, r = 78;
    let acc = 0;
    const total = slices.reduce((s, x) => s + x.value, 0);
    const ns = 'http://www.w3.org/2000/svg';
    slices.forEach((s) => {
      const a0 = (acc / total) * Math.PI * 2 - Math.PI / 2;
      acc += s.value;
      const a1 = (acc / total) * Math.PI * 2 - Math.PI / 2;
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', `M${cx},${cy} L${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`);
      path.setAttribute('fill', s.color);
      path.setAttribute('stroke', '#111726');
      path.setAttribute('stroke-width', '2');
      path.style.transition = 'transform 0.2s';
      path.style.transformOrigin = '100px 100px';
      path.addEventListener('mouseenter', () => (path.style.transform = 'scale(1.04)'));
      path.addEventListener('mouseleave', () => (path.style.transform = 'scale(1)'));
      pie.appendChild(path);
    });
    // donut hole
    const hole = document.createElementNS(ns, 'circle');
    hole.setAttribute('cx', cx); hole.setAttribute('cy', cy); hole.setAttribute('r', 38);
    hole.setAttribute('fill', '#111726');
    pie.appendChild(hole);
    const t1 = document.createElementNS(ns, 'text');
    t1.setAttribute('x', cx); t1.setAttribute('y', cy - 2);
    t1.setAttribute('text-anchor', 'middle'); t1.setAttribute('fill', '#e8edf7');
    t1.setAttribute('font-size', '20'); t1.setAttribute('font-weight', '800');
    t1.textContent = '$884M';
    pie.appendChild(t1);
    const t2 = document.createElementNS(ns, 'text');
    t2.setAttribute('x', cx); t2.setAttribute('y', cy + 16);
    t2.setAttribute('text-anchor', 'middle'); t2.setAttribute('fill', '#8a98b8');
    t2.setAttribute('font-size', '10');
    t2.textContent = 'total revenue';
    pie.appendChild(t2);

    slices.forEach((s) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="swatch" style="background:${s.color}"></span>${s.label} <b>${s.value}%</b>`;
      legend.appendChild(li);
    });
  }
})();
