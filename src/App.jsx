import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileText,
  Gauge,
  Palette,
  Pause,
  Play,
  RotateCw,
  Search,
  ShieldCheck,
  Sparkles,
  Square,
  TimerReset,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const statusMeta = {
  PASS: { label: 'Pass', icon: CheckCircle2, tone: 'pass' },
  FAIL: { label: 'Fail', icon: XCircle, tone: 'fail' },
  BLOCKED: { label: 'Blocked', icon: AlertTriangle, tone: 'blocked' },
  'NOT RUN': { label: 'Ikke kjørt', icon: TimerReset, tone: 'idle' },
};

const themes = [
  { id: 'light', label: 'Klar' },
  { id: 'fjord', label: 'Fjord' },
  { id: 'forest', label: 'Skog' },
  { id: 'night', label: 'Natt' },
];

const dateFormatter = new Intl.DateTimeFormat('nb-NO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const shortDateFormatter = new Intl.DateTimeFormat('nb-NO', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

function formatDate(value, compact = false) {
  if (!value) return 'Ukjent';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return compact ? shortDateFormatter.format(date) : dateFormatter.format(date);
}

function formatRunLabel(value) {
  return value?.replace(/^Full\s+helsesjekk$/i, 'Helsesjekk').replace(/^Full\s+regresjonstest$/i, 'Regresjonstest') ?? '';
}

function StatusPill({ status }) {
  const meta = statusMeta[status] ?? statusMeta['NOT RUN'];
  const Icon = meta.icon;
  return (
    <span className={`status-pill ${meta.tone}`}>
      <Icon size={14} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function Metric({ icon: Icon, label, value, accent, detail }) {
  return (
    <section className="metric">
      <div className={`metric-icon ${accent}`}>
        <Icon size={18} aria-hidden="true" />
      </div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {detail ? <span>{detail}</span> : null}
      </div>
    </section>
  );
}

function LinkButton({ href, children, icon: Icon = ExternalLink }) {
  if (!href) return null;
  return (
    <a className="link-button" href={href} target="_blank" rel="noreferrer">
      <Icon size={15} aria-hidden="true" />
      {children}
    </a>
  );
}

function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState(() => window.localStorage.getItem('rs-testportal-theme') || 'light');
  const [activeDashboard, setActiveDashboard] = useState('run');
  const [query, setQuery] = useState('');
  const [executionQuery, setExecutionQuery] = useState('');
  const [setFilter, setSetFilter] = useState('Alle');
  const [selectedId, setSelectedId] = useState('');
  const [selectedExecutionFile, setSelectedExecutionFile] = useState('');
  const [selectedReportRuns, setSelectedReportRuns] = useState([]);
  const [reportState, setReportState] = useState({ status: 'idle', message: '', pdf: '', html: '' });
  const [runState, setRunState] = useState({ active: false, status: 'idle', output: '' });
  const [runError, setRunError] = useState('');
  const [manualAction, setManualAction] = useState({ pending: false });
  const [manualActionError, setManualActionError] = useState('');
  const [manualActionNote, setManualActionNote] = useState('');
  const [headedRun, setHeadedRun] = useState(false);
  const manualActionIdRef = useRef('');

  const loadData = useCallback(() => {
    fetch('/dashboard-data.json', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`Kunne ikke lese dashboard-data (${response.status})`);
        return response.json();
      })
      .then((payload) => {
        setData(payload);
        setSelectedId((current) => (current && payload.tests?.some((test) => test.id === current) ? current : payload.tests?.[0]?.id ?? ''));
        setSelectedExecutionFile((current) =>
          current && payload.executions?.some((execution) => execution.file === current) ? current : payload.executions?.[0]?.file ?? '',
        );
        setSelectedReportRuns((current) => {
          const available = new Set(payload.executions?.map((execution) => execution.file) ?? []);
          const retained = current.filter((file) => available.has(file));
          return retained.length ? retained : payload.executions?.slice(0, 20).map((execution) => execution.file) ?? [];
        });
      })
      .catch((fetchError) => setError(fetchError.message));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('rs-testportal-theme', theme);
  }, [theme]);

  useEffect(() => {
    const pollRun = () => {
      fetch('/api/test-run', { cache: 'no-store' })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload) => {
          if (payload) setRunState(payload);
        })
        .catch(() => {});
    };

    pollRun();
    const interval = window.setInterval(pollRun, 2500);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const pollManualAction = () => {
      fetch('/api/manual-action', { cache: 'no-store' })
        .then((response) => (response.ok ? response.json() : { pending: false }))
        .then((payload) => {
          const nextManualAction = payload?.pending ? payload : { pending: false };
          if (nextManualAction.pending && manualActionIdRef.current !== nextManualAction.id) {
            manualActionIdRef.current = nextManualAction.id;
            setManualActionNote('');
          }
          if (!nextManualAction.pending && manualActionIdRef.current) {
            manualActionIdRef.current = '';
            setManualActionNote('');
          }
          setManualAction(nextManualAction);
          if (payload?.pending) {
            setManualActionError('');
            setActiveDashboard('run');
          }
        })
        .catch(() => {});
    };

    pollManualAction();
    const interval = window.setInterval(pollManualAction, 1500);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (['passed', 'failed', 'error', 'stopped'].includes(runState.status)) {
      const timeout = window.setTimeout(loadData, 1000);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [loadData, runState.status, runState.completedAt]);

  const filteredTests = useMemo(() => {
    if (!data) return [];
    const needle = query.trim().toLowerCase();
    return data.tests.filter((test) => {
      const matchesQuery =
        !needle ||
        [test.id, test.title, test.area, test.sourceKey, test.objective, ...(test.coveredIds ?? [])]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(needle));
      const matchesSet = setFilter === 'Alle' || test.set === setFilter;
      return matchesQuery && matchesSet;
    });
  }, [data, query, setFilter]);

  const filteredExecutions = useMemo(() => {
    if (!data) return [];
    const needle = executionQuery.trim().toLowerCase();
    return data.executions.filter((execution) => {
      if (!needle) return true;
      return [execution.id, execution.title, execution.status, execution.summary, execution.file, execution.sourceSpec]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(needle));
    });
  }, [data, executionQuery]);

  const selectedTest = useMemo(() => {
    if (!data) return null;
    return data.tests.find((test) => test.id === selectedId) ?? filteredTests[0] ?? data.tests[0] ?? null;
  }, [data, filteredTests, selectedId]);

  const selectedExecution = useMemo(() => {
    if (!data) return null;
    return data.executions.find((execution) => execution.file === selectedExecutionFile) ?? filteredExecutions[0] ?? data.executions[0] ?? null;
  }, [data, filteredExecutions, selectedExecutionFile]);

  if (error) {
    return (
      <main className="shell center-state">
        <AlertTriangle size={28} aria-hidden="true" />
        <h1>Dashboardet stoppet</h1>
        <p>{error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="shell center-state">
        <Activity size={28} aria-hidden="true" />
        <h1>Laster testmonitor</h1>
      </main>
    );
  }

  const summary = data.summary;
  const statusCounts = summary.statusCounts ?? {};
  const setNames = ['Alle', ...Object.keys(summary.setCounts ?? {})];
  const latestExecution = summary.latestExecution;
  const monitorTone = summary.monitorScore >= 80 ? 'pass' : summary.monitorScore >= 55 ? 'blocked' : 'fail';
  const selectedSpec = selectedTest?.fullAutomationSpec ?? null;
  const runControlStatus = runState.active ? (runState.status === 'stopping' ? 'Stopper' : runState.status === 'paused' ? 'Pauset' : 'Kjører') : 'Klar';
  const suiteSpecs = (() => {
    const specsBySet = (setName) => [
      ...new Set(
        data.tests
          .filter((test) => test.set === setName && test.fullAutomationSpec?.file)
          .map((test) => test.fullAutomationSpec.file),
      ),
    ];
    return {
      health: specsBySet('Helsesjekk'),
      regression: specsBySet('Regresjon'),
    };
  })();
  const supportSpecCount = selectedTest?.automationSpecs?.filter((spec) => spec.runKind !== 'full').length ?? 0;
  const canRunSelected = Boolean(selectedSpec);
  const activeRunSpecs = runState.specFiles ?? (runState.specFile ? [runState.specFile] : []);
  const activeRunLabel = formatRunLabel(runState.label) || (activeRunSpecs.length > 1 ? `${activeRunSpecs.length} tester` : runState.specFile);
  const activeWorkerCount = Number(runState.workerCount || 1);
  const runIsForSelectedSpec = selectedSpec ? activeRunSpecs.includes(selectedSpec.file) : false;
  const selectedReportRunSet = new Set(selectedReportRuns);

  const fetchRunState = async () => {
    const response = await fetch('/api/test-run', { cache: 'no-store' });
    if (!response.ok) throw new Error('Kunne ikke lese status fra test-runneren.');
    const payload = await response.json();
    setRunState(payload);
    return payload;
  };

  const requestStopRun = async () => {
    const response = await fetch('/api/test-run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop' }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message ?? 'Kunne ikke stoppe testen.');
    setRunState(payload);
    return payload;
  };

  const requestPauseRun = async () => {
    const response = await fetch('/api/test-run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pause' }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message ?? 'Kunne ikke pause testen.');
    setRunState(payload);
    return payload;
  };

  const requestResumeRun = async () => {
    const response = await fetch('/api/test-run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resume' }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message ?? 'Kunne ikke fortsette testen.');
    setRunState(payload);
    return payload;
  };

  const waitForRunnerIdle = async () => {
    for (let attempt = 0; attempt < 45; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 1000));
      const payload = await fetchRunState();
      if (!payload.active) return payload;
    }
    throw new Error('Runneren bruker lang tid på å stoppe. Prøv igjen når aktiv kjøring er avsluttet.');
  };

  const startRun = async ({ specFiles, label, replaceActive = false } = {}) => {
    const files = specFiles?.length ? specFiles : selectedSpec ? [selectedSpec.file] : [];
    if (!files.length || (runState.active && !replaceActive)) return;
    setRunError('');
    try {
      if (runState.active) {
        await requestStopRun();
        await waitForRunnerIdle();
      }

      const response = await fetch('/api/test-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specFiles: files, label, headed: headedRun }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setRunError(payload.message ?? 'Kunne ikke starte testen.');
        return;
      }
      setRunState(payload);
    } catch (startError) {
      setRunError(startError.message || 'Kunne ikke nå test-runneren.');
    }
  };

  const stopRun = async () => {
    setRunError('');
    try {
      await requestStopRun();
    } catch (stopError) {
      setRunError(stopError.message || 'Kunne ikke stoppe testen.');
    }
  };

  const togglePauseRun = async () => {
    setRunError('');
    try {
      if (runState.status === 'paused' || runState.paused) {
        await requestResumeRun();
      } else {
        await requestPauseRun();
      }
    } catch (pauseError) {
      setRunError(pauseError.message || 'Kunne ikke endre pause-status.');
    }
  };

  const resolveManualAction = async (status) => {
    setManualActionError('');
    try {
      const response = await fetch('/api/manual-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note: manualActionNote }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setManualActionError(payload.message ?? 'Kunne ikke sende manuell status.');
        return;
      }
      setManualAction({ pending: false });
      setManualActionNote('');
    } catch (manualError) {
      setManualActionError(manualError.message || 'Kunne ikke nå portalen.');
    }
  };

  const toggleReportRun = (file) => {
    setSelectedReportRuns((current) => (current.includes(file) ? current.filter((item) => item !== file) : [...current, file]));
  };

  const selectVisibleReportRuns = () => {
    setSelectedReportRuns(filteredExecutions.map((execution) => execution.file));
  };

  const selectLatestReportRuns = () => {
    setSelectedReportRuns(data.executions.slice(0, 20).map((execution) => execution.file));
  };

  const generateSelectedReport = async () => {
    if (!selectedReportRuns.length) return;
    setReportState({ status: 'running', message: 'Genererer rapport...', pdf: '', html: '' });
    try {
      const response = await fetch('/api/test-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ executionFiles: selectedReportRuns }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setReportState({ status: 'error', message: payload.message ?? 'Kunne ikke generere rapport.', pdf: '', html: '' });
        return;
      }
      const stamp = Date.now();
      const pdf = `${payload.pdf}?t=${stamp}`;
      const html = `${payload.html}?t=${stamp}`;
      setReportState({ status: 'generated', message: `${payload.selectedRuns} test runs ble inkludert.`, pdf, html });
      window.open(pdf, '_blank', 'noopener,noreferrer');
    } catch (reportError) {
      setReportState({ status: 'error', message: reportError.message || 'Kunne ikke nå rapportgeneratoren.', pdf: '', html: '' });
    }
  };

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">
            <ShieldCheck size={16} aria-hidden="true" />
            RetailSuite
          </span>
          <h1>Testportal</h1>
        </div>
        <div className="topbar-actions">
          <label className="theme-picker" aria-label="Tema">
            <span>
              <Palette size={15} aria-hidden="true" />
              Tema
            </span>
            <select className="theme-select" value={theme} onChange={(event) => setTheme(event.target.value)}>
              {themes.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="dashboard-switch" aria-label="Dashboard">
        <button className={activeDashboard === 'run' ? 'active' : ''} type="button" onClick={() => setActiveDashboard('run')}>
          <Play size={16} aria-hidden="true" />
          Kjørekontroll
        </button>
        <button className={activeDashboard === 'results' ? 'active' : ''} type="button" onClick={() => setActiveDashboard('results')}>
          <BarChart3 size={16} aria-hidden="true" />
          Resultater
        </button>
      </div>

      {activeDashboard === 'run' ? (
        <>
          <section className="run-status-grid">
            <article className="panel run-now">
              <div className="panel-title">
                <Activity size={18} aria-hidden="true" />
                <h2>Pågående test</h2>
              </div>
              <div className="run-now-status">
                <strong>{runControlStatus}</strong>
                <span>{activeRunLabel || 'Ingen test kjører nå'}</span>
                {runState.active && activeRunSpecs.length > 1 ? <small>Opptil {activeWorkerCount} tester kjøres samtidig</small> : null}
              </div>
              {runState.startedAt ? <time>{formatDate(runState.startedAt)}</time> : null}
              {runState.active ? (
                <div className="active-run-actions">
                  <button className={runState.status === 'paused' || runState.paused ? 'run-button' : 'pause-button'} type="button" onClick={togglePauseRun} disabled={runState.status === 'stopping'}>
                    {runState.status === 'paused' || runState.paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
                    {runState.status === 'paused' || runState.paused ? 'Fortsett test' : 'Pause test'}
                  </button>
                  <button className="stop-button" type="button" onClick={stopRun}>
                    <Square size={15} aria-hidden="true" />
                    Stopp pågående kjøring
                  </button>
                </div>
              ) : null}
              {runError ? <p className="run-error">{runError}</p> : null}
            </article>
            <article className="panel suite-run-card">
              <div>
                <span>Testsett</span>
                <strong>Helsesjekk</strong>
                <small>{suiteSpecs.health.length} automatiserte tester</small>
              </div>
              <button
                className="run-button"
                type="button"
                onClick={() => startRun({ specFiles: suiteSpecs.health, label: 'Helsesjekk', replaceActive: runState.active })}
                disabled={!suiteSpecs.health.length || runState.status === 'stopping'}
              >
                {runState.active ? <RotateCw size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
                {runState.active ? 'Stopp og start helsesjekk' : 'Start helsesjekk'}
              </button>
            </article>
            <article className="panel suite-run-card">
              <div>
                <span>Testsett</span>
                <strong>Regresjonstest</strong>
                <small>{suiteSpecs.regression.length} automatiserte tester</small>
              </div>
              <button
                className="run-button"
                type="button"
                onClick={() => startRun({ specFiles: suiteSpecs.regression, label: 'Regresjonstest', replaceActive: runState.active })}
                disabled={!suiteSpecs.regression.length || runState.status === 'stopping'}
              >
                {runState.active ? <RotateCw size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
                {runState.active ? 'Stopp og start regresjonstest' : 'Start regresjonstest'}
              </button>
            </article>
          </section>

          {manualAction.pending ? (
            <section className="manual-action-panel panel" role="alert" aria-live="assertive">
              <div className="manual-action-heading">
                <div className="manual-action-icon">
                  <AlertTriangle size={22} aria-hidden="true" />
                </div>
                <div>
                  <span>Handling kreves</span>
                  <h2>{manualAction.title || manualAction.testId || 'Manuell kontroll'}</h2>
                </div>
              </div>
              <p>{manualAction.message || 'Testen venter på at du gjør en manuell handling før den kan fortsette.'}</p>
              {manualAction.details?.length ? (
                <ul>
                  {manualAction.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              ) : null}
              <label className="manual-note">
                <span>Notat til testloggen</span>
                <textarea
                  value={manualActionNote}
                  onChange={(event) => setManualActionNote(event.target.value)}
                  placeholder="Valgfritt: vare, recall-id, ordrenummer eller hva du observerte"
                  rows={3}
                />
              </label>
              <div className="manual-action-buttons">
                <button className="run-button" type="button" onClick={() => resolveManualAction('completed')}>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  Gjennomført
                </button>
                <button className="stop-button" type="button" onClick={() => resolveManualAction('failed')}>
                  <XCircle size={16} aria-hidden="true" />
                  Feilet
                </button>
              </div>
              {manualActionError ? <p className="run-error">{manualActionError}</p> : null}
            </section>
          ) : null}

          <section className="workspace">
            <div className="list-panel panel">
              <div className="toolbar">
                <label className="search-field">
                  <Search size={17} aria-hidden="true" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Søk test, område, Jira-id" />
                </label>
                <div className="segmented" aria-label="Testsett">
                  {setNames.map((name) => (
                    <button className={setFilter === name ? 'active' : ''} type="button" onClick={() => setSetFilter(name)} key={name}>
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Test</th>
                      <th>Område</th>
                      <th>Type</th>
                      <th>Spec</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTests.map((test) => (
                      <tr className={selectedTest?.id === test.id ? 'selected' : ''} key={test.file} onClick={() => setSelectedId(test.id)}>
                        <td>
                          <button type="button" className="test-button">
                            <strong>{test.id}</strong>
                            <span>{test.title}</span>
                            {test.coveredIds?.length > 1 ? <small>Dekker {test.coveredIds.join(', ')}</small> : null}
                          </button>
                        </td>
                        <td>{test.area}</td>
                        <td>
                          <span className={`automation-label ${test.automationType || 'manual'}`}>{test.automationLabel || (test.hasFullAutomation ? 'Automatisk' : 'Manuell')}</span>
                        </td>
                        <td>
                          {test.hasFullAutomation ? <Sparkles size={15} aria-label="Fulltest" /> : null}
                          <span>{test.fullAutomationSpec?.file ? test.fullAutomationSpec.file.split('/').at(-1) : 'Ikke koblet'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedTest ? (
              <aside className="detail-panel panel">
                <div className="detail-heading">
                  <div>
                    <span>{selectedTest.set}</span>
                    <h2>{selectedTest.id}</h2>
                  </div>
                </div>
                <h3>{selectedTest.title}</h3>
                {selectedTest.coveredIds?.length > 1 ? <p className="covered-tests">Dekker {selectedTest.coveredIds.join(', ')}</p> : null}
                <p className="objective">{selectedTest.objective || 'Ingen måltekst registrert.'}</p>

                <div className="detail-grid">
                  <div>
                    <span>Jira</span>
                    <strong>{selectedTest.sourceKey || 'Ukjent'}</strong>
                  </div>
                  <div>
                    <span>Steg</span>
                    <strong>{selectedTest.steps}</strong>
                  </div>
                  <div>
                    <span>Automation</span>
                    <strong>{selectedTest.automationLabel || (selectedTest.hasFullAutomation ? 'Automatisk' : 'Mangler')}</strong>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Kjøring</h4>
                  <div className="runner-card">
                    {selectedSpec ? (
                      <div className="selected-spec">
                        <span>{selectedTest.automationLabel || 'Automatisk'}</span>
                        <strong>{selectedSpec.title}</strong>
                        {supportSpecCount ? <small>{supportSpecCount} støtte-specs holdes utenfor play-knappen</small> : null}
                      </div>
                    ) : null}
                    <label className="toggle-row">
                      <input type="checkbox" checked={headedRun} onChange={(event) => setHeadedRun(event.target.checked)} disabled={runState.active} />
                      Vis browser under kjøring
                    </label>
                    <div className="runner-actions">
                      <button className={`run-button ${runState.active && runIsForSelectedSpec ? 'running' : ''}`} type="button" onClick={() => startRun()} disabled={!canRunSelected || runState.active}>
                        {runState.active && runIsForSelectedSpec ? <RotateCw size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
                        {runState.active && runIsForSelectedSpec ? 'Kjører test' : 'Kjør test'}
                      </button>
                      {runState.active ? (
                        <>
                          <button className={runState.status === 'paused' || runState.paused ? 'run-button' : 'pause-button'} type="button" onClick={togglePauseRun} disabled={runState.status === 'stopping'}>
                            {runState.status === 'paused' || runState.paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
                            {runState.status === 'paused' || runState.paused ? 'Fortsett' : 'Pause'}
                          </button>
                          <button className="stop-button" type="button" onClick={stopRun}>
                            <Square size={15} aria-hidden="true" />
                            Stopp
                          </button>
                        </>
                      ) : null}
                    </div>
                    {!canRunSelected ? <p>Denne testen har ingen full Playwright-test koblet ennå.</p> : null}
                    {runError ? <p className="run-error">{runError}</p> : null}
                  </div>
                </div>

                <div className="button-row">
                  <LinkButton href={selectedTest.href} icon={FileText}>
                    Definisjon
                  </LinkButton>
                </div>
              </aside>
            ) : null}
          </section>
        </>
      ) : (
        <>
          <section className="metrics-grid" aria-label="Nøkkeltall">
            <Metric icon={ClipboardList} label="Tester" value={summary.totalTests} accent="blue" detail={`${summary.totalExecutions} kjøringer`} />
            <Metric icon={CheckCircle2} label="Passrate" value={`${summary.passRate}%`} accent="green" detail={`${statusCounts.PASS ?? 0} pass`} />
            <Metric icon={AlertTriangle} label="Åpne funn" value={(statusCounts.FAIL ?? 0) + (statusCounts.BLOCKED ?? 0)} accent="amber" detail={`${statusCounts.BLOCKED ?? 0} blokkert`} />
            <Metric icon={Activity} label="Automatisert" value={`${summary.automationRate}%`} accent="violet" detail={`${summary.automatedCount} specs`} />
          </section>

          <section className="monitor-grid">
            <article className="panel monitor-panel">
              <div className="panel-title">
                <Gauge size={18} aria-hidden="true" />
                <h2>Operativ status</h2>
              </div>
              <div className="score-row">
                <div className={`score-ring ${monitorTone}`} style={{ '--score': `${summary.monitorScore}%` }}>
                  <span>{summary.monitorScore}</span>
                </div>
                <div className="score-copy">
                  <strong>{latestExecution ? latestExecution.title : 'Ingen kjøring funnet'}</strong>
                  <span>{latestExecution ? `${latestExecution.status} · ${formatDate(latestExecution.date)}` : 'Kjør en test for å etablere baseline'}</span>
                </div>
              </div>
              <div className="signal-strip">
                <span>
                  <b>{summary.staleCount}</b> trenger oppmerksomhet
                </span>
                <span>
                  <b>{summary.totalEvidence}</b> screenshots
                </span>
                <span>
                  <b>{summary.totalReports}</b> rapporter
                </span>
              </div>
            </article>

            <article className="panel">
              <div className="panel-title">
                <BarChart3 size={18} aria-hidden="true" />
                <h2>Statusfordeling</h2>
              </div>
              <div className="status-bars">
                {['FAIL', 'BLOCKED', 'NOT RUN', 'PASS'].map((status) => {
                  const count = statusCounts[status] ?? 0;
                  const width = summary.totalTests ? Math.max(3, Math.round((count / summary.totalTests) * 100)) : 0;
                  return (
                    <div className="status-bar" key={status}>
                      <StatusPill status={status} />
                      <div className="bar-track">
                        <span className={(statusMeta[status] ?? statusMeta['NOT RUN']).tone} style={{ width: `${width}%` }} />
                      </div>
                      <b>{count}</b>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="panel timeline-panel">
              <div className="panel-title">
                <TimerReset size={18} aria-hidden="true" />
                <h2>Siste kjøringer</h2>
              </div>
              <div className="timeline">
                {data.executions.slice(0, 6).map((execution) => (
                  <button
                    type="button"
                    className="timeline-button"
                    key={execution.file}
                    onClick={() => setSelectedExecutionFile(execution.file)}
                  >
                    <StatusPill status={execution.status} />
                    <span>{execution.id}</span>
                    <time>{formatDate(execution.date, true)}</time>
                  </button>
                ))}
              </div>
            </article>
          </section>

          <section className="results-workspace">
            <div className="panel execution-list-panel">
              <div className="report-builder">
                <div>
                  <span>Rapportutvalg</span>
                  <strong>{selectedReportRuns.length} test runs valgt</strong>
                </div>
                <div className="report-actions">
                  <LinkButton href={summary.playwrightReport?.href} icon={Play}>
                    Playwright rapport
                  </LinkButton>
                  <button type="button" onClick={selectVisibleReportRuns}>
                    Velg viste
                  </button>
                  <button type="button" onClick={selectLatestReportRuns}>
                    Siste 20
                  </button>
                  <button type="button" onClick={() => setSelectedReportRuns([])}>
                    Nullstill
                  </button>
                  <button className="primary" type="button" onClick={generateSelectedReport} disabled={!selectedReportRuns.length || reportState.status === 'running'}>
                    Generer PDF
                  </button>
                </div>
                {reportState.message ? <p className={reportState.status === 'error' ? 'report-error' : ''}>{reportState.message}</p> : null}
                {reportState.status === 'generated' ? (
                  <div className="report-links">
                    <LinkButton href={reportState.pdf} icon={FileText}>
                      Åpne PDF
                    </LinkButton>
                    <LinkButton href={reportState.html} icon={FileText}>
                      Åpne HTML
                    </LinkButton>
                  </div>
                ) : null}
              </div>
              <div className="toolbar single">
                <label className="search-field">
                  <Search size={17} aria-hidden="true" />
                  <input value={executionQuery} onChange={(event) => setExecutionQuery(event.target.value)} placeholder="Søk i tidligere kjøringer" />
                </label>
              </div>
              <div className="execution-list">
                {filteredExecutions.map((execution) => (
                  <div
                    className={selectedExecution?.file === execution.file ? 'execution-row active' : 'execution-row'}
                    key={execution.file}
                  >
                    <label className="run-checkbox" aria-label={`Inkluder ${execution.id} i rapport`}>
                      <input type="checkbox" checked={selectedReportRunSet.has(execution.file)} onChange={() => toggleReportRun(execution.file)} />
                    </label>
                    <button
                      type="button"
                      className="execution-select"
                      onClick={() => {
                        setSelectedExecutionFile(execution.file);
                        setSelectedId(execution.id);
                      }}
                    >
                      <StatusPill status={execution.status} />
                      <span>
                        <strong>{execution.id}</strong>
                        {execution.title}
                      </span>
                      <time>{formatDate(execution.date, true)}</time>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <aside className="panel execution-detail-panel">
              {selectedExecution ? (
                <>
                  <div className="detail-heading">
                    <div>
                      <span>{selectedExecution.executor || 'Execution'}</span>
                      <h2>{selectedExecution.id}</h2>
                    </div>
                    <StatusPill status={selectedExecution.status} />
                  </div>
                  <h3>{selectedExecution.title}</h3>
                  <p className="objective">{selectedExecution.summary || 'Ingen oppsummering registrert.'}</p>

                  <div className="detail-grid">
                    <div>
                      <span>Dato</span>
                      <strong>{formatDate(selectedExecution.date)}</strong>
                    </div>
                    <div>
                      <span>Miljø</span>
                      <strong>{selectedExecution.environment || 'Ukjent'}</strong>
                    </div>
                    <div>
                      <span>Spec</span>
                      <strong>{selectedExecution.sourceSpec || 'Ikke registrert'}</strong>
                    </div>
                    <div>
                      <span>Evidence</span>
                      <strong>{selectedExecution.evidence.length}</strong>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Logg</h4>
                    <div className="execution-log">
                      <pre>{selectedExecution.log || selectedExecution.summary || 'Ingen logg registrert for denne kjøringen.'}</pre>
                    </div>
                  </div>

                  {selectedExecution.evidence.length ? (
                    <div className="detail-section">
                      <h4>Artefakter</h4>
                      <div className="artifact-links">
                        {selectedExecution.evidence.slice(0, 8).map((item) => (
                          <LinkButton href={item.href} icon={ExternalLink} key={`${selectedExecution.file}-${item.file}`}>
                            {item.label}
                          </LinkButton>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="button-row">
                    <LinkButton href={selectedExecution.href} icon={ClipboardList}>
                      Åpne execution
                    </LinkButton>
                  </div>
                </>
              ) : (
                <p>Ingen execution valgt.</p>
              )}
            </aside>
          </section>
        </>
      )}
    </main>
  );
}

export default App;
