const fs = require('fs');
const path = require('path');

const runtimeDir = path.resolve('test-artifacts/runtime');
const pausePath = path.join(runtimeDir, 'pause-current.json');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeReadPause() {
  try {
    if (!fs.existsSync(pausePath)) return null;
    return JSON.parse(fs.readFileSync(pausePath, 'utf8'));
  } catch {
    return null;
  }
}

function pauseMatchesRun(pauseState, runId) {
  return pauseState?.status === 'paused' && (!pauseState.runId || !runId || pauseState.runId === runId);
}

function wrapLocator(locator, waitIfPaused) {
  if (!locator || locator.__portalPauseWrapped) return locator;
  const actionMethods = new Set([
    'check',
    'click',
    'dblclick',
    'dispatchEvent',
    'fill',
    'focus',
    'hover',
    'innerText',
    'inputValue',
    'isChecked',
    'isDisabled',
    'isEnabled',
    'isHidden',
    'isVisible',
    'press',
    'screenshot',
    'scrollIntoViewIfNeeded',
    'selectOption',
    'setChecked',
    'tap',
    'textContent',
    'type',
    'uncheck',
    'waitFor',
  ]);
  const chainMethods = new Set([
    'and',
    'filter',
    'first',
    'frameLocator',
    'getByAltText',
    'getByLabel',
    'getByPlaceholder',
    'getByRole',
    'getByTestId',
    'getByText',
    'getByTitle',
    'last',
    'locator',
    'nth',
    'or',
  ]);

  Object.defineProperty(locator, '__portalPauseWrapped', {
    value: true,
    configurable: true,
  });

  for (const methodName of chainMethods) {
    if (typeof locator[methodName] !== 'function') continue;
    const original = locator[methodName].bind(locator);
    Object.defineProperty(locator, methodName, {
      configurable: true,
      value: (...args) => wrapLocator(original(...args), waitIfPaused),
    });
  }

  for (const methodName of actionMethods) {
    if (typeof locator[methodName] !== 'function') continue;
    const original = locator[methodName].bind(locator);
    Object.defineProperty(locator, methodName, {
      configurable: true,
      value: async (...args) => {
        await waitIfPaused();
        const result = await original(...args);
        await waitIfPaused();
        return result;
      },
    });
  }

  return locator;
}

function patchObjectMethods(target, methodNames, waitIfPaused) {
  for (const methodName of methodNames) {
    if (!target || typeof target[methodName] !== 'function' || target[methodName].__portalPausePatched) continue;
    const original = target[methodName].bind(target);
    const patched = async (...args) => {
      await waitIfPaused();
      const result = await original(...args);
      await waitIfPaused();
      return result;
    };
    patched.__portalPausePatched = true;
    target[methodName] = patched;
  }
}

function installPauseControl(page, { runId = '', testId = '' } = {}) {
  let loggedPaused = false;

  const waitIfPaused = async () => {
    while (true) {
      const pauseState = safeReadPause();
      if (!pauseMatchesRun(pauseState, runId)) {
        if (loggedPaused) {
          console.log(`RUN_RESUMED ${JSON.stringify({ runId, testId, at: new Date().toISOString() })}`);
          loggedPaused = false;
        }
        return;
      }

      if (!loggedPaused) {
        console.log(
          `RUN_PAUSED ${JSON.stringify({
            runId,
            testId,
            reason: pauseState.reason || '',
            at: new Date().toISOString(),
          })}`,
        );
        loggedPaused = true;
      }

      await sleep(1000);
    }
  };

  const locatorFactories = ['frameLocator', 'getByAltText', 'getByLabel', 'getByPlaceholder', 'getByRole', 'getByTestId', 'getByText', 'getByTitle', 'locator'];
  for (const methodName of locatorFactories) {
    if (typeof page[methodName] !== 'function' || page[methodName].__portalPausePatched) continue;
    const original = page[methodName].bind(page);
    const patched = (...args) => wrapLocator(original(...args), waitIfPaused);
    patched.__portalPausePatched = true;
    page[methodName] = patched;
  }

  patchObjectMethods(
    page,
    ['addScriptTag', 'addStyleTag', 'bringToFront', 'click', 'dblclick', 'dispatchEvent', 'fill', 'focus', 'goto', 'hover', 'press', 'reload', 'screenshot', 'selectOption', 'tap', 'type', 'uncheck', 'waitForEvent', 'waitForFunction', 'waitForLoadState', 'waitForResponse', 'waitForSelector', 'waitForTimeout', 'waitForURL'],
    waitIfPaused,
  );
  patchObjectMethods(page.keyboard, ['down', 'insertText', 'press', 'type', 'up'], waitIfPaused);
  patchObjectMethods(page.mouse, ['click', 'dblclick', 'down', 'move', 'up', 'wheel'], waitIfPaused);

  return { waitIfPaused };
}

module.exports = {
  installPauseControl,
  pausePath,
};
