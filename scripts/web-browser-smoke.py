"""GigBee public website browser smoke. Requires pip install playwright and installed Edge."""
from pathlib import Path
from playwright.sync_api import sync_playwright, Error as BrowserError

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'.qa-artifacts'
OUT.mkdir(exist_ok=True)
EDGE=Path(r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe')
URL='http://127.0.0.1:3104'
PAGES=['/','/jobs','/freelancers','/learn','/services','/about',
       '/how-it-works','/sign-in','/sign-up','/verify','/settings','/dashboard']
failures=[]
checked=0
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=str(EDGE),headless=True,
                              args=['--disable-gpu','--no-sandbox'])
    for mode, viewport in [('desktop',{'width':1360,'height':900}),
                            ('mobile',{'width':390,'height':844})]:
        ctx=browser.new_context(viewport=viewport,device_scale_factor=1,
                                reduced_motion='reduce')
        page=ctx.new_page()
        errors=[]
        page.on('pageerror',lambda exc:errors.append(str(exc)))
        for route in PAGES:
            errors.clear()
            try:
                response=page.goto(URL+route,wait_until='domcontentloaded',timeout=30000)
                page.wait_for_timeout(600)
                main=page.locator('#main-content')
                assert response and response.status==200,(route,'HTTP status')
                assert main.count()==1 and main.is_visible(),(route,'main not visible')
                horizontal=page.evaluate('document.documentElement.scrollWidth-window.innerWidth')
                if horizontal>16: failures.append((mode,route,f'horizontal overflow: {horizontal}px'))
                if errors: failures.append((mode,route,'browser JavaScript: '+errors[0][:180]))
                print('PASS',mode,route,'overflow',horizontal)
                checked+=1
                if mode=='mobile' and route=='/':
                    page.screenshot(path=str(OUT/'home-mobile.png'),full_page=True)
                    menu=page.locator('.mobile-nav summary')
                    if menu.is_visible():
                        menu.click()
                        assert page.locator('.mobile-nav nav a[href="/jobs"]').is_visible()
                if mode=='desktop' and route=='/jobs':
                    page.screenshot(path=str(OUT/'jobs-desktop.png'),full_page=True)
                if mode=='mobile' and route=='/learn':
                    page.screenshot(path=str(OUT/'learn-mobile.png'),full_page=True)
            except Exception as e:
                failures.append((mode,route,str(e)[:230]))
                print('FAIL',mode,route,str(e)[:160])
        ctx.close()
    browser.close()
print('BROWSER_ROUTE_CHECKS',checked,'/',len(PAGES)*2)
print('BROWSER_FAILURES',len(failures))
for entry in failures: print('ISSUE',*entry)
raise SystemExit(1 if failures else 0)
