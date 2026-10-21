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
const LV_GROWTH = 1.075;                       // 레벨당 능력치 +7.5% (복리)
const STAR_MULT = [1, 1.5, 2.2, 3.2, 4.6, 6.5]; // ★1~★6 능력치 배율
const STAR_NEED = [1, 2, 4, 8, 15];             // 다음 ★까지 필요한 중복 카드 수
const MAX_STAR = 6;
const levelCap = star => star * 20 + 10;       // ★1:30 ★2:50 … ★6:130
const levelCost = (lv, rarity) => Math.floor(10 * Math.pow(1.11, lv - 1) * (1 + rarity * 0.25));
// 스킬: Q/W/E는 게이지가 빨리 차고, R(궁극기)은 느리지만 강하다
const skillGain = key => key === 'R' ? 11 : 20;  // 평타 1회당 게이지
const skillPow = key => key === 'R' ? 1.9 : 1.0;

// 소환
const PULL_COST = 100, PULL10_COST = 1000, PITY = 70;
// 장비
const GEAR_GRADES = [
  { name: '일반', color: '#9aa4b1', rate: 50, base: 6 },
  { name: '희귀', color: '#4aa8ff', rate: 30, base: 12 },
  { name: '영웅', color: '#b46cff', rate: 14, base: 20 },
  { name: '전설', color: '#ffb52e', rate: 5, base: 32 },
  { name: '신화', color: '#ff4f6d', rate: 1, base: 50 },
];
const GEAR_SLOTS = {
  weapon: { name: '무기', icon: '🗡️', items: ['롱소드', 'B.F. 대검', '무한의 대검', '몰락한 왕의 검', '크라켄 학살자'] },
  armor: { name: '방어구', icon: '🛡️', items: ['천 갑옷', '쇠사슬 조끼', '가시 갑옷', '워모그의 갑옷', '란두인의 예언'] },
  acc: { name: '장신구', icon: '💍', items: ['증폭의 고서', '고속 연사포', '존야의 모래시계', '라바돈의 죽음모자', '영겁의 지팡이'] },
};
const ACC_STATS = { crit: '치명타', aspd: '공격 속도', skill: '스킬 피해' };
const CRAFT_COST = 10;

// 스테이지
const CHAPTERS = ['데마시아', '녹서스', '아이오니아', '필트오버', '자운', '프렐요드', '슈리마', '그림자 군도', '빌지워터', '공허'];
const MOBS = [['근접 미니언', '⚔️'], ['원거리 미니언', '🔮'], ['대포 미니언', '💣'], ['칼날부리', '🐦'], ['어스름 늑대', '🐺'], ['돌거북', '🐢'], ['그롬프', '🐸'], ['바위게', '🦀'], ['공허충', '🪲'], ['크루그', '🪨']];
const ELITES = [['붉은 덩굴정령', '🔥'], ['푸른 파수꾼', '💧'], ['고대 크루그', '🗿'], ['공허 유충', '🐛']];
const BOSSES = [['협곡의 전령', '👁️'], ['화염 드래곤', '🐉'], ['바다 드래곤', '🌊'], ['마법공학 드래곤', '⚡'], ['바람 드래곤', '🌪️'], ['대지 드래곤', '⛰️'], ['장로 드래곤', '🐲'], ['아타칸', '👹'], ['공허의 전령', '🦑'], ['내셔 남작', '🦂']];
const stageName = s => {
  const ch = Math.floor((s - 1) / 10), sub = (s - 1) % 10 + 1;
  const loop = Math.floor(ch / CHAPTERS.length);
  return `${CHAPTERS[ch % CHAPTERS.length]}${loop ? ` (심연 ${loop})` : ''} ${ch + 1}-${sub}`;
};
const enemyStat = s => ({ hp: 85 * Math.pow(1.135, s - 1), atk: 9 * Math.pow(1.115, s - 1), def: 5 + s * 1.2 });
const killGold = s => 5 * Math.pow(1.12, s - 1);

// ===== 상태 / 저장 =====
const SAVE_KEY = 'lolIdleSave_v1';
let S;
function newState() {
  const st = { gold: 300, gems: 3000, parts: 20, stage: 1, maxStage: 1, tower: 1, owned: {}, deck: [], gear: { weapon: null, armor: null, acc: null },
    pity: 0, pulls: 0, auto: true, speed: 1, autoCraft: false, lastSave: Date.now() };
  // 스타터: 포지션별 일반 등급 챔피언 1명씩
  for (const p of Object.keys(POS)) {
    const c = CHAMPS.find(c => c.pos === p && c.rarity === 0) || CHAMPS.find(c => c.pos === p);
    st.owned[c.id] = { lv: 1, star: 1, copies: 0 };
    st.deck.push(c.id);
  }
  return st;
}
function load() {
  try { const raw = localStorage.getItem(SAVE_KEY); if (raw) return Object.assign(newState(), JSON.parse(raw)); } catch (e) { /* 저장소 사용 불가 */ }
  return null;
}
function save() { S.lastSave = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 무시 */ } }

// ===== 능력치 계산 =====
function bonuses(deck = S.deck) {
  const b = { atk: 0, hp: 0, def: 0, crit: 0, aspd: 0, skill: 0, gauge: 0, team: 0, tags: {}, posCount: 0 };
  const tags = {}, poss = new Set();
  for (const id of deck) { const c = CHAMP_BY_ID[id]; tags[c.tag] = (tags[c.tag] || 0) + 1; poss.add(c.pos); }
  for (const [t, n] of Object.entries(tags)) {
    const lv = n >= 4 ? 3 : n >= 3 ? 2 : n >= 2 ? 1 : 0;
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
  const g = S.gear;
  if (g.weapon) b.atk += gearVal(g.weapon);
  if (g.armor) { b.hp += gearVal(g.armor); b.def += gearVal(g.armor); }
  if (g.acc) b[g.acc.stat] += gearVal(g.acc) * (g.acc.stat === 'crit' ? 0.35 : 1);
  return b;
}
function calcStats(id, b = bonuses()) {
  const c = CHAMP_BY_ID[id], o = S.owned[id] || { lv: 1, star: 1 };
  const base = BASE[c.pos], tm = TAGMOD[c.tag];
  const m = RARITY[c.rarity].mult * Math.pow(LV_GROWTH, o.lv - 1) * STAR_MULT[o.star - 1];
  return {
    hp: base.hp * tm.hp * m * (1 + b.hp),
    atk: base.atk * tm.atk * m * (1 + b.atk),
    def: base.def * tm.def * Math.sqrt(m) * (1 + b.def),
    aspd: base.aspd * (1 + Math.min(1.5, b.aspd)), // 공격 속도 보너스는 최대 +150%
    crit: Math.min(0.95, base.crit + tm.crit + b.crit),
    skill: tm.skill * (1 + b.skill) * (c.pos === 'M' ? 1.3 : 1),
    gaugeRate: tm.gauge * (1 + b.gauge) * (c.pos === 'S' ? 1.2 : 1),
  };
}
const powerOf = st => st.atk * st.aspd * (1 + st.crit * 0.75) * 6 * (1 + (st.skill - 1) * 0.5) + st.hp * 0.5 + st.def * 3;
function teamPower() { const b = bonuses(); return S.deck.reduce((a, id) => a + powerOf(calcStats(id, b)), 0); }

// 스킬 설명 (게임 내 효과)
function skillEffectText(c) {
  const pw = skillPow(c.key), all = c.key === 'R';
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
  return { side: 'a', id, c, ...st, maxHp: st.hp, hp: st.hp, shield: 0, gauge: rand(0, 40), timer: rand(0, 0.5), stun: 0, buffT: 0, buffMul: 0, dead: false };
}
function makeEnemy(name, icon, s, kind) {
  const e = enemyStat(s);
  const k = kind === 'boss' ? { hp: 10, atk: 2.2, g: 15, p: 8 } : kind === 'elite' ? { hp: 4, atk: 1.6, g: 5, p: 3 } : { hp: 1, atk: 1, g: 1, p: 1 };
  return { side: 'e', name, icon, kind, maxHp: e.hp * k.hp, hp: e.hp * k.hp, atk: e.atk * k.atk, def: e.def, aspd: kind === 'boss' ? 0.6 : 0.8, crit: 0.05,
    timer: rand(0, 0.8), stun: 0, dead: false, gold: killGold(s) * k.g, parts: k.p, slamT: 0, shield: 0 };
}
function startStage() {
  const b = bonuses();
  B = { mode: 'stage', s: S.stage, wave: 1, waves: 3, allies: S.deck.map(id => makeAlly(id, b)), enemies: [], over: false };
  spawnWave();
}
function startTower() {
  if (!S.deck.length) return toast('편성된 챔피언이 없습니다');
  const b = bonuses(), f = S.tower, s = Math.round(4 + f * 2.4);
  B = { mode: 'tower', s, floor: f, wave: 1, waves: 1, allies: S.deck.map(id => makeAlly(id, b)), enemies: [], over: false };
  const boss = BOSSES[(f - 1) % BOSSES.length];
  B.enemies = [makeEnemy(pick(ELITES)[0], '🌀', s, 'elite'), makeEnemy(`${f}층 수호자: ${boss[0]}`, boss[1], s, 'boss'), makeEnemy(pick(ELITES)[0], '🌀', s, 'elite')];
  B.enemies[0].icon = B.enemies[2].icon = '🟣';
  renderField(); switchTab('tower');
}
function spawnWave() {
  const s = B.s, sub = (s - 1) % 10 + 1;
  if (B.wave < B.waves) {
    const n = 3 + (s > 20 ? 1 : 0);
    B.enemies = Array.from({ length: n }, () => { const m = pick(MOBS); return makeEnemy(m[0], m[1], s, 'mob'); });
  } else if (sub === 10) {
    const bo = BOSSES[Math.floor((s - 1) / 10) % BOSSES.length];
    B.enemies = [makeEnemy(bo[0], bo[1], s, 'boss')];
  } else {
    const el = ELITES[(s - 1) % ELITES.length], m = pick(MOBS);
    B.enemies = [makeEnemy(m[0], m[1], s, 'mob'), makeEnemy(el[0], el[1], s, 'elite'), makeEnemy(m[0], m[1], s, 'mob')];
  }
  renderField();
}

function unitEl(u) {
  const d = document.createElement('div');
  d.className = `unit ${u.side === 'a' ? 'ally' : 'enemy'}${u.kind === 'boss' ? ' boss' : ''}`;
  if (u.side === 'a') {
    const o = S.owned[u.id];
    d.innerHTML = `<div class="pic" style="background-image:url(${img(u.id)})"><span class="badge">${POS[u.c.pos].icon}${o.lv}</span></div>
      <div class="info"><div class="nm">${u.c.name} <span style="color:#ffd84a">${'★'.repeat(o.star)}</span></div>
      <div class="bar hp"><i></i><span class="sh"></span></div><div class="bar gauge"><i></i></div></div>`;
  } else {
    d.innerHTML = `<div class="info" style="text-align:right"><div class="nm">${u.name}</div><div class="bar hp"><i></i><span class="sh"></span></div></div><div class="pic">${u.icon}</div>`;
  }
  u.el = d; u.hpEl = d.querySelector('.hp i'); u.shEl = d.querySelector('.sh'); u.gEl = d.querySelector('.gauge i'); u.gBar = d.querySelector('.bar.gauge');
  return d;
}
function renderField() {
  field.allies.innerHTML = ''; field.enemies.innerHTML = '';
  B.allies.forEach(u => field.allies.appendChild(unitEl(u)));
  B.enemies.forEach(u => field.enemies.appendChild(unitEl(u)));
  $('#field').classList.toggle('tower', B.mode === 'tower');
  updateStageLabel(); paintUnits();
}
function updateStageLabel() {
  $('#stageLabel').textContent = B.mode === 'tower' ? `🗼 공허의 탑 ${B.floor}층` : `${stageName(B.s)} · 웨이브 ${B.wave}/${B.waves}`;
  $('#autoBtn').classList.toggle('on', S.auto);
  $('#autoBtn').textContent = S.auto ? '자동 진행 ON' : '반복 사냥';
  $('#speedBtn').textContent = 'x' + S.speed;
}
function paintUnits() {
  for (const u of [...B.allies, ...B.enemies]) {
    if (!u.el) continue;
    u.hpEl.style.width = Math.max(0, u.hp / u.maxHp * 100) + '%';
    u.shEl.style.width = Math.min(100, u.shield / u.maxHp * 100) + '%';
    if (u.gEl) { u.gEl.style.width = u.gauge + '%'; u.gBar.classList.toggle('full', u.gauge >= 90); }
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
  d.style.left = (r.left - fr.left + rand(10, r.width - 40)) + 'px'; d.style.top = (r.top - fr.top + 4) + 'px';
  f.appendChild(d); setTimeout(() => d.remove(), 800);
}
function flash(u, cls, ms = 120) { if (!u.el) return; u.el.classList.add(cls); setTimeout(() => u.el && u.el.classList.remove(cls), ms); }
let bannerT;
function banner(text) { const b = $('#banner'); b.textContent = text; b.classList.add('show'); clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('show'), 900); }
const alive = arr => arr.filter(u => !u.dead);

function dealDamage(src, tgt, amount, cls) {
  if (tgt.dead) return 0;
  let dmg = amount * 100 / (100 + tgt.def);
  if (tgt.shield > 0) { const ab = Math.min(tgt.shield, dmg); tgt.shield -= ab; dmg -= ab; }
  tgt.hp -= dmg;
  floatText(tgt, fmt(amount * 100 / (100 + tgt.def)), cls);
  flash(tgt, 'hit');
  if (tgt.hp <= 0) { tgt.hp = 0; tgt.dead = true; onDeath(tgt); }
  return dmg;
}
function onDeath(u) {
  if (u.side === 'e') {
    S.gold += u.gold; S.parts += u.parts;
    floatText(u, '+' + fmt(u.gold) + '💰', 'heal');
  }
}
function allyTarget(arr) {
  // 적은 탱커(탑) 쪽을 우선 노린다
  const w = { T: 5, J: 3, S: 2.5, M: 1.5, A: 1.5 };
  const list = alive(arr); let sum = list.reduce((a, u) => a + w[u.c.pos], 0), r = Math.random() * sum;
  for (const u of list) { r -= w[u.c.pos]; if (r <= 0) return u; }
  return list[0];
}
function castSkill(u) {
  const c = u.c, pw = skillPow(c.key) * u.skill, all = c.key === 'R';
  const foes = alive(B.enemies), friends = alive(B.allies);
  if (!foes.length) return;
  const tgt = foes[0], atk = u.atk * (1 + u.buffMul);
  banner(`${c.name} [${c.key}] ${c.skill}!`);
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
    u.gauge = Math.min(100, u.gauge + 2.5 * u.gaugeRate * dt);
    u.timer += dt;
    const foes = alive(B.enemies); if (!foes.length) break;
    if (u.gauge >= 100) { u.gauge = 0; castSkill(u); continue; }
    if (u.timer >= 1 / (u.aspd * (1 + u.buffMul))) {
      u.timer = 0;
      // 원딜/미드는 체력이 가장 낮은 적, 나머지는 맨 앞 적
      const tgt = (u.c.pos === 'A' || u.c.pos === 'M') ? foes.reduce((a, e) => e.hp < a.hp ? e : a) : foes[0];
      const crit = Math.random() < u.crit;
      dealDamage(u, tgt, u.atk * (1 + u.buffMul) * (crit ? 1.75 : 1), crit ? 'crit' : '');
      u.gauge = Math.min(100, u.gauge + skillGain(u.c.key) * u.gaugeRate);
      flash(u, 'atk', 100);
    }
  }
  for (const e of B.enemies) {
    if (e.dead) continue;
    if (e.stun > 0) { e.stun -= dt; continue; }
    if (!alive(B.allies).length) break;
    e.timer += dt;
    if (e.kind === 'boss') {
      e.slamT += dt;
      if (e.slamT >= 6) { e.slamT = 0; banner(`⚠️ ${e.name}의 강타!`); alive(B.allies).forEach(a => dealDamage(e, a, e.atk * 1.3, 'dmg')); continue; }
    }
    if (e.timer >= 1 / e.aspd) { e.timer = 0; flash(e, 'atk'); dealDamage(e, allyTarget(B.allies), e.atk, 'dmg'); }
  }
  if (!alive(B.enemies).length) return waveCleared();
  if (!alive(B.allies).length) return defeat();
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
    const reward = 80 + (B.floor % 5 === 0 ? 300 : 0);
    S.gems += reward; S.tower++;
    toast(`🗼 ${B.floor}층 돌파! 💎 ${reward}`);
    setTimeout(() => { startStage(); refreshPanel(); }, 1200);
    return;
  }
  let msg = `${stageName(B.s)} 클리어!`;
  if (B.s === S.maxStage) {
    const g = (B.s % 10 === 0) ? 150 : 30;
    S.gems += g; S.maxStage++; msg += ` 첫 클리어 💎 ${g}`;
  }
  if (S.auto) S.stage = Math.min(S.stage + 1, S.maxStage);
  log(msg);
  setTimeout(() => { if (B === cur) startStage(); }, 700 / S.speed);
}
function defeat() {
  B.over = true;
  const cur = B;
  if (B.mode === 'tower') {
    toast(`🗼 ${B.floor}층 도전 실패… 챔피언을 강화하세요`);
    setTimeout(() => { startStage(); refreshPanel(); }, 1200);
    return;
  }
  log(`패배… 이전 스테이지에서 반복 사냥합니다`);
  S.auto = false; S.stage = Math.max(1, S.stage - 1);
  setTimeout(() => { if (B === cur) startStage(); }, 1000);
}
function log(m) { $('#log').textContent = m; }

// 레벨업 등으로 능력치가 바뀌면 전투 중인 유닛에도 반영 (체력 비율 유지)
function refreshAllyStats() {
  if (!B) return;
  const b = bonuses();
  for (const u of B.allies) {
    const st = calcStats(u.id, b), ratio = u.hp / u.maxHp;
    Object.assign(u, { atk: st.atk, def: st.def, aspd: st.aspd, crit: st.crit, skill: st.skill, gaugeRate: st.gaugeRate, maxHp: st.hp });
    if (!u.dead) u.hp = st.hp * ratio;
    const badge = u.el && u.el.querySelector('.badge'); if (badge) badge.textContent = POS[u.c.pos].icon + S.owned[u.id].lv;
  }
}

// ===== 육성 =====
function levelUp(id, times = 1) {
  const c = CHAMP_BY_ID[id], o = S.owned[id]; let n = 0;
  while (n < times && o.lv < levelCap(o.star)) {
    const cost = levelCost(o.lv, c.rarity);
    if (S.gold < cost) break;
    S.gold -= cost; o.lv++; n++;
  }
  if (!n) toast(o.lv >= levelCap(o.star) ? `레벨 한계! ★강화가 필요합니다` : '골드가 부족합니다');
  refreshAllyStats(); return n;
}
function starUp(id) {
  const o = S.owned[id];
  if (o.star >= MAX_STAR) return toast('최대 성급입니다');
  const need = STAR_NEED[o.star - 1];
  if (o.copies < need) return toast(`중복 카드가 ${need - o.copies}장 더 필요합니다`);
  o.copies -= need; o.star++;
  toast(`${CHAMP_BY_ID[id].name} ★${o.star} 달성! 레벨 한계 ${levelCap(o.star)}`);
  refreshAllyStats();
}
const canStar = id => { const o = S.owned[id]; return o && o.star < MAX_STAR && o.copies >= STAR_NEED[o.star - 1]; };

// ===== 소환 =====
function rollRarity() {
  S.pity++;
  if (S.pity >= PITY) return 3;
  let r = Math.random() * 100;
  for (let i = 3; i >= 0; i--) { r -= RARITY[i].rate; if (r <= 0) return i; }
  return 0;
}
function gacha(n) {
  const cost = n === 10 ? PULL10_COST : PULL_COST * n;
  if (S.gems < cost) return toast('💎 보석이 부족합니다');
  S.gems -= cost;
  const res = [];
  for (let i = 0; i < n; i++) {
    let r = rollRarity();
    if (n === 10 && i === 9 && !res.some(x => x.r >= 2)) r = Math.max(r, 2); // 10연차 영웅 이상 1회 보장
    if (r === 3) S.pity = 0;
    const pool = CHAMPS.filter(c => c.rarity === r), c = pick(pool);
    const isNew = !S.owned[c.id];
    if (isNew) S.owned[c.id] = { lv: 1, star: 1, copies: 0 };
    else if (S.owned[c.id].star >= MAX_STAR && S.owned[c.id].copies >= 0) { S.gold += 500 * (r + 1) * S.maxStage; }
    else S.owned[c.id].copies++;
    S.pulls++;
    res.push({ c, r, isNew });
  }
  save();
  return res;
}

// ===== 장비 (대장간) =====
function gearVal(g) { return GEAR_GRADES[g.grade].base * (1 + g.ilvl * 0.05) / 100; }
function craft() {
  if (S.parts < CRAFT_COST) { if (!S.autoCraft) toast('⚙️ 마법공학 부품이 부족합니다'); return null; }
  S.parts -= CRAFT_COST;
  let r = Math.random() * 100, grade = 0;
  for (let i = GEAR_GRADES.length - 1; i >= 0; i--) { r -= GEAR_GRADES[i].rate; if (r <= 0) { grade = i; break; } }
  const slot = pick(Object.keys(GEAR_SLOTS));
  const item = { slot, grade, ilvl: S.maxStage, name: GEAR_SLOTS[slot].items[grade], stat: slot === 'acc' ? pick(Object.keys(ACC_STATS)) : slot === 'weapon' ? 'atk' : 'hp' };
  const cur = S.gear[slot];
  let result;
  if (!cur || gearVal(item) > gearVal(cur)) {
    if (cur) S.gold += sellPrice(cur);
    S.gear[slot] = item; result = 'equip'; refreshAllyStats();
  } else { S.gold += sellPrice(item); result = 'sell'; }
  return { item, result };
}
const sellPrice = g => Math.floor(20 * (g.grade + 1) * Math.pow(1.1, g.ilvl));
function gearStatText(g) {
  const v = gearVal(g);
  if (g.slot === 'weapon') return `공격력 +${(v * 100).toFixed(1)}%`;
  if (g.slot === 'armor') return `체력·방어 +${(v * 100).toFixed(1)}%`;
  return `${ACC_STATS[g.stat]} +${(v * 100 * (g.stat === 'crit' ? 0.35 : 1)).toFixed(1)}%`;
}

// ===== UI =====
let tab = 'heroes', heroFilter = 'all', lastPull = null, lastCraft = null;
function switchTab(t) {
  tab = t;
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  refreshPanel();
}
function refreshTop() {
  $('#gold').textContent = fmt(S.gold); $('#gems').textContent = fmt(S.gems); $('#parts').textContent = fmt(S.parts);
  $('#power').textContent = fmt(teamPower());
}
const stars = n => '★'.repeat(n);
function champCard(c, extra = '') {
  const o = S.owned[c.id];
  return `<div class="card ${o ? '' : 'locked'} ${S.deck.includes(c.id) ? 'indeck' : ''}" data-id="${c.id}" style="border-color:${RARITY[c.rarity].color}">
    <span class="pos">${POS[c.pos].icon}</span><img loading="lazy" src="${img(c.id)}" alt="">
    ${o ? `<div class="stars">${stars(o.star)}</div>` : ''}${o && canStar(c.id) ? '<span class="up">★UP</span>' : ''}${extra}
    <div class="cn">${c.name}</div><div class="cl">${o ? 'Lv.' + o.lv : RARITY[c.rarity].name}</div></div>`;
}
function refreshPanel() {
  refreshTop();
  const p = $('#panel');
  if (tab === 'heroes') {
    const owned = CHAMPS.filter(c => S.owned[c.id]).length;
    let list = CHAMPS.filter(c => heroFilter === 'all' || c.pos === heroFilter);
    list = list.sort((a, b) => (!!S.owned[b.id] - !!S.owned[a.id]) || (b.rarity - a.rarity) || ((S.owned[b.id]?.lv || 0) - (S.owned[a.id]?.lv || 0)));
    p.innerHTML = `<h3>챔피언 도감 <span class="sub">보유 ${owned} / ${CHAMPS.length}</span></h3>
      <div class="filters">${[['all', '전체'], ...Object.values(POS).map(x => [x.key, x.icon + ' ' + x.name])].map(([k, n]) => `<button class="chip ${heroFilter === k ? 'on' : ''}" data-f="${k}">${n} ${k === 'all' ? '' : CHAMPS.filter(c => c.pos === k).length}</button>`).join('')}</div>
      <div class="grid">${list.map(c => champCard(c)).join('')}</div>`;
  } else if (tab === 'deck') {
    const b = bonuses();
    const slots = Array.from({ length: 5 }, (_, i) => S.deck[i]);
    p.innerHTML = `<div class="box"><h3>출전 편성 <span class="sub">최대 5명 · 슬롯을 누르면 해제</span></h3>
      <div class="slots">${slots.map((id, i) => id ? `<div class="slot filled" data-slot="${i}" style="border-color:${RARITY[CHAMP_BY_ID[id].rarity].color}"><img src="${img(id)}"><div>${POS[CHAMP_BY_ID[id].pos].icon} ${CHAMP_BY_ID[id].name}</div></div>` : `<div class="slot">빈 슬롯</div>`).join('')}</div>
      <div class="syn">
        <span class="${b.posCount >= 3 ? 'act' : ''}">🤝 포지션 ${b.posCount}/5 : 공격력·체력 +${Math.round(b.team * 100)}%</span>
        ${Object.entries(TAGS).map(([k, t]) => { const n = S.deck.filter(id => CHAMP_BY_ID[id].tag === k).length; return `<span class="${b.tags[k] ? 'act' : ''}">${t.name} ${n} : ${b.tags[k] ? t.desc(b.tags[k]) : '2명부터 ' + t.syn + ' 시너지'}</span>`; }).join('')}
      </div>
      <div class="row" style="margin-top:10px"><button class="btn teal big" id="autoDeck">⚡ 자동 편성 (포지션별 최강)</button></div></div>
      <div class="box dlist"><h3>빠른 레벨업</h3>${S.deck.map(id => { const c = CHAMP_BY_ID[id], o = S.owned[id], cap = levelCap(o.star); return `<div class="di"><img src="${img(id)}"><div class="grow"><b>${c.name}</b> ${stars(o.star)}<br>Lv.${o.lv}/${cap} · 💰${fmt(levelCost(o.lv, c.rarity))}</div>
        <button class="btn" data-lv="${id}" data-n="1" ${o.lv >= cap ? 'disabled' : ''}>+1</button><button class="btn" data-lv="${id}" data-n="10" ${o.lv >= cap ? 'disabled' : ''}>+10</button></div>`; }).join('')}</div>
      <h3>보유 챔피언 <span class="sub">눌러서 편성에 추가</span></h3>
      <div class="grid">${CHAMPS.filter(c => S.owned[c.id]).sort((a, b) => powerOf(calcStats(b.id)) - powerOf(calcStats(a.id))).map(c => champCard(c)).join('')}</div>`;
  } else if (tab === 'gacha') {
    const featured = CHAMPS.filter(c => c.rarity === 3).slice(0, 5);
    p.innerHTML = `<div class="banner-art"><div class="t">협곡 소환</div><div class="sub">전설 확정까지 <b style="color:#ffb52e">${PITY - S.pity}</b>회 · 총 ${S.pulls}회 소환</div>
        <div class="imgs">${featured.map(c => `<img src="${img(c.id)}">`).join('')}</div></div>
      <div class="row"><button class="btn big" id="pull1">1회 소환<br>💎 ${PULL_COST}</button><button class="btn teal big" id="pull10">10회 소환<br>💎 ${PULL10_COST}</button></div>
      <div class="box" style="margin-top:10px"><div class="rates">${RARITY.map(r => `<span style="color:${r.color}">${r.name} ${r.rate}% (${CHAMPS.filter(c => c.rarity === r.key).length}종)</span>`).join('')}</div>
        <div class="sub" style="margin-top:6px">· 10회 소환 시 영웅 이상 1회 보장 · ${PITY}회 내 전설 확정<br>· 중복 획득 시 성급(★) 강화 재료가 됩니다 · ★6 이후 중복은 골드로 전환</div></div>
      ${lastPull ? `<h3>소환 결과</h3><div class="grid pull-res">${lastPull.map((x, i) => champCard(x.c, x.isNew ? '<span class="new">NEW</span>' : '').replace('class="card', `style="animation-delay:${i * 0.06}s" class="card`)).join('')}</div>` : ''}`;
  } else if (tab === 'forge') {
    p.innerHTML = `<div class="box"><h3>장착 장비 <span class="sub">팀 전체에 적용</span></h3><div class="gear">${Object.entries(GEAR_SLOTS).map(([k, s]) => { const g = S.gear[k]; return g ? `<div class="gi" style="border-color:${GEAR_GRADES[g.grade].color}"><div class="ic">${s.icon}</div><div class="gn" style="color:${GEAR_GRADES[g.grade].color}">${g.name}</div><div>${GEAR_GRADES[g.grade].name} · iLv ${g.ilvl}</div><div style="color:var(--teal)">${gearStatText(g)}</div></div>` : `<div class="gi"><div class="ic">${s.icon}</div><div class="sub">${s.name} 없음</div></div>`; }).join('')}</div></div>
      <div class="box oven"><div class="big" id="ovenIcon">🔨</div><div class="sub">마법공학 부품 ${CRAFT_COST}개로 장비를 제작합니다.<br>더 좋은 장비는 자동 장착, 나머지는 골드로 판매됩니다.<br>장비 레벨(iLv)은 최고 스테이지를 따라갑니다.</div>
        <div class="row" style="margin-top:10px"><button class="btn big" id="craftBtn">제작 (⚙️ ${CRAFT_COST})</button><button class="btn big ${S.autoCraft ? 'teal' : ''}" id="autoCraftBtn">자동 제작 ${S.autoCraft ? 'ON' : 'OFF'}</button></div>
        <div id="craftRes" style="margin-top:10px;min-height:20px">${lastCraft ? craftResText(lastCraft) : ''}</div>
        <div class="rates" style="justify-content:center;margin-top:8px">${GEAR_GRADES.map(g => `<span style="color:${g.color}">${g.name} ${g.rate}%</span>`).join('')}</div></div>`;
  } else if (tab === 'tower') {
    const f = S.tower, boss = BOSSES[(f - 1) % BOSSES.length], s = Math.round(4 + f * 2.4), e = enemyStat(s);
    p.innerHTML = `<div class="box" style="text-align:center"><h3 style="justify-content:center">🗼 공허의 탑</h3>
      <div style="font-size:42px">${boss[1]}</div><div style="font-size:18px;font-weight:900">${f}층 수호자: ${boss[0]}</div>
      <div class="sub">보스 체력 ${fmt(e.hp * 10)} · 공격력 ${fmt(e.atk * 2.2)} · 정예 2마리 동반</div>
      <div class="sub" style="margin:8px 0">보상: 💎 80 ${f % 5 === 0 ? '+ 5층 보너스 💎 300' : ''}</div>
      <div class="sub">내 전투력 ⚔️ ${fmt(teamPower())}</div>
      <button class="btn teal big" id="towerBtn" style="width:100%;margin-top:10px" ${B && B.mode === 'tower' ? 'disabled' : ''}>${B && B.mode === 'tower' ? '도전 중…' : '도전하기'}</button></div>
      <div class="box sub">공허의 탑은 층마다 강해지는 보스에 도전해 보석을 얻는 콘텐츠입니다. 실패해도 잃는 것은 없습니다.</div>`;
  }
}
function craftResText(r) {
  const g = r.item;
  return `<span style="color:${GEAR_GRADES[g.grade].color};font-weight:700">[${GEAR_GRADES[g.grade].name}] ${g.name}</span> ${gearStatText(g)} → ${r.result === 'equip' ? '<b style="color:var(--teal)">장착!</b>' : `판매 💰${fmt(sellPrice(g))}`}`;
}

function openModal(html) { $('#modalBox').innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); detailId = null; }
let detailId = null;
const spellCache = {};
function showDetail(id) {
  detailId = id;
  const c = CHAMP_BY_ID[id], o = S.owned[id], st = calcStats(id), r = RARITY[c.rarity];
  const cap = o ? levelCap(o.star) : 0, need = o && o.star < MAX_STAR ? STAR_NEED[o.star - 1] : 0;
  openModal(`<div class="dhead"><img src="${img(id)}"><div>
      <div class="nm">${c.name}</div>
      <span class="tag" style="color:${r.color};border:1px solid ${r.color}">${r.name}</span><span class="tag" style="color:${POS[c.pos].color}">${POS[c.pos].icon} ${POS[c.pos].name}</span><span class="tag">${TAGS[c.tag].name}</span>
      <div style="color:#ffd84a;margin-top:4px">${o ? stars(o.star) + `<span style="color:#555">${'★'.repeat(MAX_STAR - o.star)}</span>` : '미보유'}</div>
      ${o ? `<div>Lv.<b>${o.lv}</b> / ${cap}</div>` : ''}</div></div>
    <div class="stats"><div>체력<b>${fmt(st.hp)}</b></div><div>공격력<b>${fmt(st.atk)}</b></div><div>방어력<b>${fmt(st.def)}</b></div>
      <div>공격 속도<b>${st.aspd.toFixed(2)}</b></div><div>치명타<b>${Math.round(st.crit * 100)}%</b></div><div>전투력<b>${fmt(powerOf(st))}</b></div></div>
    <div class="skill"><img id="spIcon" src="" alt="" style="visibility:hidden"><div>
      <div><span class="k">${c.key}</span><b>${c.skill}</b> <span class="sub">${EFFECTS[c.eff].icon} ${EFFECTS[c.eff].name} · 고정 스킬</span></div>
      <div class="eff">▶ ${skillEffectText(c)}</div>
      <div class="sub" style="margin-top:3px">게이지 충전: ${c.key === 'R' ? '느림 (궁극기, 위력 x1.9)' : '빠름'}</div>
      <p id="spDesc">원작 스킬 설명 불러오는 중…</p></div></div>
    ${o ? `<div class="box" style="margin-top:10px">
      <div class="row"><div style="flex:1">레벨업 비용 💰 <b>${o.lv >= cap ? '-' : fmt(levelCost(o.lv, c.rarity))}</b></div>
        <button class="btn" data-dlv="1" ${o.lv >= cap ? 'disabled' : ''}>+1</button><button class="btn" data-dlv="10" ${o.lv >= cap ? 'disabled' : ''}>+10</button><button class="btn" data-dlv="999" ${o.lv >= cap ? 'disabled' : ''}>MAX</button></div>
      <div style="margin-top:10px">성급 강화 (중복 카드) ${o.star >= MAX_STAR ? '— 최대' : `${o.copies} / ${need}`}</div>
      <div class="progress"><i style="width:${o.star >= MAX_STAR ? 100 : Math.min(100, o.copies / need * 100)}%"></i></div>
      <div class="row"><div class="sub" style="flex:1">★당 능력치 대폭 상승 + 레벨 한계 +20</div><button class="btn teal" id="starBtn" ${canStar(id) ? '' : 'disabled'}>★ 강화</button></div></div>
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
  else { if (S.deck.length >= 5) return toast('편성은 최대 5명입니다'); S.deck.push(id); }
  save(); startStage(); refreshPanel();
}
function autoDeck() {
  const owned = CHAMPS.filter(c => S.owned[c.id]);
  const deck = [];
  for (const p of Object.keys(POS)) {
    const best = owned.filter(c => c.pos === p).sort((a, b) => powerOf(calcStats(b.id)) - powerOf(calcStats(a.id)))[0];
    if (best) deck.push(best.id);
  }
  for (const c of owned.sort((a, b) => powerOf(calcStats(b.id)) - powerOf(calcStats(a.id)))) if (deck.length < 5 && !deck.includes(c.id)) deck.push(c.id);
  S.deck = deck; save(); startStage(); refreshPanel(); toast('자동 편성 완료');
}

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
  const lv = e.target.closest('[data-lv]'); if (lv) { levelUp(lv.dataset.lv, +lv.dataset.n); save(); return refreshPanel(); }
  const sl = e.target.closest('[data-slot]'); if (sl) return toggleDeck(S.deck[+sl.dataset.slot]);
  const card = e.target.closest('.card');
  if (card) {
    const id = card.dataset.id;
    if (tab === 'deck' && S.owned[id]) return toggleDeck(id);
    return showDetail(id);
  }
  const t = e.target.closest('button'); if (!t) return;
  if (t.id === 'autoDeck') autoDeck();
  if (t.id === 'pull1' || t.id === 'pull10') { const r = gacha(t.id === 'pull1' ? 1 : 10); if (r) { lastPull = r; refreshPanel(); const top = Math.max(...r.map(x => x.r)); if (top === 3) toast('🌟 전설 챔피언 획득!'); } }
  if (t.id === 'craftBtn') { const r = craft(); if (r) { lastCraft = r; refreshPanel(); $('#ovenIcon').classList.add('go'); } }
  if (t.id === 'autoCraftBtn') { S.autoCraft = !S.autoCraft; refreshPanel(); }
  if (t.id === 'towerBtn') startTower();
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
  · 탑/정글/미드/원딜/서포터를 모두 편성하면 팀 시너지 보너스!<br>
  · 시작 선물: 💎 3,000 (소환 30회)</div><button class="btn big" id="closeBtn" style="width:100%;margin-top:12px">시작하기</button>`);
else offlineReward();

let last = performance.now(), saveT = 0, craftT = 0, uiT = 0;
setInterval(() => {
  const now = performance.now(), real = Math.min(0.25, (now - last) / 1000); last = now;
  const dt = real * S.speed;
  tick(dt);
  paintUnits();
  saveT += real; craftT += real; uiT += real;
  if (S.autoCraft && craftT > 0.6) { craftT = 0; const r = craft(); if (r) { lastCraft = r; if (tab === 'forge') { const el = $('#craftRes'); if (el) el.innerHTML = craftResText(r); } } }
  if (uiT > 0.5) { uiT = 0; refreshTop(); }
  if (saveT > 5) { saveT = 0; save(); }
}, 50);
window.addEventListener('beforeunload', save);
