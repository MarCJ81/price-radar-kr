/* ============================================================
   깜깜이 시세 레이더 · core.js
   순수 로직: 검색 · 시세 밴드 계산 · 견적 판정 · 프롬프트 생성
   브라우저(window.PriceCore)와 Node(require) 양쪽에서 쓴다.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PriceCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- 숫자·문자 ---------- */

  function normalize(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .replace(/[\s\u00a0]+/g, '')
      .replace(/[()[\]{}'"·.,/\\\-_+~!?]/g, '');
  }

  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

  function roundMoney(n) {
    if (!isFinite(n)) return 0;
    if (n >= 1000000) return Math.round(n / 10000) * 10000;
    if (n >= 10000) return Math.round(n / 1000) * 1000;
    return Math.round(n / 100) * 100;
  }

  function won(n) {
    var v = Math.round(Number(n) || 0);
    return v.toLocaleString('ko-KR') + '원';
  }

  /** 128000 -> '12만 8,000' (카드 보조 표기) */
  function wonShort(n) {
    var v = Math.round(Number(n) || 0);
    if (v < 10000) return v.toLocaleString('ko-KR');
    var man = Math.floor(v / 10000);
    var rest = v % 10000;
    return rest ? man + '만 ' + rest.toLocaleString('ko-KR') : man + '만';
  }

  function pct(x) {
    var v = Math.round(Number(x) * 1000) / 10;
    return (v > 0 ? '+' : '') + v + '%';
  }

  function mulBand(b, f) {
    return { low: b.low * f, avg: b.avg * f, high: b.high * f };
  }

  function addBand(b, a) {
    return { low: b.low + a, avg: b.avg + a, high: b.high + a };
  }

  function sortBand(b) {
    var a = [b.low, b.avg, b.high].sort(function (x, y) { return x - y; });
    return { low: a[0], avg: a[1], high: a[2] };
  }

  /* ---------- 검색 ---------- */

  function itemHaystack(item) {
    return [
      item.name,
      (item.alias || []).join(' '),
      item.unit || '',
      item.basis || '',
      item.derive || ''
    ].join(' ');
  }

  var STOPWORDS = {
    '가격': 1, '비용': 1, '시세': 1, '얼마': 1, '얼마예요': 1, '금액': 1, '요금': 1,
    '후기': 1, '추천': 1, '정보': 1, '알려줘': 1, '어때요': 1, '비싼가요': 1
  };

  /**
   * @param {Array} items 데이터셋
   * @param {string} query 검색어
   * @param {string} cat 카테고리 id 또는 'all'
   * @returns {Array} 점수순 결과
   */
  /** 오픈소스 검색 엔진(engines/search-engine.js — Fuse.js). 없으면 내장 검색만 쓴다. */
  var SEARCH = null;
  function useSearch(engine) {
    SEARCH = engine && typeof engine.search === 'function' ? engine : null;
    return !!SEARCH;
  }
  function searchEngine() { return SEARCH; }

  /**
   * 초성·오타 허용 보조 검색. 기존 정확 검색이 0건일 때만 호출된다.
   * @returns {{items: Array, fuzzy: boolean, query: string}}
   */
  function fuzzyItems(items, query, cat) {
    var pool = (items || []).filter(function (it) {
      return !cat || cat === 'all' || it.cat === cat;
    });
    var q = String(query === null || query === undefined ? '' : query).trim();
    if (!SEARCH || !q) return { items: [], fuzzy: false, query: q };
    var hits;
    try { hits = SEARCH.search(pool, q); } catch (e) { hits = []; }
    return { items: hits.map(function (h) { return h.item; }), fuzzy: hits.length > 0, query: q };
  }

  function searchItems(items, query, cat) {
    var exact = searchExact(items, query, cat);
    if (exact.length) return exact;
    var fuzzy = fuzzyItems(items, query, cat);
    return fuzzy.fuzzy ? fuzzy.items : exact;
  }

  function searchExact(items, query, cat) {
    var q = normalize(query);
    var pool = (items || []).filter(function (it) {
      return !cat || cat === 'all' || it.cat === cat;
    });
    if (!q) return pool.slice();

    var tokens = String(query).trim().split(/\s+/).map(normalize).filter(function (t) {
      return t && !STOPWORDS[t];
    });
    if (!tokens.length) tokens = [q];
    var needAll = tokens.length >= 2;
    var out = [];
    pool.forEach(function (it, idx) {
      var name = normalize(it.name);
      var aliases = (it.alias || []).map(normalize);
      var hay = normalize(itemHaystack(it));
      var score = 0;
      var hitAll = true;

      if (name === q) score += 200;
      else if (name.indexOf(q) === 0) score += 150;
      else if (name.indexOf(q) >= 0) score += 110;

      aliases.forEach(function (a) {
        if (a === q) score += 120;
        else if (a.indexOf(q) === 0) score += 90;
        else if (a.indexOf(q) >= 0) score += 55;
      });

      if (score === 0 && hay.indexOf(q) >= 0) score += 30;

      tokens.forEach(function (t) {
        if (name.indexOf(t) >= 0) score += 35;
        else if (aliases.some(function (a) { return a.indexOf(t) >= 0; })) score += 25;
        else if (hay.indexOf(t) >= 0) score += 8;
        else hitAll = false;
      });

      if (hitAll) score += 20;
      if (needAll && !hitAll) score = 0;
      if (score > 0) out.push({ item: it, score: score, order: idx });
    });

    out.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.order - b.order;
    });
    return out.map(function (r) { return r.item; });
  }

  /* ---------- 시세 밴드 계산 ---------- */

  function defaultSelection(item, globals) {
    var sel = {};
    (item.opts || []).forEach(function (o) {
      var pick = null;
      if (o.type === 'scale' && o.base) {
        pick = (o.choices || []).filter(function (c) { return c.n === o.base; })[0];
      }
      if (!pick) pick = (o.choices || []).filter(function (c) { return c.def; })[0];
      if (!pick) pick = (o.choices || [])[0];
      sel[o.key] = pick ? pick.v : o.value;
    });
    (globals || []).forEach(function (key) {
      var g = GLOBALS[key];
      if (g) sel[key] = g.choices[0].v;
    });
    return sel;
  }

  var GLOBALS = {
    region: {
      key: 'region',
      label: '지역',
      choices: [
        { v: 'metro', label: '수도권', f: 1.0, note: '서울·경기·인천' },
        { v: 'city', label: '광역시', f: 0.96, note: '부산·대구·대전·광주 등' },
        { v: 'local', label: '지방·소도시', f: 0.92, note: '출장 거리·인건비 차이 반영' }
      ]
    },
    urgent: {
      key: 'urgent',
      label: '시간대',
      choices: [
        { v: 'normal', label: '평일·주간', f: 1.0 },
        { v: 'night', label: '야간·주말·긴급', f: 1.2, note: '업체 공개 할증 10~30%의 중간값' }
      ]
    },
    carType: {
      key: 'carType',
      label: '차종',
      choices: [
        { v: 'domestic', label: '국산차', f: 1.0 },
        { v: 'imported', label: '수입차', f: 1.4, note: '부품·공임이 국산의 1.3~2.5배' }
      ]
    }
  };

  function findChoice(list, v) {
    for (var i = 0; i < (list || []).length; i++) if (list[i].v === v) return list[i];
    return (list || [])[0];
  }

  /**
   * @returns {{low:number,avg:number,high:number,steps:Array,selection:Object}}
   */
  function calcBand(item, selection) {
    var sel = selection || defaultSelection(item, item.globals);
    var band = { low: item.band.low, avg: item.band.avg, high: item.band.high };
    var steps = [];
    var touched = false;

    (item.opts || []).forEach(function (o) {
      var c = findChoice(o.choices, sel[o.key]);
      if (!c) return;

      if (c.band) {
        band = { low: c.band.low, avg: c.band.avg, high: c.band.high };
        touched = false;
        steps.push({ label: o.label + ' · ' + c.label, detail: '기준 밴드 교체' });
      }
      if (typeof c.f === 'number' && c.f !== 1) {
        band = mulBand(band, c.f);
        touched = true;
        steps.push({ label: o.label + ' · ' + c.label, detail: '×' + c.f });
      }
      if (typeof c.add === 'number' && c.add !== 0) {
        band = addBand(band, c.add);
        touched = true;
        steps.push({ label: o.label + ' · ' + c.label, detail: '+' + won(c.add) });
      }
      if (o.type === 'scale' && c.n && o.base) {
        var f = c.n / o.base;
        band = mulBand(band, f);
        touched = true;
        steps.push({ label: o.label + ' · ' + c.label, detail: o.base + '평 기준 ×' + (Math.round(f * 100) / 100) });
      }
    });

    (item.globals || []).forEach(function (key) {
      var g = GLOBALS[key];
      if (!g) return;
      var c = findChoice(g.choices, sel[key]);
      if (c && typeof c.f === 'number' && c.f !== 1) {
        band = mulBand(band, c.f);
        touched = true;
        steps.push({ label: g.label + ' · ' + c.label, detail: '×' + c.f });
      }
    });

    if (touched) {
      band = { low: roundMoney(band.low), avg: roundMoney(band.avg), high: roundMoney(band.high) };
    }
    band = sortBand(band);
    return { low: band.low, avg: band.avg, high: band.high, steps: steps, selection: sel };
  }

  /* ---------- 견적 판정 ---------- */

  var VERDICTS = {
    tooLow: { key: 'tooLow', label: '최저가보다 낮음', tone: 'warn', icon: '⚠' },
    cheap: { key: 'cheap', label: '저렴한 편', tone: 'good', icon: '↓' },
    fair: { key: 'fair', label: '적정 범위', tone: 'ok', icon: '✓' },
    pricey: { key: 'pricey', label: '비싼 편', tone: 'warn', icon: '↑' },
    over: { key: 'over', label: '최고가 초과', tone: 'bad', icon: '✕' }
  };

  function judgeQuote(quote, band) {
    var q = Number(quote);
    if (!isFinite(q) || q <= 0 || !band || !band.avg) return null;
    var diff = (q - band.avg) / band.avg;
    var v;
    if (q < band.low) v = VERDICTS.tooLow;
    else if (q < band.avg * 0.9) v = VERDICTS.cheap;
    else if (q <= band.avg * 1.1) v = VERDICTS.fair;
    else if (q <= band.high) v = VERDICTS.pricey;
    else v = VERDICTS.over;

    var msg = '';
    if (v.key === 'tooLow') msg = '최저가 ' + won(band.low) + '보다 낮습니다. 부품 등급·추가금·작업 범위를 먼저 확인하세요.';
    else if (v.key === 'cheap') msg = '평균보다 ' + won(band.avg - q) + ' 쌉니다. 빠진 작업이 없는지만 확인하면 좋은 견적입니다.';
    else if (v.key === 'fair') msg = '평균 ' + won(band.avg) + '의 ±10% 안입니다. 조건이 같은지 확인하고 고르세요.';
    else if (v.key === 'pricey') msg = '평균보다 ' + won(q - band.avg) + ' 비쌉니다. 항목별 내역을 요구해 보세요.';
    else msg = '공개된 최고가 ' + won(band.high) + '를 넘습니다. 다른 견적과 비교하세요.';

    return {
      quote: q, diff: diff, diffPct: pct(diff), verdict: v, message: msg,
      posPct: band.high > band.low ? clamp((q - band.low) / (band.high - band.low), 0, 1) : 0.5
    };
  }

  function compareQuotes(quotes, band) {
    var rows = (quotes || [])
      .map(function (q) { return judgeQuote(q, band); })
      .filter(Boolean);
    if (!rows.length) return { rows: [], best: null, spread: null, summary: '' };

    var sorted = rows.slice().sort(function (a, b) { return a.quote - b.quote; });
    var best = sorted[0];
    var spread = sorted[sorted.length - 1].quote - best.quote;
    var summary = rows.length === 1
      ? '한 곳 견적은 기준점 하나입니다. 같은 조건으로 2곳을 더 받아 보세요.'
      : '가장 싼 곳과 비싼 곳의 차이는 ' + won(spread) + '입니다. 평균 대비로는 ' +
        best.verdict.label + ' ~ ' + sorted[sorted.length - 1].verdict.label + '입니다.';
    return { rows: rows, best: best, spread: spread, summary: summary, sorted: sorted };
  }

  /* ---------- 실시간 검색 브리지 ---------- */

  function buildAiPrompt(name, extra) {
    var target = String(name || '').trim() || '궁금한 서비스';
    var region = (extra && extra.region) || '수도권';
    var when = (extra && extra.when) || '2026년 11월';
    return [
      '너는 한국 소비자 가격 조사원이야. 아래 서비스의 실제 거래 시세를 조사해줘.',
      '',
      '- 품목/서비스: ' + target,
      '- 지역: ' + region,
      '- 기준 시점: ' + when + ' (가능하면 최근 6개월 자료)',
      '',
      '조사 규칙:',
      '1) 네이버 블로그·카페의 실제 결제 후기(영수증 사진, 금액이 적힌 글)를 최소 8건 찾아 금액을 모아줘.',
      '2) 정부·공공기관 공개 자료(공임나라 표준공임, 건강보험심사평가원 비급여, 한국소비자원, 지자체 요금표)가 있으면 우선해.',
      '3) 업체 광고 가격표는 "광고가"로 따로 표시해.',
      '4) 결과를 표로 정리: 최저가 / 중앙값 / 평균 / 최고가, 각 금액의 출처 링크와 날짜.',
      '5) 추가금이 붙는 조건(출장비, 철거·폐기물, 야간·주말 할증, 부품 등급)을 3개 이상 적어줘.',
      '6) 확인되지 않은 숫자는 쓰지 말고 "자료 없음"이라고 적어줘. 추정치는 추정이라고 명시해.',
      '',
      '마지막에 "이 가격이면 적정/비쌈"을 판단할 기준 한 줄과, 현장에서 물어볼 질문 3개를 적어줘.'
    ].join('\n');
  }

  function naverLinks(name) {
    var q = String(name || '').trim();
    var enc = encodeURIComponent(q ? q + ' 비용 후기' : '서비스 비용 후기');
    return {
      blog: 'https://section.blog.naver.com/Search/Post.naver?keyword=' + enc,
      cafe: 'https://search.naver.com/search.naver?where=article&query=' + enc,
      receipt: 'https://search.naver.com/search.naver?where=blog&query=' + encodeURIComponent((q || '수리') + ' 영수증')
    };
  }

  function aiLinks(prompt) {
    var q = encodeURIComponent(prompt);
    return {
      chatgpt: 'https://chatgpt.com/?q=' + q,
      claude: 'https://claude.ai/new?q=' + q,
      gemini: 'https://gemini.google.com/app'
    };
  }

  /* ---------- 내보내기 ---------- */

  function csvCell(v) {
    var s = String(v == null ? '' : v);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function toCsv(rows, cols) {
    var head = (cols || []).join(',');
    var body = (rows || []).map(function (r) {
      return (cols || []).map(function (c) { return csvCell(r[c]); }).join(',');
    });
    // 엑셀이 UTF-8 한글을 바로 읽도록 BOM을 붙이고, 행 구분은 CRLF로 맞춘다.
    return '\ufeff' + [head].concat(body).join('\r\n') + '\r\n';
  }

  /* ---------- 표시 도우미 ---------- */

  function bandWidths(band) {
    var span = band.high - band.low || 1;
    return {
      low: 0,
      avg: clamp((band.avg - band.low) / span, 0, 1),
      high: 1
    };
  }

  function savingsText(band) {
    var d = band.high - band.low;
    return '최저와 최고의 차이 ' + won(d) + ' · ' + Math.round(band.high / Math.max(1, band.low) * 10) / 10 + '배';
  }

  return {
    normalize: normalize,
    won: won,
    wonShort: wonShort,
    pct: pct,
    roundMoney: roundMoney,
    searchItems: searchItems,
    searchExact: searchExact,
    fuzzyItems: fuzzyItems,
    useSearch: useSearch,
    searchEngine: searchEngine,
    calcBand: calcBand,
    defaultSelection: defaultSelection,
    judgeQuote: judgeQuote,
    compareQuotes: compareQuotes,
    buildAiPrompt: buildAiPrompt,
    naverLinks: naverLinks,
    aiLinks: aiLinks,
    csvCell: csvCell,
    toCsv: toCsv,
    bandWidths: bandWidths,
    savingsText: savingsText,
    GLOBALS: GLOBALS,
    VERDICTS: VERDICTS
  };
});
