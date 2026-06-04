const fs = require('fs');
const path = require('path');

const runtimeDir = path.resolve('test-artifacts/runtime');
const currentPath = path.join(runtimeDir, 'manual-action-current.json');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeUnlink(filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // Nothing to clean up.
  }
}

async function waitForManualAction({ testId, title, message, details = [], timeoutMs = 30 * 60 * 1000 }) {
  fs.mkdirSync(runtimeDir, { recursive: true });
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const responseFile = path.join(runtimeDir, `manual-action-${id}-response.json`);
  const request = {
    id,
    status: 'pending',
    testId,
    title,
    message,
    details,
    startedAt: new Date().toISOString(),
    responseFile,
  };

  safeUnlink(responseFile);
  fs.writeFileSync(currentPath, JSON.stringify(request, null, 2), 'utf8');
  console.log(`MANUAL_ACTION_REQUIRED ${JSON.stringify({ id, testId, title, message })}`);

  const deadline = Date.now() + timeoutMs;
  try {
    while (Date.now() < deadline) {
      if (fs.existsSync(responseFile)) {
        const response = JSON.parse(fs.readFileSync(responseFile, 'utf8'));
        if (response.status === 'completed') return response;
        throw new Error(response.note || `${title || testId || 'Manuell handling'} ble markert som feilet i portalen.`);
      }
      await sleep(1000);
    }
    throw new Error(`${title || testId || 'Manuell handling'} ventet for lenge på bekreftelse i portalen.`);
  } finally {
    safeUnlink(currentPath);
    safeUnlink(responseFile);
  }
}

module.exports = { waitForManualAction };
