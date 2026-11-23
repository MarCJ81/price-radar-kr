/* ============================================================
   시세 레이더 · engines/search-engine.js
   ------------------------------------------------------------
   붙인 오픈소스 (상업 배포 가능)
     · Fuse.js 7.0.0    Apache-2.0   오타·유사어 퍼지 검색
     · Chart.js 4.4.6   MIT          품목별 최저~최고 가격 범위 막대

   초성 검색(ㅇㅇㅋ → 에어컨 청소)은 Fuse 에 없는 기능이라
   한글 초성 변환을 이 파일에서 직접 한다(외부 의존 없음).

   브라우저: window.PriceSearch / node: require('./engines/search-engine.js')
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root, function (p) {
      try { return require(p); } catch (e) { return null; }
    });
  } else {
    root.PriceSearch = factory(root, null);
  }
})(typeof self !== 'undefined' ? self : this, function (root, req) {
  'use strict';

  var VERSION = '1.0.0';
  var Fuse = null;
  try { Fuse = (root && root.Fuse) || (req ? req('../assets/vendor/fuse.min.js') : null); } catch (e) { Fuse = null; }
  if (Fuse && Fuse.default && typeof Fuse.default === 'function') Fuse = Fuse.default;
  var hasFuse = typeof Fuse === 'function';

  /* ---------- 한글 초성 ---------- */
  var CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

  /** 한글 음절을 초성으로. 한글·영문·숫자는 그대로 둔다. */
  function chosung(text) {
    var s = String(text === null || text === undefined ? '' : text);
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var code = s.charCodeAt(i);
      if (code >= 0xAC00 && code <= 0xD7A3) {
        out += CHO[Math.floor((code - 0xAC00) / (21 * 28))];
      } else if (code >= 0x3131 && code <= 0x314E) {
        out += s[i]; // 이미 초성
      } else if (/[a-zA-Z0-9]/.test(s[i])) {
        out += s[i].toLowerCase();
      }
    }
    return out;
  }

  function hasHangulInitials(q) {
    return /[\u3131-\u314E]/.test(q);
  }

  /** 띄어쓰기·특수문자 제거한 비교용 문자열 */
  function compact(text) {
    return String(text === null || text === undefined ? '' : text)
      .toLowerCase()
      .replace(/[\s\-_,.·/()[\]{}]/g, '');
  }

  function haystackOf(item) {
    var bits = [item.name, (item.alias || []).join(' '), item.catLabel || '', item.basis || ''];
    (item.opts || []).forEach(function (o) { bits.push((o.choices || []).map(function (c) { return c.label; }).join(' ')); });
    return bits.join(' ');
  }

  /* ---------- Fuse 인덱스 ---------- */
  var caches = [];

  function build(items) {
    if (!hasFuse) return null;
    var records = (items || []).map(function (it, idx) {
      var aliases = (it.alias || []).join(' ');
      return {
        idx: idx,
        item: it,
        name: it.name,
        aliasText: aliases,
        hay: haystackOf(it),
        nameCho: chosung(it.name),
        aliasCho: chosung(aliases),
        hayCho: chosung(haystackOf(it)),
        nameCompact: compact(it.name),
        hayCompact: compact(haystackOf(it))
      };
    });
    return new Fuse(records, {
      includeScore: true,
      ignoreLocation: true,
      threshold: 0.5,
      minMatchCharLength: 2,
      fieldNormWeight: 0, // 긴 품명이 불리해지지 않게(길이 정규화 제거)
      keys: [
        { name: 'name', weight: 0.5 },
        { name: 'aliasText', weight: 0.28 },
        { name: 'nameCho', weight: 0.3 },
        { name: 'aliasCho', weight: 0.18 },
        { name: 'hay', weight: 0.12 },
        { name: 'hayCho', weight: 0.08 },
        { name: 'nameCompact', weight: 0.4 },
        { name: 'hayCompact', weight: 0.14 }
      ]
    });
  }

  function indexFor(items) {
    if (!hasFuse) return null;
    for (var i = 0; i < caches.length; i++) if (caches[i].items === items) return caches[i].fuse;
    var fuse = build(items);
    caches.push({ items: items, fuse: fuse });
    if (caches.length > 4) caches.shift();
    return fuse;
  }

  /**
   * search(items, query, opts) → [{ item, score }]
   * - 오타·유사어·초성 입력을 Fuse 로 찾는다.
   * - 정확히 일치하는 품명은 점수를 크게 깎아 앞세운다.
   */
  function search(items, query, opts) {
    var q = String(query === null || query === undefined ? '' : query).trim();
    if (!q || !hasFuse) return [];
    var o = opts || {};
    var fuse = indexFor(items);
    if (!fuse) return [];
    // 띄어쓰기를 지운 형태도 함께 찾는다: '에어콘청소' ↔ '에어컨 청소'
    var qc = compact(q);
    var seen = {};
    var results = [];
    var queries = [q];
    if (qc && qc !== q.replace(/\s+/g, '').toLowerCase()) queries.push(qc);
    else if (qc && /\s/.test(q)) queries.push(qc);
    for (var qi = 0; qi < queries.length; qi++) {
      var part = fuse.search(o.exactOnly ? '=' + queries[qi] : queries[qi]);
      for (var pi = 0; pi < part.length; pi++) {
        var key = part[pi].item && part[pi].item.idx;
        if (seen[key]) continue;
        seen[key] = true;
        results.push(part[pi]);
      }
    }
    var qCho = hasHangulInitials(q) ? chosung(q) : '';
    var qCompact = compact(q);
    var maxScore = typeof o.maxScore === 'number' ? o.maxScore : 0.45;
    var out = [];
    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      var rec = r.item;
      var score = typeof r.score === 'number' ? r.score : 1;
      var nameC = compact(rec.name);
      var aliasC = (rec.item.alias || []).map(compact);
      if (nameC === qCompact) score *= 0.2;
      else if (nameC.indexOf(qCompact) === 0) score *= 0.55;
      else if (aliasC.indexOf(qCompact) >= 0) score *= 0.6;
      else if (qCho && (rec.nameCho.indexOf(qCho) >= 0 || rec.aliasCho.indexOf(qCho) >= 0)) score *= 0.8;
      if (score > maxScore) continue;
      out.push({ item: rec.item, score: score, order: rec.idx });
    }
    out.sort(function (a, b) {
      if (a.score !== b.score) return a.score - b.score;
      return a.order - b.order;
    });
    return out;
  }

  /** 초성 검색이 가능한지(엔진 상태) */
  function status() {
    return { version: VERSION, hasFuse: hasFuse, hasChart: !!(root && root.Chart) };
  }

  /* ---------- 가격 범위 차트 ---------- */
  var cssVar = function (name, fallback) {
    try {
      if (root && root.getComputedStyle && root.document) {
        var v = root.getComputedStyle(root.document.documentElement).getPropertyValue(name);
        if (v && v.trim()) return v.trim();
      }
    } catch (e) { /* ignore */ }
    return fallback;
  };

  var charts = {};

  function money(n) {
    var v = Math.round(Number(n) || 0);
    if (v >= 100000000) return (Math.round(v / 10000000) / 10) + '억';
    if (v >= 10000) return (Math.round(v / 1000) / 10) + '만';
    return String(v);
  }

  /**
   * drawPriceChart(canvas, rows, opts)
   * rows: [{ label, low, avg, high }] — 최대 12개만 그린다.
   * Chart.js 가 없으면 null.
   */
  function drawPriceChart(canvas, rows, opts) {
    var Chart = root && root.Chart ? root.Chart : null;
    if (!Chart || !canvas) return null;
    var o = opts || {};
    var list = (rows || []).filter(function (r) { return r && r.low > 0; }).slice(0, o.limit || 12);
    if (!list.length) return null;
    list.sort(function (a, b) { return a.low - b.low; });
    var key = canvas.id || 'price-range';
    if (charts[key]) { charts[key].destroy(); delete charts[key]; }
    var accent = cssVar('--accent', '#0f766e');
    var ink = cssVar('--ink', '#14181f');
    var line = cssVar('--line', 'rgba(20,24,31,.12)');
    charts[key] = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: list.map(function (r) { return r.label; }),
        datasets: [
          {
            label: '최저~최고',
            data: list.map(function (r) { return [r.low, r.high]; }),
            backgroundColor: accent + '55',
            borderColor: accent,
            borderWidth: 1,
            borderRadius: 4,
            barPercentage: 0.62
          },
          {
            label: '평균',
            type: 'scatter',
            data: list.map(function (r) { return { x: r.avg, y: r.label }; }),
            parsing: false,
            pointStyle: 'rectRot',
            pointRadius: 7,
            pointBorderWidth: 2,
            pointBorderColor: cssVar('--surface', '#fff'),
            backgroundColor: accent,
            showLine: false
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 240 },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                var r = list[ctx.dataIndex];
                if (!r) return '';
                return '최저 ' + money(r.low) + ' · 평균 ' + money(r.avg) + ' · 최고 ' + money(r.high) + '원';
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: line },
            ticks: { color: ink, font: { size: 10 }, callback: function (v) { return money(v); } }
          },
          y: {
            grid: { display: false },
            ticks: { color: ink, font: { size: 10.5 }, autoSkip: false }
          }
        }
      }
    });
    return charts[key];
  }

  function destroy(chartId) {
    if (charts[chartId]) { charts[chartId].destroy(); delete charts[chartId]; }
  }

  return {
    VERSION: VERSION,
    hasFuse: hasFuse,
    chosung: chosung,
    hasHangulInitials: hasHangulInitials,
    compact: compact,
    search: search,
    status: status,
    drawPriceChart: drawPriceChart,
    money: money,
    destroy: destroy
  };
});
