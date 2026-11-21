/* ============================================================
   깜깜이 시세 레이더 · data.js
   모든 금액은 2026-11-21 조사 시점에 공개된 자료를 근거로 한다.
   - conf: official(정부·협회·제조사 공식) / published(업체 공개 가격표) / market(시장 집계·다출처)
   - band: 기준 조건의 최저·평균·최고. avg는 자료가 밝힌 평균·중앙값을 우선한다.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PriceData = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CATEGORIES = [
    {
      id: 'car', icon: '🚗', label: '자동차 정비·외장',
      blurb: '공임나라 표준공임과 실제 견적서 집계를 함께 봅니다. 부품값 포함 여부가 가장 큰 함정입니다.',
      note: '엔진오일·패드·배터리처럼 부품이 들어가는 항목은 "부품+공임" 기준입니다.'
    },
    {
      id: 'home', icon: '🏠', label: '집수리·누수·인테리어',
      blurb: '평당 단가와 현장 추가금(철거·폐기물·양중)을 분리해서 봐야 실제 총액이 보입니다.',
      note: '도배·장판은 자재 등급과 평수를 고르면 밴드가 다시 계산됩니다.'
    },
    {
      id: 'appliance', icon: '❄️', label: '가전 청소·수리',
      blurb: '제조사 공식 서비스와 사설 업체 가격을 나란히 놓았습니다. 같은 "분해청소"도 범위가 다릅니다.',
      note: '제조사 정상가와 할인가, 사설 업체가를 함께 비교하세요.'
    },
    {
      id: 'dental', icon: '🦷', label: '치과 비급여',
      blurb: '건강보험심사평가원이 공개한 2026년 비급여 신고가 기준입니다. 같은 시술도 병원별 편차가 큽니다.',
      note: '심평원 공개가는 의료기관이 신고한 금액이며 실제 청구액과 다를 수 있습니다.'
    },
    {
      id: 'move', icon: '🚚', label: '이사·용달·청소',
      blurb: '허가이사종합정보 전국평균과 업체 공개 견적을 함께 봅니다. 사다리차·할증이 총액을 바꿉니다.',
      note: '이사 비용은 평수보다 짐의 양·층수·날짜가 더 크게 작용합니다.'
    },
    {
      id: 'it', icon: '💻', label: 'PC·스마트폰 수리',
      blurb: '제조사 공식 수리비와 사설 수리 시세를 구분했습니다. 부품 등급과 공임 분리가 핵심입니다.',
      note: '공식 수리는 부품값이, 사설은 부품 등급이 가격을 가릅니다.'
    }
  ];

  var ITEMS = [
    /* ================= 자동차 ================= */
    {
      id: 'car-engine-oil', cat: 'car', name: '엔진오일 + 오일필터 교환',
      alias: ['엔진오일', '오일교환', '오일갈이', '합성유', '엔진 오일 교체'],
      unit: '1회', basis: '부품+공임', conf: 'market',
      band: { low: 60000, avg: 80000, high: 120000 },
      derive: '국산 준중형~중형 합성유 기준. 공개 시세 하한 6만·평균 8만·상한 12만(수입차·대형 제외).',
      globals: ['carType', 'region', 'urgent'],
      opts: [{
        key: 'oil', label: '오일 등급', choices: [
          { v: 'mineral', label: '광유(일반)', f: 0.78 },
          { v: 'synthetic', label: '합성유', f: 1.0 },
          { v: 'full', label: '100% 합성유', f: 1.25 }
        ]
      }],
      traps: [
        '광유를 넣고 합성유 값으로 청구 — 견적서에 오일 브랜드·점도·등급이 없으면 확인 불가',
        '오일필터·에어크리너를 "별도"라며 2~4만원 추가 (공임나라 표준공임에는 포함)',
        '잔유 제거·엔진플러싱(5,000~35,000원)을 기본처럼 권유'
      ],
      questions: [
        '오일 브랜드·점도(예: 5W-30)·합성유 여부와 주입량을 견적서에 적어주세요.',
        '오일필터·에어크리너·폐유 처리비가 이 금액에 포함인가요?',
        '잔유 제거와 플러싱을 빼고 순수 교환만 하면 얼마인가요?'
      ],
      sources: [
        { name: '글라스월렛 카센터 비용 계산기 (2026-07 시중 평균)', url: 'https://glasswallet.com/calculate/carcenter-cost/', asof: '2026-07' },
        { name: '공임나라 표준공임 — 엔진오일 공임 19,000원(가솔린)·21,000원(디젤)', url: 'https://koreatire.co.kr/repair-shop-labor-cost/', asof: '2025-05' }
      ]
    },
    {
      id: 'car-brake-pad', cat: 'car', name: '브레이크 패드 교체 (앞축 1세트)',
      alias: ['브레이크패드', '패드교체', '브레이크 패드', '앞패드'],
      unit: '좌우 1세트', basis: '부품+공임', conf: 'market',
      band: { low: 70000, avg: 130000, high: 180000 },
      derive: '국산 준중형 기준 앞축. 공개 평균 13만, 범위 7만~18만. 공임나라 패드 공임은 30,000원.',
      globals: ['carType', 'region', 'urgent'],
      traps: [
        '전자식 파킹(EPB) 차량 추가 공임 15,000원 — 견적에 빠졌다가 현장에서 붙음',
        '디스크 연마·교체를 함께 권유 (연마 9만·교체 6만 별도)',
        '순정·OEM·호환 부품 등급을 적지 않아 부품값 비교가 불가능'
      ],
      questions: [
        '패드 등급(순정/OEM/호환)과 브랜드를 적어주세요.',
        '디스크 두께 측정값은 얼마이고, 교체가 꼭 필요한가요?',
        'EPB 차량 추가 공임 15,000원이 포함된 금액인가요?'
      ],
      sources: [
        { name: '글라스월렛 2026 주요 정비 시세 (앞 패드 13만·뒤 15만)', url: 'https://glasswallet.com/calculate/carcenter-cost/', asof: '2026-07' },
        { name: '공임나라 표준공임 — 디스크 패드 교환 30,000원(좌우 1세트)', url: 'https://koreatire.co.kr/repair-shop-labor-cost/', asof: '2025-05' }
      ]
    },
    {
      id: 'car-battery', cat: 'car', name: '12V 배터리 교체',
      alias: ['배터리', '밧데리', '자동차 배터리', 'AGM 배터리'],
      unit: '1개', basis: '부품+공임', conf: 'market',
      band: { low: 120000, avg: 150000, high: 200000 },
      derive: '국산 승용 일반 배터리 기준. 공개 범위 10만~25만, 평균 15만 선. AGM은 별도 옵션.',
      globals: ['carType', 'region', 'urgent'],
      opts: [{
        key: 'type', label: '배터리 종류', choices: [
          { v: 'normal', label: '일반 12V', f: 1.0 },
          { v: 'agm', label: 'AGM·EFB (ISG 차량)', band: { low: 250000, avg: 300000, high: 350000 } }
        ]
      }],
      traps: [
        'ISG 차량에 일반 배터리를 넣거나, 반대로 AGM을 강요',
        '폐배터리 반납(보증금) 조건을 말하지 않아 1~2만원 차이',
        '단자 부식 제거·충전 점검을 "추가 작업"으로 청구'
      ],
      questions: [
        '제 차량 규격(용량·단자 방향)과 AGM/EFB 필요 여부를 확인해 주세요.',
        '폐배터리 반납 가격이 반영된 금액인가요?',
        '발전기 충전 상태 점검과 단자 정리는 무료인가요?'
      ],
      sources: [
        { name: '푸테디 2026 자동차 점검 비용 (일반 12~20만·AGM 25~35만)', url: 'https://blog.poohteddy.com/191', asof: '2026-09' },
        { name: '공임나라 표준공임 — 배터리 교환 18,000원', url: 'https://koreatire.co.kr/repair-shop-labor-cost/', asof: '2025-05' }
      ]
    },
    {
      id: 'car-tire-4', cat: 'car', name: '타이어 4짝 교체 (장착·밸런스 포함)',
      alias: ['타이어', '타이어교체', '타이어 4본', '타이어 갈이'],
      unit: '4본', basis: '부품+장착', conf: 'market',
      band: { low: 350000, avg: 500000, high: 800000 },
      derive: '국산 승용 15~17인치 보급형 기준. 공개 범위 35만~80만. 평균은 범위의 중간값.',
      globals: ['region', 'urgent'],
      opts: [{
        key: 'grade', label: '타이어 등급', choices: [
          { v: 'budget', label: '보급형', f: 0.75 },
          { v: 'standard', label: '일반', f: 1.0 },
          { v: 'premium', label: '프리미엄', f: 1.6 }
        ]
      }],
      traps: [
        '재고 타이어 — 제조일자(DOT)가 3년 이상 지난 제품',
        '휠 얼라이먼트 4~8만원을 "필수"라며 추가',
        '장착·밸런스·폐타이어 처리비를 따로 청구'
      ],
      questions: [
        '타이어 제조일자(DOT 4자리)를 4짝 모두 알려주세요.',
        '장착·밸런스·폐타이어 처리비가 포함인가요?',
        '얼라이먼트는 교체 후 무상인가요, 별도인가요?'
      ],
      sources: [
        { name: '자동차 비용 계산센터 2026 수리비 평균표 (4짝 35~80만)', url: 'https://carcost.insureloanhub.com/car-repair-cost-table-2026/', asof: '2026-07' },
        { name: '공임나라 타이어 장착 공임 12,000~18,000원/본', url: 'https://smartcarview.com/car-parts-repair-cost-average/', asof: '2026-05' }
      ]
    },
    {
      id: 'car-brake-fluid', cat: 'car', name: '브레이크 오일 교환',
      alias: ['브레이크오일', '브레이크 액', '브레이크 오일'],
      unit: '1회', basis: '부품+공임', conf: 'market',
      band: { low: 50000, avg: 70000, high: 100000 },
      derive: '공개 범위 5만~10만. 공임나라 순환식 공임 38,000원 + 오일값.',
      globals: ['region', 'urgent'],
      traps: [
        '순환식 장비 없이 중력식으로 하고 순환식 값',
        'DOT4 규격 대신 저가 오일 사용',
        '교환 후 에어빼기·펌프 테스트 생략'
      ],
      questions: [
        '순환식 장비로 교환하는 게 맞나요?',
        '브레이크 오일 규격(DOT4)과 사용량을 적어주세요.',
        '교환 후 페달 에어빼기와 테스트가 포함인가요?'
      ],
      sources: [
        { name: '자동차 비용 계산센터 2026 (브레이크오일 5~10만)', url: 'https://carcost.insureloanhub.com/car-repair-cost-table-2026/', asof: '2026-07' },
        { name: '공임나라 표준공임 — 승용 브레이크오일 38,000원', url: 'https://koreatire.co.kr/repair-shop-labor-cost/', asof: '2025-05' }
      ]
    },
    {
      id: 'car-ac-gas', cat: 'car', name: '에어컨 냉매(가스) 충전',
      alias: ['에어컨 가스', '냉매', '에어컨 가스충전', '프레온'],
      unit: '1회', basis: '냉매+공임', conf: 'official',
      band: { low: 70000, avg: 77000, high: 84000 },
      derive: '공임나라 표준공임 70,000원(냉매 포함). 일반 정비소는 표준공임 대비 10~20% 높게 부르는 사례가 있어 범위로 표시.',
      globals: ['region', 'urgent'],
      traps: [
        '냉매 종류(R134a/R1234yf)와 충전량을 적지 않음 — R1234yf는 가스값이 3배 이상',
        '누설 점검 없이 가스만 충전해 3개월 뒤 재발',
        '진공 작업(에어 제거) 생략'
      ],
      questions: [
        '냉매 종류와 충전량(그램)을 적어주세요.',
        '누설 점검과 진공 작업이 포함인가요?',
        '충전 후 토출 온도차 측정 결과를 보여주시나요?'
      ],
      sources: [
        { name: '공임나라 표준공임 — 에어컨 가스 완충 70,000원(냉매 포함)', url: 'https://koreatire.co.kr/repair-shop-labor-cost/', asof: '2025-05' }
      ]
    },
    {
      id: 'car-blackbox', cat: 'car', name: '블랙박스 2채널 장착 (제품 포함)',
      alias: ['블랙박스', '블박', '블랙박스 장착', '2채널'],
      unit: '1대', basis: '제품+장착', conf: 'published',
      band: { low: 269000, avg: 400000, high: 600000 },
      derive: '티벡스 권장소비자가 장착품 기준. 보급형 269,000원 ~ 프리미엄 600,000원. 평균은 범위의 중간값.',
      globals: ['region'],
      traps: [
        '상시전원 배선·보조배터리가 "별도" (보조배터리 40~55만원)',
        '2채널이라면서 후방 카메라·케이블 별도',
        '장착비를 제품값과 따로 청구'
      ],
      questions: [
        '전·후방 2채널과 상시전원 배선까지 포함된 금액인가요?',
        '보조배터리는 별도인가요? 용량과 가격을 알려주세요.',
        '주차 중 녹화 시 저전압 차단 기준은 어떻게 설정하나요?'
      ],
      sources: [
        { name: '티벡스 권장소비자가 — 블랙박스 장착품 269,000~600,000원', url: 'https://www.tbex.co.kr/service/price', asof: '2026 확인' }
      ]
    },
    {
      id: 'car-coating', cat: 'car', name: '유리막 코팅 (중형 세단·외장)',
      alias: ['유리막', '유리막코팅', '코팅', '세라믹코팅'],
      unit: '1회', basis: '코팅제+시공', conf: 'market',
      band: { low: 400000, avg: 500000, high: 600000 },
      derive: '국산 중형 세단·광택 없음·1회 시공 기준. 기본 40~60만, 고급 55~80만, 세라믹 80~150만.',
      globals: ['region', 'carType'],
      opts: [{
        key: 'grade', label: '코팅 등급', choices: [
          { v: 'basic', label: '기본 유리막(6~12개월)', band: { low: 400000, avg: 500000, high: 600000 } },
          { v: 'high', label: '고급 유리막(12~24개월)', band: { low: 550000, avg: 675000, high: 800000 } },
          { v: 'ceramic', label: '세라믹(24~48개월)', band: { low: 800000, avg: 1150000, high: 1500000 } }
        ]
      }],
      traps: [
        '"신차 패키지"로 썬팅·PPF를 묶어 항목별 비교를 막음',
        '사전 광택 1단계 10~20만·2~3단계 25~45만이 별도',
        '1회 시공을 2회로 표기하거나 지속기간을 과장'
      ],
      questions: [
        '코팅제 이름과 시공 횟수(1회/2회), 지속기간을 적어주세요.',
        '사전 광택 단계(1단계/2~3단계)와 비용이 포함인가요?',
        '휠·유리·실내 코팅을 빼고 외장만 했을 때 얼마인가요?'
      ],
      sources: [
        { name: '유리지갑 차급별 유리막 코팅 가격표 (2026-10)', url: 'https://glasswallet.com/calculate/car-coating-cost/price-by-car-type/', asof: '2026-10' }
      ]
    },
    {
      id: 'car-bumper', cat: 'car', name: '앞범퍼 판금·도색 (중형차)',
      alias: ['판금', '도색', '범퍼', '범퍼도색', '판금도색', '문콕'],
      unit: '1부위', basis: '공임+도장', conf: 'market',
      band: { low: 242125, avg: 295000, high: 349076 },
      derive: '정비업체 실제 견적서 2,817건 집계(부가세 포함, 부품값 제외). 판금·도장 242,125~349,076원.',
      globals: ['region', 'carType'],
      opts: [{
        key: 'method', label: '수리 방법', choices: [
          { v: 'panel', label: '판금+도장', band: { low: 242125, avg: 295000, high: 349076 } },
          { v: 'paint', label: '도장만', band: { low: 230918, avg: 270000, high: 311696 } },
          { v: 'replace', label: '교환+도장 (부품값 별도)', band: { low: 209164, avg: 253000, high: 298025 } }
        ]
      }],
      traps: [
        '교환 견적에 새 범퍼 부품값을 빼고 공임만 적음',
        '범퍼 안쪽 흡수재·브래킷·클립을 추가 청구',
        '범퍼 한 면을 "2면"으로 계산해 도장비를 두 배로'
      ],
      questions: [
        '교환인가요, 판금인가요? 부품값을 따로 적어주세요.',
        '범퍼 탈착·흡수재·브래킷 교체가 포함인가요?',
        '도장은 1면인가요, 범퍼 전체인가요?'
      ],
      sources: [
        { name: '노하우카 실제 견적서 2,817건 집계 (2026-10)', url: 'https://knowhowcar.com/blog/car-body-repair-cost-2026/', asof: '2026-10' }
      ]
    },

    /* ================= 집수리 ================= */
    {
      id: 'home-wallpaper', cat: 'home', name: '도배 (24평·벽+천장 전체)',
      alias: ['도배', '벽지', '실크도배', '합지도배', '도배비용'],
      unit: '24평', basis: '자재+시공', conf: 'market',
      band: { low: 720000, avg: 1080000, high: 1680000 },
      derive: '24평 실크 기본 72만(숨고·크몽) ~ 108만(시공면적 환산) ~ 168만(상한). 합지·고급은 옵션.',
      globals: ['region'],
      opts: [
        {
          key: 'tier', label: '벽지 등급', choices: [
            { v: 'silk', label: '실크(기본)', band: { low: 720000, avg: 1080000, high: 1680000 } },
            { v: 'hapji', label: '합지', band: { low: 432000, avg: 600000, high: 860000 } },
            { v: 'silkHigh', label: '실크(고급)', band: { low: 1080000, avg: 1400000, high: 2000000 } }
          ]
        },
        {
          key: 'pyeong', label: '평수', type: 'scale', base: 24, choices: [
            { v: '18', label: '18평', n: 18 }, { v: '24', label: '24평', n: 24 },
            { v: '34', label: '34평', n: 34 }, { v: '45', label: '45평', n: 45 }
          ]
        }
      ],
      traps: [
        '기존 벽지 철거비 평당 3,000~5,000원이 별도',
        '폐기물 처리 10~20만원, 사다리차·양중비 10~20만원 추가',
        '부직포 초배(평당 3,000~5,000원)를 빼고 "실크 도배"만 표기'
      ],
      questions: [
        '벽지 등급(합지/실크)과 브랜드, 롤 수를 적어주세요.',
        '철거·폐기물·부직포 초배가 포함된 금액인가요?',
        '몰딩·걸레받이 교체는 별도인가요?'
      ],
      sources: [
        { name: '네이버 문서 24평 도배·장판 가격표 (2026-11-05)', url: 'https://naver-doc.com/life/24%ed%8f%89-%eb%8f%84%eb%b0%b0-%ec%9e%a5%ed%8c%90-%eb%b9%84%ec%9a%a9-%ed%8f%89%eb%8b%b9-%ea%b0%80%ea%b2%a9%ed%91%9c%ed%95%a9%ec%a7%80%c2%b7%ec%8b%a4%ed%81%ac%c2%b7%ec%9e%a5%ed%8c%90%eb%91%90%ea%bb%98/', asof: '2026-11' },
        { name: '똑딱 숨고 공개 시세 전수조사 (2026-09)', url: 'https://ddokddak.im/guide/wallpaper-cost-guide', asof: '2026-09' }
      ]
    },
    {
      id: 'home-floor', cat: 'home', name: '장판 시공 (24평)',
      alias: ['장판', '바닥', '모노륨', '장판교체', 'LX장판'],
      unit: '24평', basis: '자재+시공', conf: 'market',
      band: { low: 900000, avg: 1050000, high: 1200000 },
      derive: '24평 2.2T 기준 90만~120만. 1.8T는 50만~80만, 4.5T는 200만 이상.',
      globals: ['region'],
      opts: [
        {
          key: 'thick', label: '장판 두께', choices: [
            { v: '22', label: '2.2T (실거주)', band: { low: 900000, avg: 1050000, high: 1200000 } },
            { v: '18', label: '1.8T (전월세)', band: { low: 500000, avg: 650000, high: 800000 } },
            { v: '45', label: '4.5T (고급)', band: { low: 2000000, avg: 2300000, high: 2600000 } }
          ]
        },
        {
          key: 'pyeong', label: '평수', type: 'scale', base: 24, choices: [
            { v: '18', label: '18평', n: 18 }, { v: '24', label: '24평', n: 24 }, { v: '34', label: '34평', n: 34 }
          ]
        }
      ],
      traps: [
        '기존 장판 철거·바닥 평탄 작업이 별도 (문턱 제거 포함)',
        '몰딩·걸레받이·문턱 처리비 추가',
        '두께(T)와 브랜드를 적지 않고 "장판"으로만 표기'
      ],
      questions: [
        '장판 두께(T)와 브랜드, 시공 면적을 적어주세요.',
        '기존 장판 철거와 바닥 평탄 작업이 포함인가요?',
        '문턱·몰딩·걸레받이는 어떻게 처리하나요?'
      ],
      sources: [
        { name: '네이버 문서 장판 두께별 단가 (2026-11)', url: 'https://naver-doc.com/life/24%ed%8f%89-%eb%8f%84%eb%b0%b0-%ec%9e%a5%ed%8c%90-%eb%b9%84%ec%9a%a9-%ed%8f%89%eb%8b%b9-%ea%b0%80%ea%b2%a9%ed%91%9c%ed%95%a9%ec%a7%80%c2%b7%ec%8b%a4%ed%81%ac%c2%b7%ec%9e%a5%ed%8c%90%eb%91%90%ea%bb%98/', asof: '2026-11' },
        { name: '아메바모드 24평 도배·장판 시세 (2026-10)', url: 'https://amebamode.com/wallpaper-flooring-cost-24/', asof: '2026-10' }
      ]
    },
    {
      id: 'home-leak', cat: 'home', name: '누수 탐지 (아파트 1세대)',
      alias: ['누수', '누수탐지', '물샘', '천장누수', '배관누수'],
      unit: '1세대', basis: '탐지 공임', conf: 'official',
      band: { low: 150000, avg: 250000, high: 300000 },
      derive: '한국배관협회 급수배관 정밀탐지 기준 300,000원/세대. 업체 공개 범위 15만~30만.',
      globals: ['region', 'urgent'],
      traps: [
        '탐지비와 보수비를 분리해 "탐지 후 보수"에서 다시 청구',
        '"못 찾으면 무료"라고 했다가 출장비 명목으로 청구',
        '누수 지점 확인 후 벽·바닥 복구비가 별도 (10만~수십만)'
      ],
      questions: [
        '탐지비에 보수까지 포함인가요, 탐지 후 별도인가요?',
        '못 찾으면 탐지비를 받지 않는 조건인가요?',
        '누수 지점 확인 후 벽·바닥 복구비는 얼마인가요?'
      ],
      sources: [
        { name: '한국배관협회 표준정가표 — 급수배관 정밀탐지 300,000원/세대', url: 'https://kordc.org/pricing', asof: '2026 확인' },
        { name: '집꾸 집수리 비용표 — 누수탐지 15~30만', url: 'https://jibggu.com/cost-table', asof: '2026 확인' }
      ]
    },
    {
      id: 'home-toilet', cat: 'home', name: '변기 교체 (일반형·제품 포함)',
      alias: ['변기', '변기교체', '양변기', '변기수리'],
      unit: '1대', basis: '제품+시공', conf: 'published',
      band: { low: 270000, avg: 320000, high: 380000 },
      derive: '기본형 제품 포함 270,000원 공개가 + 재설치·실리콘 마감 100,000원을 상한 근거로.',
      globals: ['region', 'urgent'],
      traps: [
        '제품값을 빼고 "공임"만 말한 뒤 현장에서 제품값 추가',
        '기존 변기 철거·폐기물 처리비 별도',
        '재설치·실리콘 마감 10만원 추가'
      ],
      questions: [
        '제품 가격이 포함된 금액인가요? 모델명을 알려주세요.',
        '기존 변기 철거와 폐기물 처리가 포함인가요?',
        '재설치·실리콘 마감비가 따로 붙나요?'
      ],
      sources: [
        { name: '일산페인트 단위 작업 공개가 — 변기 교체 270,000원(기본형 제품 포함), 재설치·실리콘 100,000원', url: 'https://ilsanpaint.com/', asof: '2026-10' }
      ]
    },
    {
      id: 'home-faucet', cat: 'home', name: '세면대 수전 교체',
      alias: ['수전', '수전교체', '세면대수전', '싱크대수전'],
      unit: '1개', basis: '자재+공임', conf: 'published',
      band: { low: 180000, avg: 230000, high: 280000 },
      derive: '세면대 수전 교체 작업비 130,000원 + 수전 제품 5만~15만. 제품 등급에 따라 갈림.',
      globals: ['region', 'urgent'],
      traps: [
        '수전 제품값을 빼고 작업비만 안내 (제품 5~15만 별도)',
        '1홀·3홀 타공 작업 추가',
        '팝업·트랩 동시 교체를 권유 (10~15만 추가)'
      ],
      questions: [
        '수전 제품값이 포함인가요? 모델명과 재질을 알려주세요.',
        '기존 수전 철거와 3홀 타공 작업이 포함인가요?',
        '팝업·트랩은 교체 없이 수전만 했을 때 얼마인가요?'
      ],
      sources: [
        { name: '서울 바로하수구 요금표 — 세면대 수전 교체 130,000원(작업비)', url: 'https://seoulhasugu.co.kr/price', asof: '2026 확인' },
        { name: '당근 동네업체 공개가 — 수전 교체공임 30,000원~, 수전 5만~', url: 'https://www.daangn.com/kr/local-profile/%EB%8D%94-%EA%B9%94%EB%81%94-%EC%A7%91%EC%88%98%EB%A6%AC-%EC%88%98%EC%A0%84%EC%9A%A9%EC%8B%A4%EB%B3%80%EA%B8%B0%EC%8B%B1%ED%81%AC%EB%8C%80%EC%A0%84%EB%93%B1-vpjtiva4kp3j/', asof: '2026 확인' }
      ]
    },
    {
      id: 'home-screen', cat: 'home', name: '방충망 교체 (1짝)',
      alias: ['방충망', '방충망교체', '미세먼지방충망', '롤방충망'],
      unit: '1짝', basis: '자재+시공', conf: 'published',
      band: { low: 30000, avg: 45000, high: 60000 },
      derive: '1짝 기준. 업체 공개가 3만·6만, 공개 범위 3~5만. 평균은 범위의 중간값. 24평 전체는 22만~30만.',
      globals: ['region', 'urgent'],
      opts: [{
        key: 'scope', label: '범위', choices: [
          { v: 'one', label: '1짝', f: 1.0 },
          { v: 'whole24', label: '24평 전체', band: { low: 220000, avg: 260000, high: 300000 } },
          { v: 'whole32', label: '32평 전체', band: { low: 300000, avg: 340000, high: 380000 } }
        ]
      }],
      traps: [
        '방충망 종류(일반/미세먼지/롤)를 적지 않고 일반망으로 시공',
        '"1짝"과 "집 전체"를 섞어 계산',
        '틀(프레임) 교체가 필요한 곳을 나중에 추가'
      ],
      questions: [
        '방충망 종류(일반·미세먼지·롤)와 재질을 알려주세요.',
        '1짝 기준인가요, 집 전체 기준인가요? 짝 수를 세어주세요.',
        '틀(프레임) 교체가 필요한 곳은 어디인가요?'
      ],
      sources: [
        { name: '당근 동네업체 공개가 — 방충망 30,000원(1짝), 24평 전체 22만~, 32평 30만~', url: 'https://www.daangn.com/kr/local-profile/%EB%8D%94-%EA%B9%94%EB%81%94-%EC%A7%91%EC%88%98%EB%A6%AC-%EC%88%98%EC%A0%84%EC%9A%A9%EC%8B%A4%EB%B3%80%EA%B8%B0%EC%8B%B1%ED%81%AC%EB%8C%80%EC%A0%84%EB%93%B1-vpjtiva4kp3j/', asof: '2026 확인' },
        { name: '집꾸 비용표 — 방충망 3~5만/짝', url: 'https://jibggu.com/cost-table', asof: '2026 확인' }
      ]
    },
    {
      id: 'home-silicone', cat: 'home', name: '욕실 실리콘 코킹 (1칸)',
      alias: ['실리콘', '코킹', '욕실실리콘', '줄눈', '곰팡이실리콘'],
      unit: '욕실 1칸', basis: '자재+시공', conf: 'published',
      band: { low: 80000, avg: 120000, high: 150000 },
      derive: '공개 범위 8만~15만. 욕조만 5만, 욕실 1칸 전체 15만.',
      globals: ['region', 'urgent'],
      traps: [
        '곰팡이 제거·건조 시간을 빼고 덧바르기만',
        '실리콘 등급(방곰팡이/수중용)을 적지 않음',
        '줄눈(타일) 시공을 같은 작업으로 착각하게 함'
      ],
      questions: [
        '곰팡이 제거와 건조 시간이 포함된 작업인가요?',
        '실리콘 브랜드와 등급(방곰팡이·수중용)을 알려주세요.',
        '줄눈(타일) 시공은 별도인가요?'
      ],
      sources: [
        { name: '집꾸 비용표 — 실리콘 8~15만', url: 'https://jibggu.com/cost-table', asof: '2026 확인' },
        { name: '일산페인트 공개가 — 욕실 실리콘 150,000원', url: 'https://ilsanpaint.com/', asof: '2026-10' }
      ]
    },
    {
      id: 'home-fan', cat: 'home', name: '욕실 환풍기 교체',
      alias: ['환풍기', '욕실환풍기', '팬', '욕실팬'],
      unit: '1대', basis: '제품+시공', conf: 'market',
      band: { low: 100000, avg: 150000, high: 200000 },
      derive: '공개 범위 10만~20만(제품값 포함). 본체 3~8만 + 시공.',
      globals: ['region', 'urgent'],
      traps: [
        '제품값을 빼고 시공비만 안내',
        '기존 덕트·역류방지댐퍼 교체비 추가',
        '전원 배선·스위치 작업 별도'
      ],
      questions: [
        '환풍기 제품값이 포함인가요? 모델과 풍량을 알려주세요.',
        '기존 덕트 재사용인가요, 교체인가요?',
        '전원 배선과 스위치 작업이 포함인가요?'
      ],
      sources: [
        { name: '집꾸 비용표 — 욕실 환풍기 10~20만', url: 'https://jibggu.com/cost-table', asof: '2026 확인' }
      ]
    },

    /* ================= 가전 ================= */
    {
      id: 'app-ac-wall', cat: 'appliance', name: '벽걸이 에어컨 완전분해 청소',
      alias: ['벽걸이', '벽걸이에어컨', '에어컨청소', '에어컨 분해청소'],
      unit: '1대', basis: '청소 공임', conf: 'published',
      band: { low: 59000, avg: 85000, high: 131000 },
      derive: '사설 59,000원 ~ 제조사 정상가 131,000원. 제조사 공식 108,000~120,000원.',
      globals: ['region', 'urgent'],
      traps: [
        '"분해청소"라면서 필터·커버만 닦는 경우 — 송풍팬·열교환기 분해 여부 확인',
        '실외기 청소(5~9만)·살균(3~7만)을 별도로',
        '2대 이상 할인을 적용하지 않음'
      ],
      questions: [
        '송풍팬·열교환기까지 분해하는 완전분해인가요?',
        '실외기 청소와 살균이 포함인가요?',
        '2대 이상 할인은 어떻게 되나요?'
      ],
      sources: [
        { name: '영구크린 공개가 (2026-09-28) — 벽걸이 76,500원, 정상가 85,000원, 제조사 131,000원', url: 'https://www.mcygclean.com/clean/air_conditioner.jsp', asof: '2026-09' },
        { name: '파이낸셜투데이 제조사 공식 세척비 비교 (2025-04) — 삼성 108,000원·LG 120,000원', url: 'http://www.ftoday.co.kr/news/articleView.html?idxno=340501', asof: '2025-04' }
      ]
    },
    {
      id: 'app-ac-stand', cat: 'appliance', name: '스탠드 에어컨 완전분해 청소',
      alias: ['스탠드', '스탠드에어컨', '스탠드 청소', '거실에어컨'],
      unit: '1대', basis: '청소 공임', conf: 'published',
      band: { low: 95000, avg: 145000, high: 198000 },
      derive: '사설 89,000~165,000원, 제조사 정상가 198,000원, 공식 166,000~185,000원.',
      globals: ['region', 'urgent'],
      traps: [
        '무풍·갤러리 등 특수 모델 추가금(2~4만)을 나중에 통고',
        '스탠드+벽걸이 세트가 오히려 비싼 경우 (18만~)',
        '실외기 청소(5~9만)가 포함인지 묻지 않으면 따로 붙습니다'
      ],
      questions: [
        '무풍·갤러리 같은 특수 모델인가요? 추가금이 있나요?',
        '실외기 청소가 포함인가요?',
        '분해 범위(팬·열교환기·드레인)를 설명해 주세요.'
      ],
      sources: [
        { name: '영구크린 공개가 (2026-09) — 스탠드 121,500원·정상가 135,000원·제조사 198,000원', url: 'https://www.mcygclean.com/clean/air_conditioner.jsp', asof: '2026-09' },
        { name: '파이낸셜투데이 제조사 공식가 (2025-04) — 삼성 166,000원·LG 185,000원', url: 'http://www.ftoday.co.kr/news/articleView.html?idxno=340501', asof: '2025-04' }
      ]
    },
    {
      id: 'app-ac-system', cat: 'appliance', name: '시스템(천장형) 에어컨 4way 청소',
      alias: ['시스템에어컨', '천장형', '4way', '시스템 청소'],
      unit: '1대', basis: '청소 공임', conf: 'published',
      band: { low: 99000, avg: 140000, high: 195000 },
      derive: '사설 99,000원 ~ 제조사 195,000원. 4way 1대 기준.',
      globals: ['region', 'urgent'],
      traps: [
        '천장 높이 3m 초과 시 1~2만원 추가',
        '대수별 할인을 적용하지 않고 1대 단가로만 계산',
        '디퓨저·필터 세척을 별도 항목으로 청구'
      ],
      questions: [
        '4way 1대 기준인가요? 대수별 할인 단가를 알려주세요.',
        '천장 높이가 3m를 넘으면 추가금이 있나요?',
        '디퓨저·필터 세척이 포함인가요?'
      ],
      sources: [
        { name: '영구크린 공개가 (2026-09) — 4way 126,000원·정상가 140,000원·제조사 195,000원', url: 'https://www.mcygclean.com/clean/air_conditioner.jsp', asof: '2026-09' },
        { name: '홈닥터 가격 안내 (2026-10) — 4way 130,000원', url: 'https://www.homedr.co.kr/price', asof: '2026-10' }
      ]
    },
    {
      id: 'app-washer-top', cat: 'appliance', name: '통돌이 세탁기 분해 청소',
      alias: ['통돌이', '세탁기청소', '통돌이청소', '세탁조청소'],
      unit: '1대', basis: '청소 공임', conf: 'published',
      band: { low: 65000, avg: 105000, high: 143000 },
      derive: '사설 65,000원 ~ LG 공식 143,000원. 14~17kg 기준 평균 10만 선.',
      globals: ['region', 'urgent'],
      traps: [
        '통돌이/드럼을 혼동해 다른 단가 적용',
        '용량(kg)별 요금 차이를 말하지 않음',
        '오염 심함 추가금 1~3만원'
      ],
      questions: [
        '통돌이인지 드럼인지, 용량(kg)이 얼마인지 확인해 주세요.',
        '오염도 추가금이 붙는 조건이 있나요?',
        '분해 범위(내통·외통·날개)를 알려주세요.'
      ],
      sources: [
        { name: '미소 세탁기 청소 비용 비교 (2025-12) — LG 143,000·삼성 139,000·미소 107,900원', url: 'https://miso.kr/blog/%EC%84%B8%ED%83%81%EA%B8%B0%EC%B2%AD%EC%86%8C-%EA%B0%80%EC%9D%B4%EB%93%9C', asof: '2025-12' },
        { name: '홈닥터 가격 안내 (2026-10) — 통돌이 88,000~100,000원', url: 'https://www.homedr.co.kr/price', asof: '2026-10' }
      ]
    },
    {
      id: 'app-washer-drum', cat: 'appliance', name: '드럼 세탁기 분해 청소',
      alias: ['드럼', '드럼세탁기', '드럼 청소', '세탁기 분해'],
      unit: '1대', basis: '청소 공임', conf: 'published',
      band: { low: 100000, avg: 155000, high: 198000 },
      derive: '사설 100,000~158,400원, 제조사 공식 185,000~198,000원. 15~21kg 기준.',
      globals: ['region', 'urgent'],
      traps: [
        '빌트인·트윈워시·올인원은 20~30만원대로 별도',
        '고무패킹·배수필터 교체비 별도',
        '배수펌프 청소를 빼고 세탁통만 세척',
      ],
      questions: [
        '드럼 용량(kg)과 빌트인 여부를 알려주세요.',
        '고무패킹·배수필터·펌프까지 청소하나요?',
        '분해 후 재조립 누수 보증은 며칠인가요?'
      ],
      sources: [
        { name: '미소 세탁기 청소 비교 (2025-12) — LG 198,000·삼성 185,000·미소 128,300~158,400원', url: 'https://miso.kr/blog/%EC%84%B8%ED%83%81%EA%B8%B0%EC%B2%AD%EC%86%8C-%EA%B0%80%EC%9D%B4%EB%93%9C', asof: '2025-12' },
        { name: '청연 정찰제 (2026 확인) — 드럼 16kg 이하 178,200원~', url: 'https://www.chyeon.com/washer_clean', asof: '2026 확인' }
      ]
    },
    {
      id: 'app-refrigerant', cat: 'appliance', name: '에어컨 냉매 가스 충전',
      alias: ['냉매충전', '가스충전', '에어컨가스', '냉매'],
      unit: '1대', basis: '냉매+공임', conf: 'published',
      band: { low: 60000, avg: 70000, high: 80000 },
      derive: '홈닥터 공개가 — 청소 동반 60,000원, 충전만 80,000원(VAT 별도).',
      globals: ['region', 'urgent'],
      traps: [
        '냉매 종류(R410A/R32)와 충전량을 적지 않음',
        '누설 점검 없이 가스만 충전',
        '진공 작업(에어 제거)을 생략하고 가스만 충전',
      ],
      questions: [
        '냉매 종류와 충전량(그램)을 적어주세요.',
        '누설 점검과 진공 작업이 포함인가요?',
        '충전 후 온도차 측정 결과를 보여주시나요?'
      ],
      sources: [
        { name: '홈닥터 가격 안내 (2026-10) — 냉매 충전 60,000원(청소 동반)·80,000원(단독)', url: 'https://www.homedr.co.kr/price', asof: '2026-10' }
      ]
    },
    {
      id: 'app-outdoor', cat: 'appliance', name: '에어컨 실외기 청소',
      alias: ['실외기', '실외기청소', '에어컨 실외기'],
      unit: '1대', basis: '청소 공임', conf: 'published',
      band: { low: 49000, avg: 60000, high: 90000 },
      derive: '업체 공개가 49,000~90,000원. 1대 기준.',
      globals: ['region', 'urgent'],
      traps: [
        '실외기 위치(베란다/옥상)에 따른 추가금',
        '멀티 실외기를 단일로 계산',
        '방열판 세척 없이 겉면만'
      ],
      questions: [
        '실외기 위치와 대수, 단일/멀티 여부를 알려주세요.',
        '고압 세척과 방열판 세척이 포함인가요?',
        '청소 후 냉매 압력 점검도 해주시나요?'
      ],
      sources: [
        { name: '홈닥터 가격 안내 (2026-10) — 실외기 60,000원', url: 'https://www.homedr.co.kr/price', asof: '2026-10' },
        { name: '쏘왓 서울 업체 가격 비교 (2025-04) — 49,000~90,000원', url: 'https://sowhat.economy1110.com/2025/04/Seoul%20Air%20Conditioner%20Cleaning%20Company%20Price%20Comparison%20Best%209.html', asof: '2025-04' }
      ]
    },
    {
      id: 'app-visit', cat: 'appliance', name: '가전 출장 점검비 (냉장고·세탁기)',
      alias: ['출장비', '가전수리', '냉장고수리', '세탁기수리', '출장점검'],
      unit: '1회', basis: '출장비만', conf: 'official',
      band: { low: 28000, avg: 33000, high: 38000 },
      derive: '삼성·LG 공식 출장비 2026 — 평절기 28,000원, 야간·주말 33,000원, 성수기 33,000/38,000원. 부품비·기술료 별도.',
      globals: [],
      opts: [{
        key: 'season', label: '시기', choices: [
          { v: 'normal', label: '평절기(1~5·9~12월)', band: { low: 28000, avg: 33000, high: 38000 } },
          { v: 'peak', label: '성수기(6~8월)', band: { low: 33000, avg: 38000, high: 38000 } }
        ]
      }],
      traps: [
        '수리를 안 해도 출장비는 나감',
        '출장비 + 부품비 + 기술료로 쪼개져 총액이 2~3배',
        '성수기·야간 할증 5,000원'
      ],
      questions: [
        '출장비 외 부품비·기술료를 항목별로 견적해 주세요.',
        '수리를 안 하면 출장비만 내면 되나요?',
        '부품 보증기간과 재수리 비용은 어떻게 되나요?'
      ],
      sources: [
        { name: '삼성전자서비스·LG전자 공식 출장비 (2026 시행)', url: 'https://www.lge.co.kr/support/rates-warranty-guide', asof: '2026-11' }
      ]
    },
    {
      id: 'app-hood', cat: 'appliance', name: '주방 후드 분해 청소',
      alias: ['후드', '후드청소', '주방후드', '렌지후드'],
      unit: '1대', basis: '청소 공임', conf: 'market',
      band: { low: 70000, avg: 110000, high: 150000 },
      derive: '공개 범위 7만~15만. 평균은 범위의 중간값. 기름때 정도와 덕트 포함 여부에 따라 갈림.',
      globals: ['region', 'urgent'],
      traps: [
        '덕트 내부 청소가 별도',
        '필터를 세척이 아니라 교체로 바꿔 청구',
        '기름때 심한 경우 추가금'
      ],
      questions: [
        '덕트 내부 청소가 포함인가요?',
        '필터는 세척인가요, 교체인가요?',
        '기름때가 심하면 추가금이 있나요?'
      ],
      sources: [
        { name: '집꾸 비용표 — 주방 후드 분해청소 7~15만', url: 'https://jibggu.com/cost-table', asof: '2026 확인' }
      ]
    },

    /* ================= 치과 ================= */
    {
      id: 'den-implant', cat: 'dental', name: '임플란트 1치 (지르코니아)',
      alias: ['임플란트', '치과임플란트', '지르코니아 임플란트', '이빨심기'],
      unit: '1치', basis: '시술 전체', conf: 'official',
      band: { low: 540000, avg: 1181000, high: 2500000 },
      derive: '심평원 2026 비급여 공개 — 전체 평균 1,181,000원, 의원 최저 540,000원·최고 2,500,000원. 전체 최고는 5,937,000원.',
      globals: [],
      opts: [{
        key: 'hosp', label: '의료기관', choices: [
          { v: 'clinic', label: '치과의원', f: 1.0 },
          { v: 'hospital', label: '치과병원', f: 1.5, note: '2026 평균 174.8만 vs 의원 114만' }
        ]
      }],
      traps: [
        '뼈이식·상악동 거상이 별도 (30~100만원)',
        '지대주·임시치아·보철이 빠진 "식립만" 가격',
        '실패 시 재시술 비용·보증 기간을 말하지 않음'
      ],
      questions: [
        '뼈이식·상악동 거상·임시치아가 포함된 가격인가요?',
        '사용하는 임플란트 브랜드와 지대주 재료를 알려주세요.',
        '실패 시 재시술 보증 기간과 추가 비용은 어떻게 되나요?'
      ],
      sources: [
        { name: '보건복지부·심평원 2026 비급여 진료비용 공개 (2026-09-03)', url: 'https://www.dtissue.com/news/articleView.html?idxno=11682', asof: '2026-09' },
        { name: '심평원 2026 임플란트 평균 118.1만·최고 593.7만 보도', url: 'https://www.ket.kr/news/article.html?no=40518', asof: '2026-09' }
      ]
    },
    {
      id: 'den-crown-z', cat: 'dental', name: '지르코니아 크라운',
      alias: ['크라운', '지르코니아', '지르코니아크라운', '씌우기'],
      unit: '1치', basis: '보철 전체', conf: 'official',
      band: { low: 180000, avg: 550000, high: 1248000 },
      derive: '심평원 2026 병원급 신고 456곳 — 중앙값 550,000원, 최저 180,000원, 최고 1,248,000원.',
      globals: [],
      traps: [
        '신경치료·코어·포스트가 별도',
        '지르코니아 블록 등급(국산/수입)을 적지 않음',
        '보철 전 CT·진단료 추가'
      ],
      questions: [
        '신경치료·코어·포스트가 포함인가요?',
        '지르코니아 블록 브랜드와 제조사를 알려주세요.',
        '보철 보증 기간과 재제작 비용은요?'
      ],
      sources: [
        { name: '심평원 2026 비급여 — 크라운 지르코니아 중앙값 550,000원 (병원급 456곳)', url: 'https://eunhasu.net/pages/guide_dental_non_covered_price_compare', asof: '2026-11' },
        { name: '하스피톡 치과 비급여 통계 (2026-10-26)', url: 'https://price.hospitalk.net/stats/clcd/1100Z-%EC%B9%98%EA%B3%BC-%EC%B2%98%EC%B9%98%C2%B7-%EC%88%98%EC%88%A0%EB%A3%8C/%EC%B9%98%EA%B3%BC/', asof: '2026-10' }
      ]
    },
    {
      id: 'den-crown-pfm', cat: 'dental', name: 'PFM 크라운 (도재-금속)',
      alias: ['PFM', '피에프엠', '금속크라운', '도재금속'],
      unit: '1치', basis: '보철 전체', conf: 'official',
      band: { low: 204000, avg: 420000, high: 1072000 },
      derive: '심평원 2026 병원급 신고 429곳 — 중앙값 420,000원, 최저 204,000원, 최고 1,072,000원.',
      globals: [],
      traps: [
        '금속 변색·치은 착색 가능성을 설명하지 않음',
        '신경치료·코어가 포함인지 확인하지 않으면 따로 붙습니다',
        '상급종합병원은 중앙값이 57.5만'
      ],
      questions: [
        '금속 함량과 도재 종류를 알려주세요.',
        '신경치료·코어가 포함인가요?',
        '앞니인지 어금니인지에 따라 가격이 다른가요?'
      ],
      sources: [
        { name: '심평원 2026 비급여 — 크라운 PFM 중앙값 420,000원', url: 'https://eunhasu.net/pages/guide_dental_non_covered_price_compare', asof: '2026-11' }
      ]
    },
    {
      id: 'den-crown-gold', cat: 'dental', name: '골드 크라운',
      alias: ['골드', '금크라운', '골드크라운', '금니'],
      unit: '1치', basis: '보철 전체', conf: 'official',
      band: { low: 211000, avg: 700000, high: 2171300 },
      derive: '심평원 2026 병원급 신고 438곳 — 중앙값 700,000원, 최저 211,000원, 최고 2,171,300원. 금 시세에 연동.',
      globals: [],
      traps: [
        '금 시세 변동분을 계약 후에 반영',
        '금 함량(순금/18K)을 적지 않음',
        '치과병원 중앙값은 80만으로 더 높음'
      ],
      questions: [
        '금 함량과 사용 중량(그램)을 적어주세요.',
        '금 시세 변동 시 가격 조정 조건이 있나요?',
        '보철 보증 기간은 얼마인가요?'
      ],
      sources: [
        { name: '심평원 2026 비급여 — 크라운 Gold 중앙값 700,000원', url: 'https://eunhasu.net/pages/guide_dental_non_covered_price_compare', asof: '2026-11' }
      ]
    },
    {
      id: 'den-resin1', cat: 'dental', name: '레진 충전 (충치 1면)',
      alias: ['레진', '레진충전', '충치치료', '때우기'],
      unit: '1면', basis: '시술 전체', conf: 'official',
      band: { low: 50000, avg: 114503, high: 451320 },
      derive: '심평원 2026 전체 의료기관 — 최저 50,000원, 평균 114,503원, 최고 451,320원.',
      globals: [],
      traps: [
        '1면/2면 기준을 말하지 않고 치료 후 면 수로 청구',
        '마모·파절은 다른 항목(평균 9.4만·17.8만)',
        '만 12세 이하만 보험 적용 — 성인은 전액 비급여'
      ],
      questions: [
        '충치 몇 면 기준인가요? 치료 후 면 수를 적어주세요.',
        '레진 브랜드와 광중합기를 알려주세요.',
        '재료 하자 시 재시술 보증이 있나요?'
      ],
      sources: [
        { name: '심평원 2026 비급여 — 광중합형 복합레진 충전/우식-1면 평균 114,503원', url: 'https://price.hospitalk.net/stats/clcd/1100Z-%EC%B9%98%EA%B3%BC-%EC%B2%98%EC%B9%98%C2%B7-%EC%88%98%EC%88%A0%EB%A3%8C/%EC%B9%98%EA%B3%BC/', asof: '2026-10' }
      ]
    },
    {
      id: 'den-resin2', cat: 'dental', name: '레진 충전 (충치 2면)',
      alias: ['레진2면', '두면 레진', '충치 두면'],
      unit: '2면', basis: '시술 전체', conf: 'official',
      band: { low: 50000, avg: 156945, high: 380000 },
      derive: '심평원 2026 전체 — 최저 50,000원, 평균 156,945원, 최고 380,000원.',
      globals: [],
      traps: [
        '1면 가격으로 안내하고 치료 후 2면으로 청구',
        '인레이가 필요한 상태인데 레진으로 반복 치료',
        '치료 후 교합 조정 미포함'
      ],
      questions: [
        '2면 기준이 맞나요? 치료 전에 면 수를 확인해 주세요.',
        '인레이가 필요한 상태인지, 레진으로 충분한지 알려주세요.',
        '교합 조정과 재시술 보증이 포함인가요?'
      ],
      sources: [
        { name: '심평원 2026 비급여 — 레진 충전/우식-2면 평균 156,945원', url: 'https://price.hospitalk.net/stats/clcd/1100Z-%EC%B9%98%EA%B3%BC-%EC%B2%98%EC%B9%98%C2%B7-%EC%88%98%EC%88%A0%EB%A3%8C/%EC%B9%98%EA%B3%BC/', asof: '2026-10' }
      ]
    },
    {
      id: 'den-inlay-resin', cat: 'dental', name: '레진 인레이',
      alias: ['인레이', '레진인레이', '간접충전'],
      unit: '1치', basis: '시술 전체', conf: 'official',
      band: { low: 154000, avg: 311475, high: 667000 },
      derive: '심평원 2026 전체 — 최저 154,000원, 평균 311,475원, 최고 667,000원.',
      globals: [],
      traps: [
        '본뜨기·임시치아 비용 별도',
        '레진 인레이를 세라믹으로 바꿔 청구',
        '재료 하자 시 재제작 비용'
      ],
      questions: [
        '레진 인레이인가요, 세라믹 인레이인가요?',
        '본뜨기·임시치아·접착이 포함된 가격인가요?',
        '재제작 보증 기간은 얼마인가요?'
      ],
      sources: [
        { name: '심평원 2026 비급여 — 인레이/레진 평균 311,475원', url: 'https://price.hospitalk.net/stats/clcd/1100Z-%EC%B9%98%EA%B3%BC-%EC%B2%98%EC%B9%98%C2%B7-%EC%88%98%EC%88%A0%EB%A3%8C/%EC%B9%98%EA%B3%BC/', asof: '2026-10' }
      ]
    },
    {
      id: 'den-inlay-ceramic', cat: 'dental', name: '세라믹 인레이',
      alias: ['세라믹인레이', '도재인레이', 'CAD/CAM 인레이'],
      unit: '1치', basis: '시술 전체', conf: 'official',
      band: { low: 200000, avg: 365199, high: 684000 },
      derive: '심평원 2026 전체 — 최저 200,000원, 평균 365,199원, 최고 684,000원.',
      globals: [],
      traps: [
        'CAD/CAM 장비 사용료를 따로 청구',
        '본뜨기·임시치아 비용을 포함했다고만 하고 따로 청구',
        '색조·투명도 선택을 이유로 추가금을 요구',
      ],
      questions: [
        '세라믹 종류(도재/CAD-CAM)와 제조사를 알려주세요.',
        '본뜨기·임시치아·접착이 포함인가요?',
        '깨졌을 때 재제작 비용은 얼마인가요?'
      ],
      sources: [
        { name: '심평원 2026 비급여 — 인레이/도재-세라믹 평균 365,199원', url: 'https://price.hospitalk.net/stats/clcd/1100Z-%EC%B9%98%EA%B3%BC-%EC%B2%98%EC%B9%98%C2%B7-%EC%88%98%EC%88%A0%EB%A3%8C/%EC%B9%98%EA%B3%BC/', asof: '2026-10' }
      ]
    },
    {
      id: 'den-whitening', cat: 'dental', name: '전문가 치아미백 (3회 기준)',
      alias: ['미백', '치아미백', '블리칭', '치아하얗게'],
      unit: '3회', basis: '시술 전체', conf: 'published',
      band: { low: 297000, avg: 400000, high: 600000 },
      derive: '치과 공개 수가 — 원데이 297,000원, 전문가 3회 330,000~400,000원, 3회+자가미백 600,000원. 평균은 3회 기준.',
      globals: [],
      traps: [
        '1회 가격을 3회 가격처럼 안내',
        '시린 증상 처치(불소 도포) 별도',
        '자가미백 키트(시린지)를 별도로 청구',
      ],
      questions: [
        '전문가 미백 횟수와 사용 기기(광선/레이저)를 알려주세요.',
        '시술 후 불소 도포와 재광화 처치가 포함인가요?',
        '색 변화 유지 기간과 재시술 비용은요?'
      ],
      sources: [
        { name: '연세세브란스치과 비급여 수가 (2026-10) — 전문가 미백 3회 330,000원', url: 'https://ysevdc.com/price.php', asof: '2026-10' },
        { name: '신영통튼튼이치과 수가표 (2026) — 전문가 미백 3회 400,000원, 3회+자가 600,000원', url: 'https://www.ttecase.com/pricing', asof: '2026' }
      ]
    },
    {
      id: 'den-scaling', cat: 'dental', name: '스케일링 (건강보험, 연 1회)',
      alias: ['스케일링', '치석제거', '치석', '스켈링'],
      unit: '1회', basis: '본인부담', conf: 'official',
      band: { low: 15000, avg: 18200, high: 20000 },
      derive: '보험 적용 본인부담 — 예방 18,200원, 치주치료용 24,200원(2026). 비급여는 60,000원.',
      globals: [],
      opts: [{
        key: 'type', label: '구분', choices: [
          { v: 'prevent', label: '예방 스케일링(연 1회)', band: { low: 15000, avg: 18200, high: 20000 } },
          { v: 'perio', label: '치주치료 스케일링', band: { low: 20000, avg: 24200, high: 25000 } },
          { v: 'noncovered', label: '비급여(연 1회 초과)', band: { low: 30000, avg: 60000, high: 60000 } }
        ]
      }],
      traps: [
        '보험 연 1회를 이미 받았는데 비급여 6만원으로 안내',
        '치주치료(치근활택술)를 같은 날 추가',
        '미백·착색 제거를 스케일링에 끼워 청구'
      ],
      questions: [
        '올해 보험 스케일링을 받은 적이 있는지 확인해 주세요.',
        '치주치료(치근활택술)가 필요한 상태인가요?',
        '비급여로 돌리면 왜 6만원인가요?'
      ],
      sources: [
        { name: '신영통튼튼이치과 2026 보험 수가 — 18,200원/24,200원, 비급여 60,000원', url: 'https://www.ttecase.com/pricing', asof: '2026' },
        { name: '연합치과의원 비급여 고지 (2026-10) — 예방 18,000원, 비급여 60,000원', url: 'https://yeonhapdental.com/fees', asof: '2026-10' }
      ]
    },

    /* ================= 이사·청소 ================= */
    {
      id: 'move-cargo', cat: 'move', name: '원룸 용달 (1톤·운송만)',
      alias: ['용달', '원룸용달', '1톤', '용달이사'],
      unit: '1대', basis: '차량+기사', conf: 'market',
      band: { low: 54000, avg: 110000, high: 300000 },
      derive: '업체 공개 견적 평균 11만, 범위 5만~30만. 10km 기준 최저 54,000원(센디).',
      globals: ['region', 'urgent'],
      traps: [
        '상하차 도움은 별도 — 기사 1명 도움·인부 추가 각각 청구',
        '계단·사다리차·엘리베이터 사용료 별도',
        '대기료(시간당 5만)와 톨비·주차비 실비'
      ],
      questions: [
        '기사님 상하차 도움이 포함인가요? 아니면 얼마인가요?',
        '출발·도착 층수와 엘리베이터 유무를 반영했나요?',
        '대기료는 시간당 얼마인가요?'
      ],
      sources: [
        { name: '하나로통운 용달이사 비용 정리 (2026-11-10) — 평균 11만·범위 5~30만', url: 'https://hanarogls.kr/posts/828', asof: '2026-11' },
        { name: '센디 1톤 카고 10km 기준 54,000원~', url: 'https://sendy.ai/%EB%B9%84%EC%9A%A9%EC%95%88%EB%82%B4/%EC%9B%90%EB%A3%B8%EC%9D%B4%EC%82%AC', asof: '2026 확인' }
      ]
    },
    {
      id: 'move-room-labor', cat: 'move', name: '원룸 이사 (1톤·인력 포함)',
      alias: ['원룸이사', '원룸 이사', '투룸', '일반이사'],
      unit: '1건', basis: '운반+인력', conf: 'market',
      band: { low: 100000, avg: 220000, high: 520000 },
      derive: '업체 공개 견적 — 인력 포함 원룸 평균 22만, 범위 10만~52만.',
      globals: ['region', 'urgent'],
      traps: [
        '"운송만" 견적을 이사 견적으로 착각',
        '침대·책상 분해·조립 별도',
        '주말·손 없는 날 10~30% 할증'
      ],
      questions: [
        '포장·상하차·배치 중 어디까지 포함인가요?',
        '침대·책상 분해·조립이 포함인가요?',
        '주말·손 없는 날 할증이 얼마인가요?'
      ],
      sources: [
        { name: '하나로통운 용달이사 비용 (2026-11) — 인력 포함 원룸 평균 22만·10~52만', url: 'https://hanarogls.kr/posts/828', asof: '2026-11' }
      ]
    },
    {
      id: 'move-room-pack', cat: 'move', name: '원룸 포장이사 (10평 이하)',
      alias: ['원룸포장', '원룸 포장이사', '오피스텔 이사'],
      unit: '1건', basis: '포장+운반+정리', conf: 'market',
      band: { low: 220000, avg: 350000, high: 450000 },
      derive: '숨고 실거래 평균 22만(10~52만), 업체 공개가 30만~45만. 평균은 30만~45만의 중간값.',
      globals: ['region', 'urgent'],
      traps: [
        '1톤에 안 들어가는 짐 — 2.5톤으로 바꾸며 80만~',
        '사다리차·엘리베이터 사용료 별도',
        '에어컨 분해·설치 별도'
      ],
      questions: [
        '1톤 한 대로 짐이 다 들어가나요? 초과 시 얼마인가요?',
        '사다리차·엘리베이터 사용료가 포함인가요?',
        '에어컨 분해·설치는 별도인가요?'
      ],
      sources: [
        { name: '이사백과 원룸 이사 비용 (2026-10) — 포장 30~45만', url: 'https://packmoving.co.kr/cost/wonroom-isa-biyong/', asof: '2026-10' },
        { name: '이사히어로 숨고 2026-06 실거래 — 원룸 포장 평균 22만(10~52만)', url: 'https://isahero.kr/home/herostory/moving-types-cost-by-ton', asof: '2026-10' }
      ]
    },
    {
      id: 'move-pack-24', cat: 'move', name: '포장이사 24평 (5톤)',
      alias: ['24평 이사', '포장이사', '아파트 이사', '5톤'],
      unit: '1건', basis: '포장+운반+정리', conf: 'official',
      band: { low: 850000, avg: 1128000, high: 1700000 },
      derive: '허가이사종합정보 2025-12 전국평균 5톤 1,128,000원(시내·평일·사다리 제외). 업체 공개 범위 85만~170만.',
      globals: [],
      opts: [{
        key: 'ladder', label: '사다리차', choices: [
          { v: 'no', label: '미사용', add: 0 },
          { v: 'one', label: '한쪽 사용', add: 150000 },
          { v: 'both', label: '양쪽 사용', add: 300000 }
        ]
      }, {
        key: 'day', label: '날짜', choices: [
          { v: 'weekday', label: '평일', f: 1.0 },
          { v: 'weekend', label: '주말·월말', f: 1.1 },
          { v: 'lucky', label: '손 없는 날', f: 1.2 }
        ]
      }],
      traps: [
        '사다리차 15~52만원이 총액에 없음',
        '손 없는 날 10~30% 할증',
        '피아노·돌침대·붙박이장 등 특수품목 별도'
      ],
      questions: [
        '5톤 기준인가요? 작업 인원과 주방 담당이 포함인가요?',
        '사다리차·엘리베이터 사용료가 포함인가요?',
        '추가요금이 붙는 조건을 계약서에 적어주세요.'
      ],
      sources: [
        { name: '허가이사종합정보 2025-12 전국평균 — 5톤 1,128,000원', url: 'https://showmethetime.tistory.com/63', asof: '2025-12' },
        { name: '2026 포장이사 비용표 — 20~24평 85만~170만', url: 'https://showmethetime.tistory.com/63', asof: '2026-08' }
      ]
    },
    {
      id: 'move-pack-34', cat: 'move', name: '포장이사 34평 (5~6톤)',
      alias: ['34평 이사', '34평 포장이사', '84㎡ 이사'],
      unit: '1건', basis: '포장+운반+정리', conf: 'official',
      band: { low: 1200000, avg: 1328000, high: 2650000 },
      derive: '허가이사 5톤 112.8만·6톤 132.8만, 업체 공개 범위 120만~265만. 평균은 6톤 전국평균.',
      globals: [],
      opts: [{
        key: 'ladder', label: '사다리차', choices: [
          { v: 'no', label: '미사용', add: 0 },
          { v: 'one', label: '한쪽 사용', add: 150000 },
          { v: 'both', label: '양쪽 사용', add: 300000 }
        ]
      }, {
        key: 'day', label: '날짜', choices: [
          { v: 'weekday', label: '평일', f: 1.0 },
          { v: 'weekend', label: '주말·월말', f: 1.1 },
          { v: 'lucky', label: '손 없는 날', f: 1.2 }
        ]
      }],
      traps: [
        '6~10톤으로 올라가면 200만~265만',
        '사다리차를 양쪽에서 2회 사용하면 30만원 추가',
        '특수 가전(김치냉장고·운동기구) 작업비'
      ],
      questions: [
        '5톤인가요, 6톤인가요? 짐의 양으로 판단해 주세요.',
        '사다리차 사용 횟수와 비용이 포함인가요?',
        '특수품목 작업비가 따로 있나요?'
      ],
      sources: [
        { name: '허가이사종합정보 2025-12 — 5톤 112.8만·6톤 132.8만·7.5톤 162.1만', url: 'https://showmethetime.tistory.com/63', asof: '2025-12' },
        { name: '2026 포장이사 비용표 — 30~34평 120만~265만', url: 'https://showmethetime.tistory.com/63', asof: '2026-08' }
      ]
    },
    {
      id: 'move-ladder', cat: 'move', name: '사다리차 (5톤·2~6층)',
      alias: ['사다리차', '사다리', '스카이차'],
      unit: '1회', basis: '장비+기사', conf: 'official',
      band: { low: 120000, avg: 150000, high: 180000 },
      derive: '허가이사 2025-12 서울·경기 5톤 2~6층 15만. 업체 공개 범위 12만~18만.',
      globals: ['region', 'urgent'],
      traps: [
        '층이 높아지면 25층 52만까지',
        '양쪽 집에서 쓰면 2회 계산',
        '기본 작업 시간(2시간) 초과 시 시간당 3만'
      ],
      questions: [
        '5톤 기준 2~6층 요금이 맞나요? 층이 높으면 얼마인가요?',
        '기본 작업 시간(2시간)을 넘기면 시간당 얼마인가요?',
        '양쪽 집 모두 쓰면 2회로 계산되나요?'
      ],
      sources: [
        { name: '허가이사종합정보 2025-12 — 5톤 2~6층 15만, 25층 52만', url: 'https://showmethetime.tistory.com/63', asof: '2025-12' },
        { name: '이사백과 사다리차 2~5층 12~18만', url: 'https://packmoving.co.kr/cost/wonroom-isa-biyong/', asof: '2026-10' }
      ]
    },
    {
      id: 'move-clean-24', cat: 'move', name: '입주청소 (24평)',
      alias: ['입주청소', '이사청소', '청소', '24평 청소'],
      unit: '24평', basis: '평당 단가', conf: 'market',
      band: { low: 264000, avg: 312000, high: 360000 },
      derive: '공개 평당 단가 11,000~15,000원 × 24평. 평균은 13,000원/평.',
      globals: [],
      opts: [
        {
          key: 'state', label: '집 상태', choices: [
            { v: 'new', label: '신축 입주', f: 1.0 },
            { v: 'old', label: '구축(거주 이력)', f: 1.15 },
            { v: 'remodel', label: '리모델링 직후', f: 1.28 }
          ]
        },
        {
          key: 'pyeong', label: '평수', type: 'scale', base: 24, choices: [
            { v: '18', label: '18평', n: 18 }, { v: '24', label: '24평', n: 24 }, { v: '34', label: '34평', n: 34 }
          ]
        }
      ],
      traps: [
        '베란다 확장형 10~20% 가산',
        '곰팡이·보양재 제거 3~5만, 가전 내부 3~5만 별도',
        '현장에서 "분진 추가금" 25만 사례'
      ],
      questions: [
        '평당 단가와 공급면적 기준인지 확인해 주세요.',
        '베란다 확장·곰팡이 제거·가전 내부가 포함인가요?',
        '현장 추가금이 붙는 조건을 미리 알려주세요.'
      ],
      sources: [
        { name: '홈팩트북 입주청소 비용 (2026-10) — 평당 11,000~15,000원', url: 'https://homefactbook.com/%EC%9E%85%EC%A3%BC%EC%B2%AD%EC%86%8C-%EB%B9%84%EC%9A%A9/', asof: '2026-10' },
        { name: '유리지갑 입주청소 계산기 (2026-08) — 평당 12,000~15,000원', url: 'https://glasswallet.com/calculate/move-in-cleaning-cost/', asof: '2026-08' }
      ]
    },
    {
      id: 'move-clean-34', cat: 'move', name: '입주청소 (34평)',
      alias: ['34평 청소', '34평 입주청소'],
      unit: '34평', basis: '평당 단가', conf: 'market',
      band: { low: 374000, avg: 442000, high: 510000 },
      derive: '평당 11,000~15,000원 × 34평. 평균은 13,000원/평.',
      globals: [],
      opts: [{
        key: 'state', label: '집 상태', choices: [
          { v: 'new', label: '신축 입주', f: 1.0 },
          { v: 'old', label: '구축(거주 이력)', f: 1.15 }
        ]
      }, {
        key: 'pyeong', label: '평수', type: 'scale', base: 34, choices: [
          { v: '24', label: '24평', n: 24 }, { v: '34', label: '34평', n: 34 }, { v: '45', label: '45평', n: 45 }
        ]
      }],
      traps: [
        '신축 준공청소는 평당 15,000~18,000원으로 더 비쌈',
        '베란다 3개 이상 추가금',
        '층고 3m 이상 사다리 작업 추가'
      ],
      questions: [
        '신축 준공청소인가요, 일반 입주청소인가요?',
        '베란다 개수와 확장 여부를 반영했나요?',
        '기본 작업 범위(창틀·수납장 내부)를 문서로 주세요.'
      ],
      sources: [
        { name: '홈팩트북 입주청소 비용 (2026-10) — 34평 37.4만~51만', url: 'https://homefactbook.com/%EC%9E%85%EC%A3%BC%EC%B2%AD%EC%86%8C-%EB%B9%84%EC%9A%A9/', asof: '2026-10' },
        { name: '모아툴 2026 평당 단가 — 입주 12,000~15,000원', url: 'https://www.mowatool.com/calculators/life/move-in-cleaning-cost', asof: '2026' }
      ]
    },
    {
      id: 'move-clean-old34', cat: 'move', name: '이사청소 (34평·구축)',
      alias: ['이사청소 34평', '구축 청소', '거주청소'],
      unit: '34평', basis: '평당 단가', conf: 'market',
      band: { low: 442000, avg: 493000, high: 544000 },
      derive: '구축 이사청소 평당 13,000~16,000원 × 34평. 평균 14,500원/평.',
      globals: [],
      opts: [{
        key: 'pyeong', label: '평수', type: 'scale', base: 34, choices: [
          { v: '24', label: '24평', n: 24 }, { v: '34', label: '34평', n: 34 }, { v: '45', label: '45평', n: 45 }
        ]
      }],
      traps: [
        '주방 후드 기름때·욕실 곰팡이 제거 별도',
        '짐이 남아 있으면 거주청소(평당 15,000~19,000원)',
        '외창 청소 5~10만 별도'
      ],
      questions: [
        '짐이 완전히 빠진 상태인가요?',
        '주방 후드·욕실 곰팡이 제거가 포함인가요?',
        '외창과 베란다 바깥쪽도 청소하나요?'
      ],
      sources: [
        { name: '코그로우 KTI 매거진 (2026-11) — 구축 이사청소 평당 13,000~16,000원', url: 'https://www.cogrow.co.kr/info/c/public/move-in-cleaning-cost-checklist-guide-2026', asof: '2026-11' }
      ]
    },

    /* ================= PC·스마트폰 ================= */
    {
      id: 'it-windows', cat: 'it', name: '윈도우 재설치 (포맷 포함)',
      alias: ['윈도우', '포맷', '윈도우 재설치', 'OS설치', '컴퓨터 포맷'],
      unit: '1대', basis: '공임', conf: 'market',
      band: { low: 20000, avg: 35000, high: 50000 },
      derive: 'PC공임 표준공임 30,000~50,000원, 시장 범위 20,000~50,000원. 정품 라이선스 별도.',
      globals: ['region'],
      opts: [{
        key: 'visit', label: '방식', choices: [
          { v: 'shop', label: '매장 방문', add: 0 },
          { v: 'visit', label: '출장', add: 25000 }
        ]
      }],
      traps: [
        '정품 윈도우 라이선스(10~20만)를 별도로',
        '포맷 전 데이터 백업 별도',
        '드라이버·기본 프로그램 설치 추가'
      ],
      questions: [
        '정품 윈도우 라이선스가 포함인가요?',
        '포맷 전 데이터 백업이 포함인가요?',
        '드라이버와 기본 프로그램 설치까지 해주시나요?'
      ],
      sources: [
        { name: 'PC공임 표준공임표 — 포맷+윈도우 재설치 30,000~50,000원', url: 'https://pcgongim.com/standard_price.php', asof: '2026 확인' },
        { name: '테크집사 2026 컴퓨터 수리비 — 20,000~50,000원', url: 'https://techdoctor.tistory.com/entry/%EC%BB%B4%ED%93%A8%ED%84%B0-%EC%88%98%EB%A6%AC-%EB%B9%84%EC%9A%A9-%EC%B4%9D%EC%A0%95%EB%A6%AC-2026', asof: '2026-03' }
      ]
    },
    {
      id: 'it-laptop-lcd', cat: 'it', name: '노트북 액정 교체 (부품+공임)',
      alias: ['노트북액정', '노트북 액정', 'LCD', '노트북 화면'],
      unit: '1대', basis: '부품+공임', conf: 'market',
      band: { low: 100000, avg: 250000, high: 600000 },
      derive: '공임 50,000~80,000원 + 패널 5~50만. 부품 포함 총액 범위 10만~60만.',
      globals: ['region'],
      traps: [
        '패널만 교체인지 상판 전체인지 확인',
        '정품/호환 패널을 구분하지 않음',
        '공임을 부품값에 숨겨 표시'
      ],
      questions: [
        '패널만 교체인가요, 상판 전체인가요?',
        '정품 패널인지 호환 패널인지 알려주세요.',
        '교체 후 불량 화소·백라이트 보증은요?'
      ],
      sources: [
        { name: '테크집사 2026 — 노트북 액정 공임 5~8만·부품 포함 10~60만', url: 'https://techdoctor.tistory.com/entry/%EC%BB%B4%ED%93%A8%ED%84%B0-%EC%88%98%EB%A6%AC-%EB%B9%84%EC%9A%A9-%EC%B4%9D%EC%A0%95%EB%A6%AC-2026', asof: '2026-03' }
      ]
    },
    {
      id: 'it-recovery', cat: 'it', name: '데이터 복구 (논리 손상·1TB 이하)',
      alias: ['데이터복구', '복구', '하드복구', '파일복구'],
      unit: '1건', basis: '복구 공임', conf: 'market',
      band: { low: 90000, avg: 120000, high: 150000 },
      derive: '소프트웨어 손상 HDD 500GB 9~11만, 1TB 10~12만. 논리 복구 상한 15만.',
      globals: ['region'],
      traps: [
        '논리/물리 손상을 구분하지 않고 물리가(30만~)로 청구',
        '복구 성공 시 추가 비용',
        '복구 불가일 때도 진단비를 따로 청구',
      ],
      questions: [
        '논리 복구인가요, 물리 복구인가요? 진단 결과를 먼저 알려주세요.',
        '복구 성공 시에만 청구되는 조건인가요?',
        '복구 불가 시 진단비는 얼마인가요?'
      ],
      sources: [
        { name: '테크집사 2026 — HDD 500GB 9~11만·1TB 10~12만', url: 'https://techdoctor.tistory.com/entry/%EC%BB%B4%ED%93%A8%ED%84%B0-%EC%88%98%EB%A6%AC-%EB%B9%84%EC%9A%A9-%EC%B4%9D%EC%A0%95%EB%A6%AC-2026', asof: '2026-03' },
        { name: 'PC공임 — 논리적 데이터 복구 150,000원~', url: 'https://pcgongim.com/standard_price.php', asof: '2026 확인' }
      ]
    },
    {
      id: 'it-ssd', cat: 'it', name: 'SSD 교체 + 윈도우 설치 (공임)',
      alias: ['SSD', 'SSD교체', '하드교체', '저장장치'],
      unit: '1대', basis: '공임만', conf: 'published',
      band: { low: 15000, avg: 35000, high: 50000 },
      derive: 'PC공임 SSD 교체 15,000~25,000원 + OS 설치, 시장 30,000~50,000원. 부품값 별도.',
      globals: ['region'],
      traps: [
        'SSD 부품값(5~15만)을 빼고 공임만 안내',
        '데이터 이전(복제) 6~9만 별도',
        '윈도우 라이선스와 드라이버 설치를 별도로',
      ],
      questions: [
        'SSD 부품값이 별도인가요? 모델과 용량을 알려주세요.',
        '기존 데이터 복제(마이그레이션)가 포함인가요?',
        '윈도우 재설치가 필요한가요?'
      ],
      sources: [
        { name: 'PC공임 — SSD/HDD 교체 15,000~25,000원, 데이터 이전 60,000~90,000원', url: 'https://pcgongim.com/standard_price.php', asof: '2026 확인' }
      ]
    },
    {
      id: 'it-iphone-official', cat: 'it', name: '아이폰 액정 교체 (Apple 공식)',
      alias: ['아이폰 액정', '아이폰수리', '아이폰 화면', '애플 수리'],
      unit: '1대', basis: '공식 수리', conf: 'official',
      band: { low: 189000, avg: 420000, high: 559000 },
      derive: 'Apple 공식 화면 손상 요금(2026-09) — SE 189,000원, 기본형 420,000원, 프로 499,000원, 프로맥스 559,000원. 평균은 기본형 기준.',
      globals: [],
      opts: [{
        key: 'model', label: '기종', choices: [
          { v: 'all', label: '기종 전체(범위)', band: { low: 189000, avg: 420000, high: 559000 } },
          { v: 'se', label: 'SE 2·3세대', band: { low: 189000, avg: 189000, high: 189000 } },
          { v: 'base', label: '15·16 기본', band: { low: 420000, avg: 420000, high: 420000 } },
          { v: 'pro', label: '프로·17', band: { low: 499000, avg: 499000, high: 499000 } },
          { v: 'promax', label: '프로 맥스', band: { low: 559000, avg: 559000, high: 559000 } }
        ]
      }],
      traps: [
        '애플케어+ 가입자는 자기부담금 40,000원 — 확인 없이 일반 수리',
        '공인 서비스 제공업체는 자체 요금을 책정할 수 있음',
        '후면 유리까지 깨지면 55만~69만'
      ],
      questions: [
        '제 기종의 공식 화면 손상 요금이 맞나요?',
        '애플케어+ 자기부담금 4만원과 비교해 주세요.',
        '후면 유리도 깨졌으면 얼마인가요?'
      ],
      sources: [
        { name: 'Apple 공식 iPhone 서비스 요금 (2026-09 확인)', url: 'https://support.apple.com/ko-kr/iphone/repair?services=service', asof: '2026-09' },
        { name: '기종별 공식 수리비 정리 (2026-09-26)', url: 'https://xn--9y2bo82b.net/wiki/%EC%95%84%EC%9D%B4%ED%8F%B0-%EC%95%A1%EC%A0%95-%EC%88%98%EB%A6%AC%EB%B9%84-179', asof: '2026-09' }
      ]
    },
    {
      id: 'it-iphone-third', cat: 'it', name: '아이폰 액정 교체 (사설)',
      alias: ['아이폰 사설', '사설수리', '아이폰 유리', '액정 사설'],
      unit: '1대', basis: '부품+공임', conf: 'published',
      band: { low: 90000, avg: 250000, high: 600000 },
      derive: '사설 단가표(2026-11-20) — 유리만 9만~35만, LCD까지 20만~60만.',
      globals: ['region'],
      opts: [{
        key: 'damage', label: '손상 범위', choices: [
          { v: 'all', label: '손상 전체(범위)', band: { low: 90000, avg: 250000, high: 600000 } },
          { v: 'glass', label: '유리만 깨짐', band: { low: 90000, avg: 180000, high: 350000 } },
          { v: 'lcd', label: 'LCD까지 손상', band: { low: 200000, avg: 350000, high: 600000 } }
        ]
      }],
      traps: [
        '유리만 깨졌는데 LCD 교체로 청구',
        '부품 등급(정품/HX/DD)을 적지 않음',
        '수리 후 방수·페이스ID 보증 없음'
      ],
      questions: [
        '유리만 교체인가요, LCD까지인가요?',
        '부품 등급(정품/HX/DD)과 보증 기간을 알려주세요.',
        '수리 후 방수·페이스ID 정상 동작 보증이 있나요?'
      ],
      sources: [
        { name: '다올리페어 아이폰 액정 수리비 표 (2026-11-20 단가)', url: 'https://xn--2j1bq2k97kxnah86c.com/articles/iphone-screen-repair-cost', asof: '2026-11' }
      ]
    },
    {
      id: 'it-galaxy-lcd', cat: 'it', name: '갤럭시 디스플레이 교체 (S25 계열)',
      alias: ['갤럭시액정', '갤럭시 액정', '삼성수리', '폰액정'],
      unit: '1대', basis: '파손품 반납가', conf: 'published',
      band: { low: 184000, avg: 230000, high: 295000 },
      derive: '삼성전자서비스 센터 안내(2026-10) — S25 184,000원, S25+ 230,000원, S25 울트라 295,000원(파손품 반납). 평균은 S25+ 기준.',
      globals: [],
      opts: [{
        key: 'model', label: '기종', choices: [
          { v: 'all', label: 'S25 계열 전체', band: { low: 184000, avg: 230000, high: 295000 } },
          { v: 's25', label: 'S25', band: { low: 184000, avg: 184000, high: 184000 } },
          { v: 's25p', label: 'S25+', band: { low: 230000, avg: 230000, high: 230000 } },
          { v: 's25u', label: 'S25 울트라', band: { low: 295000, avg: 295000, high: 295000 } }
        ]
      }],
      traps: [
        '파손품 미반납 시 15만원 추가',
        '단품 수리 가능 요일(평일) — 토요일 방문 시 통짜 견적',
        '출장비 28,000원 별도'
      ],
      questions: [
        '파손품 반납 기준 금액인가요? 미반납 시 얼마인가요?',
        '단품 수리 가능한 기종·요일인가요?',
        '출장비 28,000원이 포함된 금액인가요?'
      ],
      sources: [
        { name: '유리지갑 삼성서비스센터 수리비 정리 (2026-10)', url: 'https://glasswallet.com/blog/samsung-service-center-repair-cost-guide/', asof: '2026-10' }
      ]
    },
    {
      id: 'it-galaxy-battery', cat: 'it', name: '갤럭시 배터리 교체',
      alias: ['갤럭시배터리', '휴대폰 배터리', '배터리교체'],
      unit: '1대', basis: '부품+공임', conf: 'published',
      band: { low: 67500, avg: 68500, high: 69500 },
      derive: '삼성전자서비스 센터 안내(2026-10) — S25 67,500원, S25 울트라 69,500원.',
      globals: [],
      traps: [
        '배터리 단품인지 모듈 교체인지 확인',
        '방수 실링 재작업 여부',
        '출장비 28,000원 별도'
      ],
      questions: [
        '배터리 단품 교체인가요, 모듈 교체인가요?',
        '교체 후 방수 성능이 유지되나요?',
        '배터리 보증 기간은요?'
      ],
      sources: [
        { name: '유리지갑 삼성서비스센터 수리비 (2026-10) — 배터리 67,500~69,500원', url: 'https://glasswallet.com/blog/samsung-service-center-repair-cost-guide/', asof: '2026-10' }
      ]
    },
    {
      id: 'it-pc-visit', cat: 'it', name: 'PC 출장 점검비',
      alias: ['출장비', 'PC출장', '컴퓨터 출장', '방문점검'],
      unit: '1회', basis: '출장비만', conf: 'market',
      band: { low: 12000, avg: 25000, high: 30000 },
      derive: '업체 공개 출장비 12,000~30,000원. 평균 25,000원 선.',
      globals: ['region'],
      traps: [
        '수리를 안 해도 출장비는 나감',
        '진단비를 출장비와 따로 청구',
        '원거리·야간 출장 할증 기준이 따로 있음',
      ],
      questions: [
        '출장비에 진단비가 포함인가요?',
        '수리하지 않으면 출장비만 내면 되나요?',
        '원거리·야간 할증 기준이 있나요?'
      ],
      sources: [
        { name: '테크집사 2026 — 출장비 12,000원~', url: 'https://techdoctor.tistory.com/entry/%EC%BB%B4%ED%93%A8%ED%84%B0-%EC%88%98%EB%A6%AC-%EB%B9%84%EC%9A%A9-%EC%B4%9D%EC%A0%95%EB%A6%AC-2026', asof: '2026-03' },
        { name: 'PC공임 — 기본 출장비 25,000~30,000원', url: 'https://pcgongim.com/standard_price.php', asof: '2026 확인' }
      ]
    }
  ];

  return { CATEGORIES: CATEGORIES, ITEMS: ITEMS };
});
