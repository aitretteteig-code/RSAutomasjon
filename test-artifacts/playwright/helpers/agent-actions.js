function normalizeText(value = '') {
  return String(value)
    .replaceAll('Ã¦', 'æ')
    .replaceAll('Ã¸', 'ø')
    .replaceAll('Ã¥', 'å')
    .replaceAll('Ã†', 'Æ')
    .replaceAll('Ã˜', 'Ø')
    .replaceAll('Ã…', 'Å')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9æøå]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function textTokens(value) {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length > 1);
}

function scoreText(candidate, targets) {
  const candidateText = normalizeText(candidate);
  if (!candidateText) return 0;

  let best = 0;
  for (const target of targets) {
    const targetText = normalizeText(target);
    if (!targetText) continue;
    if (candidateText === targetText) best = Math.max(best, 1);
    if (candidateText.includes(targetText) || targetText.includes(candidateText)) best = Math.max(best, 0.88);

    const targetTokens = textTokens(targetText);
    if (!targetTokens.length) continue;
    const candidateTokens = new Set(textTokens(candidateText));
    const overlap = targetTokens.filter((token) => candidateTokens.has(token)).length / targetTokens.length;
    best = Math.max(best, overlap * 0.78);
  }
  return best;
}

function uniqueTexts(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function regexForText(value) {
  const escaped = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped.replace(/\s+/g, '\\s+'), 'i');
}

async function visibleControls(scope) {
  const controls = scope.locator('button, input[type="submit"], input[type="button"], a[role="button"], [role="button"], a');
  const items = await controls
    .evaluateAll((elements) =>
      elements.map((element, index) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        const visible = rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
        const label = (
          element.innerText ||
          element.value ||
          element.getAttribute('aria-label') ||
          element.getAttribute('title') ||
          element.textContent ||
          ''
        )
          .replace(/\s+/g, ' ')
          .trim();
        return {
          index,
          visible,
          disabled: Boolean(element.disabled || element.getAttribute('aria-disabled') === 'true'),
          label,
        };
      }),
    )
    .catch(() => []);
  return { controls, items: items.filter((item) => item.visible && !item.disabled && item.label) };
}

async function clickAgentControl(scope, { label = 'control', names = [], timeout = 15000, minScore = 0.52 } = {}) {
  const targets = uniqueTexts([...names, label]);
  if (!targets.length) {
    throw new Error('Agent-assisted click requires at least one expected text.');
  }

  for (const targetText of targets) {
    const exact = scope.getByRole('button', { name: regexForText(targetText) }).first();
    if (await exact.isVisible({ timeout: 1200 }).catch(() => false)) {
      await exact.click({ timeout });
      console.log(`BROWSER_AGENT_ASSIST ${JSON.stringify({ action: 'click', mode: 'role', label, matched: targetText })}`);
      return { mode: 'role', matched: targetText };
    }
  }

  const { controls, items } = await visibleControls(scope);
  const ranked = items
    .map((item) => ({ ...item, score: scoreText(item.label, targets) }))
    .sort((left, right) => right.score - left.score);
  const best = ranked[0];

  if (!best || best.score < minScore) {
    const visibleLabels = items.map((item) => item.label).slice(0, 12).join(' | ');
    throw new Error(`Agent-assisted click could not find ${label}. Visible controls: ${visibleLabels}`);
  }

  const target = controls.nth(best.index);
  try {
    await target.click({ timeout });
  } catch {
    await target.evaluate((element) => element.click());
  }

  console.log(
    `BROWSER_AGENT_ASSIST ${JSON.stringify({
      action: 'click',
      mode: 'text-score',
      label,
      matched: best.label,
      score: Number(best.score.toFixed(2)),
    })}`,
  );
  return { mode: 'text-score', matched: best.label, score: best.score };
}

async function expectAgentText(scope, { label = 'text', names = [], timeout = 15000, minScore = 0.52 } = {}) {
  const targets = uniqueTexts([...names, label]);
  const deadline = Date.now() + timeout;
  let lastText = '';

  while (Date.now() < deadline) {
    if (typeof scope.innerText === 'function') {
      lastText = await scope.innerText({ timeout: 1500 }).catch(() => '');
    } else {
      lastText = await scope.locator('body').innerText({ timeout: 1500 }).catch(() => '');
    }
    const score = scoreText(lastText, targets);
    if (score >= minScore || targets.some((target) => normalizeText(lastText).includes(normalizeText(target)))) {
      console.log(`BROWSER_AGENT_ASSIST ${JSON.stringify({ action: 'assert-text', label, score: Number(score.toFixed(2)) })}`);
      return true;
    }
    await sleep(500);
  }

  throw new Error(`Agent-assisted text check failed for ${label}. Page text sample: ${lastText.replace(/\s+/g, ' ').slice(0, 700)}`);
}

module.exports = {
  clickAgentControl,
  expectAgentText,
  normalizeText,
  scoreText,
};
