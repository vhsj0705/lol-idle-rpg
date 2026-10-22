# 넥슨 오픈API(메이플스토리)의 스타포스·큐브 사용 기록을 모아 게임용 확률표(probability.js)를 만든다.
#
# 사용법 (PowerShell):
#   $env:NEXON_API_KEY = '발급받은 키'
#   powershell -ExecutionPolicy Bypass -File tools\nexon-probability.ps1 -Days 90
#
# - API 키는 환경변수로만 받고 파일에 저장하지 않는다. probability.js에는 집계한 확률 숫자만 들어간다.
# - 기록 API는 키를 발급한 계정의 사용 기록만 돌려주므로, 기록이 많을수록 확률이 정확해진다.
# - -SampleFile: API 대신 저장해 둔 응답(JSON)으로 집계만 해 본다 (테스트용).
param(
  [int]$Days = 90,
  [string]$SampleFile = '',
  [string]$Out = (Join-Path (Split-Path $PSScriptRoot -Parent) 'probability.js')
)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$Base = 'https://open.api.nexon.com/maplestory/v1/history'

function Get-History([string]$kind, [string]$listField) {
  $key = $env:NEXON_API_KEY
  if (-not $key) { throw 'NEXON_API_KEY 환경변수가 없습니다. $env:NEXON_API_KEY = ''키'' 로 먼저 설정하세요.' }
  $all = New-Object System.Collections.ArrayList
  # 기록 API는 날짜별(KST)로 조회한다. 오늘 데이터는 아직 없으므로 어제부터 거슬러 올라간다.
  for ($i = 1; $i -le $Days; $i++) {
    $date = (Get-Date).AddDays(-$i).ToString('yyyy-MM-dd')
    $cursor = $null
    do {
      $url = if ($cursor) { "$Base/${kind}?count=1000&cursor=$cursor" } else { "$Base/${kind}?count=1000&date=$date" }
      try { $res = Invoke-RestMethod -Uri $url -Headers @{ 'x-nxopen-api-key' = $key } -TimeoutSec 30 }
      catch { Write-Warning "$kind $date 조회 실패: $($_.Exception.Message)"; break }
      $rows = $res.$listField
      if ($rows) { [void]$all.AddRange(@($rows)) }
      $cursor = $res.next_cursor
      Start-Sleep -Milliseconds 250   # 호출 제한 여유
    } while ($cursor)
    Write-Host ("{0} {1}: 누적 {2}건" -f $kind, $date, $all.Count)
  }
  return $all
}

if ($SampleFile) {
  $sample = Get-Content $SampleFile -Raw -Encoding UTF8 | ConvertFrom-Json
  $sf = @($sample.starforce_history); $cube = @($sample.cube_history)
} else {
  $sf = Get-History 'starforce' 'starforce_history'
  $cube = Get-History 'cube' 'cube_history'
}

# ----- 스타포스: 강화 전 별 개수별 결과 비율 -----
# 확률이 다른 경우(슈페리얼 장비, 찬스 타임, 파괴 방지)는 제외한다
$star = @{}
foreach ($r in $sf) {
  if ($r.superior_item_flag -eq '슈페리얼 장비' -or $r.superior_item_flag -eq $true) { continue }
  if ($r.chance_time -eq '찬스 타임 적용' -or $r.chance_time -eq $true) { continue }
  if ($r.destroy_defence -eq '파괴 방지 적용' -or $r.destroy_defence -eq $true) { continue }
  $n = [int]$r.before_starforce_count
  if (-not $star.ContainsKey($n)) { $star[$n] = @{ success = 0; keep = 0; drop = 0; destroy = 0 } }
  switch -Wildcard ([string]$r.item_upgrade_result) {
    '성공*'     { $star[$n].success++ }
    '*유지*'    { $star[$n].keep++ }
    '*하락*'    { $star[$n].drop++ }
    '파괴*'     { $star[$n].destroy++ }
  }
}

# ----- 큐브: 잠재능력 등급별 등급 상승 비율 -----
# 결과가 '성공'이면 등급이 올라간 것. 등급은 사용 전 잠재능력 등급 기준
$grades = @('레어', '에픽', '유니크', '레전드리')
$cubeStat = @{}
foreach ($g in $grades) { $cubeStat[$g] = @{ up = 0; total = 0 } }
foreach ($r in $cube) {
  $g = [string]$r.potential_option_grade
  if ($r.before_potential_option_grade) { $g = [string]$r.before_potential_option_grade }
  if (-not $cubeStat.ContainsKey($g)) { continue }
  $cubeStat[$g].total++
  if ([string]$r.item_upgrade_result -like '성공*') { $cubeStat[$g].up++ }
}

# ----- probability.js 쓰기 -----
$sfLines = foreach ($n in ($star.Keys | Sort-Object)) {
  $s = $star[$n]; $t = $s.success + $s.keep + $s.drop + $s.destroy
  if ($t -eq 0) { continue }
  "    $n`: { success: $([math]::Round($s.success / $t, 4)), keep: $([math]::Round($s.keep / $t, 4)), drop: $([math]::Round($s.drop / $t, 4)), destroy: $([math]::Round($s.destroy / $t, 4)), samples: $t },"
}
$cubeLines = foreach ($g in $grades) {
  $c = $cubeStat[$g]; if ($c.total -eq 0) { continue }
  "    '$g': { up: $([math]::Round($c.up / $c.total, 5)), samples: $($c.total) },"
}
$src = if ($SampleFile) { "샘플 파일 $(Split-Path $SampleFile -Leaf)" } else { "넥슨 오픈API 메이플스토리 기록 (최근 $Days일)" }
$js = @"
// 자동 생성 파일: tools/nexon-probability.ps1 이 만든 확률표 (직접 고치지 마세요)
// 출처: $src · 생성: $((Get-Date).ToString('yyyy-MM-dd HH:mm'))
const NEXON_PROB = {
  source: '$src',
  collectedAt: '$((Get-Date).ToString('yyyy-MM-dd'))',
  // 강화 전 별 개수 → 결과 비율 (성공 / 실패-유지 / 실패-하락 / 파괴)
  starforce: {
$($sfLines -join "`n")
  },
  // 잠재능력 등급 → 큐브 사용 시 등급 상승 비율
  cube: {
$($cubeLines -join "`n")
  },
};
"@
[IO.File]::WriteAllText($Out, $js, (New-Object Text.UTF8Encoding $false))
Write-Host "스타포스 $($sf.Count)건 · 큐브 $($cube.Count)건 집계 → $Out"
