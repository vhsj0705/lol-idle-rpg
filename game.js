'use strict';
// ===== 유틸 =====
const $ = s => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function fmt(n) {
  n = Math.floor(n);
  const units = [[1e16, '경'], [1e12, '조'], [1e8, '억'], [1e4, '만']];
  for (const [v, u] of units) if (n >= v) return (n / v).toFixed(n / v >= 100 ? 0 : 1) + u;
  return n.toLocaleString();
}
const img = id => `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/champion/${id}.png`;
const splash = id => `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${id}_0.jpg`;
// Community Dragon(게임 클라이언트 파일)의 LoL/TFT 이미지. path는 assets/ 아래 경로
const cdIcon = path => `https://raw.communitydragon.org/latest/game/assets/${path}`;
const tftUnit = (dir, file = `${dir}_square`, hud = true) => `characters/${dir}/${hud ? 'hud/' : ''}${file}.png`;
// 아이콘 HTML: 이미지를 못 불러오면 이모지로 대체
const iconImg = (url, fb, cls = 'mimg') => `<img class="${cls}" src="${url}" alt="" data-fb="${fb}" onerror="this.outerHTML=this.dataset.fb">`;
const itemImg = id => `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/item/${id}.png`;
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1800); }

// ===== 밸런스 기획 =====
// 포지션별 기본 능력치 (Lv1, ★1, 일반 기준)
const BASE = {
  T: { hp: 460, atk: 24, def: 30, aspd: 0.80, crit: 0.05 },
  J: { hp: 360, atk: 30, def: 20, aspd: 0.95, crit: 0.15 },
  M: { hp: 270, atk: 30, def: 12, aspd: 0.75, crit: 0.05 },
  A: { hp: 250, atk: 36, def: 10, aspd: 1.15, crit: 0.20 },
  S: { hp: 310, atk: 18, def: 18, aspd: 0.80, crit: 0.05 },
};
// 역할군 보정
const TAGMOD = {
  F: { hp: 1.10, atk: 1.08, def: 1.0, skill: 1.0, gauge: 1.0, crit: 0 },
  T: { hp: 1.30, atk: 0.85, def: 1.3, skill: 1.0, gauge: 1.0, crit: 0 },
  M: { hp: 1.00, atk: 1.00, def: 1.0, skill: 1.25, gauge: 1.0, crit: 0 },
  A: { hp: 0.90, atk: 1.15, def: 1.0, skill: 1.0, gauge: 1.0, crit: 0.10 },
  S: { hp: 1.00, atk: 1.00, def: 1.0, skill: 1.0, gauge: 1.15, crit: 0 },
};
// 레벨·★ 성장률은 등급마다 다르다 (data.js RARITY의 lv/star). 높은 등급일수록 강화할 때 더 많이 오른다
const growthMult = (rarity, lv, star) => { const r = RARITY[rarity]; return r.mult * Math.pow(r.lv, lv - 1) * Math.pow(r.star, star - 1); };
const STAR_NEED = [1, 2, 4, 8, 15];             // 다음 ★까지 필요한 중복 카드 수
const MAX_STAR = 6;
const MAX_DECK = 10;
const levelCap = star => star * 20 + 10;       // ★1:30 ★2:50 … ★6:130
// 등급별 육성 비용 배율: 일반 ×1 · 희귀 ×2 · 영웅 ×3.5 · 전설 ×5
const RARITY_COST = [1, 2, 3.5, 5];
const levelCost = (lv, rarity) => Math.floor(20 * Math.pow(1.068, lv - 1) * RARITY_COST[rarity]);
// 성급 강화: 중복 카드 + 골드 (성급이 오를수록 약 1.8배씩)
const starCost = (star, rarity) => Math.floor(200 * Math.pow(1.79, star - 1) * RARITY_COST[rarity]);
// 스킬: 챔피언마다 위력(c.pw)과 마나 비용(c.mana, 위력에 비례), 마나 회복 속도(c.manaGain)가 다르다
const MANA_REGEN = 1 / 8;                         // 초당 자연 회복 = 평타 1회 회복량 × 1/8

// 소환
const PULL_COST = 100, PULL10_COST = 1000, PITY = 70;

// 장비: 6칸, 등급이 높을수록 능력치 종류(개수)와 수치가 늘어난다
const GEAR_GRADES = [
  { name: '일반', color: '#9aa4b1', rate: 50, base: 8, n: 1 },
  { name: '희귀', color: '#4aa8ff', rate: 30, base: 16, n: 2 },
  { name: '영웅', color: '#b46cff', rate: 14, base: 28, n: 3 },
  { name: '전설', color: '#ffb52e', rate: 5, base: 45, n: 4 },
  { name: '신화', color: '#ff4f6d', rate: 1, base: 70, n: 5 },
];
// coef: 수치 계수, w: 장비 점수 가중치(좋은 장비 비교용)
const GEAR_STATS = {
  atk: { name: '공격력', coef: 1, w: 1 }, hp: { name: '체력', coef: 1, w: 0.8 }, def: { name: '방어력', coef: 1, w: 0.8 },
  crit: { name: '치명타 확률', coef: 0.3, w: 3.3 }, aspd: { name: '공격 속도', coef: 0.5, w: 2 },
  skill: { name: '스킬 피해', coef: 0.9, w: 1 }, gauge: { name: '게이지 충전', coef: 0.6, w: 1.3 },
};
// items: 등급(일반→신화)별 LoL 완성 아이템 [Data Dragon 아이템 ID, 이름]. 이미지도 해당 아이템의 것을 쓴다
const GEAR_SLOTS = {
  weapon: { name: '무기', icon: '🗡️', main: 'atk', items: [[3142, '요우무의 유령검'], [3071, '칠흑의 양날 도끼'], [3153, '몰락한 왕의 검'], [3031, '무한의 대검'], [6672, '크라켄 학살자']] },
  armor: { name: '방어구', icon: '🛡️', main: 'hp', items: [[3742, '망자의 갑옷'], [3068, '태양불꽃 방패'], [3084, '강철심장'], [3083, '워모그의 갑옷'], [3143, '란두인의 예언']] },
  helm: { name: '투구', icon: '⛑️', main: 'def', items: [[6333, '죽음의 무도'], [3065, '정령의 형상'], [3110, '얼어붙은 심장'], [8020, '심연의 가면'], [3026, '수호 천사']] },
  gloves: { name: '장갑', icon: '🧤', main: 'crit', items: [[3094, '고속 연사포'], [3085, '루난의 허리케인'], [3046, '유령 무희'], [3036, '도미닉 경의 인사'], [6675, '나보리 명멸검']] },
  boots: { name: '신발', icon: '👢', main: 'aspd', items: [[3047, '판금 장화'], [3006, '광전사의 군화'], [3158, '명석함의 아이오니아 장화'], [3174, '무장 진격'], [3172, '건메탈 군화']] },
  acc: { name: '장신구', icon: '💍', main: 'skill', items: [[3157, '존야의 모래시계'], [3003, '대천사의 지팡이'], [3165, '모렐로노미콘'], [6657, '영겁의 지팡이'], [3089, '라바돈의 죽음모자']] },
};
const gearName = g => GEAR_SLOTS[g.slot].items[g.grade][1];
// 장비 아이콘: 장착 장비는 그 아이템, 빈 칸은 일반 등급 아이템을 흐리게 표시
const gearIcon = (slot, grade, cls = 'gimg') => iconImg(itemImg(GEAR_SLOTS[slot].items[grade][0]), GEAR_SLOTS[slot].icon, cls);
const GEAR_KEYS = Object.keys(GEAR_SLOTS);
const CRAFT_COST = 10;
const MAX_PLUS = 25;

// 스테이지
const CHAPTERS = ['데마시아', '녹서스', '아이오니아', '필트오버', '자운', '프렐요드', '슈리마', '그림자 군도', '빌지워터', '공허'];
// [이름, 대체 이모지, 이미지 경로] — TFT 유닛 초상화를 우선 쓰고, TFT에 없는 원소 드래곤은 LoL 미니맵 아이콘을 쓴다
const MOBS = [['근접 미니언', '⚔️', tftUnit('tfteventer_minionmelee')], ['원거리 미니언', '🔮', tftUnit('tfteventer_minionranged')], ['대포 미니언', '💣', tftUnit('tfteventer_minionsiege')],
  ['칼날부리', '🐦', tftUnit('tft_razorbeak', 'razorbeak_square')], ['어스름 늑대', '🐺', tftUnit('tft_murkwolf')], ['돌거북', '🐢', tftUnit('tft_krug', 'ancientkrug_square')],
  ['심술두꺼비', '🐸', tftUnit('tft16_pve_gromp')], ['바위게', '🦀', tftUnit('tft18_scuttlecrab', 'tft18_scuttlecrab_square', false)],
  ['공허충', '🪲', tftUnit('tft16_malzaharvoidling')], ['크루그', '🪨', tftUnit('tft18_krug', 'tft18_krug_square', false)]];
const ELITES = [['붉은 덩굴정령', '🔥', tftUnit('tft16_pve_redgolem')], ['푸른 파수꾼', '💧', tftUnit('tft16_pve_bluegolem')], ['고대 크루그', '🗿', tftUnit('tft_krug', 'ancientkrug_square')], ['공허 유충', '🐛', tftUnit('tft16_pve_voidgrublarge')]];
const BOSSES = [['협곡의 전령', '👁️', tftUnit('tft_riftherald', 'tft9_riftherald_square')], ['화염 드래곤', '🐉', 'ux/minimap/icons/dragon_infernal.png'], ['바다 드래곤', '🌊', 'ux/minimap/icons/dragon_ocean.png'],
  ['마법공학 드래곤', '⚡', 'ux/minimap/icons/dragon_chemtech.png'], ['바람 드래곤', '🌪️', 'ux/minimap/icons/dragon_cloud.png'], ['대지 드래곤', '⛰️', 'ux/minimap/icons/dragon_mountain.png'],
  ['장로 드래곤', '🐲', tftUnit('tft18_elderdragon')], ['아타칸', '👹', tftUnit('tft16_atakhan')],
  ['공허의 전령', '🦑', 'characters/tft16_riftherald/skins/base/images/tft16_riftherald_splash_tile_0.png'], ['내셔 남작', '🦂', tftUnit('tft16_baronnashor')]];
const stageName = s => {
  const ch = Math.floor((s - 1) / 10), sub = (s - 1) % 10 + 1;
  const loop = Math.floor(ch / CHAPTERS.length);
  return `${CHAPTERS[ch % CHAPTERS.length]}${loop ? ` (심연 ${loop})` : ''} ${ch + 1}-${sub}`;
};
const enemyStat = s => ({ hp: 150 * Math.pow(1.065, s - 1), atk: 16 * Math.pow(1.056, s - 1), def: 5 + s * 0.6 });
const killGold = s => 5 * Math.pow(1.058, s - 1);
const killGoldV1 = s => 5 * Math.pow(1.12, s - 1);   // 이전 경제 (저장 데이터 변환용)
const towerStage = f => Math.round(4 + f * 2.4);

// 적 종류별 배율 / 전투 시간 환산용
// champ: 챔피언 대결 스테이지의 적 챔피언 (스킬도 사용하므로 일반 스테이지보다 강하다)
const KIND = { mob: { hp: 1, atk: 1, aspd: 0.8, g: 1, p: 1 }, elite: { hp: 4, atk: 1.6, aspd: 0.8, g: 5, p: 3 }, boss: { hp: 10, atk: 2.2, aspd: 0.6, g: 15, p: 8 },
  champ: { hp: 4.5, atk: 1.7, aspd: 0.9, g: 6, p: 4 } };
// 챔피언 대결: 각 챕터의 5번째 스테이지(x-5) 마지막 웨이브에 그 지역 챔피언들이 나온다
const isChampStage = s => (s - 1) % 10 + 1 === 5;
const champStageCount = s => 3 + (s > 30 ? 1 : 0) + (s > 70 ? 1 : 0);
// 스테이지 보상: 골드 외 보상은 초기 버전의 2.5배 + 스테이지가 오를수록 증가
const partsPerKill = (s, kind) => KIND[kind].p * 2.5 * (1 + s * 0.05);
const firstClearGems = s => Math.floor((s % 10 === 0 ? 375 : 75) * (1 + s * 0.03));
const firstClearTickets = s => s % 20 === 0 ? 1 + Math.floor(s / 60) : 0;   // 보스 스테이지 2개마다

// ===== 권장 전투력 =====
// 해당 전투에서 만나는 적의 총 체력과 초당 피해량으로 위협도를 구하고,
// 전투 시뮬레이션에서 승률 약 83%가 되는 전투력에 맞춰 보정한다 (권장 = 5.6 × 위협도^0.9, 탑은 ×1.38)
const REC_A = 5.6, REC_EXP = 0.9, REC_TOWER = 1.38;
function waveKinds(s, wave, waves) {
  const sub = (s - 1) % 10 + 1;
  if (wave < waves) return Array(3 + (s > 20 ? 1 : 0)).fill('mob');
  if (sub === 10) return ['boss'];
  return isChampStage(s) ? Array(champStageCount(s)).fill('champ') : ['mob', 'elite', 'mob'];
}
function threat(waveList, s) {
  const e = enemyStat(s); let hp = 0, dps = 0;
  for (const kinds of waveList) {
    let d = 0;
    for (const k of kinds) { const m = KIND[k]; hp += e.hp * m.hp; d += e.atk * m.atk * m.aspd; }
    dps = Math.max(dps, d);
  }
  return Math.sqrt(hp * dps);
}
const recFromThreat = t => REC_A * Math.pow(t, REC_EXP);
const REC_CHAMP = 1.3;  // 챔피언 대결은 적이 스킬도 쓰므로 위협도에 추가 보정 (시뮬레이션 기준)
function recPowerStage(s) { return recFromThreat(threat([waveKinds(s, 1, 3), waveKinds(s, 2, 3), waveKinds(s, 3, 3)], s)) * (isChampStage(s) ? REC_CHAMP : 1); }
function recPowerTower(f) { return recFromThreat(threat([['elite', 'boss', 'elite']], towerStage(f))) * REC_TOWER; }
// 내 전투력 / 권장 전투력 → 성공 가능성 표시
function odds(power, rec) {
  const r = power / rec;
  if (r >= 1.3) return { cls: 'o-safe', text: '충분히 가능' };
  if (r >= 1.05) return { cls: 'o-ok', text: '클리어 가능' };
  if (r >= 0.85) return { cls: 'o-even', text: '비등비등' };
  if (r >= 0.65) return { cls: 'o-risk', text: '위험' };
  return { cls: 'o-bad', text: '성공확률 낮음' };
}
function recHTML(rec) {
  const o = odds(teamPower(), rec);
  return `<span class="rec ${o.cls}">권장 ⚔️ ${fmt(rec)} · ${o.text}</span>`;
}

// ===== 상태 / 저장 =====
const SAVE_KEY = 'lolIdleSave_v1';
let S;
function newState() {
  const st = { gold: 300, gems: 3000, parts: 20, tickets: 3, stage: 1, maxStage: 1, tower: 1, owned: {}, deck: [], gear: Object.fromEntries(GEAR_KEYS.map(k => [k, null])),
    pity: 0, pulls: 0, auto: true, speed: 1, autoCraft: false, autoTower: false, econ: 2, lastSave: Date.now() };
  // 스타터: 포지션별 일반 등급 챔피언 1명씩
  for (const p of Object.keys(POS)) {
    const c = CHAMPS.find(c => c.pos === p && c.rarity === 0) || CHAMPS.find(c => c.pos === p);
    st.owned[c.id] = { lv: 1, star: 1, copies: 0 };
    st.deck.push(c.id);
  }
  return st;
}
let migrationNote = '';
function normalizeGear(st) {
  const g = {}; let refund = 0;
  for (const k of GEAR_KEYS) {
    const it = st.gear && st.gear[k];
    if (it && it.stats) g[k] = it;
    else { g[k] = null; if (it) refund += Math.floor(20 * (it.grade + 1) * Math.pow(1.1, it.ilvl || 1)); }
  }
  st.gear = g;
  if (refund) { st.gold += refund; migrationNote = `장비 시스템이 개편되어 기존 장비가 판매되었습니다. 💰 ${fmt(refund)} 지급`; }
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw), st = Object.assign(newState(), data);
      normalizeGear(st);
      // 경제 v2(수치 축소): 보유 골드를 최고 스테이지의 처치 골드 비율만큼 줄여 새 단위로 바꾼다
      if (!data.econ) {
        const before = st.gold;
        st.gold = Math.floor(st.gold * killGold(st.maxStage) / killGoldV1(st.maxStage));
        if (before >= 1000) migrationNote = (migrationNote ? migrationNote + '<br>' : '') + `능력치·골드 단위가 작아졌습니다. 보유 골드 💰 ${fmt(before)} → 💰 ${fmt(st.gold)} (같은 가치로 변환)`;
      }
      return st;
    }
  } catch (e) { /* 저장소 사용 불가 */ }
  return null;
}
function save() { S.lastSave = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 무시 */ } }

// ===== 장비 계산 =====
const gearMainOf = g => GEAR_SLOTS[g.slot].main;
function gearStatVal(g, st) {
  const isMain = st.k === gearMainOf(g);
  return GEAR_GRADES[g.grade].base * GEAR_STATS[st.k].coef * (isMain ? 1 : 0.65) * st.r * (1 + g.ilvl * 0.025) * (1 + g.plus * 0.12) / 100;
}
const gearScore = g => g.stats.reduce((a, st) => a + gearStatVal(g, st) * GEAR_STATS[st.k].w, 0);
const gearStatLine = (g, st) => `${GEAR_STATS[st.k].name} +${(gearStatVal(g, st) * 100).toFixed(1)}%`;
const sellPrice = g => Math.floor(20 * (g.grade + 1) * Math.pow(1.049, g.ilvl) * (1 + g.plus * 0.3));

// ===== 시너지 / 능력치 계산 =====
const BONUS_KEYS = ['atk', 'hp', 'def', 'crit', 'aspd', 'skill', 'gauge', 'dr', 'ls', 'gold', 'parts'];
function synergyState(deck = S.deck) {
  return SYNERGIES.map(s => {
    const count = s.need === 'legend10' ? deck.filter(id => CHAMP_BY_ID[id].rarity === 3).length : deck.filter(id => s.members.includes(id)).length;
    let tier = -1;
    s.tiers.forEach((t, i) => { if (count >= t[0]) tier = i; });
    return { s, count, tier };
  });
}
function bonuses(deck = S.deck) {
  const b = Object.fromEntries(BONUS_KEYS.map(k => [k, 0])); b.tags = {}; b.posCount = 0; b.team = 0; b.active = [];
  const tags = {}, poss = new Set();
  for (const id of deck) { const c = CHAMP_BY_ID[id]; tags[c.tag] = (tags[c.tag] || 0) + 1; poss.add(c.pos); }
  for (const [t, n] of Object.entries(tags)) {
    const lv = n >= 6 ? 4 : n >= 4 ? 3 : n >= 3 ? 2 : n >= 2 ? 1 : 0;
    b.tags[t] = lv;
    if (t === 'F') b.atk += 0.10 * lv;
    if (t === 'T') { b.hp += 0.15 * lv; b.def += 0.15 * lv; }
    if (t === 'M') b.skill += 0.20 * lv;
    if (t === 'A') b.crit += 0.10 * lv;
    if (t === 'S') b.gauge += 0.15 * lv;
  }
  b.posCount = poss.size;
  b.team = poss.size === 5 ? 0.20 : poss.size === 4 ? 0.10 : poss.size === 3 ? 0.05 : 0;
  b.atk += b.team; b.hp += b.team;
  // 지역 / 특수 조합 / 단독 시너지
  for (const x of synergyState(deck)) {
    if (x.tier < 0) continue;
    const bn = x.s.tiers[x.tier][1];
    for (const [k, v] of Object.entries(bn)) b[k] += v;
    b.active.push(x);
  }
  // 장비
  for (const k of GEAR_KEYS) { const g = S.gear[k]; if (g) for (const st of g.stats) b[st.k] += gearStatVal(g, st); }
  return b;
}
function calcStats(id, b = bonuses()) {
  const c = CHAMP_BY_ID[id], o = S.owned[id] || { lv: 1, star: 1 };
  const base = BASE[c.pos], tm = TAGMOD[c.tag];
  const m = growthMult(c.rarity, o.lv, o.star);
  return {
    hp: base.hp * tm.hp * m * (1 + b.hp),
    atk: base.atk * tm.atk * m * (1 + b.atk),
    def: base.def * tm.def * Math.sqrt(m) * (1 + b.def),
    aspd: base.aspd * (1 + Math.min(1.5, b.aspd)), // 공격 속도 보너스는 최대 +150%
    crit: Math.min(0.95, base.crit + tm.crit + b.crit),
    skill: tm.skill * (1 + b.skill) * (c.pos === 'M' ? 1.3 : 1),
    gaugeRate: tm.gauge * (1 + b.gauge) * (c.pos === 'S' ? 1.2 : 1),
    dr: Math.min(0.6, b.dr), ls: b.ls,
  };
}
const powerOf = st => st.atk * st.aspd * (1 + st.crit * 0.75) * 6 * (1 + (st.skill - 1) * 0.5) + st.hp * 0.5 + st.def * 3;
function teamPower() { const b = bonuses(); return S.deck.reduce((a, id) => a + powerOf(calcStats(id, b)), 0); }

// 스킬 설명 (게임 내 효과)
function skillEffectText(c) {
  const pw = c.pw, all = c.key === 'R';
  const pct = v => Math.round(v * pw * 100) + '%';
  switch (c.eff) {
    case 'd': return (all || c.pos === 'M') ? `모든 적에게 공격력의 ${pct(2.2)} 피해` : `대상에게 공격력의 ${pct(3.5)} 피해`;
    case 'c': return `${all ? '모든 적' : '대상'}에게 공격력의 ${pct(2.0)} 피해 + ${all ? 2 : 1.5}초 기절`;
    case 'h': return `${all ? '모든 아군' : '체력이 가장 낮은 아군'}을 공격력의 ${pct(2.5)}만큼 회복 + 대상에게 ${pct(1.5)} 피해`;
    case 's': return `모든 아군에게 공격력의 ${pct(2.0)} + 최대 체력 8% 보호막`;
    case 'b': return `모든 아군 공격력·공격 속도 +${all ? 50 : 30}% (${all ? 7 : 5}초) + 대상에게 ${pct(1.5)} 피해`;
  }
}

// ===== 전투 =====
let B = null;
const field = { allies: $('#allies'), enemies: $('#enemies') };

function makeAlly(id, b) {
  const c = CHAMP_BY_ID[id], st = calcStats(id, b);
  return { side: 'a', id, c, ...st, maxHp: st.hp, hp: st.hp, shield: 0, gauge: rand(0, c.mana * 0.4), timer: rand(0, 0.5), stun: 0, buffT: 0, buffMul: 0, dead: false };
}
function makeEnemy(m, s, kind) {
  const e = enemyStat(s), k = KIND[kind];
  return { side: 'e', name: m[0], icon: m[1], iconKey: m[2], kind, maxHp: e.hp * k.hp, hp: e.hp * k.hp, atk: e.atk * k.atk, def: e.def, aspd: k.aspd, crit: 0.05,
    timer: rand(0, 0.8), stun: 0, buffT: 0, buffMul: 0, dead: false, gold: killGold(s) * k.g, parts: partsPerKill(s, kind), slamT: 0, shield: 0 };
}
// 적 챔피언: 스테이지 기준 능력치에 포지션 성향(탑은 단단, 원딜은 강한 공격 등)을 반영하고, 자기 스킬을 사용한다
function makeEnemyChamp(c, s) {
  const u = makeEnemy([c.name, '⚔️'], s, 'champ'), base = BASE[c.pos], tm = TAGMOD[c.tag];
  const hpM = base.hp * tm.hp / 330, atkM = base.atk * tm.atk / 28;
  Object.assign(u, { c, champId: c.id, maxHp: u.maxHp * hpM, hp: u.maxHp * hpM, atk: u.atk * atkM, def: u.def * (base.def / 18),
    aspd: base.aspd * 0.85, crit: base.crit + tm.crit, skill: tm.skill, gaugeRate: tm.gauge, gauge: rand(0, c.mana * 0.3) });
  return u;
}
// 챕터 지역(데마시아, 녹서스 …)의 챔피언 중에서 고른다
function champWave(s) {
  const region = CHAPTERS[Math.floor((s - 1) / 10) % CHAPTERS.length];
  const syn = SYNERGIES.find(x => x.kind === 'region' && x.name === region);
  const pool = (syn ? syn.members : CHAMPS.map(c => c.id)).slice().sort(() => Math.random() - 0.5);
  return pool.slice(0, champStageCount(s)).map(id => makeEnemyChamp(CHAMP_BY_ID[id], s));
}
function startStage() {
  if (S.autoTower && S.deck.length) return startTower(false); // 탑 자동 도전 중이면 탑을 계속한다
  const b = bonuses();
  B = { mode: 'stage', s: S.stage, wave: 1, waves: 3, bonus: b, allies: S.deck.map(id => makeAlly(id, b)), enemies: [], over: false };
  spawnWave();
}
function startTower(show = true) {
  if (!S.deck.length) return toast('편성된 챔피언이 없습니다');
  const b = bonuses(), f = S.tower, s = towerStage(f);
  B = { mode: 'tower', s, floor: f, wave: 1, waves: 1, bonus: b, allies: S.deck.map(id => makeAlly(id, b)), enemies: [], over: false };
  const boss = BOSSES[(f - 1) % BOSSES.length];
  B.enemies = [makeEnemy(pick(ELITES), s, 'elite'), makeEnemy([`${f}층 수호자: ${boss[0]}`, boss[1], boss[2]], s, 'boss'), makeEnemy(pick(ELITES), s, 'elite')];
  renderField();
  if (show) switchTab('tower'); else if (tab === 'tower') refreshPanel();
}
function spawnWave() {
  const s = B.s, sub = (s - 1) % 10 + 1;
  if (B.wave < B.waves) {
    const n = 3 + (s > 20 ? 1 : 0);
    B.enemies = Array.from({ length: n }, () => makeEnemy(pick(MOBS), s, 'mob'));
  } else if (sub === 10) {
    B.enemies = [makeEnemy(BOSSES[Math.floor((s - 1) / 10) % BOSSES.length], s, 'boss')];
  } else if (isChampStage(s)) {
    B.enemies = champWave(s);
    banner(`⚔️ 챔피언 대결! ${CHAPTERS[Math.floor((s - 1) / 10) % CHAPTERS.length]}의 챔피언들이 나타났다`);
  } else {
    const el = ELITES[(s - 1) % ELITES.length], m = pick(MOBS);
    B.enemies = [makeEnemy(m, s, 'mob'), makeEnemy(el, s, 'elite'), makeEnemy(m, s, 'mob')];
  }
  renderField();
}

// 적 이미지: TFT/LoL 이미지를 쓰고, 불러오지 못하면 이모지로 대체
const monsterPic = u => u.iconKey ? iconImg(cdIcon(u.iconKey), u.icon) : u.icon;
function unitEl(u) {
  const d = document.createElement('div');
  d.className = `unit ${u.side === 'a' ? 'ally' : 'enemy'}${u.kind === 'boss' ? ' boss' : ''}${u.champId ? ' echamp' : ''}`;
  if (u.champId) {
    d.innerHTML = `<div class="info" style="text-align:right"><div class="nm">⚔️ ${u.name}</div><div class="bar hp"><i></i><span class="sh"></span><em class="bt"></em></div><div class="bar gauge"><i></i><em class="bt"></em></div></div>
      <div class="pic" style="background-image:url(${img(u.champId)})"><span class="badge">${POS[u.c.pos].icon}</span></div>`;
  } else if (u.side === 'a') {
    const o = S.owned[u.id];
    d.innerHTML = `<div class="pic" style="background-image:url(${img(u.id)})"><span class="badge">${POS[u.c.pos].icon}${o.lv}</span></div>
      <div class="info"><div class="nm">${u.c.name} <span style="color:#ffd84a">${'★'.repeat(o.star)}</span></div>
      <div class="bar hp"><i></i><span class="sh"></span><em class="bt"></em></div><div class="bar gauge"><i></i><em class="bt"></em></div></div>`;
  } else {
    d.innerHTML = `<div class="info" style="text-align:right"><div class="nm">${u.name}</div><div class="bar hp"><i></i><span class="sh"></span><em class="bt"></em></div></div><div class="pic">${monsterPic(u)}</div>`;
  }
  u.el = d; u.hpEl = d.querySelector('.hp i'); u.shEl = d.querySelector('.sh'); u.gEl = d.querySelector('.gauge i'); u.gBar = d.querySelector('.bar.gauge');
  u.hpTx = d.querySelector('.hp .bt'); u.gTx = d.querySelector('.gauge .bt');
  return d;
}
function renderField() {
  field.allies.innerHTML = ''; field.enemies.innerHTML = '';
  B.allies.forEach(u => field.allies.appendChild(unitEl(u)));
  B.enemies.forEach(u => field.enemies.appendChild(unitEl(u)));
  field.allies.classList.toggle('two', B.allies.length > 5);
  $('#field').classList.toggle('tower', B.mode === 'tower');
  updateStageLabel(); paintUnits();
}
function updateStageLabel() {
  if (!B) return;
  const rec = B.mode === 'tower' ? recPowerTower(B.floor) : recPowerStage(B.s);
  $('#stageLabel').innerHTML = (B.mode === 'tower' ? `🗼 공허의 탑 ${B.floor}층` : `${stageName(B.s)}${isChampStage(B.s) ? ' <span class="champtag">⚔️ 챔피언 대결</span>' : ''} · 웨이브 ${B.wave}/${B.waves}`) + ' ' + recHTML(rec);
  $('#autoBtn').classList.toggle('on', S.auto);
  $('#autoBtn').textContent = S.auto ? '자동 진행 ON' : '반복 사냥';
  $('#speedBtn').textContent = 'x' + S.speed;
}
function paintUnits() {
  for (const u of [...B.allies, ...B.enemies]) {
    if (!u.el) continue;
    u.hpEl.style.width = Math.max(0, u.hp / u.maxHp * 100) + '%';
    u.shEl.style.width = Math.min(100, u.shield / u.maxHp * 100) + '%';
    u.hpTx.textContent = `${fmt(Math.max(0, u.hp))}/${fmt(u.maxHp)}`;
    if (u.gEl) { const mx = u.c.mana; u.gEl.style.width = Math.min(100, u.gauge / mx * 100) + '%'; u.gBar.classList.toggle('full', u.gauge >= mx * 0.9); u.gTx.textContent = `${Math.floor(u.gauge)}/${mx}`; }
    u.el.classList.toggle('dead', u.dead);
    u.el.classList.toggle('stun', u.stun > 0 && !u.dead);
    u.el.classList.toggle('buff', u.buffT > 0 && !u.dead);
  }
}
function floatText(u, text, cls) {
  if (!u.el || document.hidden) return;
  const f = $('#field'), r = u.el.getBoundingClientRect(), fr = f.getBoundingClientRect();
  if (f.querySelectorAll('.float').length > 40) return;
  const d = document.createElement('div');
  d.className = 'float ' + cls; d.textContent = text;
  d.style.left = (r.left - fr.left + rand(10, Math.max(11, r.width - 40))) + 'px'; d.style.top = (r.top - fr.top + 4) + 'px';
  f.appendChild(d); setTimeout(() => d.remove(), 800);
}
function flash(u, cls, ms = 120) { if (!u.el) return; u.el.classList.add(cls); setTimeout(() => u.el && u.el.classList.remove(cls), ms); }
let bannerT;
function banner(text) { const b = $('#banner'); b.textContent = text; b.classList.add('show'); clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('show'), 900); }
const alive = arr => arr.filter(u => !u.dead);

function dealDamage(src, tgt, amount, cls) {
  if (tgt.dead) return 0;
  let dmg = amount * 100 / (100 + tgt.def);
  if (tgt.dr) dmg *= 1 - tgt.dr;                   // 시너지: 받는 피해 감소
  const shown = dmg;
  if (tgt.shield > 0) { const ab = Math.min(tgt.shield, dmg); tgt.shield -= ab; dmg -= ab; }
  tgt.hp -= dmg;
  if (src.ls && !src.dead) src.hp = Math.min(src.maxHp, src.hp + shown * src.ls); // 시너지: 생명력 흡수
  floatText(tgt, fmt(shown), cls);
  flash(tgt, 'hit');
  if (tgt.hp <= 0) { tgt.hp = 0; tgt.dead = true; onDeath(tgt); }
  return dmg;
}
function onDeath(u) {
  if (u.side === 'e') {
    const bn = B && B.bonus ? B.bonus : { gold: 0, parts: 0 };
    const gold = u.gold * (1 + bn.gold);
    S.gold += gold; S.parts += u.parts * (1 + bn.parts);
    floatText(u, '+' + fmt(gold) + '💰', 'heal');
  }
}
function allyTarget(arr) {
  // 적은 탱커(탑) 쪽을 우선 노린다
  const w = { T: 5, J: 3, S: 2.5, M: 1.5, A: 1.5 };
  const list = alive(arr); let sum = list.reduce((a, u) => a + w[u.c.pos], 0), r = Math.random() * sum;
  for (const u of list) { r -= w[u.c.pos]; if (r <= 0) return u; }
  return list[0];
}
// 아군·적 챔피언 공용: 시전자 편에 따라 적/아군이 바뀐다
function castSkill(u) {
  const c = u.c, pw = c.pw * u.skill, all = c.key === 'R', mine = u.side === 'a';
  const foes = alive(mine ? B.enemies : B.allies), friends = alive(mine ? B.allies : B.enemies);
  if (!foes.length) return;
  const tgt = mine ? foes[0] : allyTarget(foes), atk = u.atk * (1 + u.buffMul);
  banner(`${mine ? '' : '⚠️ 적 '}${c.name} [${c.key}] ${c.skill}!`);
  flash(u, 'cast', 400);
  switch (c.eff) {
    case 'd':
      if (all || c.pos === 'M') foes.forEach(e => dealDamage(u, e, atk * 2.2 * pw, 'skill'));
      else dealDamage(u, tgt, atk * 3.5 * pw, 'skill');
      break;
    case 'c':
      (all ? foes : [tgt]).forEach(e => { dealDamage(u, e, atk * 2.0 * pw, 'skill'); e.stun = (all ? 2 : 1.5) * (e.kind === 'boss' ? 0.4 : 1); });
      break;
    case 'h': {
      const amt = atk * 2.5 * pw;
      const targets = all ? friends : [friends.reduce((a, x) => x.hp / x.maxHp < a.hp / a.maxHp ? x : a)];
      targets.forEach(f => { f.hp = Math.min(f.maxHp, f.hp + amt); floatText(f, '+' + fmt(amt), 'heal'); });
      dealDamage(u, tgt, atk * 1.5 * pw, 'skill');
      break;
    }
    case 's':
      friends.forEach(f => { f.shield += atk * 2.0 * pw + u.maxHp * 0.08; });
      floatText(u, '보호막!', 'heal');
      break;
    case 'b':
      friends.forEach(f => { f.buffT = all ? 7 : 5; f.buffMul = all ? 0.5 : 0.3; });
      dealDamage(u, tgt, atk * 1.5 * pw, 'skill');
      break;
  }
}

function tick(dt) {
  if (!B || B.over) return;
  for (const u of B.allies) {
    if (u.dead) continue;
    if (u.buffT > 0) { u.buffT -= dt; if (u.buffT <= 0) u.buffMul = 0; }
    if (u.stun > 0) { u.stun -= dt; continue; }
    u.gauge = Math.min(u.c.mana, u.gauge + u.c.manaGain * MANA_REGEN * u.gaugeRate * dt);
    u.timer += dt;
    const foes = alive(B.enemies); if (!foes.length) break;
    if (u.gauge >= u.c.mana) { u.gauge = 0; castSkill(u); continue; }
    if (u.timer >= 1 / (u.aspd * (1 + u.buffMul))) {
      u.timer = 0;
      // 원딜/미드는 체력이 가장 낮은 적, 나머지는 맨 앞 적
      const tgt = (u.c.pos === 'A' || u.c.pos === 'M') ? foes.reduce((a, e) => e.hp < a.hp ? e : a) : foes[0];
      const crit = Math.random() < u.crit;
      dealDamage(u, tgt, u.atk * (1 + u.buffMul) * (crit ? 1.75 : 1), crit ? 'crit' : '');
      u.gauge = Math.min(u.c.mana, u.gauge + u.c.manaGain * u.gaugeRate);
      flash(u, 'atk', 100);
    }
  }
  for (const e of B.enemies) {
    if (e.dead) continue;
    if (e.buffT > 0) { e.buffT -= dt; if (e.buffT <= 0) e.buffMul = 0; }
    if (e.stun > 0) { e.stun -= dt; continue; }
    if (!alive(B.allies).length) break;
    e.timer += dt;
    if (e.champId) {
      // 적 챔피언: 아군과 같은 방식으로 마나를 모아 스킬을 쓴다
      e.gauge = Math.min(e.c.mana, e.gauge + e.c.manaGain * MANA_REGEN * e.gaugeRate * dt);
      if (e.gauge >= e.c.mana) { e.gauge = 0; castSkill(e); continue; }
      if (e.timer >= 1 / (e.aspd * (1 + e.buffMul))) {
        e.timer = 0; flash(e, 'atk');
        const crit = Math.random() < e.crit;
        dealDamage(e, allyTarget(B.allies), e.atk * (1 + e.buffMul) * (crit ? 1.75 : 1), 'dmg');
        e.gauge = Math.min(e.c.mana, e.gauge + e.c.manaGain * e.gaugeRate);
      }
      continue;
    }
    if (e.kind === 'boss') {
      e.slamT += dt;
      if (e.slamT >= 6) { e.slamT = 0; banner(`⚠️ ${e.name}의 강타!`); alive(B.allies).forEach(a => dealDamage(e, a, e.atk * 1.3, 'dmg')); continue; }
    }
    if (e.timer >= 1 / e.aspd) { e.timer = 0; flash(e, 'atk'); dealDamage(e, allyTarget(B.allies), e.atk, 'dmg'); }
  }
  if (!alive(B.enemies).length) return waveCleared();
  if (!alive(B.allies).length) return defeat();
}

// 탑 보상: 층이 높을수록 많아지고, 종류도 다양하다
function towerReward(f) {
  const boss5 = f % 5 === 0, boss10 = f % 10 === 0;
  return {
    gems: Math.floor(500 + f * 60 + (boss5 ? 2500 + f * 50 : 0)),
    gold: Math.floor(killGold(towerStage(f)) * 75 * (boss5 ? 2 : 1)),
    parts: Math.floor(30 + f * 4 + (boss5 ? 50 : 0)),
    tickets: (f % 2 === 0 ? 1 : 0) + (boss5 ? 1 : 0) + Math.floor(f / 40),
    cards: f % 6 === 0 ? 1 + Math.floor(f / 20) : 0,        // 6층마다 챔피언 카드
    legendCards: boss10 ? (f % 20 === 0 ? 2 : 1) : 0,         // 10층마다 전설 카드 (20층마다 2장)
    gear: boss10 ? Math.min(4, 2 + Math.floor(f / 25)) : -1,  // 10층마다 영웅 이상 장비 (최소 등급)
  };
}
function towerRewardText(r) {
  const t = [`💎 ${fmt(r.gems)}`, `💰 ${fmt(r.gold)}`, `⚙️ ${fmt(r.parts)}`, `🎫 ${r.tickets}`];
  if (r.cards) t.push(`🃏 챔피언 카드 ${r.cards}장`);
  if (r.legendCards) t.push(`🌟 전설 카드 ${r.legendCards}장`);
  if (r.gear >= 0) t.push(`🛡️ ${GEAR_GRADES[r.gear].name} 이상 장비`);
  return t.join(' · ');
}
function grantTowerReward(f) {
  const r = towerReward(f), got = [];
  S.gems += r.gems; S.gold += r.gold; S.parts += r.parts; S.tickets += r.tickets;
  if (r.cards) {
    const rar = f >= 30 ? 3 : f >= 15 ? 2 : 1, c = pick(CHAMPS.filter(c => c.rarity === rar));
    grantCard(c, r.cards); got.push(`${c.name} 카드 ${r.cards}장`);
  }
  if (r.legendCards) { const c = pick(CHAMPS.filter(c => c.rarity === 3)); grantCard(c, r.legendCards); got.push(`${c.name} 카드 ${r.legendCards}장`); }
  if (r.gear >= 0) { const res = craft(r.gear, true); if (res) got.push(`${GEAR_GRADES[res.item.grade].name} ${gearName(res.item)}`); }
  return { r, got };
}

function waveCleared() {
  if (B.wave < B.waves) {
    B.wave++;
    // 웨이브 사이: 생존자 체력 20% 회복
    B.allies.forEach(a => { if (!a.dead) a.hp = Math.min(a.maxHp, a.hp + a.maxHp * 0.2); });
    const cur = B;
    B.over = true; setTimeout(() => { if (B !== cur) return; B.over = false; spawnWave(); }, 400 / S.speed);
    return;
  }
  B.over = true;
  const cur = B;
  if (B.mode === 'tower') {
    const f = B.floor, { r, got } = grantTowerReward(f);
    S.tower++;
    save();
    if (S.autoTower) {
      // 자동 도전: 보상은 알림으로만 보여 주고 바로 다음 층에 도전한다
      log(`🗼 ${f}층 돌파! ${towerRewardText(r)}${got.length ? ' · ' + got.join(', ') : ''}`);
      toast(`🗼 ${f}층 돌파! 다음 층 자동 도전`);
      setTimeout(() => { if (B !== cur) return; if (S.autoTower) startTower(false); else { startStage(); refreshPanel(); } }, 1000 / S.speed);
      return;
    }
    openModal(`<h3 style="justify-content:center">🗼 ${f}층 돌파!</h3><div style="text-align:center;line-height:1.8">${towerRewardText(r).replace(/ · /g, '<br>')}${got.length ? `<br><b style="color:var(--gold)">획득: ${got.join(', ')}</b>` : ''}</div>
      <button class="btn big" id="closeBtn" style="width:100%;margin-top:12px">확인</button>`);
    setTimeout(() => { startStage(); refreshPanel(); }, 1200);
    return;
  }
  let msg = `${stageName(B.s)} 클리어!`;
  if (B.s === S.maxStage) {
    const g = firstClearGems(B.s), tk = firstClearTickets(B.s);
    S.gems += g; S.tickets += tk; S.maxStage++; msg += ` 첫 클리어 💎 ${fmt(g)}${tk ? ` 🎫 ${tk}` : ''}`;
  }
  if (S.auto) S.stage = Math.min(S.stage + 1, S.maxStage);
  log(msg);
  setTimeout(() => { if (B === cur) startStage(); }, 700 / S.speed);
}
function defeat() {
  B.over = true;
  const cur = B;
  if (B.mode === 'tower') {
    // 자동 도전 중 실패하면 자동 도전을 멈추고 스테이지 사냥으로 돌아간다
    const wasAuto = S.autoTower;
    if (wasAuto) { S.autoTower = false; save(); }
    toast(`🗼 ${B.floor}층 도전 실패… 챔피언을 강화하세요${wasAuto ? ' (자동 도전 중지)' : ''}`);
    setTimeout(() => { startStage(); refreshPanel(); }, 1200);
    return;
  }
  log(`패배… 이전 스테이지에서 반복 사냥합니다`);
  S.auto = false; S.stage = Math.max(1, S.stage - 1);
  setTimeout(() => { if (B === cur) startStage(); }, 1000);
}
function log(m) { $('#log').textContent = m; }

// 레벨업·장비 변경 등으로 능력치가 바뀌면 전투 중인 유닛에도 반영 (체력 비율 유지)
function refreshAllyStats() {
  if (!B) return;
  const b = bonuses(); B.bonus = b;
  for (const u of B.allies) {
    const st = calcStats(u.id, b), ratio = u.hp / u.maxHp;
    Object.assign(u, { atk: st.atk, def: st.def, aspd: st.aspd, crit: st.crit, skill: st.skill, gaugeRate: st.gaugeRate, dr: st.dr, ls: st.ls, maxHp: st.hp });
    if (!u.dead) u.hp = st.hp * ratio;
    const badge = u.el && u.el.querySelector('.badge'); if (badge) badge.textContent = POS[u.c.pos].icon + S.owned[u.id].lv;
  }
}

// ===== 육성 =====
function levelUp(id, times = 1, quiet = false) {
  const c = CHAMP_BY_ID[id], o = S.owned[id]; let n = 0;
  while (n < times && o.lv < levelCap(o.star)) {
    const cost = levelCost(o.lv, c.rarity);
    if (S.gold < cost) break;
    S.gold -= cost; o.lv++; n++;
  }
  if (!n && !quiet) toast(o.lv >= levelCap(o.star) ? `레벨 한계! ★강화가 필요합니다` : '골드가 부족합니다');
  if (!quiet) refreshAllyStats();
  return n;
}
function starUp(id, quiet = false) {
  const o = S.owned[id], c = CHAMP_BY_ID[id];
  if (o.star >= MAX_STAR) { if (!quiet) toast('최대 성급입니다'); return false; }
  const need = STAR_NEED[o.star - 1], cost = starCost(o.star, c.rarity);
  if (o.copies < need) { if (!quiet) toast(`중복 카드가 ${need - o.copies}장 더 필요합니다`); return false; }
  if (S.gold < cost) { if (!quiet) toast(`골드가 부족합니다 (💰 ${fmt(cost)} 필요)`); return false; }
  S.gold -= cost; o.copies -= need; o.star++;
  if (!quiet) { toast(`${c.name} ★${o.star} 달성! 레벨 한계 ${levelCap(o.star)}`); refreshAllyStats(); }
  return true;
}
const canStar = id => { const o = S.owned[id]; return o && o.star < MAX_STAR && o.copies >= STAR_NEED[o.star - 1]; };
// 모두 강화: 출전 챔피언부터 가능한 성급 강화 → 레벨업을 자동으로 진행
function upgradeAll() {
  const b = bonuses(), ids = Object.keys(S.owned).sort((a, c) =>
    (S.deck.includes(c) - S.deck.includes(a)) || (powerOf(calcStats(c, b)) - powerOf(calcStats(a, b))));
  let stars = 0, lvs = 0;
  for (const id of ids) {
    let changed = true;
    while (changed) {
      changed = false;
      while (canStar(id) && starUp(id, true)) { stars++; changed = true; }
      const n = levelUp(id, 999, true);
      if (n) { lvs += n; changed = true; }
    }
  }
  refreshAllyStats(); save();
  toast(stars || lvs ? `모두 강화 완료: ★ 강화 ${stars}회 · 레벨 +${lvs}` : '진행할 수 있는 강화가 없습니다 (골드/카드 부족)');
}

// ===== 소환 =====
function rollRarity() {
  S.pity++;
  if (S.pity >= PITY) return 3;
  let r = Math.random() * 100;
  for (let i = 3; i >= 0; i--) { r -= RARITY[i].rate; if (r <= 0) return i; }
  return 0;
}
// 챔피언 카드 지급 (신규면 획득, 중복이면 성급 재료, ★6 이후는 골드로 전환)
function grantCard(c, n = 1) {
  let isNew = false;
  for (let i = 0; i < n; i++) {
    if (!S.owned[c.id]) { S.owned[c.id] = { lv: 1, star: 1, copies: 0 }; isNew = true; }
    else if (S.owned[c.id].star >= MAX_STAR) S.gold += Math.floor(killGold(S.maxStage) * 60 * (c.rarity + 1));
    else S.owned[c.id].copies++;
  }
  return isNew;
}
function gacha(n, useTicket = false) {
  const cost = n === 10 ? PULL10_COST : PULL_COST * n;
  if (useTicket) { if (S.tickets < n) return toast('🎫 소환권이 부족합니다'); S.tickets -= n; }
  else { if (S.gems < cost) return toast('💎 보석이 부족합니다'); S.gems -= cost; }
  const res = [];
  for (let i = 0; i < n; i++) {
    let r = rollRarity();
    if (n === 10 && i === 9 && !res.some(x => x.r >= 2)) r = Math.max(r, 2); // 10연차 영웅 이상 1회 보장
    if (r === 3) S.pity = 0;
    const c = pick(CHAMPS.filter(c => c.rarity === r));
    const isNew = grantCard(c);
    S.pulls++;
    res.push({ c, r, isNew });
  }
  save();
  return res;
}

// ===== 장비 (대장간) =====
function rollGear(minGrade = 0) {
  let r = Math.random() * 100, grade = 0;
  for (let i = GEAR_GRADES.length - 1; i >= 0; i--) { r -= GEAR_GRADES[i].rate; if (r <= 0) { grade = i; break; } }
  grade = Math.max(grade, minGrade);
  const slot = pick(GEAR_KEYS), main = GEAR_SLOTS[slot].main;
  const others = Object.keys(GEAR_STATS).filter(k => k !== main).sort(() => Math.random() - 0.5);
  const keys = [main, ...others].slice(0, GEAR_GRADES[grade].n);
  return { slot, grade, ilvl: S.maxStage, plus: 0, stats: keys.map(k => ({ k, r: rand(0.9, 1.1) })) };
}
function craft(minGrade = 0, free = false) {
  if (!free) {
    if (S.parts < CRAFT_COST) { if (!S.autoCraft) toast('⚙️ 마법공학 부품이 부족합니다'); return null; }
    S.parts -= CRAFT_COST;
  }
  const item = rollGear(minGrade), cur = S.gear[item.slot];
  let result;
  if (!cur || gearScore(item) > gearScore(cur)) {
    if (cur) S.gold += sellPrice(cur);
    S.gear[item.slot] = item; result = 'equip'; refreshAllyStats();
  } else { S.gold += sellPrice(item); result = 'sell'; }
  return { item, result };
}
// 장비 강화 (골드 소모, 확률형). +1 이상 올릴수록 비용이 크게 늘고 성공 확률은 낮아진다
// 비용은 기존 공식의 2배를 최소로 하고, 장비 레벨(=최고 스테이지)의 처치 골드에 비례해 함께 오른다.
// (기존 공식은 iLv에 정비례라 골드 수입이 지수로 늘어나는 후반에 강화가 너무 쌌다)
const enhanceCost = g => Math.floor(Math.pow(1.32, g.plus) * (g.grade + 1) * Math.max(600 * (1 + g.ilvl * 0.1), killGold(g.ilvl) * 50));
function enhanceOdds(plus) {
  const great = 0.04;
  const success = Math.max(0.18, 0.62 - plus * 0.03);
  const minus = plus >= 4 ? Math.min(0.12, 0.01 + 0.006 * plus) : 0;
  const destroy = plus >= 8 ? Math.min(0.03, 0.002 + 0.0015 * (plus - 8)) : 0;
  return { great, success, minus, destroy, fail: Math.max(0, 1 - great - success - minus - destroy) };
}
function enhance(slot) {
  const g = S.gear[slot]; if (!g) return null;
  if (g.plus >= MAX_PLUS) { toast('최대 강화입니다'); return null; }
  const cost = enhanceCost(g);
  if (S.gold < cost) { toast(`골드가 부족합니다 (💰 ${fmt(cost)} 필요)`); return null; }
  S.gold -= cost;
  const o = enhanceOdds(g.plus); let r = Math.random(), res;
  if ((r -= o.destroy) < 0) { S.gear[slot] = null; res = { type: 'destroy', delta: 0 }; }
  else if ((r -= o.minus) < 0) { g.plus--; res = { type: 'minus', delta: -1 }; }
  else if ((r -= o.great) < 0) { const d = Math.min(MAX_PLUS - g.plus, 2 + Math.floor(Math.random() * 4)); g.plus += d; res = { type: 'great', delta: d }; }
  else if ((r -= o.success) < 0) { g.plus++; res = { type: 'success', delta: 1 }; }
  else res = { type: 'fail', delta: 0 };
  res.plus = g.plus;
  refreshAllyStats(); save();
  return res;
}
const ENH_MSG = { great: ['✨ 대성공!', '#ffd84a'], success: ['성공', '#6ee87f'], fail: ['실패 (변화 없음)', '#8a93a6'], minus: ['⚠️ 실패 — 강화 단계 하락', '#ff9c3b'], destroy: ['💥 장비가 파괴되었습니다…', '#ff4f6d'] };

// ===== UI =====
let tab = 'heroes', heroFilter = 'all', rarFilter = 'all', heroSort = 'power', lastPull = null, lastCraft = null, forgeSel = 'weapon', lastEnh = null, showAllSyn = false;
const SORTS = { power: '전투력', hp: '체력', atk: '공격력', def: '방어력', aspd: '공격 속도', crit: '치명타' };
function switchTab(t) {
  tab = t;
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  refreshPanel();
}
function refreshTop() {
  $('#gold').textContent = fmt(S.gold); $('#gems').textContent = fmt(S.gems); $('#parts').textContent = fmt(S.parts); $('#tickets').textContent = fmt(S.tickets);
  $('#power').textContent = fmt(teamPower());
}
const stars = n => '★'.repeat(n);
function sortVal(key, st) {
  if (key === 'power') return powerOf(st);
  if (key === 'crit') return st.crit;
  return st[key];
}
function sortText(key, v) { return key === 'crit' ? Math.round(v * 100) + '%' : key === 'aspd' ? v.toFixed(2) : fmt(v); }
function champCard(c, extra = '', sk = null) {
  const o = S.owned[c.id];
  return `<div class="card ${o ? '' : 'locked'} ${S.deck.includes(c.id) ? 'indeck' : ''}" data-id="${c.id}" style="border-color:${RARITY[c.rarity].color}">
    <span class="pos">${POS[c.pos].icon}</span><img loading="lazy" src="${img(c.id)}" alt="">
    ${o ? `<div class="stars">${stars(o.star)}</div>` : ''}${o && canStar(c.id) ? '<span class="up">★UP</span>' : ''}${extra}
    <div class="cn">${c.name}</div><div class="cl">${o ? 'Lv.' + o.lv : RARITY[c.rarity].name}</div>${sk ? `<div class="cv">${sk}</div>` : ''}</div>`;
}
function heroesHTML() {
  const owned = CHAMPS.filter(c => S.owned[c.id]).length, b = bonuses();
  let list = CHAMPS.filter(c => (heroFilter === 'all' || c.pos === heroFilter) && (rarFilter === 'all' || c.rarity === rarFilter));
  const sv = new Map(list.map(c => [c.id, sortVal(heroSort, calcStats(c.id, b))]));
  // 정렬: ① 출전 중 ② 보유 ③ 선택한 능력치 높은 순 (기본 전투력)
  list.sort((a, c) => (S.deck.includes(c.id) - S.deck.includes(a.id)) || (!!S.owned[c.id] - !!S.owned[a.id]) || (sv.get(c.id) - sv.get(a.id)));
  const chips = (arr, cur, attr) => arr.map(([k, n]) => `<button class="chip ${String(cur) === String(k) ? 'on' : ''}" data-${attr}="${k}">${n}</button>`).join('');
  return `<h3>챔피언 도감 <span class="sub">보유 ${owned} / ${CHAMPS.length}</span></h3>
    <div class="row" style="margin-bottom:8px"><button class="btn teal big" id="upAll">⬆️ 모두 강화 (★강화 → 레벨업)</button></div>
    <div class="filters">${chips([['all', '전체'], ...Object.values(POS).map(x => [x.key, x.icon + ' ' + x.name + ' ' + CHAMPS.filter(c => c.pos === x.key).length])], heroFilter, 'f')}</div>
    <div class="filters">${chips([['all', '모든 등급'], ...RARITY.map(r => [r.key, `<span style="color:${r.color}">●</span> ${r.name} ${CHAMPS.filter(c => c.rarity === r.key).length}`])], rarFilter, 'rf')}</div>
    <div class="filters"><span class="sub" style="align-self:center">정렬</span>${chips(Object.entries(SORTS), heroSort, 'sort')}<span class="sub" style="align-self:center">· 출전 중인 챔피언이 항상 맨 앞</span></div>
    <div class="grid">${list.map(c => champCard(c, '', `${SORTS[heroSort]} ${sortText(heroSort, sv.get(c.id))}`)).join('')}</div>`;
}
const synIcon = s => s.img ? iconImg(cdIcon(s.img), s.icon, 'timg') : s.icon;
function synergyHTML(b) {
  const st = synergyState();
  const act = st.filter(x => x.tier >= 0), inact = st.filter(x => x.tier < 0 && x.count > 0);
  const chip = (x, on) => {
    const t = x.s.tiers[Math.max(0, x.tier)];
    return `<span class="${on ? 'act' : ''}" title="${x.s.desc}">${synIcon(x.s)} ${x.s.name} ${x.count}/${t[0]} : ${bonusText(t[1])}</span>`;
  };
  const total = Object.fromEntries(BONUS_KEYS.map(k => [k, b[k]]));
  const nameList = x => x.s.kind === 'region' ? x.s.members.map(id => CHAMP_BY_ID[id].name).join(', ') : x.s.desc;
  return `<div class="syn">
      <span class="${b.posCount >= 3 ? 'act' : ''}">🤝 포지션 ${b.posCount}/5 : 공격력·체력 +${Math.round(b.team * 100)}%</span>
      ${Object.entries(TAGS).map(([k, t]) => { const n = S.deck.filter(id => CHAMP_BY_ID[id].tag === k).length; return `<span class="${b.tags[k] ? 'act' : ''}">${t.name} ${n} : ${b.tags[k] ? t.desc(b.tags[k]) : '2명부터 ' + t.syn + ' 시너지'}</span>`; }).join('')}
    </div>
    <h3 style="margin-top:12px">활성 시너지 <span class="sub">${act.length}개 · 지역/조합/단독</span></h3>
    <div class="syn">${act.length ? act.map(x => chip(x, true)).join('') : '<span>활성 시너지가 없습니다</span>'}${inact.map(x => chip(x, false)).join('')}</div>
    <div class="box" style="margin-top:8px"><div class="sub">전체 보너스 합계 (시너지 + 장비 + 포지션/역할군)</div><div class="syn" style="margin-top:4px">${Object.entries(total).filter(([, v]) => v > 0).map(([k, v]) => `<span class="act">${BONUS_NAMES[k]} +${Math.round(v * 100)}%</span>`).join('') || '<span>없음</span>'}</div></div>
    <button class="chip" id="synToggle" style="margin-top:6px">${showAllSyn ? '▲ 시너지 도감 닫기' : '▼ 전체 시너지 도감 보기 (' + SYNERGIES.length + '개)'}</button>
    ${showAllSyn ? `<div class="synlist">${st.map(x => `<div class="si ${x.tier >= 0 ? 'on' : ''}"><b>${synIcon(x.s)} ${x.s.name}</b> <span class="sub">[${{ region: '지역', squad: '조합', solo: '단독' }[x.s.kind]}] ${x.count}명 편성</span>
        <div class="sub">${nameList(x)}</div>${x.s.tiers.map((t, i) => `<div class="${x.tier >= i ? 'tier on' : 'tier'}">${t[0]}명 : ${bonusText(t[1])}</div>`).join('')}</div>`).join('')}</div>` : ''}`;
}
function deckHTML() {
  const b = bonuses();
  const slots = Array.from({ length: MAX_DECK }, (_, i) => S.deck[i]);
  return `<div class="box"><h3>출전 편성 <span class="sub">최대 ${MAX_DECK}명 · 슬롯을 누르면 해제 (${S.deck.length}/${MAX_DECK})</span></h3>
      <div class="slots">${slots.map((id, i) => id ? `<div class="slot filled" data-slot="${i}" style="border-color:${RARITY[CHAMP_BY_ID[id].rarity].color}"><img src="${img(id)}"><div>${POS[CHAMP_BY_ID[id].pos].icon} ${CHAMP_BY_ID[id].name}</div></div>` : `<div class="slot">빈 슬롯</div>`).join('')}</div>
      ${synergyHTML(b)}
      <div class="row" style="margin-top:10px"><button class="btn teal big" id="autoDeck">⚡ 자동 편성 (포지션별 최강 + 전투력 순)</button></div></div>
    <div class="box dlist"><h3>빠른 레벨업</h3>${S.deck.map(id => { const c = CHAMP_BY_ID[id], o = S.owned[id], cap = levelCap(o.star), d = o.lv >= cap ? 'disabled' : ''; return `<div class="di"><img src="${img(id)}"><div class="grow"><b>${c.name}</b> ${stars(o.star)}<br>Lv.${o.lv}/${cap} · 💰${o.lv >= cap ? '-' : fmt(levelCost(o.lv, c.rarity))}</div>
        <button class="btn" data-lv="${id}" data-n="1" ${d}>+1</button><button class="btn" data-lv="${id}" data-n="10" ${d}>+10</button><button class="btn teal" data-lv="${id}" data-n="999" ${d}>MAX</button></div>`; }).join('')}</div>
    <h3>보유 챔피언 <span class="sub">눌러서 편성에 추가</span></h3>
    <div class="grid">${CHAMPS.filter(c => S.owned[c.id]).sort((a, c) => powerOf(calcStats(c.id, b)) - powerOf(calcStats(a.id, b))).map(c => champCard(c)).join('')}</div>`;
}
function gachaHTML() {
  const featured = CHAMPS.filter(c => c.rarity === 3).slice(0, 5);
  return `<div class="banner-art"><div class="t">협곡 소환</div><div class="sub">전설 확정까지 <b style="color:#ffb52e">${PITY - S.pity}</b>회 · 총 ${S.pulls}회 소환</div>
        <div class="imgs">${featured.map(c => `<img src="${img(c.id)}">`).join('')}</div></div>
      <div class="row"><button class="btn big" id="pull1">1회 소환<br>💎 ${PULL_COST}</button><button class="btn teal big" id="pull10">10회 소환<br>💎 ${PULL10_COST}</button></div>
      <div class="row" style="margin-top:8px"><button class="btn big" id="pullTk" ${S.tickets < 1 ? 'disabled' : ''}>🎫 소환권 1회<br><span class="sub">보유 ${S.tickets}장</span></button><button class="btn teal big" id="pullTkAll" ${S.tickets < 1 ? 'disabled' : ''}>🎫 모두 사용<br><span class="sub">${S.tickets}회 한 번에 소환</span></button></div>
      <div class="box" style="margin-top:10px"><div class="rates">${RARITY.map(r => `<span style="color:${r.color}">${r.name} ${r.rate}% (${CHAMPS.filter(c => c.rarity === r.key).length}종)</span>`).join('')}</div>
        <div class="sub" style="margin-top:6px">· 10회 소환 시 영웅 이상 1회 보장 · ${PITY}회 내 전설 확정<br>· 중복 획득 시 성급(★) 강화 재료가 됩니다 · ★6 이후 중복은 골드로 전환<br>· 🎫 소환권은 스테이지 보스 첫 클리어, 공허의 탑에서 얻습니다</div></div>
      ${lastPull ? `<h3>소환 결과</h3><div class="grid pull-res">${lastPull.map((x, i) => champCard(x.c, x.isNew ? '<span class="new">NEW</span>' : '').replace('class="card', `style="animation-delay:${i * 0.06}s" class="card ${x.r === 3 ? 'leg' : x.r === 2 ? 'epic' : ''}`)).join('')}</div>` : ''}`;
}
function gearCardHTML(k) {
  const s = GEAR_SLOTS[k], g = S.gear[k];
  if (!g) return `<div class="gi ${forgeSel === k ? 'sel' : ''}" data-gs="${k}"><div class="ic empty">${gearIcon(k, 0)}</div><div class="sub">${s.name} 없음</div></div>`;
  return `<div class="gi ${forgeSel === k ? 'sel' : ''}" data-gs="${k}" style="border-color:${GEAR_GRADES[g.grade].color}"><div class="ic">${gearIcon(k, g.grade)}</div>
    <div class="gn" style="color:${GEAR_GRADES[g.grade].color}">${gearName(g)}${g.plus ? ` <span style="color:#ffd84a">+${g.plus}</span>` : ''}</div>
    <div>${GEAR_GRADES[g.grade].name} · iLv ${g.ilvl}</div><div class="sub">능력치 ${g.stats.length}개</div></div>`;
}
function forgeDetailHTML() {
  const s = GEAR_SLOTS[forgeSel], g = S.gear[forgeSel];
  if (!g) return `<div class="sub" style="text-align:center">${s.icon} ${s.name} 칸이 비어 있습니다. 제작으로 획득하세요.</div>`;
  const o = enhanceOdds(g.plus), pc = v => (v * 100).toFixed(v < 0.1 && v > 0 ? 1 : 0) + '%';
  const e = lastEnh && lastEnh.slot === forgeSel ? ENH_MSG[lastEnh.type] : null;
  return `<div style="font-weight:700;color:${GEAR_GRADES[g.grade].color}">${gearIcon(forgeSel, g.grade, 'gimg sm')} [${GEAR_GRADES[g.grade].name}] ${gearName(g)} <span style="color:#ffd84a">+${g.plus}/${MAX_PLUS}</span></div>
    <div class="gstats">${g.stats.map(st => `<div>${st.k === s.main ? '⭐ ' : '· '}${gearStatLine(g, st)}</div>`).join('')}</div>
    <div class="sub" style="margin:6px 0">성공 시 능력치 +12%씩 (강화 단계당) · 판매가 💰 ${fmt(sellPrice(g))}</div>
    ${g.plus >= MAX_PLUS ? '<div class="sub">최대 강화입니다</div>' : `<div class="odds"><span style="color:#ffd84a">대성공 ${pc(o.great)} (+2~5)</span><span style="color:#6ee87f">성공 ${pc(o.success)} (+1)</span><span>실패 ${pc(o.fail)}</span>${o.minus ? `<span style="color:#ff9c3b">하락 ${pc(o.minus)} (-1)</span>` : ''}${o.destroy ? `<span style="color:#ff4f6d">파괴 ${pc(o.destroy)}</span>` : ''}</div>
      <button class="btn teal big" id="enhBtn" style="width:100%;margin-top:8px">강화 💰 ${fmt(enhanceCost(g))}</button>`}
    <div id="enhRes" style="min-height:20px;margin-top:6px;font-weight:700;text-align:center;color:${e ? e[1] : 'inherit'}">${e ? `${e[0]}${lastEnh.delta > 0 ? ` (+${lastEnh.delta})` : ''}` : ''}</div>`;
}
function renderGearBox() {
  const gb = $('#gearBox'); if (gb) gb.innerHTML = GEAR_KEYS.map(gearCardHTML).join('');
  const fd = $('#forgeDetail'); if (fd) fd.innerHTML = forgeDetailHTML();
  refreshTop();
}
function forgeHTML() {
  return `<div class="box"><h3>장착 장비 <span class="sub">팀 전체에 적용 · 눌러서 강화</span></h3><div class="gear" id="gearBox">${GEAR_KEYS.map(gearCardHTML).join('')}</div>
      <div class="box" id="forgeDetail" style="margin:10px 0 0">${forgeDetailHTML()}</div></div>
      <div class="box oven"><div class="big" id="ovenIcon">🔨</div><div class="sub">마법공학 부품 ${CRAFT_COST}개로 장비를 제작합니다. (6칸: 무기·방어구·투구·장갑·신발·장신구)<br>더 좋은 장비는 자동 장착되고 장착 상태가 바로 갱신됩니다. 나머지는 골드로 판매됩니다.<br>등급이 높을수록 능력치 개수와 수치가 늘어납니다 (일반 1개 … 신화 5개). 장비 레벨(iLv)은 최고 스테이지를 따라갑니다.</div>
        <div class="row" style="margin-top:10px"><button class="btn big" id="craftBtn">제작 (⚙️ ${CRAFT_COST})</button><button class="btn big ${S.autoCraft ? 'teal' : ''}" id="autoCraftBtn">자동 제작 ${S.autoCraft ? 'ON' : 'OFF'}</button></div>
        <div id="craftRes" style="margin-top:10px;min-height:20px">${lastCraft ? craftResText(lastCraft) : ''}</div>
        <div class="rates" style="justify-content:center;margin-top:8px">${GEAR_GRADES.map(g => `<span style="color:${g.color}">${g.name} ${g.rate}% (${g.n}옵션)</span>`).join('')}</div></div>`;
}
function towerHTML() {
  const f = S.tower, boss = BOSSES[(f - 1) % BOSSES.length], e = enemyStat(towerStage(f)), r = towerReward(f);
  return `<div class="box" style="text-align:center"><h3 style="justify-content:center">🗼 공허의 탑</h3>
      <div style="font-size:42px">${iconImg(cdIcon(boss[2]), boss[1], 'mimg big')}</div><div style="font-size:18px;font-weight:900">${f}층 수호자: ${boss[0]}</div>
      <div class="sub">보스 체력 ${fmt(e.hp * 10)} · 공격력 ${fmt(e.atk * 2.2)} · 정예 2마리 동반</div>
      <div style="margin:8px 0">${recHTML(recPowerTower(f))}</div>
      <div class="sub">내 전투력 ⚔️ ${fmt(teamPower())}</div>
      <div class="box" style="margin:10px 0;text-align:left"><div class="sub">이 층의 보상</div><div style="line-height:1.8">${towerRewardText(r).replace(/ · /g, '<br>')}</div>
        <div class="sub" style="margin-top:4px">${f % 5 === 0 ? '🌟 보스 층 보너스 포함 · ' : ''}층이 높을수록 보상이 늘어납니다 (5층마다 보석, 10층마다 전설 카드·장비)</div></div>
      <div class="row" style="margin-top:6px"><button class="btn teal big" id="towerBtn" ${B && B.mode === 'tower' ? 'disabled' : ''}>${B && B.mode === 'tower' ? '도전 중…' : '도전하기'}</button>
        <button class="btn big ${S.autoTower ? 'teal' : ''}" id="autoTowerBtn">자동 도전 ${S.autoTower ? 'ON' : 'OFF'}</button></div>
      <div class="sub" style="margin-top:6px">자동 도전: 층을 돌파하면 바로 다음 층에 도전하고, 실패하면 멈춘 뒤 스테이지 사냥으로 돌아갑니다.</div></div>
      <div class="box sub">공허의 탑은 층마다 강해지는 보스에 도전해 다양한 보상을 얻는 콘텐츠입니다. 실패해도 잃는 것은 없습니다.</div>`;
}
function refreshPanel() {
  refreshTop();
  const p = $('#panel');
  p.innerHTML = ({ heroes: heroesHTML, deck: deckHTML, gacha: gachaHTML, forge: forgeHTML, tower: towerHTML })[tab]();
}
function craftResText(r) {
  const g = r.item;
  return `${gearIcon(g.slot, g.grade, 'gimg sm')} <span style="color:${GEAR_GRADES[g.grade].color};font-weight:700">[${GEAR_GRADES[g.grade].name}] ${gearName(g)}</span> <span class="sub">${GEAR_SLOTS[g.slot].name} · 능력치 ${g.stats.length}개 (${g.stats.map(st => gearStatLine(g, st)).join(', ')})</span> → ${r.result === 'equip' ? '<b style="color:var(--teal)">장착!</b>' : `판매 💰${fmt(sellPrice(g))}`}`;
}

function openModal(html) { $('#modalBox').innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); detailId = null; }
let detailId = null;
const spellCache = {};
function showDetail(id) {
  detailId = id;
  const c = CHAMP_BY_ID[id], o = S.owned[id], st = calcStats(id), r = RARITY[c.rarity];
  const cap = o ? levelCap(o.star) : 0, need = o && o.star < MAX_STAR ? STAR_NEED[o.star - 1] : 0;
  openModal(`<div class="dhead"><img src="${img(id)}" style="border-color:${r.color};box-shadow:0 0 12px ${r.color}88"><div>
      <div class="nm">${c.name}</div>
      <span class="tag" style="color:${r.color};border:1px solid ${r.color}">${r.name}</span><span class="tag" style="color:${POS[c.pos].color}">${POS[c.pos].icon} ${POS[c.pos].name}</span><span class="tag">${TAGS[c.tag].name}</span>
      <div style="color:#ffd84a;margin-top:4px">${o ? stars(o.star) + `<span style="color:#555">${'★'.repeat(MAX_STAR - o.star)}</span>` : '미보유'}</div>
      ${o ? `<div>Lv.<b>${o.lv}</b> / ${cap}</div>` : ''}</div></div>
    <div class="stats"><div>체력<b>${fmt(st.hp)}</b></div><div>공격력<b>${fmt(st.atk)}</b></div><div>방어력<b>${fmt(st.def)}</b></div>
      <div>공격 속도<b>${st.aspd.toFixed(2)}</b></div><div>치명타<b>${Math.round(st.crit * 100)}%</b></div><div>전투력<b>${fmt(powerOf(st))}</b></div></div>
    <div class="skill"><img id="spIcon" src="" alt="" style="visibility:hidden"><div>
      <div><span class="k">${c.key}</span><b>${c.skill}</b> <span class="sub">${EFFECTS[c.eff].icon} ${EFFECTS[c.eff].name} · 고정 스킬</span></div>
      <div class="eff">▶ ${skillEffectText(c)}</div>
      <div class="sub" style="margin-top:3px">스킬 위력 ×${c.pw.toFixed(2)} · 🔷 마나 ${c.mana} · 평타당 마나 +${c.manaGain} (초당 +${(c.manaGain * MANA_REGEN).toFixed(1)})</div>
      <p id="spDesc">원작 스킬 설명 불러오는 중…</p></div></div>
    ${o ? `<div class="box" style="margin-top:10px">
      <div class="row"><div style="flex:1">레벨업 비용 💰 <b>${o.lv >= cap ? '-' : fmt(levelCost(o.lv, c.rarity))}</b></div>
        <button class="btn" data-dlv="1" ${o.lv >= cap ? 'disabled' : ''}>+1</button><button class="btn" data-dlv="10" ${o.lv >= cap ? 'disabled' : ''}>+10</button><button class="btn" data-dlv="999" ${o.lv >= cap ? 'disabled' : ''}>MAX</button></div>
      <div style="margin-top:10px">성급 강화 (중복 카드) ${o.star >= MAX_STAR ? '— 최대' : `${o.copies} / ${need} · 💰 ${fmt(starCost(o.star, c.rarity))}`}</div>
      <div class="progress"><i style="width:${o.star >= MAX_STAR ? 100 : Math.min(100, o.copies / need * 100)}%"></i></div>
      <div class="row"><div class="sub" style="flex:1">${r.name} 성장: 레벨당 +${((r.lv - 1) * 100).toFixed(1)}% · ★당 +${Math.round((r.star - 1) * 100)}% · 레벨 한계 +20</div><button class="btn teal" id="starBtn" ${canStar(id) ? '' : 'disabled'}>★ 강화</button></div></div>
      <div class="row"><button class="btn big" id="deckToggle">${S.deck.includes(id) ? '편성 해제' : '편성에 추가'}</button><button class="btn big" id="closeBtn">닫기</button></div>`
      : `<div class="box sub" style="margin-top:10px;text-align:center">소환에서 획득할 수 있습니다.</div><button class="btn big" id="closeBtn" style="width:100%">닫기</button>`}`);
  loadSpell(c);
}
async function loadSpell(c) {
  const idx = 'QWER'.indexOf(c.key);
  try {
    if (!spellCache[c.id]) spellCache[c.id] = (await (await fetch(`https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/data/ko_KR/champion/${c.id}.json`)).json()).data[c.id];
    const sp = spellCache[c.id].spells[idx];
    if (detailId !== c.id) return;
    const ic = $('#spIcon'); ic.src = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/spell/${sp.image.full}`; ic.style.visibility = 'visible';
    $('#spDesc').textContent = sp.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  } catch (e) { const d = $('#spDesc'); if (d) d.textContent = '(원작 설명을 불러오지 못했습니다)'; }
}
function toggleDeck(id) {
  const i = S.deck.indexOf(id);
  if (i >= 0) { if (S.deck.length <= 1) return toast('최소 1명은 출전해야 합니다'); S.deck.splice(i, 1); }
  else { if (S.deck.length >= MAX_DECK) return toast(`편성은 최대 ${MAX_DECK}명입니다`); S.deck.push(id); }
  save(); startStage(); refreshPanel();
}
function autoDeck() {
  const owned = CHAMPS.filter(c => S.owned[c.id]), b = bonuses();
  const pw = c => powerOf(calcStats(c.id, b));
  const deck = [];
  for (const p of Object.keys(POS)) {
    const best = owned.filter(c => c.pos === p).sort((a, c) => pw(c) - pw(a))[0];
    if (best) deck.push(best.id);
  }
  for (const c of owned.sort((a, c) => pw(c) - pw(a))) if (deck.length < MAX_DECK && !deck.includes(c.id)) deck.push(c.id);
  S.deck = deck; save(); startStage(); refreshPanel(); toast('자동 편성 완료');
}

// 전설 소환 연출
let fxQ = [], fxT;
function showLegendFx(list) { fxQ = list.slice(); nextFx(); }
function nextFx() {
  clearTimeout(fxT);
  const fx = $('#fx'), x = fxQ.shift();
  if (!x) { fx.classList.add('hidden'); fx.innerHTML = ''; return; }
  fx.classList.remove('hidden');
  fx.innerHTML = `<div class="rays"></div><div class="fxflash"></div>
    <div class="fxbox"><div class="fxt">✨ 전설 소환! ✨</div>
      <img class="fxsp" src="${splash(x.c.id)}" alt="" onerror="this.onerror=null;this.src='${img(x.c.id)}'">
      <div class="fxn">${x.c.name}</div><div class="fxs">${POS[x.c.pos].icon} ${POS[x.c.pos].name} · ${x.isNew ? '<b class="newtag">NEW!</b>' : '중복 획득 (★ 강화 재료)'}</div>
      <div class="fxh">${fxQ.length ? `터치하여 다음 (${fxQ.length}명 남음)` : '터치하여 닫기'}</div></div>`;
  fxT = setTimeout(nextFx, 3600);
}
$('#fx').onclick = nextFx;

// ===== 이벤트 =====
document.querySelectorAll('#nav button').forEach(b => b.onclick = () => switchTab(b.dataset.tab));
$('#autoBtn').onclick = () => { S.auto = !S.auto; if (S.auto && B.mode === 'stage') { S.stage = S.maxStage; startStage(); } updateStageLabel(); toast(S.auto ? '최고 스테이지부터 자동 진행' : '현재 스테이지 반복 사냥'); };
$('#speedBtn').onclick = () => { S.speed = S.speed === 1 ? 2 : S.speed === 2 ? 3 : 1; updateStageLabel(); };
$('#modal').onclick = e => { if (e.target.id === 'modal') closeModal(); };
$('#modalBox').onclick = e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.id === 'closeBtn') return closeModal();
  if (t.dataset.dlv) { levelUp(detailId, +t.dataset.dlv); save(); showDetail(detailId); refreshPanel(); }
  if (t.id === 'starBtn') { starUp(detailId); save(); showDetail(detailId); refreshPanel(); }
  if (t.id === 'deckToggle') { const id = detailId; toggleDeck(id); showDetail(id); }
};
$('#panel').onclick = e => {
  const f = e.target.closest('[data-f]'); if (f) { heroFilter = f.dataset.f; return refreshPanel(); }
  const rf = e.target.closest('[data-rf]'); if (rf) { rarFilter = rf.dataset.rf === 'all' ? 'all' : +rf.dataset.rf; return refreshPanel(); }
  const so = e.target.closest('[data-sort]'); if (so) { heroSort = so.dataset.sort; return refreshPanel(); }
  const lv = e.target.closest('[data-lv]'); if (lv) { levelUp(lv.dataset.lv, +lv.dataset.n); save(); return refreshPanel(); }
  const gs = e.target.closest('[data-gs]'); if (gs) { forgeSel = gs.dataset.gs; return renderGearBox(); }
  const sl = e.target.closest('[data-slot]'); if (sl) return toggleDeck(S.deck[+sl.dataset.slot]);
  const card = e.target.closest('.card');
  if (card) {
    const id = card.dataset.id;
    if (tab === 'deck' && S.owned[id]) return toggleDeck(id);
    return showDetail(id);
  }
  const t = e.target.closest('button'); if (!t) return;
  if (t.id === 'autoDeck') autoDeck();
  if (t.id === 'upAll') { upgradeAll(); refreshPanel(); }
  if (t.id === 'synToggle') { showAllSyn = !showAllSyn; refreshPanel(); }
  if (t.id === 'pull1' || t.id === 'pull10' || t.id === 'pullTk' || t.id === 'pullTkAll') {
    const r = t.id === 'pullTkAll' ? gacha(S.tickets, true) : gacha(t.id === 'pull10' ? 10 : 1, t.id === 'pullTk');
    if (r) { lastPull = r; refreshPanel(); const legends = r.filter(x => x.r === 3); if (legends.length) showLegendFx(legends); }
  }
  if (t.id === 'craftBtn') { const r = craft(); if (r) { lastCraft = r; if (r.result === 'equip') forgeSel = r.item.slot; refreshPanel(); $('#ovenIcon').classList.add('go'); } }
  if (t.id === 'autoCraftBtn') { S.autoCraft = !S.autoCraft; refreshPanel(); }
  if (t.id === 'enhBtn') { const r = enhance(forgeSel); if (r) { lastEnh = { slot: forgeSel, ...r }; renderGearBox(); } }
  if (t.id === 'towerBtn') startTower();
  if (t.id === 'autoTowerBtn') {
    S.autoTower = !S.autoTower; save();
    if (S.autoTower && !(B && B.mode === 'tower')) startTower(); else refreshPanel();
    toast(S.autoTower ? '🗼 공허의 탑 자동 도전 시작' : '🗼 자동 도전 끔 (현재 층까지만 진행)');
  }
};

// ===== 오프라인 보상 =====
function offlineReward() {
  const sec = Math.min(8 * 3600, (Date.now() - (S.lastSave || Date.now())) / 1000);
  if (sec < 60) return;
  const s = Math.max(1, S.stage);
  const gold = killGold(s) * 0.35 * sec, parts = Math.floor(sec * 0.05), gems = Math.floor(sec / 600) * 5;
  S.gold += gold; S.parts += parts; S.gems += gems;
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60);
  openModal(`<h3 style="justify-content:center">⏰ 방치 보상</h3><div style="text-align:center">${h}시간 ${m}분 동안 ${stageName(s)}에서 사냥했습니다.<br><br>
    💰 <b>${fmt(gold)}</b> · ⚙️ <b>${fmt(parts)}</b> · 💎 <b>${gems}</b><br><br><span class="sub">최대 8시간까지 누적됩니다</span></div>
    <button class="btn big" id="closeBtn" style="width:100%;margin-top:12px">받기</button>`);
}

// ===== 시작 =====
S = load();
const firstRun = !S;
if (!S) S = newState();
startStage();
switchTab('heroes');
if (firstRun) openModal(`<h3 style="justify-content:center">협곡 키우기</h3><div style="font-size:13px;line-height:1.7">
  리그 오브 레전드 챔피언 ${CHAMPS.length}명으로 즐기는 방치형 RPG입니다.<br>
  · 전투는 자동! 게이지가 차면 챔피언의 <b>고정 스킬</b>이 자동 발동됩니다.<br>
  · 💰 골드로 레벨업, 🎲 소환의 중복 카드로 ★성급 강화.<br>
  · 탑/정글/미드/원딜/서포터를 모두 편성하면 팀 시너지 보너스! 지역·조합 시너지도 확인해 보세요.<br>
  · 시작 선물: 💎 3,000 (소환 30회) · 🎫 소환권 3장</div><button class="btn big" id="closeBtn" style="width:100%;margin-top:12px">시작하기</button>`);
else if (migrationNote) openModal(`<h3 style="justify-content:center">🔧 업데이트 안내</h3><div style="text-align:center;line-height:1.7">${migrationNote}</div><button class="btn big" id="closeBtn" style="width:100%;margin-top:12px">확인</button>`);
else offlineReward();

let last = performance.now(), saveT = 0, craftT = 0, uiT = 0;
setInterval(() => {
  const now = performance.now(), real = Math.min(0.25, (now - last) / 1000); last = now;
  const dt = real * S.speed;
  tick(dt);
  paintUnits();
  saveT += real; craftT += real; uiT += real;
  if (S.autoCraft && craftT > 0.6) {
    craftT = 0;
    const r = craft();
    if (r) { lastCraft = r; if (tab === 'forge') { const el = $('#craftRes'); if (el) el.innerHTML = craftResText(r); if (r.result === 'equip') renderGearBox(); } }
  }
  if (uiT > 0.5) { uiT = 0; refreshTop(); updateStageLabel(); }
  if (saveT > 5) { saveT = 0; save(); }
}, 50);
window.addEventListener('beforeunload', save);
