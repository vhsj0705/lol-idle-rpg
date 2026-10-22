// 챔피언 데이터 (수집일 2026-10-21)
// - 이름/스킬: Riot Data Dragon 16.21.1 (ko_KR)
// - 포지션: OP.GG 16.20 패치 라인별 픽률 중 가장 높은 라인을 주 포지션으로 지정
// - 스킬: Q/W/E/R 중 1개를 시드 랜덤으로 선택해 고정
// 형식: id,이름,포지션(T탑 J정글 M미드 A원딜 S서폿),역할군(F전사 T탱커 M마법사/원거리 A암살자 S서포터),스킬키,스킬명,효과(d피해 c군중제어 h회복 s보호막 b강화)
const DDRAGON_VER = '16.21.1';
const CHAMP_RAW = `Garen,가렌,T,F,R,데마시아의 정의,d;Galio,갈리오,M,T,R,영웅출현,s;Gangplank,갱플랭크,T,F,Q,혀어어어업상,d;Gragas,그라가스,T,F,W,취중 분노,d;Graves,그레이브즈,J,M,Q,화약 역류,d;Gwen,그웬,T,F,W,신성한 안개,d;Gnar,나르,T,F,E,폴짝 / 우지끈,d;Nami,나미,S,S,W,밀물 썰물,h;Nasus,나서스,T,F,E,영혼의 불길,d;Naafiri,나피리,J,A,Q,다르킨 단검,d;Nautilus,노틸러스,S,T,R,폭뢰,c;Nocturne,녹턴,J,F,E,말할 수 없는 공포,c;Nunu,누누와 윌럼프,J,T,R,절대 영도,d;Nidalee,니달리,J,A,Q,창 투척 / 숨통 끊기,d;Neeko,니코,S,M,W,형상 분리,b;Nilah,닐라,A,F,Q,무형의 검,d;Darius,다리우스,T,F,Q,학살,h;Diana,다이애나,J,F,R,달빛 낙하,c;Draven,드레이븐,A,M,W,광기의 피,b;Ryze,라이즈,M,M,E,주문 전이,d;Rakan,라칸,S,S,W,화려한 등장,d;Rammus,람머스,J,T,E,광란의 도발,c;Lux,럭스,S,M,W,프리즘 보호막,d;Rumble,럼블,T,F,R,이퀄라이저 미사일,d;Renata,레나타 글라스크,S,S,W,긴급 구제,d;Renekton,레넥톤,T,F,W,무자비한 포식자,s;Leona,레오나,S,T,E,천공의 검,d;RekSai,렉사이,J,F,W,매복 / 돌출,d;Rell,렐,S,T,R,자기 폭풍,c;Rengar,렝가,J,A,Q,포악함,b;Locke,로크,M,A,R,연옥,d;Lucian,루시안,A,M,R,빛의 심판,d;Lulu,룰루,S,S,Q,반짝반짝 창,d;Leblanc,르블랑,M,A,E,환영 사슬,c;LeeSin,리 신,J,F,W,방호 / 강철의 의지,s;Riven,리븐,T,F,R,추방자의 검,d;Lissandra,리산드라,M,M,Q,얼음 파편,d;Lillia,릴리아,J,F,R,감미로운 자장가,d;MasterYi,마스터 이,J,F,R,최후의 전사,b;Maokai,마오카이,S,T,W,뒤틀린 전진,c;Malzahar,말자하,M,M,R,황천의 손아귀,c;Malphite,말파이트,T,T,W,천둥소리,d;Mel,멜,M,M,Q,빛의 세례,d;Mordekaiser,모데카이저,T,F,Q,말살,d;Morgana,모르가나,S,S,R,영혼의 족쇄,c;DrMundo,문도 박사,T,T,R,최대 투여량,h;MissFortune,미스 포츈,A,M,W,활보,b;Milio,밀리오,S,S,R,생명의 온기,h;Bard,바드,S,S,Q,우주의 결속,c;Varus,바루스,A,M,W,역병 화살,d;Vi,바이,J,F,R,정지 명령,c;Veigar,베이가,M,M,E,사건의 지평선,c;Vayne,베인,A,M,Q,구르기,d;Vex,벡스,M,M,R,그림자 파동,d;Belveth,벨베스,J,F,E,여제의 소용돌이,d;Velkoz,벨코즈,S,M,R,생물 분해 광선,d;Volibear,볼리베어,T,F,R,폭풍을 부르는 자,d;Braum,브라움,S,T,E,불굴,d;Briar,브라이어,J,F,E,오싹한 비명,h;Brand,브랜드,S,M,W,화염 기둥,d;Vladimir,블라디미르,M,M,R,혈사병,h;Blitzcrank,블리츠크랭크,S,T,E,강철 주먹,d;Viego,비에고,J,F,R,심장 파괴자,c;Viktor,빅토르,M,M,R,아케인 폭풍,d;Poppy,뽀삐,S,T,E,용감한 돌진,c;Samira,사미라,A,M,E,거침없는 질주,b;Sion,사이온,T,T,Q,대량 학살 강타,c;Sylas,사일러스,M,M,R,강탈,d;Shaco,샤코,J,A,Q,속임수,d;Senna,세나,S,S,W,마지막 포옹,c;Seraphine,세라핀,S,S,R,앙코르,c;Sejuani,세주아니,J,T,Q,혹한의 맹습,d;Sett,세트,T,F,W,강펀치,s;Sona,소나,S,S,Q,용맹의 찬가,d;Soraka,소라카,S,S,W,은하의 마력,h;Shen,쉔,T,T,Q,황혼 강습,d;Shyvana,쉬바나,J,F,R,용의 강림,d;Smolder,스몰더,A,M,E,펄럭펄럭,d;Swain,스웨인,S,M,W,제국의 눈,d;Skarner,스카너,J,T,R,꿰뚫기,c;Sivir,시비르,A,M,R,사냥 개시,d;XinZhao,신 짜오,J,F,R,현월수호,c;Syndra,신드라,M,M,E,적군 와해,c;Singed,신지드,T,T,W,초강력 접착제,d;Thresh,쓰레쉬,S,S,W,어둠의 통로,d;Ahri,아리,M,M,R,혼령 질주,d;Amumu,아무무,J,T,E,짜증내기,d;AurelionSol,아우렐리온 솔,M,M,R,유성 / 천상 강림,c;Ivern,아이번,J,S,Q,덩굴뿌리,c;Azir,아지르,M,M,Q,사막의 맹습,d;Akali,아칼리,M,A,W,황혼의 장막,d;Akshan,아크샨,M,M,Q,복수의 부메랑,d;Aatrox,아트록스,T,F,W,지옥사슬,d;Aphelios,아펠리오스,A,M,E,무기 교체 시스템,d;Alistar,알리스타,S,T,Q,분쇄,c;Ambessa,암베사,T,F,Q,교활한 휩쓸기 / 파멸의 일격,d;Annie,애니,M,M,R,소환: 티버,d;Anivia,애니비아,M,M,W,결정화,d;Ashe,애쉬,A,M,E,매 날리기,d;Yasuo,야스오,M,F,R,최후의 숨결,d;Ekko,에코,M,A,E,시간 도약,d;Elise,엘리스,J,A,E,고치 / 줄타기,h;MonkeyKing,오공,J,F,W,분신 전사,d;Aurora,오로라,M,M,R,세계의 경계,d;Ornn,오른,T,T,R,대장장이 신의 부름,d;Orianna,오리아나,M,M,Q,명령: 공격,d;Olaf,올라프,T,F,R,라그나로크,d;Yone,요네,T,F,R,운명봉인,c;Yorick,요릭,T,F,R,군도의 장송곡,d;Udyr,우디르,J,F,R,날개 돋친 폭풍,d;Urgot,우르곳,T,F,Q,부식성 폭약,d;Warwick,워윅,J,F,R,무한의 구속,c;Yunara,유나라,A,M,W,심판의 궤적 | 파멸의 궤적,d;Yuumi,유미,S,S,Q,사르르탄,d;Irelia,이렐리아,T,F,R,선봉진격검,d;Evelynn,이블린,J,A,W,황홀한 저주,c;Ezreal,이즈리얼,A,M,Q,신비한 화살,d;Illaoi,일라오이,T,F,R,믿음의 도약,d;JarvanIV,자르반 4세,J,F,E,데마시아의 깃발,b;Xayah,자야,A,M,Q,깃털 연타,d;Zyra,자이라,S,M,E,휘감는 뿌리,d;Zac,자크,J,T,E,새총 발사,d;Zaahen,자헨,T,F,R,단호한 판결,h;Janna,잔나,S,S,R,계절풍,c;Jax,잭스,T,F,E,반격,c;Zed,제드,M,A,Q,예리한 표창,d;Xerath,제라스,M,M,E,충격 구체,c;Zeri,제리,A,M,R,번개 방출,h;Jayce,제이스,T,F,W,전류 역장 / 초전하,h;Zoe,조이,M,M,W,주문도둑,d;Ziggs,직스,A,M,E,마법공학 지뢰밭,d;Jhin,진,A,M,E,강제 관람,d;Zilean,질리언,S,S,W,되감기,d;Jinx,징크스,A,M,E,와작와작 뻥!,d;Chogath,초가스,J,T,R,포식,d;Karma,카르마,S,M,E,고무,s;Camille,카밀,T,F,W,전술적 휩쓸기,h;Kassadin,카사딘,M,A,Q,무의 구체,s;Karthus,카서스,J,M,Q,황폐화,d;Cassiopeia,카시오페아,M,M,Q,맹독 폭발,b;Kaisa,카이사,A,M,E,고속 충전,b;Khazix,카직스,J,A,R,공허의 습격,b;Katarina,카타리나,M,A,W,준비,d;Kalista,칼리스타,A,M,Q,꿰뚫는 창,d;Kennen,케넨,T,M,W,전류 방출,d;Caitlyn,케이틀린,A,M,W,요들잡이 덫,d;Kayn,케인,J,F,Q,살상돌격,d;Kayle,케일,T,M,R,신성한 심판,d;KogMaw,코그모,A,M,W,생체마법 폭격,d;Corki,코르키,A,M,R,미사일 폭격,d;Quinn,퀸,J,M,E,공중제비,d;KSante,크산테,T,T,W,길을 여는 자,c;Kled,클레드,T,F,W,버럭버럭,b;Qiyana,키아나,J,A,E,대담무쌍,d;Kindred,킨드레드,J,M,Q,화살 세례,d;Taric,타릭,S,S,W,수호의 고리,s;Talon,탈론,J,A,R,그림자 공격,d;Taliyah,탈리야,M,M,W,지각변동,d;TahmKench,탐 켄치,S,T,E,두꺼운 피부,h;Trundle,트런들,T,F,R,진압,d;Tristana,트리스타나,A,M,Q,속사,b;Tryndamere,트린다미어,T,F,W,조롱의 외침,d;TwistedFate,트위스티드 페이트,M,M,W,카드 뽑기,d;Twitch,트위치,A,M,Q,매복,b;Teemo,티모,T,M,R,유독성 함정,d;Pyke,파이크,S,S,W,유령 잠수,b;Pantheon,판테온,T,F,W,방호의 도약,c;Fiddlesticks,피들스틱,J,M,W,풍작,d;Fiora,피오라,T,F,R,대결투,h;Fizz,피즈,M,A,W,심해석 삼지창,d;Heimerdinger,하이머딩거,T,M,W,마법공학 초소형 로켓,d;Hecarim,헤카림,J,F,E,파멸의 돌격,c;Hwei,흐웨이,M,M,R,절망의 소용돌이,d`;

const POS = {
  T: { key: 'T', name: '탑', icon: '🛡️', color: '#e0904a' },
  J: { key: 'J', name: '정글', icon: '🌿', color: '#5fbf5a' },
  M: { key: 'M', name: '미드', icon: '✨', color: '#5aa7ff' },
  A: { key: 'A', name: '원딜', icon: '🏹', color: '#ff6b6b' },
  S: { key: 'S', name: '서포터', icon: '💗', color: '#d58cff' },
};
const TAGS = {
  F: { name: '전사', syn: '공격력', desc: n => `공격력 +${n * 10}%` },
  T: { name: '탱커', syn: '체력', desc: n => `체력·방어력 +${n * 15}%` },
  M: { name: '마법사·원거리', syn: '스킬 피해', desc: n => `스킬 피해 +${n * 20}%` },
  A: { name: '암살자', syn: '치명타', desc: n => `치명타 확률 +${n * 10}%` },
  S: { name: '서포터', syn: '게이지', desc: n => `스킬 게이지 충전 +${n * 15}%` },
};
const EFFECTS = {
  d: { name: '피해', icon: '💥' },
  c: { name: '군중 제어', icon: '🌀' },
  h: { name: '회복', icon: '💚' },
  s: { name: '보호막', icon: '🔰' },
  b: { name: '강화', icon: '🔥' },
};
const RARITY = [
  { key: 0, name: '일반', color: '#9aa4b1', mult: 1.0, rate: 55 },
  { key: 1, name: '희귀', color: '#4aa8ff', mult: 1.3, rate: 30 },
  { key: 2, name: '영웅', color: '#b46cff', mult: 1.7, rate: 12 },
  { key: 3, name: '전설', color: '#ffb52e', mult: 2.3, rate: 3 },
];

// 문자열 해시로 등급을 결정 (고정): 전설 ~12%, 영웅 ~23%, 희귀 ~32%, 일반 ~33%
function hashStr(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }

const CHAMPS = CHAMP_RAW.split(';').map(row => {
  const [id, name, pos, tag, key, skill, eff] = row.split(',');
  const h = hashStr(id + 'rarity');
  const rarity = h < 0.12 ? 3 : h < 0.35 ? 2 : h < 0.67 ? 1 : 0;
  return { id, name, pos, tag, key, skill, eff, rarity };
});
const CHAMP_BY_ID = Object.fromEntries(CHAMPS.map(c => [c.id, c]));

// ===== 시너지 (지역 / 특수 조합 / 단독) =====
// 보너스 키: atk 공격력, hp 체력, def 방어력, crit 치명타 확률, aspd 공격 속도, skill 스킬 피해, gauge 게이지 충전,
//          dr 받는 피해 감소, ls 생명력 흡수, gold 골드 획득, parts 부품 획득
// tiers: [[필요 인원, 보너스], ...]  — 편성한 해당 챔피언 수가 기준 이상이면 가장 높은 단계가 적용된다
// 지역 소속은 공식 챔피언 소개/세계관(룬테라 지역) 기준이며, 한 챔피언이 여러 그룹에 속할 수 있다
const BONUS_NAMES = { atk: '공격력', hp: '체력', def: '방어력', crit: '치명타 확률', aspd: '공격 속도', skill: '스킬 피해', gauge: '게이지 충전', dr: '받는 피해 감소', ls: '생명력 흡수', gold: '골드 획득', parts: '부품 획득' };
const bonusText = b => Object.entries(b).map(([k, v]) => `${BONUS_NAMES[k]} +${Math.round(v * 100)}%`).join(' · ');
const SYNERGIES = [
  // --- 지역 (2/4/6명) ---
  { kind: 'region', icon: '🦁', name: '데마시아', desc: '정의와 명예의 왕국', members: 'Garen Lux Galio JarvanIV Fiora XinZhao Sylas Vayne Quinn Poppy Lucian Sona Kayle Morgana Shyvana'.split(' '),
    tiers: [[2, { hp: .08, def: .08 }], [4, { hp: .16, def: .16, dr: .04 }], [6, { hp: .26, def: .26, dr: .10 }]] },
  { kind: 'region', icon: '⚔️', name: '녹서스', desc: '힘이 곧 정의인 제국', members: 'Darius Draven Swain Katarina Leblanc Sion Vladimir Talon Riven Rell Samira Cassiopeia Kled Ambessa Briar'.split(' '),
    tiers: [[2, { atk: .08 }], [4, { atk: .16, crit: .05 }], [6, { atk: .28, crit: .10 }]] },
  { kind: 'region', icon: '🍃', name: '아이오니아', desc: '영혼과 균형의 땅', members: 'Ahri Akali Irelia Karma Kayn Kennen LeeSin MasterYi Shen Syndra MonkeyKing Xayah Rakan Yasuo Yone Zed Jhin Lillia Sett Hwei Varus Ivern'.split(' '),
    tiers: [[2, { aspd: .08 }], [4, { aspd: .16, gauge: .10 }], [6, { aspd: .26, gauge: .20 }]] },
  { kind: 'region', icon: '⚙️', name: '필트오버', desc: '진보의 도시', members: 'Caitlyn Vi Jayce Heimerdinger Camille Ezreal Orianna Seraphine Mel Corki'.split(' '),
    tiers: [[2, { skill: .10 }], [4, { skill: .20, gold: .15 }], [6, { skill: .32, gold: .30 }]] },
  { kind: 'region', icon: '🧪', name: '자운', desc: '화학과 혁신의 지하도시', members: 'Jinx Ekko Warwick Singed Blitzcrank Viktor DrMundo Twitch Zac Urgot Zeri Renata Ziggs Janna'.split(' '),
    tiers: [[2, { crit: .05, ls: .03 }], [4, { crit: .10, ls: .06, aspd: .08 }], [6, { crit: .18, ls: .10, aspd: .16 }]] },
  { kind: 'region', icon: '❄️', name: '프렐요드', desc: '얼어붙은 북방의 부족들', members: 'Ashe Braum Lissandra Sejuani Volibear Anivia Gragas Nunu Olaf Trundle Udyr Ornn Gnar Aurora'.split(' '),
    tiers: [[2, { hp: .10 }], [4, { hp: .20, def: .10 }], [6, { hp: .34, def: .20, dr: .06 }]] },
  { kind: 'region', icon: '🏜️', name: '슈리마', desc: '태양 원반의 사막 제국', members: 'Azir Nasus Renekton Sivir Rammus Amumu Taliyah Xerath Zilean Akshan Zaahen Naafiri Aatrox Nilah'.split(' '),
    tiers: [[2, { atk: .06, skill: .06 }], [4, { atk: .12, skill: .14, hp: .08 }], [6, { atk: .22, skill: .26, hp: .16 }]] },
  { kind: 'region', icon: '👻', name: '그림자 군도', desc: '검은 안개가 뒤덮은 섬', members: 'Thresh Hecarim Karthus Kalista Mordekaiser Maokai Yorick Viego Gwen Fiddlesticks Vex Kindred Senna Elise'.split(' '),
    tiers: [[2, { ls: .04 }], [4, { ls: .08, atk: .10 }], [6, { ls: .14, atk: .20, dr: .05 }]] },
  { kind: 'region', icon: '🏴‍☠️', name: '빌지워터', desc: '무법의 항구 도시', members: 'MissFortune Gangplank Graves TwistedFate Illaoi Nautilus Fizz Pyke TahmKench Nami'.split(' '),
    tiers: [[2, { gold: .15 }], [4, { gold: .30, crit: .06 }], [6, { gold: .50, crit: .12, parts: .20 }]] },
  { kind: 'region', icon: '🌀', name: '공허', desc: '룬테라를 갉아먹는 종말', members: 'Belveth Chogath Kaisa Khazix Kassadin KogMaw Malzahar Velkoz RekSai'.split(' '),
    tiers: [[2, { atk: .08 }], [4, { atk: .16, skill: .12 }], [6, { atk: .28, skill: .24, ls: .05 }]] },
  { kind: 'region', icon: '🌿', name: '이쉬탈', desc: '정글 속 마법의 땅', members: 'Neeko Nidalee Qiyana Zyra Rengar Milio Malphite Skarner'.split(' '),
    tiers: [[2, { aspd: .06, crit: .03 }], [4, { aspd: .12, crit: .08 }], [6, { aspd: .20, crit: .14 }]] },
  { kind: 'region', icon: '🌙', name: '타곤', desc: '별과 달이 닿는 산', members: 'Leona Diana Pantheon Soraka Aphelios Zoe AurelionSol Taric'.split(' '),
    tiers: [[2, { gauge: .10 }], [4, { gauge: .20, skill: .10 }], [6, { gauge: .32, skill: .20, dr: .05 }]] },
  { kind: 'region', icon: '🍄', name: '반들 시티 (요들)', desc: '작지만 강한 요들들', members: 'Teemo Tristana Lulu Veigar Rumble Poppy Kled Gnar Kennen Ziggs Corki Heimerdinger Vex Fizz'.split(' '),
    tiers: [[2, { aspd: .06, gauge: .06 }], [4, { aspd: .12, gauge: .14, skill: .10 }], [6, { aspd: .20, gauge: .24, skill: .20 }]] },
  // --- 특수 조합 (지정한 챔피언을 모두 편성) ---
  { kind: 'squad', icon: '👑', name: '데마시아의 남매', desc: '가렌 + 럭스', members: ['Garen', 'Lux'], tiers: [[2, { atk: .12, hp: .12, def: .10 }]] },
  { kind: 'squad', icon: '🪓', name: '녹서스의 형제', desc: '다리우스 + 드레이븐', members: ['Darius', 'Draven'], tiers: [[2, { atk: .20, crit: .08 }]] },
  { kind: 'squad', icon: '💥', name: '피와 불꽃의 자매', desc: '바이 + 징크스', members: ['Vi', 'Jinx'], tiers: [[2, { crit: .10, aspd: .12 }]] },
  { kind: 'squad', icon: '🪽', name: '타락한 자매', desc: '케일 + 모르가나', members: ['Kayle', 'Morgana'], tiers: [[2, { skill: .25, gauge: .10 }]] },
  { kind: 'squad', icon: '🌬️', name: '바람의 형제', desc: '야스오 + 요네', members: ['Yasuo', 'Yone'], tiers: [[2, { aspd: .18, crit: .10 }]] },
  { kind: 'squad', icon: '☀️', name: '해와 달', desc: '레오나 + 다이애나', members: ['Leona', 'Diana'], tiers: [[2, { atk: .12, skill: .20, gauge: .10 }]] },
  { kind: 'squad', icon: '🛡️', name: '프렐요드 연맹', desc: '애쉬 + 세주아니 + 브라움', members: ['Ashe', 'Sejuani', 'Braum'], tiers: [[3, { hp: .20, def: .20, aspd: .10, dr: .05 }]] },
  { kind: 'squad', icon: '🍻', name: '빌지워터 선술집', desc: '미스 포츈 + 그레이브즈 + 트위스티드 페이트', members: ['MissFortune', 'Graves', 'TwistedFate'], tiers: [[3, { gold: .30, crit: .10, parts: .15 }]] },
  { kind: 'squad', icon: '🔧', name: '필트오버 집행단', desc: '케이틀린 + 제이스 + 바이', members: ['Caitlyn', 'Jayce', 'Vi'], tiers: [[3, { atk: .18, skill: .15, def: .10 }]] },
  { kind: 'squad', icon: '🥁', name: '요들 특공대', desc: '룰루 + 티모 + 트리스타나 + 베이가 + 럼블', members: ['Lulu', 'Teemo', 'Tristana', 'Veigar', 'Rumble'], tiers: [[5, { aspd: .20, gauge: .20, skill: .25, atk: .10 }]] },
  { kind: 'squad', icon: '🦑', name: '공허의 군단', desc: '카직스 + 렉사이 + 초가스 + 벨코즈 + 카이사', members: ['Khazix', 'RekSai', 'Chogath', 'Velkoz', 'Kaisa'], tiers: [[5, { atk: .25, skill: .20, ls: .08 }]] },
  { kind: 'squad', icon: '💀', name: '검은 안개의 영혼', desc: '쓰레쉬 + 카서스 + 헤카림 + 모데카이저', members: ['Thresh', 'Karthus', 'Hecarim', 'Mordekaiser'], tiers: [[4, { ls: .10, hp: .15, atk: .12 }]] },
  { kind: 'squad', icon: '🐉', name: '용을 닮은 자들', desc: '쉬바나 + 아우렐리온 솔 + 아트록스 + 우디르', members: ['Shyvana', 'AurelionSol', 'Aatrox', 'Udyr'], tiers: [[4, { atk: .20, skill: .20, hp: .10 }]] },
  { kind: 'squad', icon: '🐆', name: '정글의 사냥꾼', desc: '니달리 + 렝가 + 니코 + 키아나', members: ['Nidalee', 'Rengar', 'Neeko', 'Qiyana'], tiers: [[4, { crit: .15, aspd: .15, atk: .10 }]] },
  { kind: 'squad', icon: '🌌', name: '룬테라의 수호자들', desc: '가렌 + 아리 + 애쉬 + 징크스 + 카이사 + 아지르 + 트위스티드 페이트', members: ['Garen', 'Ahri', 'Ashe', 'Jinx', 'Kaisa', 'Azir', 'TwistedFate'], tiers: [[7, { atk: .20, hp: .20, def: .15, skill: .15 }]] },
  { kind: 'squad', icon: '🧙', name: '대마법사의 연회', desc: '럭스 + 오리아나 + 신드라 + 조이 + 아리 + 르블랑 + 말자하 + 빅토르', members: ['Lux', 'Orianna', 'Syndra', 'Zoe', 'Ahri', 'Leblanc', 'Malzahar', 'Viktor'], tiers: [[8, { skill: .45, gauge: .25, atk: .12 }]] },
  { kind: 'squad', icon: '🏆', name: '전설의 열 명', desc: '10명 모두 전설 등급 편성', members: [], need: 'legend10', tiers: [[10, { atk: .30, hp: .30, def: .20, skill: .20, gold: .20 }]] },
  // --- 단독 (1명) ---
  { kind: 'solo', icon: '🗡️', name: '데마시아의 힘', desc: '가렌 편성', members: ['Garen'], tiers: [[1, { hp: .08, def: .06 }]] },
  { kind: 'solo', icon: '🌪️', name: '방랑 검객', desc: '야스오 편성', members: ['Yasuo'], tiers: [[1, { crit: .08 }]] },
  { kind: 'solo', icon: '🍄', name: '정찰 개시', desc: '티모 편성', members: ['Teemo'], tiers: [[1, { gold: .12 }]] },
  { kind: 'solo', icon: '🪄', name: '무한한 잠재력', desc: '베이가 편성', members: ['Veigar'], tiers: [[1, { skill: .15 }]] },
  { kind: 'solo', icon: '🥋', name: '명상 수련', desc: '마스터 이 편성', members: ['MasterYi'], tiers: [[1, { aspd: .10 }]] },
  { kind: 'solo', icon: '⭐', name: '별의 치유', desc: '소라카 편성', members: ['Soraka'], tiers: [[1, { gauge: .12 }]] },
  { kind: 'solo', icon: '🎴', name: '운명의 카드', desc: '트위스티드 페이트 편성', members: ['TwistedFate'], tiers: [[1, { gold: .15, parts: .10 }]] },
  { kind: 'solo', icon: '🧭', name: '탐험가', desc: '이즈리얼 편성', members: ['Ezreal'], tiers: [[1, { parts: .20 }]] },
  { kind: 'solo', icon: '🤖', name: '증기 기관', desc: '블리츠크랭크 편성', members: ['Blitzcrank'], tiers: [[1, { hp: .08, dr: .03 }]] },
];
// 현재 모르는 ID가 있어도 오류가 나지 않도록 존재하는 챔피언만 남긴다
SYNERGIES.forEach(s => { s.members = s.members.filter(id => CHAMP_BY_ID[id]); });
