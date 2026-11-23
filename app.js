/* ============================================================
   깜깜이 시세 레이더 · app.js
   화면 조립과 이벤트. 모든 계산은 core.js, 데이터는 data.js.
   ============================================================ */
(function () {
  'use strict';

  var C = window.PriceCore;
  var CATS = window.PriceData.CATEGORIES;
  var ITEMS = window.PriceData.ITEMS;
  var PS = window.PriceSearch || null;   // engines/search-engine.js (Fuse.js·Chart.js)
  var Pro = window.ProConnector || null; // engines/pro-api-connector.js (무료 AI 맛보기)
  if (PS && C.useSearch) C.useSearch(PS);
  var FREE_APP = 'price-radar-kr';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var state = {
    tab: 'radar',
    cat: 'all',
    q: '',
    globals: { region: 'metro', urgent: 'normal' },
    itemId: null,
    modalSel: null,
    cmpItemId: ITEMS[0].id,
    cmpSel: null,
    quotes: ['', '', '']
  };

  var MEMO_KEY = 'price-radar-memo-v1';

  /* ---------- 작은 도구 ---------- */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function compact(v) {
    var n = Math.round(Number(v) || 0);
    if (n >= 10000) {
      var man = Math.round(n / 1000) / 10;
      return String(man).replace(/\.0$/, '') + '만';
    }
    return n.toLocaleString('ko-KR') + '원';
  }

  function catOf(id) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i].id === id) return CATS[i];
    return CATS[0];
  }

  /* 인라인 SVG 아이콘 — 외부 요청·이모지 폰트 의존 없이 같은 굵기로 그린다. */
  var ICONS = {
    car: '<path d="M3.2 15.4h17.6"/><path d="M5 15.4V19h2.8v-3.6"/><path d="M16.2 15.4V19H19v-3.6"/><path d="M4.6 15.4l1.5-5.1c.2-.8.9-1.3 1.7-1.3h8.4c.8 0 1.5.5 1.7 1.3l1.5 5.1"/><path d="M7.2 12.6h1.4M15.4 12.6h1.4"/>',
    home: '<path d="M4 10.4 12 3.8l8 6.6V20h-5.7v-5.4H9.7V20H4z"/>',
    appliance: '<path d="M12 3.4v17.2M4.6 7.6l14.8 8.8M19.4 7.6 4.6 16.4"/><path d="M12 6.6l2.2-1.3M12 6.6 9.8 5.3M12 17.4l2.2 1.3M12 17.4l-2.2 1.3"/>',
    dental: '<path d="M8.3 4.3c1.3 0 1.8.6 3.7.6s2.4-.6 3.7-.6c2.2 0 3.4 1.7 3.4 4.1 0 2-.7 3.2-1.2 5-.4 1.5-.5 5.6-2.2 5.6-1.4 0-1.2-3.7-2.1-5-.4-.5-1.4-.5-1.8 0-.9 1.3-.7 5-2.1 5-1.7 0-1.8-4.1-2.2-5.6-.5-1.8-1.2-3-1.2-5 0-2.4 1.2-4.1 3.3-4.1z"/>',
    move: '<path d="M3 7.2h9.6V16H3z"/><path d="M12.6 10h4l3.1 3.1V16h-7.1z"/><circle cx="6.6" cy="18.2" r="1.5"/><circle cx="16.4" cy="18.2" r="1.5"/>',
    it: '<rect x="4" y="5.4" width="16" height="10.2" rx="1.6"/><path d="M2.4 18.6h19.2"/>'
  };

  function catIcon(id) {
    var p = ICONS[id] || ICONS.home;
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }

  function itemOf(id) {
    for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === id) return ITEMS[i];
    return ITEMS[0];
  }

  function confText(c) {
    return c === 'official' ? '공식 자료' : c === 'published' ? '업체 공개가' : '시장 집계';
  }

  function toast(msg) {
    var el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  function copyText(text, okMsg) {
    var done = function () { toast(okMsg || '복사했습니다'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    if (ok) done(); else toast('복사에 실패했습니다. 길게 눌러 선택해 주세요.');
  }

  /* ---------- 렌더: 히어로 통계 ---------- */

  function renderHeroStats() {
    var srcNames = {};
    ITEMS.forEach(function (it) {
      (it.sources || []).forEach(function (s) { srcNames[s.name] = 1; });
    });
    var count = Object.keys(srcNames).length;
    var traps = ITEMS.reduce(function (n, it) { return n + (it.traps || []).length; }, 0);
    var questions = ITEMS.reduce(function (n, it) { return n + (it.questions || []).length; }, 0);
    var conf = { official: 0, published: 0, market: 0 };
    ITEMS.forEach(function (it) { conf[it.conf] = (conf[it.conf] || 0) + 1; });
    $('#heroStats').innerHTML = [
      '<div class="stat"><p>세부 품목</p><b>' + ITEMS.length + '<small>개</small></b><span class="delta">' + CATS.length + '업종 · 함정 ' + traps + '</span></div>',
      '<div class="stat"><p>실측 출처</p><b>' + count + '<small>곳</small></b><span class="delta">공식 ' + conf.official + ' · 공개 ' + conf.published + ' · 시장 ' + conf.market + '</span></div>',
      '<div class="stat"><p>현장 질문</p><b>' + questions + '<small>문장</small></b><span class="delta">품목마다 3문장 · 복사 가능</span></div>',
      '<div class="stat"><p>외부 전송</p><b>0<small>건</small></b><span class="delta">서버·CDN·추적 없음</span></div>'
    ].join('');
    var live = $('#liveCount');
    if (live) live.textContent = String(ITEMS.length);
  }

  /* ---------- 렌더: 히어로 타일 ---------- */

  function renderHeroTile() {
    var holder = $('#heroTile');
    if (!holder) return;
    var ranked = ITEMS.slice().sort(function (a, b) {
      return (b.band.high / Math.max(1, b.band.low)) - (a.band.high / Math.max(1, a.band.low));
    });
    var it = ranked[0];
    var band = C.calcBand(it, C.defaultSelection(it, it.globals || []));
    var w = C.bandWidths(band);
    var ratio = Math.round(band.high / Math.max(1, band.low) * 10) / 10;
    var cat = catOf(it.cat);
    holder.innerHTML = [
      '<span class="tile-top"><span class="tile-kicker">WIDEST BAND · 같은 이름, 다른 값</span><span class="tag live">실측</span></span>',
      '<strong class="tile-name">' + esc(it.name) + '</strong>',
      '<span class="tile-sub">' + esc(cat.label) + ' · ' + esc(it.unit) + '</span>',
      '<span class="tile-band">',
      '  <span><i>최저</i><b>' + compact(band.low) + '</b></span>',
      '  <span><i>평균</i><b>' + compact(band.avg) + '</b></span>',
      '  <span><i>최고</i><b>' + compact(band.high) + '</b></span>',
      '</span>',
      '<span class="bar" style="--avg:' + Math.round(w.avg * 100) + '%"><span class="bar-track"><i class="bar-avg"></i></span></span>',
      '<span class="tile-note">최저와 최고의 차이 ' + C.won(band.high - band.low) + ' · ' + ratio + '배</span>',
      '<span class="tile-foot"><span>함정 ' + (it.traps || []).length + ' · 질문 ' + (it.questions || []).length + ' · 출처 ' + (it.sources || []).length + '곳</span><span class="go">자세히 →</span></span>'
    ].join('');
    holder.setAttribute('data-item', it.id);
    holder.setAttribute('aria-label', it.name + ' 시세 자세히 보기');
  }

  /* ---------- 렌더: 칩·필터 ---------- */

  function renderChips() {
    var counts = {};
    ITEMS.forEach(function (it) { counts[it.cat] = (counts[it.cat] || 0) + 1; });
    var html = '<button class="chip' + (state.cat === 'all' ? ' is-active' : '') + '" data-cat="all" aria-pressed="' + (state.cat === 'all') + '">전체 <span class="n">' + ITEMS.length + '</span></button>';
    CATS.forEach(function (c) {
      html += '<button class="chip' + (state.cat === c.id ? ' is-active' : '') + '" data-cat="' + c.id + '" aria-pressed="' + (state.cat === c.id) + '">' +
        catIcon(c.id) + esc(c.label) + ' <span class="n">' + (counts[c.id] || 0) + '</span></button>';
    });
    $('#catChips').innerHTML = html;
  }

  function renderGlobalFilters() {
    var region = C.GLOBALS.region, urgent = C.GLOBALS.urgent;
    var html = '<div class="gsel"><label for="gRegion">지역</label><select id="gRegion">' +
      region.choices.map(function (c) {
        return '<option value="' + c.v + '"' + (state.globals.region === c.v ? ' selected' : '') + '>' + esc(c.label) + '</option>';
      }).join('') + '</select></div>';
    html += '<div class="gsel"><label for="gUrgent">시간</label><select id="gUrgent">' +
      urgent.choices.map(function (c) {
        return '<option value="' + c.v + '"' + (state.globals.urgent === c.v ? ' selected' : '') + '>' + esc(c.label) + '</option>';
      }).join('') + '</select></div>';
    $('#globalFilters').innerHTML = html;
  }

  function renderQuick() {
    var picks = ['벽걸이 에어컨 청소', '브레이크 패드', '임플란트', '원룸 이사', '도배', '아이폰 액정', '누수탐지'];
    $('#quickRow').innerHTML = picks.map(function (p) {
      return '<button class="quick" type="button" data-quick="' + esc(p) + '">' + esc(p) + '</button>';
    }).join('');
  }

  /* ---------- 렌더: 카드 ---------- */

  function selectionFor(item) {
    var sel = C.defaultSelection(item, item.globals || []);
    (item.globals || []).forEach(function (k) {
      if (state.globals[k] !== undefined) sel[k] = state.globals[k];
    });
    return sel;
  }

  function cardHtml(it) {
    var band = C.calcBand(it, selectionFor(it));
    var w = C.bandWidths(band);
    var cat = catOf(it.cat);
    return [
      '<button class="card" type="button" data-item="' + it.id + '" aria-label="' + esc(it.name) + ' 시세 자세히 보기">',
      '  <span class="card-top"><span class="card-cat">' + catIcon(cat.id) + '<span>' + esc(cat.label) + '</span></span>',
      '  <span class="badge ' + it.conf + '">' + confText(it.conf) + '</span></span>',
      '  <h3>' + esc(it.name) + '</h3>',
      '  <span class="unit">' + esc(it.unit) + ' · ' + esc(it.basis) + '</span>',
      '  <span class="band">',
      '    <span class="band-cell start"><span>최저</span><b title="' + C.won(band.low) + '">' + compact(band.low) + '</b></span>',
      '    <span class="band-cell mid"><span>평균</span><b title="' + C.won(band.avg) + '">' + compact(band.avg) + '</b></span>',
      '    <span class="band-cell end"><span>최고</span><b title="' + C.won(band.high) + '">' + compact(band.high) + '</b></span>',
      '  </span>',
      '  <span class="bar" style="--avg:' + Math.round(w.avg * 100) + '%">',
      '    <span class="bar-track"><i class="bar-avg"></i></span>',
      '    <span class="bar-labels"><span>최저가</span><span>평균</span><span>최고가</span></span>',
      '  </span>',
      '  <span class="card-meta">함정 3 · 질문 3 · 출처 ' + ((it.sources || []).length) + '곳</span>',
      '  <span class="card-foot"><span class="pill">' + esc((it.sources && it.sources[0] ? it.sources[0].asof : '2026') + ' 기준') + '</span><span class="go">자세히 →</span></span>',
      '</button>'
    ].join('');
  }

  function renderCards() {
    var list = C.searchItems(ITEMS, state.q, state.cat);
    var q = state.q.trim();
    var exactCount = q ? C.searchExact(ITEMS, q, state.cat).length : list.length;
    var fuzzy = !!(q && exactCount === 0 && list.length > 0);
    $('#cards').innerHTML = list.map(cardHtml).join('');
    $('#resultCount').innerHTML = q
      ? (fuzzy
        ? '“' + esc(q) + '”와 비슷한 품목 <em>' + list.length + '</em>건'
        : '“' + esc(q) + '” 검색 결과 <em>' + list.length + '</em>건')
      : '전체 <em>' + list.length + '</em>개 품목';
    var hintEl = $('#resultHint');
    if (hintEl) {
      hintEl.textContent = fuzzy
        ? '정확히 같은 이름은 없지만 초성·오타를 보고 가까운 품목을 찾았습니다. 다르면 아래 브리지에서 직접 조사하세요.'
        : '카드를 누르면 조건별 계산·함정 포인트·질문 3문장이 열립니다.';
    }
    $('#emptyState').hidden = !(q && list.length === 0);
    $('#cards').hidden = !!(q && list.length === 0);
    $('#resultHint').hidden = !!(q && list.length === 0);
    $('#clearQ').hidden = !q;
    renderPriceChart(list);
    var nf = $('#notFound');
    if (nf) {
      nf.hidden = !q;
      var nfq = $('#notFoundQ');
      if (nfq) nfq.textContent = '“' + q + '”';
    }
  }

  /* ---------- 가격 범위 차트 (Chart.js) ---------- */

  function bandFor(it) {
    var sel = C.defaultSelection(it, it.globals || []);
    (it.globals || []).forEach(function (k) { if (state.globals[k] !== undefined) sel[k] = state.globals[k]; });
    return C.calcBand(it, sel);
  }

  function renderPriceChart(list) {
    var panel = $('#rangePanel');
    var canvas = $('#priceChart');
    if (!panel) return;
    if (!PS || !PS.drawPriceChart || !list || !list.length) {
      panel.hidden = true;
      if (PS && PS.destroy) PS.destroy('priceChart');
      return;
    }
    panel.hidden = false;
    var rows = list.slice().sort(function (a, b) { return bandFor(a).low - bandFor(b).low; }).slice(0, 12).map(function (it) {
      var b = bandFor(it);
      return { label: it.name.length > 24 ? it.name.slice(0, 23) + '…' : it.name, low: b.low, avg: b.avg, high: b.high };
    });
    var meta = $('#rangeMeta');
    if (meta) meta.textContent = rows.length + '개 품목 · ' + (state.q ? '검색 결과' : '전체') + ' · 조건 반영';
    try {
      PS.drawPriceChart(canvas, rows);
    } catch (e) {
      panel.hidden = true;
    }
  }

  /* ---------- 무료 AI 맛보기 (키 없이) ---------- */

  function freeStatus(text, kind) {
    var el = $('#freeStatus');
    if (!el) return;
    el.className = 'micro' + (kind ? ' free-' + kind : '');
    el.textContent = text;
  }

  function freeAsk() {
    if (!Pro) { freeStatus('무료 AI 엔진을 불러오지 못했습니다. engines/pro-api-connector.js 를 확인하세요.', 'error'); return; }
    var name = $('#bridgeName') ? $('#bridgeName').value.trim() : '';
    if (!name) { toast('품목·증상을 먼저 적어 주세요'); freeStatus('품목·증상을 먼저 적어 주세요.', 'error'); return; }
    var btn = $('[data-action="free-ask"]');
    if (btn) btn.disabled = true;
    freeStatus('무료 체험으로 조사 중… (10~30초)', '');
    var out = $('#freeOut');
    if (out) out.hidden = true;
    var card = $('#freeCard');
    if (card) card.innerHTML = '';
    Pro.generateFree({
      task: 'text',
      prompt: bridgePrompt(),
      system: '너는 한국 소비자 가격 조사원이다. 확인된 자료만 쓰고, 확인되지 않은 숫자는 [확인 필요]로 남긴다. 표와 출처 링크·날짜를 함께 적는다.'
    }, { app: FREE_APP, truncate: true, timeoutMs: 45000 }).then(function (res) {
      if (btn) btn.disabled = false;
      if (res.ok) {
        if (out) {
          out.hidden = false;
          out.textContent = res.text + '\n\n— 무료 체험 AI 초안입니다. 금액과 출처는 꼭 원문에서 확인하세요.';
        }
        var left = res.quota ? ' · 남은 ' + res.quota.remaining + '/' + res.quota.limit + '회' : '';
        freeStatus('무료 체험으로 받았습니다' + left + (res.truncated ? ' · 2,000자 제한으로 프롬프트를 줄였습니다' : '') + '.', 'ok');
      } else if (res.upgrade) {
        freeStatus(res.message, 'error');
        if (card && Pro.freeLimitCard) {
          var c = Pro.freeLimitCard(res);
          card.innerHTML = '<div class="free-card"><b>' + esc(c.title) + '</b><p>' + esc(c.body) + '</p>' +
            '<a href="' + esc(c.primary.href) + '" target="_blank" rel="noopener noreferrer">' + esc(c.primary.label) + ' ↗</a></div>';
        }
      } else {
        freeStatus(res.message || '무료 체험에 실패했습니다.', 'error');
      }
    }, function () {
      if (btn) btn.disabled = false;
      freeStatus('무료 체험에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.', 'error');
    });
  }

  /* ---------- 모달 ---------- */

  function optionFields(item, sel, prefix) {
    var out = [];
    (item.opts || []).forEach(function (o) {
      out.push('<label class="field"><span>' + esc(o.label) + '</span><select data-opt="' + o.key + '" id="' + prefix + o.key + '">' +
        o.choices.map(function (c) {
          return '<option value="' + c.v + '"' + (sel[o.key] === c.v ? ' selected' : '') + '>' + esc(c.label) + '</option>';
        }).join('') + '</select></label>');
    });
    (item.globals || []).forEach(function (k) {
      var g = C.GLOBALS[k];
      if (!g) return;
      out.push('<label class="field"><span>' + esc(g.label) + '</span><select data-opt="' + g.key + '" id="' + prefix + g.key + '">' +
        g.choices.map(function (c) {
          return '<option value="' + c.v + '"' + (sel[g.key] === c.v ? ' selected' : '') + '>' + esc(c.label) + '</option>';
        }).join('') + '</select></label>');
    });
    return out.join('');
  }

  function bandBlockHtml(it, band) {
    var w = C.bandWidths(band);
    return [
      '<div class="m-band">',
      '  <div class="grid3">',
      '    <div class="cell low"><span>최저가</span><b>' + C.won(band.low) + '</b></div>',
      '    <div class="cell avg"><span>평균가</span><b>' + C.won(band.avg) + '</b></div>',
      '    <div class="cell high"><span>최고가</span><b>' + C.won(band.high) + '</b></div>',
      '  </div>',
      '  <div class="bar" style="--avg:' + Math.round(w.avg * 100) + '%"><div class="bar-track"><i class="bar-avg"></i></div></div>',
      '  <p class="m-note">' + esc(C.savingsText(band)) + ' · ' + esc(it.unit) + ' 기준</p>',
      '</div>'
    ].join('');
  }

  function openModal(id) {
    var it = itemOf(id);
    var sel = C.defaultSelection(it, it.globals || []);
    (it.globals || []).forEach(function (k) { if (state.globals[k] !== undefined) sel[k] = state.globals[k]; });
    state.itemId = id;
    state.modalSel = sel;
    var band = C.calcBand(it, sel);
    var cat = catOf(it.cat);

    var html = [
      '<div class="m-head">',
      '  <p class="m-cat">' + cat.icon + ' ' + esc(cat.label) + ' · ' + esc(it.unit) + ' · ' + esc(it.basis) + '</p>',
      '  <h2 id="modalTitle">' + esc(it.name) + '</h2>',
      '  <p class="m-sub"><span class="badge ' + it.conf + '">' + confText(it.conf) + '</span> · 출처 ' + (it.sources || []).length + '곳 · 2026-11-21 조회</p>',
      '</div>',
      '<div id="modalBand">' + bandBlockHtml(it, band) + '</div>',
      '<div class="m-block"><h3>조건 바꿔 계산 <span class="k">선택 즉시 반영</span></h3>',
      '  <div class="m-opts" id="modalOpts">' + (optionFields(it, sel, 'm_') || '<p class="micro">이 항목은 조건 보정이 없습니다.</p>') + '</div>',
      '  <div class="steps" id="modalSteps"></div>',
      '  <p class="micro" id="modalDerive">' + esc(it.derive || '') + '</p>',
      '</div>',
      '<div class="m-block"><h3>추가금 붙는 함정 포인트 <span class="k">3</span></h3>',
      '  <div class="trap-list">' + (it.traps || []).map(function (t, i) {
        return '<div class="trap"><span class="n">' + (i + 1) + '</span><span>' + esc(t) + '</span></div>';
      }).join('') + '</div>',
      '</div>',
      '<div class="m-block"><h3>현장에서 호구 안 당하는 질문 3문장 <span class="k">그대로 읽으세요</span></h3>',
      '  <div class="q-list">' + (it.questions || []).map(function (q) {
        return '<div class="q-item"><p>“' + esc(q) + '”</p><button class="copy" type="button" data-copy-q="' + esc(q) + '">복사</button></div>';
      }).join('') + '</div>',
      '  <div class="m-actions"><button class="btn primary" type="button" data-action="copy-all-q">질문 3문장 한 번에 복사</button>',
      '  <button class="btn" type="button" data-action="compare-this">이 항목 견적 비교</button></div>',
      '</div>',
      '<div class="m-block"><h3>출처·기준일</h3><div class="src-list">' + (it.sources || []).map(function (s) {
        return '<div class="src"><b>' + esc(s.name) + '</b> <span class="asof">(' + esc(s.asof) + ')</span><br /><a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">원문 보기</a></div>';
      }).join('') + '</div></div>',
      '<p class="m-disclaimer">공개 자료를 범위로 정리한 참고값입니다. 실제 금액은 현장 상태·업체·시점에 따라 달라지며, 이 화면은 특정 업체의 견적이나 추천이 아닙니다. 계약 전 서면 견적과 포함 항목을 확인하세요.</p>'
    ].join('');

    $('#modalBody').innerHTML = html;
    updateModalBand();
    var body = $('#modalBody');
    if (body) body.scrollTop = 0;

    var dlg = $('#itemModal');
    if (dlg && typeof dlg.showModal === 'function') {
      if (!dlg.open) dlg.showModal();
    } else if (dlg) {
      dlg.setAttribute('open', '');
    }
    document.body.classList.add('modal-open');
  }

  function updateModalBand() {
    var it = itemOf(state.itemId);
    if (!it || !state.modalSel) return;
    var band = C.calcBand(it, state.modalSel);
    var holder = $('#modalBand');
    if (holder) holder.innerHTML = bandBlockHtml(it, band);
    var steps = $('#modalSteps');
    if (steps) {
      steps.innerHTML = band.steps.length
        ? band.steps.map(function (s) { return '<span class="step">' + esc(s.label) + ' <b>' + esc(s.detail) + '</b></span>'; }).join('')
        : '';
    }
  }

  function closeModal() {
    var dlg = $('#itemModal');
    if (dlg && typeof dlg.close === 'function' && dlg.open) dlg.close();
    else if (dlg) dlg.removeAttribute('open');
    document.body.classList.remove('modal-open');
    state.itemId = null;
  }

  /* ---------- 견적 비교 ---------- */

  function fillCompareItemSelect() {
    var html = '';
    CATS.forEach(function (c) {
      html += '<optgroup label="' + esc(c.icon + ' ' + c.label) + '">';
      ITEMS.filter(function (it) { return it.cat === c.id; }).forEach(function (it) {
        html += '<option value="' + it.id + '"' + (state.cmpItemId === it.id ? ' selected' : '') + '>' + esc(it.name) + '</option>';
      });
      html += '</optgroup>';
    });
    $('#cmpItem').innerHTML = html;
  }

  function renderCompare() {
    var it = itemOf(state.cmpItemId);
    if (!state.cmpSel) {
      state.cmpSel = C.defaultSelection(it, it.globals || []);
    }
    $('#cmpCondition').innerHTML = optionFields(it, state.cmpSel, 'c_');
    var band = C.calcBand(it, state.cmpSel);
    $('#cmpBand').innerHTML = [
      '<div class="row"><div class="big">' + C.won(band.avg) + '<small>평균</small></div>',
      '<div class="range">최저 ' + C.won(band.low) + ' ~ 최고 ' + C.won(band.high) + '</div></div>',
      '<div class="bar" style="--avg:' + Math.round(C.bandWidths(band).avg * 100) + '%"><div class="bar-track"><i class="bar-avg"></i></div></div>',
      '<p class="micro">' + esc(it.name) + ' · ' + esc(it.unit) + ' · ' + esc(it.basis) + '</p>'
    ].join('');
    renderQuoteInputs();
  }

  function renderQuoteInputs() {
    var rows = state.quotes.map(function (q, i) {
      return '<div class="quote-row">' +
        '<input type="text" data-quote-name="' + i + '" placeholder="업체 ' + (i + 1) + ' (선택)" value="' + esc((state.quoteNames && state.quoteNames[i]) || '') + '" aria-label="업체 ' + (i + 1) + ' 이름" />' +
        '<input type="number" inputmode="numeric" min="0" step="1000" data-quote="' + i + '" placeholder="금액" value="' + esc(q) + '" aria-label="업체 ' + (i + 1) + ' 견적 금액" />' +
        '<button type="button" class="del" data-del-quote="' + i + '" aria-label="' + (i + 1) + '번 견적 지우기">×</button>' +
        '</div>';
    });
    $('#quoteInputs').innerHTML = rows.join('');
  }

  function readQuotes() {
    $$('[data-quote]').forEach(function (el) {
      var i = Number(el.getAttribute('data-quote'));
      state.quotes[i] = el.value;
    });
    state.quoteNames = $$('[data-quote-name]').map(function (el) { return el.value; });
  }

  function judge() {
    readQuotes();
    var it = itemOf(state.cmpItemId);
    var band = C.calcBand(it, state.cmpSel);
    var names = state.quoteNames || [];
    var entries = state.quotes.map(function (v, i) {
      var n = Number(String(v).replace(/[^\d]/g, ''));
      return { num: n, name: (names[i] && names[i].trim()) || ('업체 ' + (i + 1)) };
    }).filter(function (e) { return e.num > 0; });
    var res = C.compareQuotes(entries.map(function (e) { return e.num; }), band);
    res.rows.forEach(function (r, i) { r.name = entries[i].name; });
    var panel = $('#judgePanel');

    if (!res.rows.length) {
      panel.innerHTML = '<p class="placeholder">금액을 하나 이상 넣어 주세요. 업체 이름은 비워도 됩니다.</p>';
      return;
    }

    var html = '<h2 style="font-size:15px;margin-bottom:12px">판정 결과 · 평균 ' + C.won(band.avg) + ' 기준</h2><div class="judge-list">';
    res.rows.forEach(function (r, i) {
      var name = r.name || ('업체 ' + (i + 1));
      var isBest = res.rows.length > 1 && r.quote === res.best.quote;
      html += '<div class="judge' + (isBest ? ' top' : '') + '">' +
        '<div class="judge-head"><span class="judge-name">' + esc(name) + (isBest ? ' · 최저' : '') + '</span>' +
        '<span class="judge-price">' + C.won(r.quote) + '</span></div>' +
        '<div class="judge-head"><span class="vtag ' + r.verdict.tone + '">' + r.verdict.icon + ' ' + r.verdict.label + '</span>' +
        '<span style="font-size:12px;color:var(--muted)">평균 대비 ' + r.diffPct + '</span></div>' +
        '<div class="judge-bar"><i style="left:' + Math.round(r.posPct * 100) + '%"></i></div>' +
        '<div class="judge-scale"><span>' + compact(band.low) + '</span><span>평균 ' + compact(band.avg) + '</span><span>' + compact(band.high) + '</span></div>' +
        '<p class="judge-msg">' + esc(r.message) + '</p>' +
        '</div>';
    });
    html += '</div>';
    html += '<div class="summary">' + esc(res.summary) + '</div>';
    if (res.rows.length > 1) {
      html += '<p class="best-line">가장 합리적인 견적은 <strong>' + C.won(res.best.quote) + '</strong>입니다. 다만 금액이 낮을수록 빠진 작업이 없는지 확인하세요.</p>';
    }
    html += '<p class="micro">입력한 견적은 이 브라우저에만 저장됩니다. 서버로 전송되지 않습니다.</p>';
    panel.innerHTML = html;
    $('#copyJudge').disabled = false;
    state.lastJudge = { res: res, band: band, item: it, entries: entries };
    saveMemo();
  }

  function copyJudge() {
    if (!state.lastJudge) return;
    var it = state.lastJudge.item;
    var band = state.lastJudge.band;
    var lines = ['[깜깜이 시세 레이더] ' + it.name + ' 견적 비교', '평균 시세 ' + C.won(band.avg) + ' (최저 ' + C.won(band.low) + ' ~ 최고 ' + C.won(band.high) + ')', ''];
    state.lastJudge.res.rows.forEach(function (r, i) {
      var name = r.name || ('업체 ' + (i + 1));
      lines.push('- ' + name + ': ' + C.won(r.quote) + ' · ' + r.verdict.label + ' (평균 대비 ' + r.diffPct + ')');
    });
    lines.push('', state.lastJudge.res.summary);
    copyText(lines.join('\n'), '비교 메모를 복사했습니다');
  }

  function saveMemo() {
    try {
      localStorage.setItem(MEMO_KEY, JSON.stringify({
        itemId: state.cmpItemId, sel: state.cmpSel, quotes: state.quotes, names: state.quoteNames || []
      }));
    } catch (e) { /* 저장 실패는 조용히 넘긴다 */ }
  }

  function loadMemo() {
    try {
      var raw = localStorage.getItem(MEMO_KEY);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (d && itemOf(d.itemId)) state.cmpItemId = d.itemId;
      if (d && d.sel) state.cmpSel = d.sel;
      if (d && Array.isArray(d.quotes)) {
        state.quotes = [d.quotes[0] || '', d.quotes[1] || '', d.quotes[2] || ''];
        state.quoteNames = d.names || [];
      }
    } catch (e) { /* 깨진 저장값은 무시 */ }
  }

  /* ---------- 브리지 ---------- */

  function bridgePrompt() {
    var name = $('#bridgeName') ? $('#bridgeName').value.trim() : '';
    var region = $('#bridgeRegion') ? $('#bridgeRegion').value : '수도권';
    return C.buildAiPrompt(name, { region: region, when: '2026년 11월' });
  }

  function updatePrompt() {
    var el = $('#promptPreview');
    if (el) el.textContent = bridgePrompt();
  }

  function bridgeQuery() {
    var name = $('#bridgeName') ? $('#bridgeName').value.trim() : '';
    if (!name) { toast('품목·증상을 먼저 적어 주세요'); return null; }
    return name;
  }

  function openExternal(url) {
    var w = window.open(url, '_blank', 'noopener');
    if (!w) toast('팝업이 차단되었습니다. 주소를 직접 열어 주세요.');
  }

  /* ---------- 탭 ---------- */

  function setTab(name) {
    state.tab = name;
    $$('.tab').forEach(function (t) {
      var on = t.getAttribute('data-tab') === name;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
    });
    $('#view-radar').hidden = name !== 'radar';
    $('#view-compare').hidden = name !== 'compare';
    $('#view-bridge').hidden = name !== 'bridge';
    if (name === 'compare') renderCompare();
    if (name === 'bridge') updatePrompt();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- 이벤트 ---------- */

  function bind() {
    var q = $('#q');
    var timer = null;
    q.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        state.q = q.value;
        renderCards();
      }, 60);
    });

    $('#clearQ').addEventListener('click', function () {
      q.value = '';
      state.q = '';
      renderCards();
      q.focus();
    });

    document.addEventListener('click', function (e) {
      var tab = e.target.closest('[data-tab]');
      if (tab) { setTab(tab.getAttribute('data-tab')); return; }

      var chip = e.target.closest('[data-cat]');
      if (chip) {
        state.cat = chip.getAttribute('data-cat');
        renderChips();
        renderCards();
        return;
      }

      var quick = e.target.closest('[data-quick]');
      if (quick) {
        var v = quick.getAttribute('data-quick');
        q.value = v;
        state.q = v;
        renderCards();
        q.focus();
        return;
      }

      var card = e.target.closest('[data-item]');
      if (card) { openModal(card.getAttribute('data-item')); return; }

      var copyQ = e.target.closest('[data-copy-q]');
      if (copyQ) { copyText(copyQ.getAttribute('data-copy-q'), '질문을 복사했습니다'); return; }

      var action = e.target.closest('[data-action]');
      if (action) { handleAction(action.getAttribute('data-action')); return; }

      var del = e.target.closest('[data-del-quote]');
      if (del) {
        var i = Number(del.getAttribute('data-del-quote'));
        state.quotes[i] = '';
        state.quoteNames = state.quoteNames || [];
        state.quoteNames[i] = '';
        renderQuoteInputs();
        return;
      }

      if (e.target.id === 'itemModal') closeModal();
    });

    document.addEventListener('change', function (e) {
      if (e.target.id === 'gRegion' || e.target.id === 'gUrgent') {
        state.globals[e.target.id === 'gRegion' ? 'region' : 'urgent'] = e.target.value;
        renderCards();
        return;
      }
      if (e.target.id === 'bridgeRegion') {
        updatePrompt();
        return;
      }
      var opt = e.target.getAttribute && e.target.getAttribute('data-opt');
      if (!opt) return;
      if (e.target.id && e.target.id.indexOf('m_') === 0) {
        state.modalSel[opt] = e.target.value;
        updateModalBand();
      } else if (e.target.id && e.target.id.indexOf('c_') === 0) {
        readQuotes();
        state.cmpSel[opt] = e.target.value;
        renderCompare();
      }
    });

    document.addEventListener('input', function (e) {
      if (e.target.id === 'bridgeName') updatePrompt();
      if (e.target.id === 'cmpItem') { /* select는 change */ }
      var qi = e.target.getAttribute && e.target.getAttribute('data-quote');
      if (qi !== null && qi !== undefined) {
        state.quotes[Number(qi)] = e.target.value;
      }
    });

    $('#cmpItem').addEventListener('change', function () {
      state.cmpItemId = this.value;
      state.cmpSel = null;
      renderCompare();
      $('#judgePanel').innerHTML = '<p class="placeholder">금액을 넣고 <strong>판정하기</strong>를 누르면 결과가 여기에 나옵니다.</p>';
      $('#copyJudge').disabled = true;
      saveMemo();
    });

    var dlg = $('#itemModal');
    if (dlg) {
      dlg.addEventListener('close', function () { document.body.classList.remove('modal-open'); state.itemId = null; });
      dlg.addEventListener('click', function (ev) {
        if (ev.target === dlg) closeModal();
      });
    }
  }

  function handleAction(name) {
    if (name === 'home') { setTab('radar'); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (name === 'close-modal') { closeModal(); return; }
    if (name === 'reset-filters') {
      state.q = ''; state.cat = 'all'; $('#q').value = ''; renderChips(); renderCards(); return;
    }
    if (name === 'bridge-with-query') {
      var qv = state.q.trim();
      if (qv && $('#bridgeName')) $('#bridgeName').value = qv;
      setTab('bridge'); updatePrompt(); return;
    }
    if (name === 'copy-all-q') {
      var it = itemOf(state.itemId);
      if (!it) return;
      copyText(it.questions.map(function (q) { return '“' + q + '”'; }).join('\n'), '질문 3문장을 복사했습니다');
      return;
    }
    if (name === 'compare-this') {
      state.cmpItemId = state.itemId;
      state.cmpSel = state.modalSel ? Object.assign({}, state.modalSel) : null;
      closeModal();
      fillCompareItemSelect();
      setTab('compare');
      return;
    }
    if (name === 'judge') { judge(); return; }
    if (name === 'export-json') { exportData('json'); return; }
    if (name === 'export-csv') { exportData('csv'); return; }
    if (name === 'copy-judge') { copyJudge(); return; }
    if (name === 'clear-compare') {
      state.quotes = ['', '', '']; state.quoteNames = ['', '', ''];
      renderQuoteInputs();
      $('#judgePanel').innerHTML = '<p class="placeholder">금액을 넣고 <strong>판정하기</strong>를 누르면 결과가 여기에 나옵니다.</p>';
      $('#copyJudge').disabled = true;
      state.lastJudge = null;
      saveMemo();
      return;
    }
    if (name === 'free-ask') { freeAsk(); return; }
    if (name === 'copy-prompt') { copyText(bridgePrompt(), 'AI 조사 프롬프트를 복사했습니다'); return; }
    if (name === 'open-chatgpt' || name === 'open-claude' || name === 'open-gemini') {
      var prompt = bridgePrompt();
      copyText(prompt, '프롬프트를 복사했어요. AI 창에 붙여넣으세요');
      var links = C.aiLinks(prompt);
      openExternal(name === 'open-chatgpt' ? links.chatgpt : name === 'open-claude' ? links.claude : links.gemini);
      return;
    }
    if (name === 'bridge-in-db') {
      var nm = bridgeQuery();
      if (!nm) return;
      $('#q').value = nm; state.q = nm; state.cat = 'all';
      renderChips(); renderCards(); setTab('radar');
      return;
    }
    if (name.indexOf('open-naver') === 0) {
      var nq = bridgeQuery();
      if (!nq) return;
      var nl = C.naverLinks(nq);
      openExternal(name === 'open-naver-blog' ? nl.blog : name === 'open-naver-cafe' ? nl.cafe : nl.receipt);
      return;
    }
  }

  /* ---------- 시작 ---------- */

  /* ---------- JSON·CSV 내보내기 ---------- */

  var EXPORT_COLS = ['품목', '업종', '단위', '기준', '신뢰도', '최저가', '평균가', '최고가', '최저최고배수', '출처수', '기준일'];

  function exportRows() {
    return C.searchItems(ITEMS, state.q, state.cat).map(function (it) {
      var band = C.calcBand(it, selectionFor(it));
      return {
        '품목': it.name,
        '업종': catOf(it.cat).label,
        '단위': it.unit,
        '기준': it.basis,
        '신뢰도': confText(it.conf),
        '최저가': band.low,
        '평균가': band.avg,
        '최고가': band.high,
        '최저최고배수': Math.round(band.high / Math.max(1, band.low) * 100) / 100,
        '출처수': (it.sources || []).length,
        '기준일': (it.sources && it.sources[0]) ? it.sources[0].asof : ''
      };
    });
  }

  function stamp() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
  }

  function download(name, text, mime) {
    try {
      var blob = new Blob([text], { type: mime });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); if (a.parentNode) a.parentNode.removeChild(a); }, 1200);
      toast(name + ' 내려받기를 시작했습니다');
    } catch (e) {
      toast('내려받기에 실패했습니다. 브라우저 다운로드 설정을 확인해 주세요.');
    }
  }

  function exportData(kind) {
    var rows = exportRows();
    if (!rows.length) { toast('내보낼 항목이 없습니다'); return; }
    var regionLabel = '', timeLabel = '';
    C.GLOBALS.region.choices.forEach(function (c) { if (c.v === state.globals.region) regionLabel = c.label; });
    C.GLOBALS.urgent.choices.forEach(function (c) { if (c.v === state.globals.urgent) timeLabel = c.label; });
    if (kind === 'csv') {
      download('price-radar-' + stamp() + '.csv', C.toCsv(rows, EXPORT_COLS), 'text/csv;charset=utf-8');
      return;
    }
    var payload = {
      app: '깜깜이 시세 레이더',
      generatedAt: new Date().toISOString(),
      conditions: { region: regionLabel, time: timeLabel },
      count: rows.length,
      columns: EXPORT_COLS,
      items: rows
    };
    download('price-radar-' + stamp() + '.json', JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
  }

  function init() {
    loadMemo();
    renderHeroStats();
    renderHeroTile();
    renderChips();
    renderGlobalFilters();
    renderQuick();
    fillCompareItemSelect();
    renderCards();
    renderQuoteInputs();
    updatePrompt();
    bind();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
