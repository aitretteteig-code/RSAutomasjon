import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifactsDir = path.join(root, 'test-artifacts');

const statusRank = {
  FAIL: 0,
  BLOCKED: 1,
  'NOT RUN': 2,
  PASS: 3,
};

const statusAliases = new Map([
  ['PASSED', 'PASS'],
  ['PASS', 'PASS'],
  ['FAILED', 'FAIL'],
  ['FAIL', 'FAIL'],
  ['BLOCKED', 'BLOCKED'],
  ['NOT RUN', 'NOT RUN'],
  ['NOT_RUN', 'NOT RUN'],
  ['TODO', 'NOT RUN'],
]);

const campaignFlowIds = ['HC-008', 'HC-009', 'HC-010', 'HC-011'];

const polishNorwegianText = (value = '') =>
  String(value)
    .replaceAll('Kjoring', 'Kjøring')
    .replaceAll('kjoring', 'kjøring')
    .replaceAll('kjor', 'kjør')
    .replaceAll('miljofeil', 'miljøfeil')
    .replaceAll('Miljofeil', 'Miljøfeil')
    .replaceAll('miljo', 'miljø')
    .replaceAll('Miljo', 'Miljø')
    .replaceAll('Naringsdeklarasjon', 'Næringsdeklarasjon')
    .replaceAll('naringsdeklarasjon', 'næringsdeklarasjon')
    .replaceAll('fullfort', 'fullført')
    .replaceAll('Fullfort', 'Fullført')
    .replaceAll('fullforing', 'fullføring')
    .replaceAll('Fullforing', 'Fullføring')
    .replaceAll('forsok', 'forsøk')
    .replaceAll('Forsok', 'Forsøk')
    .replaceAll(' forste ', ' første ')
    .replaceAll(' Forste ', ' Første ')
    .replaceAll(' se pa ', ' se på ')
    .replaceAll(' Se pa ', ' Se på ')
    .replaceAll(' vent pa ', ' vent på ')
    .replaceAll(' pa nytt', ' på nytt')
    .replaceAll(' bor ', ' bør ')
    .replaceAll(' Bor ', ' Bør ');

const polishData = (value) => {
  if (typeof value === 'string') return polishNorwegianText(value);
  if (Array.isArray(value)) return value.map(polishData);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, polishData(entry)]));
  }
  return value;
};

const exists = async (target) => {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
};

const listFiles = async (dir, predicate = () => true) => {
  if (!(await exists(dir))) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return listFiles(fullPath, predicate);
      return predicate(fullPath) ? [fullPath] : [];
    }),
  );
  return nested.flat().sort((a, b) => a.localeCompare(b));
};

const readText = async (filePath) => fs.readFile(filePath, 'utf8');

const relPath = (filePath) => path.relative(root, filePath).split(path.sep).join('/');
const hrefFor = (filePath) => `/${encodeURI(relPath(filePath))}`;

const firstMatch = (text, regex, fallback = '') => {
  const match = text.match(regex);
  return match?.[1]?.trim() ?? fallback;
};

const normalizeStatus = (value = '') => {
  const cleaned = value.trim().replace(/\s+/g, ' ').toUpperCase();
  if (cleaned.startsWith('PASS')) return 'PASS';
  if (cleaned.startsWith('FAIL')) return 'FAIL';
  if (cleaned.startsWith('BLOCKED')) return 'BLOCKED';
  if (cleaned.startsWith('NOT RUN') || cleaned.startsWith('NOT_RUN')) return 'NOT RUN';
  return statusAliases.get(cleaned) ?? cleaned ?? 'NOT RUN';
};

const extractSection = (text, heading) => {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim().toLowerCase() === `## ${heading}`.toLowerCase());
  if (start === -1) return '';
  const collected = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s+/.test(line)) break;
    collected.push(line);
  }
  return collected.join('\n').trim();
};

const titleFromMarkdown = (text, fallback) => firstMatch(text, /^#\s+(.+)$/m, fallback);

const cleanTitle = (title) => title.replace(/^Execution\s*-\s*/i, '').replace(/^([A-Z]+-\d{3})\s+Execution\s*-\s*/i, '$1 ').trim();

const extractTestId = (value) => {
  const normalized = value.replace(/_/g, '-');
  const match = normalized.match(/\b([A-Z]+)-?(\d{1,3})\b/i);
  if (!match) return '';
  return `${match[1].toUpperCase()}-${match[2].padStart(3, '0')}`;
};

const extractTestIds = (value) => {
  const normalized = value.replace(/_/g, '-');
  const ids = [...normalized.matchAll(/\b([A-Z]+)-?(\d{1,3})\b/gi)].map(
    (match) => `${match[1].toUpperCase()}-${match[2].padStart(3, '0')}`,
  );
  return [...new Set(ids)];
};

const testIdSortValue = (id) => {
  const match = id.match(/^([A-Z]+)-(\d+)$/);
  if (!match) return [99, 9999, id];
  const [, prefix, number] = match;
  const prefixRank = prefix === 'HC' ? 0 : prefix === 'REG' ? 1 : 2;
  return [prefixRank, Number(number), id];
};

const compareTestIds = (a, b) => {
  const left = testIdSortValue(a);
  const right = testIdSortValue(b);
  return left[0] - right[0] || left[1] - right[1] || left[2].localeCompare(right[2]);
};

const extractSourceKey = (text) => firstMatch(text, /Source reference:\s*([A-Z]+-\d+)/i);

const parseDateValue = (raw) => {
  if (!raw) return '';
  const cleaned = raw.trim().replace(/\s+(Europe\/Oslo|UTC|CET|CEST)$/i, '');
  const normalized = cleaned.replace(
    /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})(?::(\d{2}))?$/,
    (_, date, hourMinute, seconds = '00') => `${date}T${hourMinute}:${seconds}`,
  );
  const isoCandidate = normalized.replace(' ', 'T');
  const parsed = new Date(isoCandidate);
  return Number.isNaN(parsed.getTime()) ? raw.trim() : parsed.toISOString();
};

const parseDateFromFilename = (filePath) => {
  const name = path.basename(filePath);
  const match = name.match(/(\d{8})-(\d{6})/);
  if (!match) return '';
  const [, date, time] = match;
  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}.000`;
};

const formatFileDate = async (filePath) => {
  const stat = await fs.stat(filePath);
  return stat.mtime.toISOString();
};

const parseDefinition = async (filePath) => {
  const text = await readText(filePath);
  const id = extractTestId(`${path.basename(filePath)} ${text}`);
  const set = firstMatch(text, /^Set:\s*(.+)$/mi, relPath(filePath).includes('/helsesjekk/') ? 'Helsesjekk' : 'Regresjon');
  const status = normalizeStatus(firstMatch(text, /^Status:\s*(.+)$/mi, 'NOT RUN'));
  const objective = extractSection(text, 'Objective').split(/\r?\n/).find(Boolean) ?? '';
  const blockers = extractSection(text, 'Blockers / Risks')
    .split(/\r?\n/)
    .map((line) => line.replace(/^-\s*/, '').trim())
    .filter(Boolean);
  const steps = extractSection(text, 'Steps')
    .split(/\r?\n/)
    .filter((line) => /^\d+\.\s+/.test(line.trim()));

  return {
    id,
    title: titleFromMarkdown(text, path.basename(filePath, '.md')).replace(`${id} `, ''),
    set,
    sourceKey: extractSourceKey(text),
    area: firstMatch(text, /^Area:\s*(.+)$/mi, 'Uspesifisert'),
    priority: firstMatch(text, /^Priority:\s*(.+)$/mi, 'Normal'),
    status,
    documentationStatus: firstMatch(text, /^Documentation status:\s*(.+)$/mi, ''),
    objective,
    blockers,
    steps: steps.length,
    file: relPath(filePath),
    href: hrefFor(filePath),
    updatedAt: await formatFileDate(filePath),
  };
};

const parseExecution = async (filePath) => {
  const text = await readText(filePath);
  const id = extractTestId(`${path.basename(filePath)} ${text}`);
  const dateLine = firstMatch(text, /^Date:\s*(.+)$/mi);
  const runId = firstMatch(text, /^Run ID:\s*(.+)$/mi);
  const runTime = runId.match(/\b\d{8}-(\d{2})(\d{2})(\d{2})\b/);
  const dateWithTime = /^\d{4}-\d{2}-\d{2}$/.test(dateLine) && runTime ? `${dateLine} ${runTime[1]}:${runTime[2]}:${runTime[3]}` : dateLine;
  const date = parseDateValue(dateWithTime) || parseDateFromFilename(filePath) || (await formatFileDate(filePath));
  const status = normalizeStatus(firstMatch(text, /^Status:\s*(.+)$/mi) || firstMatch(text, /^Result:\s*(.+)$/mi, 'NOT RUN'));
  const failureSummary = extractSection(text, 'Failure').split(/\r?\n/).find(Boolean) ?? '';
  const resultSummary =
    extractSection(text, 'Actual Result').split(/\r?\n/).find(Boolean) ??
    extractSection(text, 'Result Summary').split(/\r?\n/).find(Boolean) ??
    extractSection(text, 'Result').split(/\r?\n/).find(Boolean) ??
    '';
  const summary = (status === 'FAIL' && failureSummary) || resultSummary;
  const log =
    extractSection(text, 'Output') ||
    extractSection(text, 'Failure') ||
    extractSection(text, 'Notes') ||
    extractSection(text, 'Result') ||
    summary;
  const evidence = text
    .split(/\r?\n/)
    .map((line) => firstMatch(line, /^-\s+(.+)$/))
    .filter((line) => line && /test-artifacts[\\/]/i.test(line))
    .map((rawPath) => {
      const cleaned = rawPath.trim().replace(/^`|`$/g, '');
      const pathMatch = cleaned.match(/test-artifacts[\\/][^`\s)]+/i);
      const evidencePath = pathMatch?.[0] ?? cleaned;
      const normalized = evidencePath.replace(root, '').replace(/^[\\/]/, '').split(/[\\/]/).join('/');
      return {
        label: path.basename(normalized),
        file: normalized,
        href: `/${encodeURI(normalized)}`,
      };
    });

  return {
    id,
    title: cleanTitle(titleFromMarkdown(text, path.basename(filePath, '.md'))),
    date,
    set: firstMatch(text, /^Set:\s*(.+)$/mi, ''),
    environment: firstMatch(text, /^Environment:\s*(.+)$/mi, ''),
    store: firstMatch(text, /^Store\/context:\s*(.+)$/mi) || firstMatch(text, /^Store:\s*(.+)$/mi, ''),
    executor: firstMatch(text, /^Executor:\s*(.+)$/mi) || firstMatch(text, /^Runner:\s*(.+)$/mi, ''),
    sourceSpec: firstMatch(text, /^Source spec:\s*(.+)$/mi, ''),
    status,
    summary,
    log,
    evidence,
    file: relPath(filePath),
    href: hrefFor(filePath),
    updatedAt: await formatFileDate(filePath),
  };
};

const parseSimpleFile = async (filePath) => ({
  title: titleFromMarkdown(await readText(filePath), path.basename(filePath, path.extname(filePath))),
  file: relPath(filePath),
  href: hrefFor(filePath),
  updatedAt: await formatFileDate(filePath),
});

const countBy = (items, key) =>
  items.reduce((acc, item) => {
    const value = typeof key === 'function' ? key(item) : item[key];
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});

const daysSince = (dateString) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
};

const specRunPriority = (spec) => {
  const title = spec.title.toLowerCase();
  if (title.includes('inspect') || title.includes('debug')) return 30;
  if (title.includes('continue')) return 20;
  if (title.includes('flow')) return 0;
  return 10;
};

const specRunKind = (filePath) => {
  const title = path.basename(filePath).toLowerCase();
  if (/^hc-001-(article-recall-list|recall-api|recall-filter|rs-store-inspect)\.spec\.js$/i.test(title)) return 'support';
  if (title.includes('inspect') || title.includes('debug')) return 'support';
  if (title.includes('continue')) return 'support';
  return 'full';
};

const specAutomationType = async (filePath, runKind) => {
  if (runKind !== 'full') return 'support';
  const text = await readText(filePath);
  return /waitForManualAction|MANUAL_ACTION_REQUIRED|manualStep|hybrid-flow|mode:\s*['"]hybrid['"]/i.test(text) ? 'hybrid' : 'automatic';
};

const automationLabel = (type) => {
  if (type === 'automatic') return 'Automatisk';
  if (type === 'hybrid') return 'Hybrid';
  return 'Manuell';
};

const main = async () => {
  const definitionFiles = await listFiles(path.join(artifactsDir, 'test-library'), (filePath) => {
    const relative = relPath(filePath);
    return filePath.endsWith('.md') && relative.includes('/tests/') && !filePath.endsWith('README.md');
  });
  const executionFiles = await listFiles(path.join(artifactsDir, 'executions'), (filePath) => filePath.endsWith('.md') && !filePath.endsWith('README.md'));
  const screenshotFiles = await listFiles(path.join(artifactsDir, 'evidence', 'screenshots'), (filePath) => /\.(png|jpg|jpeg|webp)$/i.test(filePath));
  const specFiles = await listFiles(path.join(artifactsDir, 'playwright', 'tests'), (filePath) => filePath.endsWith('.spec.js'));
  const reportFiles = await listFiles(path.join(artifactsDir, 'reports'), (filePath) => filePath.endsWith('.md') && !filePath.endsWith('README.md'));
  const investigationFiles = await listFiles(path.join(artifactsDir, 'investigations'), (filePath) => filePath.endsWith('.md'));

  const definitions = (await Promise.all(definitionFiles.map(parseDefinition))).filter((item) => item.id);
  const executions = (await Promise.all(executionFiles.map(parseExecution))).filter((item) => item.id);
  executions.sort((a, b) => new Date(b.date) - new Date(a.date));

  const specs = (
    await Promise.all(
      specFiles.map(async (filePath) => {
        const ids = extractTestIds(path.basename(filePath));
        const updatedAt = await formatFileDate(filePath);
        const runKind = specRunKind(filePath);
        const automationType = await specAutomationType(filePath, runKind);
        return (ids.length ? ids : ['ADHOC']).map((id) => ({
          id,
          title: path.basename(filePath),
          file: relPath(filePath),
          href: hrefFor(filePath),
          runKind,
          automationType,
          automationLabel: automationLabel(automationType),
          updatedAt,
        }));
      }),
    )
  ).flat();

  const screenshots = await Promise.all(
    screenshotFiles.map(async (filePath) => ({
      id: extractTestId(path.basename(filePath)) || 'ADHOC',
      label: path.basename(filePath),
      file: relPath(filePath),
      href: hrefFor(filePath),
      updatedAt: await formatFileDate(filePath),
    })),
  );

  const reports = await Promise.all(reportFiles.map(parseSimpleFile));
  const investigations = await Promise.all(investigationFiles.map(parseSimpleFile));
  const playwrightReportPath = path.join(artifactsDir, 'evidence', 'playwright-report', 'index.html');

  const executionsByTest = new Map();
  for (const execution of executions) {
    if (!executionsByTest.has(execution.id)) executionsByTest.set(execution.id, []);
    executionsByTest.get(execution.id).push(execution);
  }

  const specsByTest = new Map();
  for (const spec of specs) {
    if (!specsByTest.has(spec.id)) specsByTest.set(spec.id, []);
    specsByTest.get(spec.id).push(spec);
  }

  for (const groupedSpecs of specsByTest.values()) {
    groupedSpecs.sort((a, b) => specRunPriority(a) - specRunPriority(b) || a.title.localeCompare(b.title));
  }

  const screenshotsByTest = new Map();
  for (const screenshot of screenshots) {
    if (!screenshotsByTest.has(screenshot.id)) screenshotsByTest.set(screenshot.id, []);
    screenshotsByTest.get(screenshot.id).push(screenshot);
  }

  const tests = definitions.map((definition) => {
    const testExecutions = executionsByTest.get(definition.id) ?? [];
    const latestExecution = testExecutions[0] ?? null;
    const finalStatus = latestExecution?.status ?? definition.status ?? 'NOT RUN';
    const evidence = screenshotsByTest.get(definition.id) ?? [];
    const latestImageEvidence = latestExecution?.evidence.find((item) => /\.(png|jpg|jpeg|webp)$/i.test(item.file)) ?? null;
    const automationSpecs = specsByTest.get(definition.id) ?? [];
    const fullAutomationSpec = automationSpecs.find((spec) => spec.runKind === 'full') ?? null;
    const automationType = fullAutomationSpec?.automationType ?? 'manual';
    return {
      ...definition,
      status: finalStatus,
      definitionStatus: definition.status,
      latestExecution,
      executionCount: testExecutions.length,
      evidenceCount: evidence.length + testExecutions.reduce((sum, execution) => sum + execution.evidence.length, 0),
      screenshotPreview: evidence[0] ?? null,
      primaryEvidence: latestImageEvidence ?? evidence[0] ?? null,
      automationSpecs,
      fullAutomationSpec,
      automated: automationSpecs.length > 0,
      hasFullAutomation: Boolean(fullAutomationSpec),
      automationType,
      automationLabel: automationLabel(automationType),
      ageDays: latestExecution ? daysSince(latestExecution.date) : null,
    };
  });

  const campaignTests = tests.filter((test) => campaignFlowIds.includes(test.id));
  if (campaignTests.length) {
    const primaryIndex = tests.findIndex((test) => test.id === 'HC-008');
    const primary = campaignTests.find((test) => test.id === 'HC-008') ?? campaignTests[0];
    const groupedExecutions = campaignFlowIds
      .flatMap((id) => executionsByTest.get(id) ?? [])
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    const latestExecution = groupedExecutions[0] ?? primary.latestExecution ?? null;
    const groupedEvidence = campaignFlowIds.flatMap((id) => screenshotsByTest.get(id) ?? []);
    const groupedSpecs = specsByTest.get('HC-008') ?? primary.automationSpecs;
    const fullAutomationSpec = groupedSpecs.find((spec) => spec.runKind === 'full') ?? primary.fullAutomationSpec ?? null;
    const automationType = fullAutomationSpec?.automationType ?? 'manual';
    const groupedTest = {
      ...primary,
      id: 'HC-008',
      title: 'Kampanjeflyt kundeavis og BonusBuy',
      sourceKey: campaignTests.map((test) => test.sourceKey).filter(Boolean).join(' / '),
      objective:
        'Samlet flyt for opprettelse og endring av kundeavis-kampanje og BonusBuy/Mixmatch fra SAP til RS Connector, RS Store og POS.',
      blockers: [...new Set(campaignTests.flatMap((test) => test.blockers ?? []))],
      steps: campaignTests.reduce((sum, test) => sum + (Number(test.steps) || 0), 0),
      coveredIds: campaignFlowIds,
      coveredTitles: campaignTests.map((test) => `${test.id} ${test.title}`),
      status: latestExecution?.status ?? primary.status,
      latestExecution,
      executionCount: groupedExecutions.length,
      evidenceCount:
        groupedEvidence.length + groupedExecutions.reduce((sum, execution) => sum + execution.evidence.length, 0),
      screenshotPreview: groupedEvidence[0] ?? null,
      primaryEvidence:
        latestExecution?.evidence.find((item) => /\.(png|jpg|jpeg|webp)$/i.test(item.file)) ?? groupedEvidence[0] ?? null,
      automationSpecs: groupedSpecs,
      fullAutomationSpec,
      automated: groupedSpecs.length > 0,
      hasFullAutomation: Boolean(fullAutomationSpec),
      automationType,
      automationLabel: automationLabel(automationType),
      ageDays: latestExecution ? daysSince(latestExecution.date) : null,
    };

    const filteredTests = tests.filter((test) => !campaignFlowIds.includes(test.id));
    if (primaryIndex >= 0) {
      filteredTests.push(groupedTest);
    } else {
      filteredTests.unshift(groupedTest);
    }
    tests.length = 0;
    tests.push(...filteredTests);
  }

  tests.sort((a, b) => compareTestIds(a.id, b.id));

  const statusCounts = countBy(tests, 'status');
  const setCounts = countBy(tests, 'set');
  const automatedCount = tests.filter((test) => test.automated).length;
  const latestExecution = executions[0] ?? null;
  const staleTests = tests.filter((test) => test.status !== 'PASS' || test.ageDays === null || test.ageDays > 7);
  const passRate = tests.length ? Math.round(((statusCounts.PASS ?? 0) / tests.length) * 100) : 0;
  const monitorScore = Math.max(0, Math.min(100, passRate - (statusCounts.BLOCKED ?? 0) * 2 - (statusCounts.FAIL ?? 0) * 5));

  const data = {
    generatedAt: new Date().toISOString(),
    sourceRoot: root,
    summary: {
      totalTests: tests.length,
      statusCounts,
      setCounts,
      automatedCount,
      automationRate: tests.length ? Math.round((automatedCount / tests.length) * 100) : 0,
      totalExecutions: executions.length,
      totalEvidence: screenshots.length,
      totalReports: reports.length + investigations.length,
      passRate,
      monitorScore,
      latestExecution,
      staleCount: staleTests.length,
      playwrightReport: (await exists(playwrightReportPath))
        ? {
            label: 'Playwright HTML-rapport',
            file: relPath(playwrightReportPath),
            href: hrefFor(playwrightReportPath),
            updatedAt: await formatFileDate(playwrightReportPath),
          }
        : null,
    },
    tests,
    executions,
    reports,
    investigations,
    specs,
  };

  await fs.mkdir(path.join(root, 'public'), { recursive: true });
  await fs.writeFile(path.join(root, 'public', 'dashboard-data.json'), `${JSON.stringify(polishData(data), null, 2)}\n`);
  console.log(`Dashboard data: ${tests.length} tests, ${executions.length} executions, ${screenshots.length} screenshots.`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
