const { spawnSync } = require('child_process');
const path = require('path');

const DEFAULT_MENY_PREPROD_URL = 'https://menyweb.trumffrontend.systest.trumf.cloud/';

const ENV_TO_CONFIG_KEY = {
  MENY_PREPROD_URL: 'preprodUrl',
  MENY_TEST_PHONE: 'phone',
  MENY_TEST_PASSWORD: 'password',
  MENY_TEST_OTP_CODE: 'otpCode',
  MENY_TEST_CARD: 'card',
  MENY_TEST_EXPIRY: 'expiry',
  MENY_TEST_CVC: 'cvc',
};

let secureMenyConfigCache = null;

function readSecureMenyConfig() {
  if (secureMenyConfigCache) return secureMenyConfigCache;

  const scriptPath = path.resolve('scripts/secure-rs-credentials.ps1');
  const result = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-Action', 'GetMeny'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      windowsHide: true,
    },
  );

  if (result.status !== 0 || !result.stdout.trim()) {
    secureMenyConfigCache = {};
    return secureMenyConfigCache;
  }

  try {
    secureMenyConfigCache = JSON.parse(result.stdout);
  } catch {
    secureMenyConfigCache = {};
  }
  return secureMenyConfigCache;
}

function getMenyValue(name, fallback = '') {
  const envValue = process.env[name];
  if (envValue && envValue.trim()) {
    return envValue.trim();
  }

  const configKey = ENV_TO_CONFIG_KEY[name];
  const secureValue = configKey ? readSecureMenyConfig()[configKey] : '';
  if (secureValue && String(secureValue).trim()) {
    return String(secureValue).trim();
  }

  return fallback;
}

function getRequiredMenyValue(name) {
  const value = getMenyValue(name);
  if (value) return value;

  throw new Error(
    `Missing required Meny Preprod value: ${name}. Set it directly or save encrypted local credentials with scripts/secure-rs-credentials.ps1 -Action SaveMeny.`,
  );
}

module.exports = {
  DEFAULT_MENY_PREPROD_URL,
  getMenyValue,
  getRequiredMenyValue,
  readSecureMenyConfig,
};
