param(
  [string]$Mode = "inspect",
  [string]$SearchTerm = "",
  [int]$X = 0,
  [int]$Y = 0,
  [string]$LoginUsername = $env:RS_TEST_USERNAME,
  [string]$LoginPassword = $env:RS_TEST_PASSWORD
)

$ErrorActionPreference = "Stop"

$Workspace = "C:\Users\antret\OneDrive - NorgesGruppen\Dokumenter\New project 3"
$EvidenceDir = Join-Path $Workspace "test-artifacts\evidence\screenshots"
$ExecutionDir = Join-Path $Workspace "test-artifacts\executions"
$RunId = "HC-002-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$DebugData = $null
$LoginUrl = "https://rsbutikk-blue.test.ngdata.no/RetailSuite/IdentityServer/Account/Login?ReturnUrl=%2FRetailSuite%2FIdentityServer%2Fconnect%2Fauthorize%2Fcallback%3Fclient_id%3Drsstore%26redirect_uri%3Dhttps%253A%252F%252Frsbutikk-blue.test.ngdata.no%252Fretailsuite%252Fstore%252F%2523%252Flogin%252Fsuccess%253F%26response_type%3Did_token%2520token%26scope%3Dopenid%2520rs%26state%3D0c5cd233e78c4bd599908f72fc9aac45%26nonce%3Da6c2e4b87acc43a9965968019b379fb7"

New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null
New-Item -ItemType Directory -Force -Path $ExecutionDir | Out-Null

function Get-PageTarget {
  $targets = (curl.exe -s "http://127.0.0.1:9222/json/list" | ConvertFrom-Json) | Where-Object { $_.type -eq "page" }
  if (-not $targets) {
    throw "No page target found on CDP port 9222."
  }
  return ($targets | Select-Object -First 1)
}

function Connect-Cdp {
  param([string]$WebSocketUrl)

  $ws = [System.Net.WebSockets.ClientWebSocket]::new()
  $ws.ConnectAsync([Uri]$WebSocketUrl, [Threading.CancellationToken]::None).Wait()
  return $ws
}

function Receive-CdpMessage {
  param([System.Net.WebSockets.ClientWebSocket]$Ws)

  $buffer = New-Object byte[] 1048576
  $message = New-Object System.Text.StringBuilder
  do {
    $segment = [ArraySegment[byte]]::new($buffer)
    $result = $Ws.ReceiveAsync($segment, [Threading.CancellationToken]::None).Result
    if ($result.Count -gt 0) {
      [void]$message.Append([Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count))
    }
  } until ($result.EndOfMessage)

  $text = $message.ToString()
  if ([string]::IsNullOrWhiteSpace($text)) {
    return $null
  }
  return ($text | ConvertFrom-Json)
}

$script:CdpId = 0
function Invoke-Cdp {
  param(
    [System.Net.WebSockets.ClientWebSocket]$Ws,
    [string]$Method,
    [hashtable]$Params = @{}
  )

  $script:CdpId += 1
  $id = $script:CdpId
  $payload = @{ id = $id; method = $Method; params = $Params } | ConvertTo-Json -Depth 50 -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($payload)
  $Ws.SendAsync([ArraySegment[byte]]::new($bytes), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).Wait()

  while ($true) {
    $msg = Receive-CdpMessage -Ws $Ws
    if ($null -ne $msg -and $msg.id -eq $id) {
      if ($msg.error) {
        throw ($msg.error | ConvertTo-Json -Depth 10)
      }
      return $msg
    }
  }
}

function Eval-Js {
  param(
    [System.Net.WebSockets.ClientWebSocket]$Ws,
    [string]$Expression
  )

  $response = Invoke-Cdp -Ws $Ws -Method "Runtime.evaluate" -Params @{
    expression = $Expression
    returnByValue = $true
    awaitPromise = $true
  }
  return $response.result.result.value
}

function Save-Screenshot {
  param(
    [System.Net.WebSockets.ClientWebSocket]$Ws,
    [string]$Name
  )

  $response = Invoke-Cdp -Ws $Ws -Method "Page.captureScreenshot" -Params @{
    format = "png"
    captureBeyondViewport = $false
  }
  $path = Join-Path $EvidenceDir "$RunId-$Name.png"
  [IO.File]::WriteAllBytes($path, [Convert]::FromBase64String($response.result.data))
  return $path
}

function Wait-ForIdle {
  param([int]$Seconds = 3)
  Start-Sleep -Seconds $Seconds
}

$target = Get-PageTarget
$ws = Connect-Cdp -WebSocketUrl $target.webSocketDebuggerUrl

try {
  Invoke-Cdp -Ws $ws -Method "Page.enable" | Out-Null
  Invoke-Cdp -Ws $ws -Method "Runtime.enable" | Out-Null
  Invoke-Cdp -Ws $ws -Method "Page.bringToFront" | Out-Null

  if ($Mode -eq "login" -or $Mode -eq "inspect") {
    if ([string]::IsNullOrWhiteSpace($LoginUsername) -or [string]::IsNullOrWhiteSpace($LoginPassword)) {
      throw "Login credentials must be passed as parameters or RS_TEST_USERNAME / RS_TEST_PASSWORD environment variables."
    }
    $loginUsernameJson = $LoginUsername | ConvertTo-Json -Compress
    $loginPasswordJson = $LoginPassword | ConvertTo-Json -Compress
    Invoke-Cdp -Ws $ws -Method "Page.navigate" -Params @{ url = $LoginUrl } | Out-Null
    Wait-ForIdle -Seconds 5
    $loginShot = Save-Screenshot -Ws $ws -Name "01-login-page"

    $loginResult = Eval-Js -Ws $ws -Expression @"
(() => {
  const text = (document.body && document.body.innerText || '').slice(0, 2000);
  const inputs = [...document.querySelectorAll('input')].map((el, i) => ({
    i,
    type: el.type || '',
    name: el.name || '',
    id: el.id || '',
    placeholder: el.placeholder || '',
    value: el.type === 'password' ? '' : (el.value || '')
  }));
  return { url: location.href, title: document.title, text, inputs };
})()
"@

    $didLogin = Eval-Js -Ws $ws -Expression @"
(() => {
  const loginUsername = $loginUsernameJson;
  const loginPassword = $loginPasswordJson;
  const user = document.querySelector('input[name="Username"], input[name="username"], input[type="email"], input[type="text"]');
  const pass = document.querySelector('input[name="Password"], input[name="password"], input[type="password"]');
  if (!user || !pass) return { ok: false, reason: 'Login inputs not found' };
  const setValue = (el, value) => {
    el.focus();
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  setValue(user, loginUsername);
  setValue(pass, loginPassword);
  const button = document.querySelector('#login-btn, button[type="submit"], input[type="submit"]');
  if (!button) return { ok: false, reason: 'Submit button not found' };
  button.click();
  return { ok: true };
})()
"@
    Wait-ForIdle -Seconds 8
    $afterLoginShot = Save-Screenshot -Ws $ws -Name "02-after-login"
  }

  if ($Mode -eq "store") {
    Invoke-Cdp -Ws $ws -Method "Page.navigate" -Params @{ url = "https://rsbutikk-blue.test.ngdata.no/retailsuite/store/" } | Out-Null
    Wait-ForIdle -Seconds 8
    $loginShot = Save-Screenshot -Ws $ws -Name "01-store-direct"
    $afterLoginShot = $loginShot
  }

  if ($Mode -eq "confirm-store") {
    $confirmResult = Eval-Js -Ws $ws -Expression @"
(() => {
  const buttons = [...document.querySelectorAll('button,input[type="submit"]')];
  const btn = buttons.find(el => ((el.innerText || el.value || '').trim() === 'Bekreft'));
  if (!btn) return { ok: false, reason: 'Bekreft button not found' };
  btn.click();
  return { ok: true };
})()
"@
    Wait-ForIdle -Seconds 8
    $loginShot = Save-Screenshot -Ws $ws -Name "01-after-confirm-store"
    $afterLoginShot = $loginShot
  }

  if ($Mode -eq "articles") {
    $articleClick = Eval-Js -Ws $ws -Expression @"
(() => {
  const link = [...document.querySelectorAll('a')].find(a => (a.innerText || '').trim() === 'Varer');
  if (!link) return { ok: false, reason: 'Varer link not found' };
  link.click();
  return { ok: true, href: link.href };
})()
"@
    Wait-ForIdle -Seconds 8
    $loginShot = Save-Screenshot -Ws $ws -Name "01-articles"
    $afterLoginShot = $loginShot
  }

  if ($Mode -eq "search-article") {
    $searchResult = Eval-Js -Ws $ws -Expression @"
(() => {
  const term = '$SearchTerm';
  const input = document.querySelector('#search, input[placeholder*="ID"], input[placeholder*="Navn"], input[type="text"]');
  if (!input) return { ok: false, reason: 'Search input not found' };
  input.focus();
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(input, term);
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: term }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  const buttons = [...document.querySelectorAll('button')];
  const btn = buttons.find(el => (el.innerText || '').trim() === 'Søk');
  if (!btn) return { ok: false, reason: 'Search button not found' };
  btn.click();
  return { ok: true, term };
})()
"@
    Wait-ForIdle -Seconds 12
    $loginShot = Save-Screenshot -Ws $ws -Name "01-search-$SearchTerm"
    $afterLoginShot = $loginShot
  }

  if ($Mode -eq "search-article-keys") {
    Invoke-Cdp -Ws $ws -Method "Input.dispatchMouseEvent" -Params @{ type = "mousePressed"; x = 115; y = 155; button = "left"; clickCount = 1 } | Out-Null
    Invoke-Cdp -Ws $ws -Method "Input.dispatchMouseEvent" -Params @{ type = "mouseReleased"; x = 115; y = 155; button = "left"; clickCount = 1 } | Out-Null
    Start-Sleep -Milliseconds 300
    Invoke-Cdp -Ws $ws -Method "Input.dispatchKeyEvent" -Params @{ type = "keyDown"; key = "a"; code = "KeyA"; windowsVirtualKeyCode = 65; modifiers = 2 } | Out-Null
    Invoke-Cdp -Ws $ws -Method "Input.dispatchKeyEvent" -Params @{ type = "keyUp"; key = "a"; code = "KeyA"; windowsVirtualKeyCode = 65; modifiers = 2 } | Out-Null
    Invoke-Cdp -Ws $ws -Method "Input.dispatchKeyEvent" -Params @{ type = "keyDown"; key = "Backspace"; code = "Backspace"; windowsVirtualKeyCode = 8 } | Out-Null
    Invoke-Cdp -Ws $ws -Method "Input.dispatchKeyEvent" -Params @{ type = "keyUp"; key = "Backspace"; code = "Backspace"; windowsVirtualKeyCode = 8 } | Out-Null
    Invoke-Cdp -Ws $ws -Method "Input.insertText" -Params @{ text = $SearchTerm } | Out-Null
    Start-Sleep -Milliseconds 300
    Invoke-Cdp -Ws $ws -Method "Input.dispatchMouseEvent" -Params @{ type = "mousePressed"; x = 299; y = 155; button = "left"; clickCount = 1 } | Out-Null
    Invoke-Cdp -Ws $ws -Method "Input.dispatchMouseEvent" -Params @{ type = "mouseReleased"; x = 299; y = 155; button = "left"; clickCount = 1 } | Out-Null
    Wait-ForIdle -Seconds 12
    $loginShot = Save-Screenshot -Ws $ws -Name "01-search-keys-$SearchTerm"
    $afterLoginShot = $loginShot
  }

  if ($Mode -eq "wait") {
    Wait-ForIdle -Seconds 12
    $loginShot = Save-Screenshot -Ws $ws -Name "01-wait"
    $afterLoginShot = $loginShot
  }

  if ($Mode -eq "click-result") {
    $clickResult = Eval-Js -Ws $ws -Expression @"
(() => {
  const term = '$SearchTerm'.toUpperCase();
  const rows = [...document.querySelectorAll('.rs-table-row, [class*="row-table"], tr, div')];
  const row = rows.find(el => (el.innerText || '').toUpperCase().includes(term));
  if (!row) return { ok: false, reason: 'Result row not found', term };
  row.scrollIntoView({ block: 'center' });
  row.click();
  return { ok: true, text: (row.innerText || '').slice(0, 200) };
})()
"@
    Wait-ForIdle -Seconds 8
    $loginShot = Save-Screenshot -Ws $ws -Name "01-click-result"
    $afterLoginShot = $loginShot
  }

  if ($Mode -eq "click-coord") {
    Invoke-Cdp -Ws $ws -Method "Input.dispatchMouseEvent" -Params @{ type = "mousePressed"; x = $X; y = $Y; button = "left"; clickCount = 1 } | Out-Null
    Invoke-Cdp -Ws $ws -Method "Input.dispatchMouseEvent" -Params @{ type = "mouseReleased"; x = $X; y = $Y; button = "left"; clickCount = 1 } | Out-Null
    Wait-ForIdle -Seconds 8
    $loginShot = Save-Screenshot -Ws $ws -Name "01-click-$X-$Y"
    $afterLoginShot = $loginShot
  }

  if ($Mode -eq "type-price") {
    Invoke-Cdp -Ws $ws -Method "Input.dispatchMouseEvent" -Params @{ type = "mousePressed"; x = 615; y = 370; button = "left"; clickCount = 1 } | Out-Null
    Invoke-Cdp -Ws $ws -Method "Input.dispatchMouseEvent" -Params @{ type = "mouseReleased"; x = 615; y = 370; button = "left"; clickCount = 1 } | Out-Null
    Start-Sleep -Milliseconds 300
    Invoke-Cdp -Ws $ws -Method "Input.dispatchKeyEvent" -Params @{ type = "keyDown"; key = "a"; code = "KeyA"; windowsVirtualKeyCode = 65; modifiers = 2 } | Out-Null
    Invoke-Cdp -Ws $ws -Method "Input.dispatchKeyEvent" -Params @{ type = "keyUp"; key = "a"; code = "KeyA"; windowsVirtualKeyCode = 65; modifiers = 2 } | Out-Null
    Invoke-Cdp -Ws $ws -Method "Input.dispatchKeyEvent" -Params @{ type = "keyDown"; key = "Backspace"; code = "Backspace"; windowsVirtualKeyCode = 8 } | Out-Null
    Invoke-Cdp -Ws $ws -Method "Input.dispatchKeyEvent" -Params @{ type = "keyUp"; key = "Backspace"; code = "Backspace"; windowsVirtualKeyCode = 8 } | Out-Null
    Invoke-Cdp -Ws $ws -Method "Input.insertText" -Params @{ text = $SearchTerm } | Out-Null
    Start-Sleep -Milliseconds 500
    Invoke-Cdp -Ws $ws -Method "Input.dispatchKeyEvent" -Params @{ type = "keyDown"; key = "Tab"; code = "Tab"; windowsVirtualKeyCode = 9 } | Out-Null
    Invoke-Cdp -Ws $ws -Method "Input.dispatchKeyEvent" -Params @{ type = "keyUp"; key = "Tab"; code = "Tab"; windowsVirtualKeyCode = 9 } | Out-Null
    Wait-ForIdle -Seconds 2
    $loginShot = Save-Screenshot -Ws $ws -Name "01-type-price-$SearchTerm"
    $afterLoginShot = $loginShot
  }

  if ($Mode -eq "open-article-id") {
    Invoke-Cdp -Ws $ws -Method "Page.navigate" -Params @{ url = "https://rsbutikk-blue.test.ngdata.no/retailsuite/store/#/articles/article/listwithdetails?queryId=1778062468504&id=$SearchTerm" } | Out-Null
    Wait-ForIdle -Seconds 8
    $loginShot = Save-Screenshot -Ws $ws -Name "01-article-$SearchTerm"
    $afterLoginShot = $loginShot
  }

  if ($Mode -eq "navigate-url") {
    Invoke-Cdp -Ws $ws -Method "Page.navigate" -Params @{ url = $SearchTerm } | Out-Null
    Wait-ForIdle -Seconds 8
    $loginShot = Save-Screenshot -Ws $ws -Name "01-navigate-url"
    $afterLoginShot = $loginShot
  }

  if ($Mode -eq "edit-recipe") {
    $editResult = Eval-Js -Ws $ws -Expression @"
(() => {
  const buttons = [...document.querySelectorAll('button')].filter(b => (b.innerText || '').trim() === 'Rediger');
  const target = buttons.find(b => {
    const y = b.getBoundingClientRect().y;
    return y > 2300 && y < 2800;
  });
  if (!target) return { ok: false, reason: 'Oppskrift Rediger button not found', count: buttons.length };
  target.scrollIntoView({ block: 'center' });
  target.click();
  return { ok: true };
})()
"@
    Wait-ForIdle -Seconds 8
    $loginShot = Save-Screenshot -Ws $ws -Name "01-edit-recipe"
    $afterLoginShot = $loginShot
  }

  if ($Mode -eq "delete-first-ingredient") {
    $deleteResult = Eval-Js -Ws $ws -Expression @"
(() => {
  const modal = document.querySelector('.modal-content, .modal-dialog') || document;
  const buttons = [...modal.querySelectorAll('button')].map((b, i) => {
    const r = b.getBoundingClientRect();
    return { i, text: (b.innerText || '').trim(), cls: b.className || '', x: r.x, y: r.y, w: r.width, h: r.height, el: b };
  });
  const target = buttons.find(b => b.cls.includes('btn-danger') && b.y > 650 && b.y < 780);
  if (!target) return { ok: false, buttons: buttons.map(({el, ...rest}) => rest) };
  target.el.click();
  return { ok: true, clicked: (({el, ...rest}) => rest)(target) };
})()
"@
    Wait-ForIdle -Seconds 5
    $loginShot = Save-Screenshot -Ws $ws -Name "01-delete-first-ingredient"
    $afterLoginShot = $loginShot
  }

  if ($Mode -eq "debug-modal-buttons") {
    $DebugData = Eval-Js -Ws $ws -Expression @"
(() => {
  return [...document.querySelectorAll('button,input,a')].map((el, i) => {
    const r = el.getBoundingClientRect();
    return {
      i,
      tag: el.tagName,
      type: el.type || '',
      text: (el.innerText || el.value || el.getAttribute('aria-label') || el.title || '').trim(),
      cls: el.className || '',
      disabled: !!el.disabled,
      html: el.outerHTML.slice(0, 300),
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
    };
  }).filter(x => x.rect.w > 0 || x.rect.h > 0 || x.cls.includes('danger') || x.text);
})()
"@
    Wait-ForIdle -Seconds 1
    $loginShot = Save-Screenshot -Ws $ws -Name "01-debug-modal-buttons"
    $afterLoginShot = $loginShot
  }

  if ($Mode -eq "debug-app") {
    $DebugData = Eval-Js -Ws $ws -Expression @"
(() => {
  const resources = performance.getEntriesByType('resource')
    .map(r => r.name)
    .filter(u => /article|price|store|search|query|assort|stock/i.test(u))
    .slice(-80);
  const storage = {};
  for (const store of [localStorage, sessionStorage]) {
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      storage[key] = (store.getItem(key) || '').slice(0, 500);
    }
  }
  const scripts = [...document.scripts].map(s => s.src).filter(Boolean).filter(u => /article|store|app|bundle|main/i.test(u)).slice(-80);
  return { url: location.href, resources, storageKeys: Object.keys(storage), storage, scripts };
})()
"@
    Wait-ForIdle -Seconds 1
    $loginShot = Save-Screenshot -Ws $ws -Name "01-debug-app"
    $afterLoginShot = $loginShot
  }

  if ($Mode -eq "api-search") {
    $termJson = $SearchTerm | ConvertTo-Json -Compress
    $DebugData = Eval-Js -Ws $ws -Expression @"
(async () => {
  const term = $termJson;
  const injector = angular.element(document.body).injector();
  const wrapper = injector.get('rsStoreArticleQueryWrapper');
  const querySvc = injector.get('rsArticleSearchQueryService');
  const payload = { queryString: term, status: querySvc.getDefaultArticleSearchStatuses(), skip: 0, take: 10, order: 'articleId', excludeRestrictedArticles: false };
  try {
    const result = await wrapper.extendedSearch(payload, false).`$promise;
    return { ok: true, payload, hits: result && result.hits, result: (result && result.result || []).slice(0, 10).map(a => ({ articleId: a.articleId, articleName: a.articleName, salesPrice: a.salesPrice, defaultArticleBarcode: a.defaultArticleBarcode })) };
  } catch (e) {
    return { ok: false, payload, status: e && e.status, statusText: e && e.statusText, data: e && e.data };
  }
})()
"@
    Wait-ForIdle -Seconds 1
    $loginShot = Save-Screenshot -Ws $ws -Name "01-api-search-$SearchTerm"
    $afterLoginShot = $loginShot
  }

  if ($Mode -eq "api-search-direct") {
    $termJson = $SearchTerm | ConvertTo-Json -Compress
    $DebugData = Eval-Js -Ws $ws -Expression @"
(async () => {
  const term = $termJson;
  const injector = angular.element(document.body).injector();
  const service = injector.get('rsStoreArticleService');
  const querySvc = injector.get('rsArticleSearchQueryService');
  const payload = { skip: 0, take: 10, orderBy: 'articleName', excludeRestrictedArticles: false, extendedParameters: { queryString: term, status: querySvc.getDefaultArticleSearchStatuses() } };
  try {
    const result = await service.extendedSearch(payload).`$promise;
    return { ok: true, payload, hits: result && result.hits, result: (result && result.result || []).slice(0, 10).map(a => ({ articleId: a.articleId, articleName: a.articleName, salesPrice: a.salesPrice, defaultArticleBarcode: a.defaultArticleBarcode })) };
  } catch (e) {
    return { ok: false, payload, status: e && e.status, statusText: e && e.statusText, data: e && e.data };
  }
})()
"@
    Wait-ForIdle -Seconds 1
    $loginShot = Save-Screenshot -Ws $ws -Name "01-api-search-direct-$SearchTerm"
    $afterLoginShot = $loginShot
  }

  if ($Mode -eq "debug-auth-safe") {
    $DebugData = Eval-Js -Ws $ws -Expression @"
(() => {
  const injector = angular.element(document.body).injector();
  const auth = injector.get('auth');
  const user = auth && auth.user || {};
  return {
    isLoggedIn: auth.isLoggedIn && auth.isLoggedIn(),
    isStoreSelected: auth.isStoreSelected && auth.isStoreSelected(),
    selectedStoreId: user.selectedStoreId,
    selectedStoreName: user.selectedStoreName,
    selectedStoreNo: user.selectedStoreNo,
    username: user.username,
    parameters: user.parameters ? {
      defaultArticleStatusesToSearchFor: user.parameters.defaultArticleStatusesToSearchFor,
      numberOfRowsInStoreArticleSearch: user.parameters.numberOfRowsInStoreArticleSearch,
      thresholdValuePriceField: user.parameters.thresholdValuePriceField
    } : null
  };
})()
"@
    Wait-ForIdle -Seconds 1
    $loginShot = Save-Screenshot -Ws $ws -Name "01-debug-auth-safe"
    $afterLoginShot = $loginShot
  }

  $state = Eval-Js -Ws $ws -Expression @"
(() => {
  const visible = [...document.querySelectorAll('a,button,input,select,[role="button"],[ng-click],[href]')]
    .filter(el => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    })
    .slice(0, 120)
    .map((el, i) => ({
      i,
      tag: el.tagName,
      type: el.type || '',
      text: (el.type === 'password' ? '' : (el.innerText || el.value || el.getAttribute('aria-label') || el.getAttribute('title') || '')).trim().slice(0, 120),
      href: el.href || '',
      id: el.id || '',
      cls: el.className || '',
      rect: (() => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()
    }));
  return {
    url: location.href,
    title: document.title,
    body: (document.body && document.body.innerText || '').slice(0, 4000),
    visible
  };
})()
"@

  $statePath = Join-Path $ExecutionDir "$RunId-state.json"
  $state | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $statePath -Encoding UTF8

  $status = "BLOCKED"
  $actual = "Login/navigation inspection completed, but HC-002 was not executed because recipe selection and safe editable test data were not available from the current test definition."
  if (($state.body -match "Oppskrift|oppskrift|Produksjon|produksjon|Recipe|recipe") -and ($state.body -match "Store|RetailSuite|RS")) {
    $actual = "RS Store appears reachable. Execution is still blocked until a concrete KG recipe and STK recipe are selected for safe editing."
  }

  $executionPath = Join-Path $ExecutionDir "$RunId.md"
  $content = @"
# Execution - HC-002 Redigering av oppskrift RS Store

Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Set: Helsesjekk
Environment: Test
Store/context: Not selected
Executor: Codex testleder via controlled Edge/CDP
Source test definition: ../test-library/helsesjekk/tests/HC-002-kobt-3399-redigering-oppskrift-rs-store.md

## Result

Status: $status

## Steps Performed

1. Opened RS Test login page in one controlled Edge tab.
2. Attempted login with the provided test credentials.
3. Captured current post-login/browser state.
4. Reviewed HC-002 prerequisites before making recipe changes.

## Expected Result

KG and STK recipes should be selected, edited, saved, produced, and declaration update verified.

## Actual Result

$actual

## Evidence

- $loginShot
- $afterLoginShot
- $statePath

## Findings

- HC-002 has test data marked as "Avklares ved execution" for both KG and STK recipe.
- The test changes recipes, so it should not be performed on an arbitrary recipe without an agreed safe test recipe.

## Blockers

- Need one KG recipe and one STK recipe that are safe to edit in Test.
- Need target store/context if the recipe catalog differs by store.

## Jira / External Comment

Not posted.

## Follow-Up

User/testleder should provide safe KG and STK recipe examples, or approve use of known disposable test recipes.
"@
  Set-Content -LiteralPath $executionPath -Value $content -Encoding UTF8

  [pscustomobject]@{
    runId = $RunId
    status = $status
    currentUrl = $state.url
    currentTitle = $state.title
    execution = $executionPath
    state = $statePath
    screenshots = @($loginShot, $afterLoginShot)
    debug = $DebugData
  } | ConvertTo-Json -Depth 10
}
finally {
  if ($ws) {
    $ws.Dispose()
  }
}
