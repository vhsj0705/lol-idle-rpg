// data.js 무결성 + index.html 로컬 참조 검사 (CI에서 실행: node scripts/validate.mjs)
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const errors = [];
const fail = msg => errors.push(msg);

// data.js 로드 시 존재하지 않는 시너지 멤버가 조용히 걸러지므로, 걸러지기 전에 원본 목록을 기록한다
const FILTER_LINE = 's.members = s.members.filter(id => CHAMP_BY_ID[id]);';
let src = readFileSync('data.js', 'utf8');
if (!src.includes(FILTER_LINE)) fail(`data.js에서 시너지 필터 구문을 찾지 못함: ${FILTER_LINE}`);
src = src.replace(FILTER_LINE, `s.rawMembers = [...s.members]; ${FILTER_LINE}`);

const ctx = {};
vm.runInNewContext(`${src}\n;globalThis.__d = { DDRAGON_VER, POS, TAGS, EFFECTS, RARITY, CHAMPS, SYNERGIES, BONUS_NAMES };`, ctx);
const { POS, TAGS, EFFECTS, CHAMPS, SYNERGIES, BONUS_NAMES, RARITY } = ctx.__d;

// 챔피언
const ids = new Set();
for (const c of CHAMPS) {
  const where = `챔피언 ${c.id}`;
  if (Object.values(c).some(v => v === undefined || v === '')) fail(`${where}: 필드 누락`);
  if (ids.has(c.id)) fail(`${where}: ID 중복`);
  ids.add(c.id);
  if (!POS[c.pos]) fail(`${where}: 알 수 없는 포지션 '${c.pos}'`);
  if (!TAGS[c.tag]) fail(`${where}: 알 수 없는 역할군 '${c.tag}'`);
  if (!EFFECTS[c.eff]) fail(`${where}: 알 수 없는 효과 '${c.eff}'`);
  if (!'QWER'.includes(c.key) || c.key.length !== 1) fail(`${where}: 스킬 키는 Q/W/E/R 중 하나여야 함 ('${c.key}')`);
}
if (new Set(CHAMPS.map(c => c.name)).size !== CHAMPS.length) fail('챔피언 이름 중복');
if (RARITY.reduce((a, r) => a + r.rate, 0) !== 100) fail('RARITY 확률 합이 100이 아님');

// 시너지
const synNames = new Set();
for (const s of SYNERGIES) {
  const where = `시너지 '${s.name}'`;
  if (synNames.has(s.name)) fail(`${where}: 이름 중복`);
  synNames.add(s.name);
  for (const id of s.rawMembers ?? []) if (!ids.has(id)) fail(`${where}: 존재하지 않는 챔피언 ID '${id}'`);
  if (!Array.isArray(s.tiers) || !s.tiers.length) { fail(`${where}: tiers 없음`); continue; }
  let prev = 0;
  for (const [need, bonus] of s.tiers) {
    if (!(need > prev)) fail(`${where}: 단계 인원이 오름차순이 아님 (${need})`);
    prev = need;
    for (const k of Object.keys(bonus)) if (!BONUS_NAMES[k]) fail(`${where}: 알 수 없는 보너스 키 '${k}'`);
  }
}

// index.html이 참조하는 로컬 파일 존재 여부
const html = readFileSync('index.html', 'utf8');
for (const [, ref] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  if (/^(https?:)?\/\//.test(ref) || ref.startsWith('data:')) continue;
  if (!existsSync(ref)) fail(`index.html: 로컬 파일 없음 '${ref}'`);
}

if (errors.length) {
  console.error(`검사 실패 ${errors.length}건:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`OK: 챔피언 ${CHAMPS.length}명, 시너지 ${SYNERGIES.length}개`);
