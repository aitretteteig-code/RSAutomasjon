const fs = require('fs');
const path = require('path');

const DEFAULT_EVIDENCE_DIR = path.resolve('test-artifacts/evidence');
const MAX_VISIBLE_TEXT = 6000;
const diagnosedTestIds = new Set();

function normalizeTestId(value = '') {
  return String(value || '').trim().toUpperCase() || 'ADHOC';
}

function diagnosisKey(testId, runId = '') {
  return `${normalizeTestId(testId)}:${String(runId || '').trim()}`;
}

function markDiagnosisForTest(testId, runId = '') {
  diagnosedTestIds.add(diagnosisKey(testId, runId));
}

function hasDiagnosisForTest(testId, runId = '') {
  return diagnosedTestIds.has(diagnosisKey(testId, runId));
}

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function redactSensitive(value) {
  return String(value || '')
    .replace(/([?&](?:token|code|password|session|auth|id_token|access_token|refresh_token)=)[^&\s]+/gi, '$1[redacted]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email-redacted]');
}

function relPath(filePath) {
  return path.relative(process.cwd(), filePath).split(path.sep).join('/');
}

function safeJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function filterRelevantFindings(events) {
  return events
    .filter((item) => item.type !== 'console.warning' || /error|failed|exception|timeout|500|unauthor/i.test(item.text))
    .slice(-12);
}

function buildCheckDiagnosis({ testId, checks, checkInfo = {}, browserFindings = [], context = {}, nextAction = '' }) {
  const failedChecks = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => ({
      key,
      title: checkInfo[key]?.title || key,
      reason: checkInfo[key]?.fail || 'Kontrollpunktet feilet.',
    }));

  const passedChecks = Object.entries(checks)
    .filter(([, passed]) => passed)
    .map(([key]) => checkInfo[key]?.title || key);

  return {
    agent: 'Browser Test Agent',
    mode: 'local-checks',
    testId,
    summary: failedChecks.length
      ? `${testId} feilet fordi ${failedChecks.map((item) => item.title.toLowerCase()).join(' og ')} ikke ble verifisert.`
      : 'Alle kontrollpunkter ble verifisert.',
    failedChecks,
    passedChecks,
    context,
    consoleFindings: filterRelevantFindings(browserFindings),
    nextAction,
  };
}

function inferRuleBasedAdvice({ error, pageContext, baseDiagnosis }) {
  const errorText = normalize(error?.message || error || '');
  const visibleText = normalize(pageContext.visibleText || '');
  const failedChecks = Array.isArray(baseDiagnosis.failedChecks) ? baseDiagnosis.failedChecks : [];
  const failedTitles = failedChecks.map((item) => `${item.title || item.key}: ${item.reason || ''}`).join(' | ');

  if (!errorText && failedChecks.length === 0) {
    return {
      classification: 'passed',
      confidence: 1,
      safeAction: 'Ingen tiltak nødvendig.',
      playwrightAdvice: 'Behold testen som PASS og bruk rapporten som dokumentasjon på hva agenten observerte.',
      retry: { allowed: false, reason: 'Testen passerte.' },
    };
  }

  if (/Velg butikk/i.test(visibleText)) {
    return {
      classification: 'store-context',
      confidence: 0.86,
      safeAction: 'Bekreft butikkvalg og kjør steget på nytt.',
      playwrightAdvice: 'Kall ensureStoreSelected(page) rett for steget som feilet.',
      retry: { allowed: true, reason: 'Butikkvalg er en kjent stabiliserbar RS-gate.' },
    };
  }

  if (/password|logg inn|login|username|brukernavn/i.test(visibleText)) {
    return {
      classification: 'login-required',
      confidence: 0.82,
      safeAction: 'Logg inn eller kontroller RS_TEST_USERNAME/RS_TEST_PASSWORD for ny kjøring.',
      playwrightAdvice: 'Kall loginIfNeeded(page) og stopp testen hvis innlogging fortsatt vises.',
      retry: { allowed: false, reason: 'Innlogging krever gyldige credentials eller brukerhandling.' },
    };
  }

  if (/strict mode violation/i.test(errorText)) {
    return {
      classification: 'selector-or-timing',
      confidence: 0.9,
      safeAction: 'Locatoren traff flere synlige elementer. Gjør locatoren mer presis før testen kjøres på nytt.',
      playwrightAdvice: 'Bruk exact: true, en mer spesifikk rolle/tekst, section-scope, eller .first() når flere like elementer er forventet.',
      selectorSuggestions: pageContext.controls.slice(0, 8).map((item) => item.label).filter(Boolean),
      retry: { allowed: true, reason: 'Dette er en reparerbar selector-feil, ikke nødvendigvis et miljøproblem.' },
    };
  }

  if (/Rediger varepris|salesPrice|Prisdialogen/i.test(errorText) && /price\/extended|articlepricewithdiscounts|500|Internal Server Error/i.test(`${errorText} ${JSON.stringify(baseDiagnosis.consoleFindings || [])}`)) {
    return {
      classification: 'environment-or-network',
      confidence: 0.9,
      safeAction: 'Prisdialogen åpnet, men RS Store sitt pris-endepunkt feilet. Ikke lagre prisendring før API-et svarer normalt.',
      playwrightAdvice: 'Ta screenshot av modal/spinner, logg failing price-endpoint, lukk dialogen og prøv en annen konfigurert kandidat eller stopp som BLOCKED.',
      selectorSuggestions: pageContext.controls.slice(0, 8).map((item) => item.label).filter(Boolean),
      retry: { allowed: true, reason: 'Retry eller annen kandidat kan være nyttig, men samme vare bør ikke bare vente lenger når price/extended returnerer 500.' },
    };
  }

  if (/Timeout|toBeVisible|waiting for locator/i.test(errorText)) {
    return {
      classification: 'selector-or-timing',
      confidence: 0.72,
      safeAction: 'Sjekk om teksten/knappen finnes med nytt navn, eller om siden fortsatt laster.',
      playwrightAdvice: 'Bruk rolle/tekst-locator med fallback og vent på et stabilt sideanker for klikk/assert.',
      selectorSuggestions: pageContext.controls.slice(0, 8).map((item) => item.label).filter(Boolean),
      retry: { allowed: true, reason: 'Timeout kan ofte skyldes timing eller endret locator.' },
    };
  }

  if (/500|503|requestfailed|ERR_|net::/i.test(`${errorText} ${JSON.stringify(baseDiagnosis.consoleFindings || [])}`)) {
    return {
      classification: 'environment-or-network',
      confidence: 0.78,
      safeAction: 'Behandle som mulig miljøfeil og se på nettverksfunn før testdata endres.',
      playwrightAdvice: 'Ikke forsøk destruktiv retry. Lagre response/request-funn som evidence.',
      retry: { allowed: false, reason: 'Miljøfeil bør ikke maskeres av automatisk retry.' },
    };
  }

  if (failedChecks.length) {
    return {
      classification: 'business-assertion',
      confidence: 0.7,
      safeAction: `Kontroller feilede kontrollpunkt manuelt: ${failedTitles}`,
      playwrightAdvice: 'Hold testen som FAIL/BLOCKED til forventet forretningsresultat er verifisert.',
      retry: { allowed: false, reason: 'Feilede pass-kriterier skal ikke automatisk repareres.' },
    };
  }

  return {
    classification: 'unknown',
    confidence: 0.45,
    safeAction: 'Se på screenshot, synlig tekst og console/nettverksfunn før selector endres.',
    playwrightAdvice: 'Legg inn mer spesifikk diagnosekontekst rundt steget som feilet.',
    retry: { allowed: false, reason: 'For lite sikkert grunnlag for automatisk retry.' },
  };
}

async function maybeAskModel(payload) {
  const enabled = /^(1|true|yes)$/i.test(process.env.BROWSER_TEST_AGENT_AI || '');
  if (!enabled) return { skippedReason: 'BROWSER_TEST_AGENT_AI er ikke aktivert.' };
  if (!process.env.OPENAI_API_KEY) return { skippedReason: 'OPENAI_API_KEY mangler.' };
  if (!process.env.BROWSER_TEST_AGENT_MODEL) return { skippedReason: 'BROWSER_TEST_AGENT_MODEL mangler.' };

  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      summary: { type: 'string' },
      classification: {
        type: 'string',
        enum: ['passed', 'selector-or-timing', 'login-required', 'store-context', 'environment-or-network', 'business-assertion', 'manual-required', 'unknown'],
      },
      confidence: { type: 'number' },
      safeAction: { type: 'string' },
      playwrightAdvice: { type: 'string' },
      selectorSuggestions: { type: 'array', items: { type: 'string' } },
      nextAction: { type: 'string' },
      retry: {
        type: 'object',
        additionalProperties: false,
        properties: {
          allowed: { type: 'boolean' },
          reason: { type: 'string' },
        },
        required: ['allowed', 'reason'],
      },
    },
    required: ['summary', 'classification', 'confidence', 'safeAction', 'playwrightAdvice', 'selectorSuggestions', 'nextAction', 'retry'],
  };

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.BROWSER_TEST_AGENT_MODEL,
        input: [
          {
            role: 'system',
            content:
              'Du er Browser Test Agent for RetailSuite Playwright-tester. Skriv norsk med æ, ø og å. Diagnose skal være konservativ: foreslå trygge retry kun for login/store/timing/selector, aldri for forretningsasserts eller irreversible handlinger. Svar kun med JSON.',
          },
          {
            role: 'user',
            content: JSON.stringify(payload).slice(0, 24000),
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'browser_test_agent_diagnosis',
            strict: true,
            schema,
          },
        },
      }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { skippedReason: `OpenAI-kall feilet: ${response.status} ${body.error?.message || response.statusText}` };
    }

    const text = body.output_text || body.output?.flatMap((item) => item.content || []).find((item) => item.type === 'output_text')?.text;
    const parsed = safeJson(text, null);
    return parsed ? { diagnosis: parsed } : { skippedReason: 'OpenAI svarte uten gyldig JSON-diagnose.' };
  } catch (error) {
    return { skippedReason: `OpenAI-kall feilet: ${error.message}` };
  }
}

function createBrowserTestAgent({ page, testId, runId, evidenceDir = DEFAULT_EVIDENCE_DIR }) {
  const events = [];
  const push = (event) => {
    events.push({ at: new Date().toISOString(), ...event });
    if (events.length > 100) events.shift();
  };

  page.on('console', (message) => {
    if (!['error', 'warning'].includes(message.type())) return;
    push({
      type: `console.${message.type()}`,
      text: redactSensitive(normalize(message.text()).slice(0, 700)),
      location: message.location(),
    });
  });
  page.on('pageerror', (error) => {
    push({ type: 'pageerror', text: redactSensitive(normalize(error.message).slice(0, 700)) });
  });
  page.on('requestfailed', (request) => {
    push({
      type: 'requestfailed',
      text: redactSensitive(`${request.method()} ${request.url()} - ${request.failure()?.errorText || 'failed'}`.slice(0, 700)),
    });
  });
  page.on('response', (response) => {
    if (response.status() < 500) return;
    push({ type: 'http', text: redactSensitive(`${response.status()} ${response.url()}`.slice(0, 700)) });
  });

  async function collectPageContext(stepSlug = 'context') {
    fs.mkdirSync(evidenceDir, { recursive: true });
    const screenshotPath = path.join(evidenceDir, `${testId}-${runId}-browser-agent-${stepSlug}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});

    const pageContext = await page
      .evaluate((maxVisibleText) => {
        const visible = (element) => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
        };
        const labelFor = (element) =>
          (element.innerText || element.value || element.getAttribute('aria-label') || element.getAttribute('title') || element.getAttribute('placeholder') || '')
            .replace(/\s+/g, ' ')
            .trim();
        const controls = [...document.querySelectorAll('button,a,input,select,textarea')]
          .filter(visible)
          .slice(0, 80)
          .map((element) => ({
            tag: element.tagName.toLowerCase(),
            type: element.getAttribute('type') || '',
            label: labelFor(element).slice(0, 120),
            disabled: Boolean(element.disabled || element.getAttribute('aria-disabled') === 'true'),
          }));
        return {
          title: document.title || '',
          visibleText: (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, maxVisibleText),
          controls,
        };
      }, MAX_VISIBLE_TEXT)
      .catch((error) => ({
        title: '',
        visibleText: '',
        controls: [],
        contextError: error.message,
      }));

    return {
      ...pageContext,
      url: redactSensitive(page.url()),
      screenshot: relPath(screenshotPath),
    };
  }

  async function diagnose({ step, expected = '', error = null, baseDiagnosis = {}, extra = {} }) {
    const stepSlug = normalize(step).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 60) || 'diagnosis';
    const pageContext = await collectPageContext(stepSlug);
    const ruleAdvice = inferRuleBasedAdvice({ error, pageContext, baseDiagnosis });
    const modelResult = await maybeAskModel({
      testId,
      runId,
      step,
      expected,
      error: redactSensitive(error?.message || String(error || '')),
      baseDiagnosis,
      pageContext: {
        url: pageContext.url,
        title: pageContext.title,
        visibleText: pageContext.visibleText,
        controls: pageContext.controls,
      },
      browserFindings: filterRelevantFindings(events),
      extra,
    });
    const modelDiagnosis = modelResult.diagnosis || {};
    const diagnosis = {
      ...baseDiagnosis,
      agent: 'Browser Test Agent',
      agentVersion: 1,
      mode: modelResult.diagnosis ? 'llm-assisted' : 'local-rules',
      modelSkippedReason: modelResult.skippedReason || '',
      testId,
      runId,
      step,
      expected,
      productionId: baseDiagnosis.productionId || baseDiagnosis.context?.productionId || '',
      productionUrl: baseDiagnosis.productionUrl || baseDiagnosis.context?.productionUrl || '',
      extraCheck: baseDiagnosis.extraCheck || baseDiagnosis.context?.extraCheck || '',
      summary: modelDiagnosis.summary || baseDiagnosis.summary || ruleAdvice.safeAction,
      classification: modelDiagnosis.classification || ruleAdvice.classification,
      confidence: modelDiagnosis.confidence ?? ruleAdvice.confidence,
      safeAction: modelDiagnosis.safeAction || ruleAdvice.safeAction,
      playwrightAdvice: modelDiagnosis.playwrightAdvice || ruleAdvice.playwrightAdvice,
      selectorSuggestions: modelDiagnosis.selectorSuggestions || ruleAdvice.selectorSuggestions || [],
      nextAction: modelDiagnosis.nextAction || baseDiagnosis.nextAction || ruleAdvice.safeAction,
      retry: modelDiagnosis.retry || ruleAdvice.retry,
      consoleFindings: filterRelevantFindings([...events, ...(baseDiagnosis.consoleFindings || [])]),
      pageContext: {
        url: pageContext.url,
        title: pageContext.title,
        screenshot: pageContext.screenshot,
        controls: pageContext.controls.slice(0, 20),
      },
    };

    const artifactPath = path.join(evidenceDir, `${testId}-${runId}-browser-agent-diagnosis.json`);
    fs.writeFileSync(
      artifactPath,
      JSON.stringify(
        {
          ...diagnosis,
          pageTextSample: pageContext.visibleText,
          extra,
        },
        null,
        2,
      ),
      'utf8',
    );
    diagnosis.agentEvidence = relPath(artifactPath);
    markDiagnosisForTest(testId, runId);
    console.log(`${testId}-DIAGNOSIS ${JSON.stringify(diagnosis)}`);
    return diagnosis;
  }

  return {
    findings: () => events.slice(-12),
    diagnose,
  };
}

module.exports = {
  buildCheckDiagnosis,
  createBrowserTestAgent,
  hasDiagnosisForTest,
};
