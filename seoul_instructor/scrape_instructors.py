"""서울시평생학습포털(서울시민대학 공지사항) 강사 구인 공고 수집 -> xlsx -> 막대그래프 -> 이메일 발송.

실행 시점 기준 '지난주 월~금' 에 올라온 게시글 중 강사 모집 공고만 수집한다.

    python scrape_instructors.py                  # 수집 + xlsx + 그래프 + 메일 본문(eml) 생성
    python scrape_instructors.py --send           # 위에 더해 SMTP 로 실제 발송
    python scrape_instructors.py --today 2026-10-22   # 기준일 지정(테스트용)

--send 에 필요한 환경변수: SMTP_HOST, SMTP_PORT(기본 587), SMTP_USER, SMTP_PASS, (선택) MAIL_FROM
"""
import argparse
import datetime as dt
import os
import re
import smtplib
import ssl
import sys
import time
from email.message import EmailMessage

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
import requests
from matplotlib import font_manager
from requests.adapters import HTTPAdapter

BASE = "https://sll.seoul.go.kr"
BOARD_NO = 58
MNID = "202601488292"
LIST_URL = f"/lms/front/boardItem/doListView.do?main_se=ssu&board_no={BOARD_NO}&mnid={MNID}"
AJAX_URL = "/lms/front/boardItem/doListViewAjax.do"
VIEW_URL = f"{BASE}/lms/front/boardItem/doViewBoardItem.do?board_no={BOARD_NO}&boarditem_no=%s&page=1&mnid={MNID}"

RECIPIENT = "jhlee@8around.kr"
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
# 강사 구인 공고 판별: 제목에 '강사' 가 있거나, 본문에 '강사 모집/선발/채용/공모' 류 표현이 있는 글
INSTRUCTOR_TITLE_RE = re.compile(r"강사")
INSTRUCTOR_BODY_RE = re.compile(r"강사\s*(공개\s*)?(모집|선발|채용|공모|위촉)")
FIELD_RE = re.compile(r"모집\s*분야[^\n:：]*[:：]?\s*(?:\([^)]*\))?\s*[-–]?\s*(.+)")


class TLS12Adapter(HTTPAdapter):
    """이 사이트는 TLS 1.3 핸드셰이크를 끊는 경우가 있어 TLS 1.2 로 고정한다."""

    def init_poolmanager(self, *args, **kwargs):
        ctx = ssl.create_default_context()
        ctx.maximum_version = ssl.TLSVersion.TLSv1_2
        kwargs["ssl_context"] = ctx
        super().init_poolmanager(*args, **kwargs)


def make_session():
    s = requests.Session()
    s.mount("https://", TLS12Adapter())
    s.headers["User-Agent"] = "Mozilla/5.0"
    return s


def request(s, method, path, **kw):
    for _ in range(10):  # 간헐적 SSL 끊김 재시도
        try:
            return s.request(method, BASE + path, timeout=30, **kw)
        except requests.exceptions.SSLError:
            time.sleep(1)
    raise RuntimeError(f"요청 실패: {path}")


def last_week_range(today):
    """today 가 속한 주의 직전 주 월~금 (date, date)."""
    this_monday = today - dt.timedelta(days=today.weekday())
    mon = this_monday - dt.timedelta(days=7)
    return mon, mon + dt.timedelta(days=4)


def fetch_rows(s, start, end):
    html = request(s, "GET", LIST_URL).text
    token = re.search(r'name="_csrf" content="([^"]+)"', html).group(1)
    headers = {"X-CSRF-TOKEN": token, "X-Requested-With": "XMLHttpRequest", "Referer": BASE + LIST_URL}
    rows, page = [], 1
    while True:
        data = {"page": page, "board_no": BOARD_NO, "mnid": MNID, "q_where_type": "", "q_key": "", "_csrf": token}
        res = request(s, "POST", AJAX_URL, data=data, headers=headers).json()
        batch = res["rows"]
        if not batch:
            break
        normal = [r for r in batch if r["fixed_yn"] != "Y"]  # 상단 고정 공지는 날짜순이 아님
        for r in normal:
            d = dt.datetime.strptime(r["insert_dt"], "%Y.%m.%d").date()
            if start <= d <= end:
                rows.append(r)
        # 일반글은 최신순이므로 기간 시작일보다 오래된 글이 나오면 중단
        if normal and dt.datetime.strptime(normal[-1]["insert_dt"], "%Y.%m.%d").date() < start:
            break
        if page >= int(res["total"]):
            break
        page += 1
    return rows


def html_to_text(html):
    html = re.sub(r"<br\s*/?>|</p>|</div>|</li>", "\n", html, flags=re.I)
    text = re.sub(r"<[^>]+>", "", html)
    text = (text.replace("&nbsp;", " ").replace("&amp;", "&").replace("&gt;", ">")
            .replace("&lt;", "<").replace("&quot;", '"'))
    return re.sub(r"[ \t ]+", " ", text)


def is_instructor_post(title, text):
    return bool(INSTRUCTOR_TITLE_RE.search(title) or INSTRUCTOR_BODY_RE.search(text))


def parse_deadline(text, posted):
    """'~ 11. 2.(월) 18:00까지', '10. 19.(월)~11. 2.(월)' 같은 표기에서 마감일(마지막 날짜)을 찾는다."""
    date_pat = re.compile(r"(?:(\d{4})\s*[.년]\s*)?(\d{1,2})\s*[.월]\s*(\d{1,2})\s*[.일]?")
    for line in text.split("\n"):
        if not re.search(r"접수|마감|기한|신청|모집기간|지원", line):
            continue
        if not re.search(r"까지|~|마감|-", line):
            continue
        found = date_pat.findall(line)
        if not found:
            continue
        y, m, d = found[-1]
        year = int(y) if y else posted.year
        try:
            res = dt.date(year, int(m), int(d))
        except ValueError:
            continue
        if not y and res < posted:  # 연도 생략 시 연말-연초 넘어가는 경우
            res = res.replace(year=year + 1)
        return res.isoformat() + (" " + t.group(0) if (t := re.search(r"\d{1,2}:\d{2}", line)) else "")
    return ""


def parse_fields(text):
    """모집분야 항목을 쉼표/가운뎃점 등으로 분리해 리스트로 반환. 없으면 ['미분류']."""
    for line in text.split("\n"):
        if "모집" in line and "분야" in line:
            idx = text.find(line)
            tail = line.split(":", 1)[-1] if ":" in line else ""
            chunk = tail.strip() or text[idx + len(line):].strip().split("\n")[0]
            chunk = re.sub(r"\([^)]*\)", "", chunk).lstrip("-– ").strip()
            parts = [p.strip() for p in re.split(r"[,，、·/]", chunk) if p.strip()]
            if parts:
                return parts
    return ["미분류"]


def parse_headcount(text):
    m = re.search(r"(?:모집|선발)\s*인원[^\n\d]*(\d+)\s*명", text) or re.search(r"(\d+)\s*명\s*(?:내외|이내)?\s*(?:모집|선발)", text)
    return int(m.group(1)) if m else None


def build_dataframe(rows):
    recs = []
    for r in rows:
        title = r["boarditem_title"].strip()
        text = html_to_text(r.get("boarditem_content", ""))
        if not is_instructor_post(title, text):
            continue
        posted = dt.datetime.strptime(r["insert_dt"], "%Y.%m.%d").date()
        emails = sorted(set(EMAIL_RE.findall(text)))
        recs.append({
            "게시글 타이틀": title,
            "게시일": posted.isoformat(),
            "담당자 이메일": ", ".join(emails),
            "마감일": parse_deadline(text, posted),
            "공고 게시글 상세 링크": VIEW_URL % r["boarditem_no"],
            "모집분야": ", ".join(parse_fields(text)),
            "모집인원(명)": parse_headcount(text),
            "첨부파일 수": r.get("file_yn", ""),
        })
    return pd.DataFrame(recs)


def save_xlsx(df, path):
    with pd.ExcelWriter(path, engine="openpyxl") as w:
        df.to_excel(w, index=False, sheet_name="강사모집공고")
        ws = w.sheets["강사모집공고"]
        widths = {"A": 60, "B": 12, "C": 32, "D": 18, "E": 90, "F": 40, "G": 14, "H": 12}
        for col, wd in widths.items():
            ws.column_dimensions[col].width = wd
        for row in ws.iter_rows(min_row=2, min_col=5, max_col=5):
            for c in row:
                c.hyperlink = c.value


def setup_korean_font():
    for name in ["Malgun Gothic", "NanumGothic", "AppleGothic", "Noto Sans CJK KR", "WenQuanYi Zen Hei"]:
        if any(f.name == name for f in font_manager.fontManager.ttflist):
            plt.rcParams["font.family"] = name
            break
    plt.rcParams["axes.unicode_minus"] = False


def save_chart(df, path, start, end):
    setup_korean_font()
    counts = {}
    for _, r in df.iterrows():
        fields = [f.strip() for f in r["모집분야"].split(",")]
        n = r["모집인원(명)"]
        for f in fields:
            counts[f] = counts.get(f, 0) + (int(n) if pd.notna(n) else 1)
    fig, ax = plt.subplots(figsize=(8, 4.5))
    if counts:
        s = pd.Series(counts).sort_values(ascending=False)
        bars = ax.bar(s.index, s.values, color="#4C78A8")
        ax.bar_label(bars)
        ax.set_ylabel("구인 건수 (모집인원 명시 시 명수)")
        ax.yaxis.get_major_locator().set_params(integer=True)
    else:
        ax.text(0.5, 0.5, "해당 기간 강사 모집 공고 없음", ha="center", va="center", transform=ax.transAxes)
        ax.set_axis_off()
    ax.set_title(f"분야별 강사 구인 현황 ({start:%m.%d}~{end:%m.%d})")
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)


def build_mail(count, start, end, xlsx_path, png_path):
    msg = EmailMessage()
    msg["To"] = RECIPIENT
    msg["From"] = os.environ.get("MAIL_FROM") or os.environ.get("SMTP_USER", "sender@example.com")
    msg["Subject"] = f"[서울시 강사 구인] {start:%m/%d}~{end:%m/%d} 공고 {count}건 수집 결과"
    body = (
        "안녕하세요.\n\n"
        f"서울시평생학습포털 지난주({start:%Y-%m-%d} ~ {end:%Y-%m-%d}, 월~금)에 올라온 "
        f"강사 구인 공고를 수집했습니다.\n\n"
        f"- 수집된 공고 수: {count}건\n"
        "- 분야별 구인 현황은 첨부된 막대그래프(본문 이미지)를, 상세 목록은 첨부 엑셀 파일을 확인해 주세요.\n\n"
        "감사합니다.\n"
    )
    msg.set_content(body)
    html = "<p>" + body.replace("\n\n", "</p><p>").replace("\n", "<br>") + '</p><img src="cid:chart">'
    msg.add_alternative(html, subtype="html")
    with open(png_path, "rb") as f:
        msg.get_payload()[1].add_related(f.read(), "image", "png", cid="<chart>")
    with open(xlsx_path, "rb") as f:
        msg.add_attachment(f.read(), maintype="application",
                           subtype="vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                           filename=os.path.basename(xlsx_path))
    return msg


def send_mail(msg):
    host, user, pw = os.environ.get("SMTP_HOST"), os.environ.get("SMTP_USER"), os.environ.get("SMTP_PASS")
    if not (host and user and pw):
        sys.exit("SMTP_HOST / SMTP_USER / SMTP_PASS 환경변수가 필요합니다.")
    with smtplib.SMTP(host, int(os.environ.get("SMTP_PORT", "587"))) as smtp:
        smtp.starttls()
        smtp.login(user, pw)
        smtp.send_message(msg)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--today", help="기준일 YYYY-MM-DD (기본: 오늘)")
    ap.add_argument("--send", action="store_true", help="SMTP 로 이메일 발송")
    args = ap.parse_args()

    today = dt.date.fromisoformat(args.today) if args.today else dt.date.today()
    start, end = last_week_range(today)
    os.makedirs(OUT_DIR, exist_ok=True)
    tag = f"{start:%Y%m%d}_{end:%Y%m%d}"
    xlsx_path = os.path.join(OUT_DIR, f"seoul_instructor_posts_{tag}.xlsx")
    png_path = os.path.join(OUT_DIR, f"seoul_instructor_chart_{tag}.png")
    eml_path = os.path.join(OUT_DIR, f"mail_{tag}.eml")

    s = make_session()
    rows = fetch_rows(s, start, end)
    df = build_dataframe(rows)
    print(f"기간 {start}~{end}: 전체 게시글 {len(rows)}건 중 강사 구인 공고 {len(df)}건")

    save_xlsx(df, xlsx_path)
    save_chart(df, png_path, start, end)
    msg = build_mail(len(df), start, end, xlsx_path, png_path)
    with open(eml_path, "wb") as f:
        f.write(bytes(msg))
    print("저장:", xlsx_path, png_path, eml_path, sep="\n  ")
    if args.send:
        send_mail(msg)
        print("발송 완료:", RECIPIENT)


if __name__ == "__main__":
    main()
