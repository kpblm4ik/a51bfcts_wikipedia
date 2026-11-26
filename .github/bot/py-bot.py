# Боты на Python: selenium, uc (undetected-chromedriver), scrapy, mechanicalsoup. Выбор через env BOT.
# selenium/uc: Chrome, режимы naive/smart/patient. scrapy/mechanicalsoup: качают сырой HTML без JS, форма в нём не должна быть видна.
import os, re, subprocess, sys, time, pathlib

BOT = os.environ.get('BOT', 'selenium')
BASE = (os.environ.get('TARGET') or 'https://kpblm4ik.github.io/a51bfcts_wikipedia/').strip()
if not BASE.endswith('/'):
    BASE += '/'
MODES = [m.strip() for m in (os.environ.get('MODES') or 'naive,smart,patient').split(',') if m.strip()]
PAGES = ['work.html', 'ads.html']
ACT = pathlib.Path(__file__).with_name('act.js').read_text(encoding='utf-8')
ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--host-resolver-rules=MAP github.com 0.0.0.0']
EP_RE = re.compile(r'FORMS_ENDPOINT\s*=\s*("([^"]*)"|null)', re.I)
_CHROME_MAJOR = []


def chrome_major():
    # uc сам качает драйвер последней версии, а на раннере Chrome может быть старше: берём версию установленного браузера
    if _CHROME_MAJOR:
        return _CHROME_MAJOR[0]
    ver = None
    for b in ('google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'):
        try:
            out = subprocess.check_output([b, '--version'], text=True, timeout=15)
            m = re.search(r'(\d+)\.\d+', out)
            if m:
                ver = int(m.group(1))
                print(f'Chrome на раннере: {out.strip()} (драйвер берём под версию {ver})')
                break
        except Exception:
            continue
    _CHROME_MAJOR.append(ver)
    return ver


def make_driver():
    if BOT == 'uc':
        import undetected_chromedriver as uc
        o = uc.ChromeOptions()
        for a in ARGS:
            o.add_argument(a)
        return uc.Chrome(options=o, headless=True, use_subprocess=True, version_main=chrome_major())
    from selenium import webdriver
    o = webdriver.ChromeOptions()
    o.add_argument('--headless=new')
    for a in ARGS:
        o.add_argument(a)
    return webdriver.Chrome(options=o)


def run_one(mode, page):
    try:
        d = make_driver()
    except Exception as e:
        print(f'FAIL {mode.upper()} {page}: браузер не запустился ({str(e).splitlines()[0] if str(e) else e.__class__.__name__})')
        return False
    try:
        d.get(BASE + page)
        found = False
        for _ in range(16):
            n = d.execute_script("return document.querySelectorAll('input:not([type=hidden]),textarea,select').length")
            if n >= 2:
                found = True
                break
            time.sleep(0.5)
        if not found:
            print(f'FAIL {mode.upper()} {page}: форма не найдена')
            return False
        if mode == 'patient':
            time.sleep(4)
        start = d.current_url
        r = d.execute_script(ACT + '\nreturn window.__act(%s);' % ('true' if mode != 'naive' else 'false'))
        time.sleep(1.5)
        sent = []
        try:
            sent += d.execute_script('return window.__sent||[]') or []
        except Exception:
            sent.append('страница ушла (контекст потерян)')
        try:
            if d.current_url != start:
                sent.append('переход ' + d.current_url[:80])
            if len(d.window_handles) > 1:
                sent.append('новое окно')
        except Exception:
            sent.append('окно закрыто')
        was = len(sent) > 0
        ok = was if mode == 'patient' else not was
        extra = (' -> ' + '; '.join(sent)) if was else ''
        print(f"{'OK  ' if ok else 'FAIL'} {mode.upper()} {page}: {'ОТПРАВЛЕНО' if was else 'ЗАБЛОКИРОВАНО'} (полей заполнено: {r['filled']}, пропущено: {r['skipped']}, кнопок: {r['btns']}){extra}")
        return ok
    except Exception as e:
        print(f'FAIL {mode.upper()} {page}: {str(e).splitlines()[0] if str(e) else e.__class__.__name__}')
        return False
    finally:
        try:
            d.quit()
        except Exception:
            pass


def scan(page):
    import urllib.request
    try:
        h = urllib.request.urlopen(BASE + page, timeout=20).read().decode('utf-8', 'replace')
        m = EP_RE.search(h)
        ep = m.group(2) if m and m.group(2) else ''
        print(f'HTTP {page}: ' + (f'endpoint {ep} открыт для прямого POST (нужна проверка на сервере)' if ep else 'endpoint не задан, прямой POST невозможен'))
    except Exception as e:
        print(f'HTTP {page}: ошибка {e}')


def report(page, forms, areas, inputs):
    found = forms > 0 or areas > 0
    print(f"{'FAIL' if found else 'OK  '} {BOT.upper()} {page}: {'ФОРМА ВИДНА В HTML' if found else 'форма в HTML не найдена'} (form: {forms}, textarea: {areas}, input: {inputs})")
    return not found


def http_scrapy():
    import scrapy
    from scrapy.crawler import CrawlerProcess
    res = {}

    class S(scrapy.Spider):
        name = 'a51'
        start_urls = [BASE + p for p in PAGES]
        custom_settings = {'LOG_LEVEL': 'ERROR', 'ROBOTSTXT_OBEY': False}

        def parse(self, response):
            res[response.url.rstrip('/').split('/')[-1]] = (len(response.css('form')), len(response.css('textarea')), len(response.css('input')))

    p = CrawlerProcess()
    p.crawl(S)
    p.start()
    return res


def http_soup():
    import mechanicalsoup
    b = mechanicalsoup.StatefulBrowser()
    res = {}
    for p in PAGES:
        b.open(BASE + p)
        s = b.page
        res[p] = (len(s.find_all('form')), len(s.find_all('textarea')), len(s.find_all('input')))
    return res


if BOT in ('scrapy', 'mechanicalsoup'):
    print(f'Бот: {BOT}\nЦель: {BASE}\nКачает HTML без выполнения JS, всего тестов: {len(PAGES)}')
    res = http_scrapy() if BOT == 'scrapy' else http_soup()
    ok = 0
    for i, p in enumerate(PAGES, 1):
        print(f'[{i}/{len(PAGES)}] {BOT} {p}')
        if p not in res:
            print(f'FAIL {BOT.upper()} {p}: страница не загрузилась')
            continue
        if report(p, *res[p]):
            ok += 1
    for p in PAGES:
        scan(p)
    total = len(PAGES)
else:
    total = len(PAGES) * len(MODES)
    print(f'Бот: {BOT}\nЦель: {BASE}\nРежимы: {", ".join(MODES)}, всего тестов: {total}')
    ok = i = 0
    for p in PAGES:
        for m in MODES:
            i += 1
            print(f'[{i}/{total}] {m} {p}')
            if run_one(m, p):
                ok += 1
    for p in PAGES:
        scan(p)

print(f'ИТОГ: {ok} из {total} тестов прошли')
sys.exit(0 if ok == total else 1)
