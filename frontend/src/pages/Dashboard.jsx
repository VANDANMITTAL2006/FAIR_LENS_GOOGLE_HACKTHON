import { useRef, useState } from 'react';
import Papa from 'papaparse';
import { motion } from 'framer-motion';
import {
  parseDataset,
  calculateGenderGap,
  calculateRaceGap,
  calculateFairnessScore,
  calculateRiskStatus,
  calculateApprovalRates,
} from '../utils/fairness';
import Navbar from '../components/Navbar';
import UploadCard from '../components/UploadCard';
import MetricsGrid from '../components/MetricsGrid';
import BiasChart from '../components/BiasChart';
import ShapPanel from '../components/ShapPanel';
import CounterfactualCard from '../components/CounterfactualCard';
import DebiasSection from '../components/DebiasSection';
import Footer from '../components/Footer';
import {
  initialMetrics,
  demoMetrics,
  initialGroupData,
  demoGroupData,
  baselinePieData,
  demoPieData,
  initialShapData,
  demoShapData,
  debiasStrategies,
  strategyGroupData,
  strategyPieData,
} from '../data/mockData';

const Dashboard = () => {
  const metricsRef = useRef(null);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [groupData, setGroupData] = useState(initialGroupData);
  const [pieData, setPieData] = useState(baselinePieData);
  const [shapData, setShapData] = useState(initialShapData);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [progress, setProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [toast, setToast] = useState('');
  const [appliedStrategy, setAppliedStrategy] = useState('None');
  const [heroStats, setHeroStats] = useState({
    demoDatasets: 0,
    fairnessMetrics: 0,
    insights: 'Idle',
  });
  const [datasetRows, setDatasetRows] = useState([]);
  const [activeRecord, setActiveRecord] = useState(null);
  const [groupRates, setGroupRates] = useState({ maleRate: 0, femaleRate: 0, whiteRate: 0, nonWhiteRate: 0 });

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
  };

  const scrollToMetrics = () => {
    metricsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const computeDatasetMetrics = (rows) => {
    const parsedRows = parseDataset(rows);
    const genderGap = calculateGenderGap(parsedRows);
    const raceGap = calculateRaceGap(parsedRows);
    const fairnessScore = calculateFairnessScore(parsedRows);
    const riskStatus = calculateRiskStatus(fairnessScore);
    const { maleRate, femaleRate, whiteRate, nonWhiteRate } = calculateApprovalRates(parsedRows);

    return {
      parsedRows,
      metrics: [
        {
          id: 'gender',
          title: 'Gender Bias Gap',
          value: `${genderGap.toFixed(1)}%`,
          helper: 'Difference between male and female positive outcome rates.',
          accent: 'from-rose-500 to-pink-500',
          trend: genderGap <= 10 ? 'down' : 'up',
        },
        {
          id: 'race',
          title: 'Race Bias Gap',
          value: `${raceGap.toFixed(1)}%`,
          helper: 'Difference between White and Non-White rates.',
          accent: 'from-violet-500 to-indigo-500',
          trend: raceGap <= 10 ? 'down' : 'up',
        },
        {
          id: 'fairness',
          title: 'Fairness Score',
          value: `${fairnessScore} / 100`,
          helper: 'Higher score indicates more balanced outcomes.',
          accent: 'from-sky-500 to-blue-600',
          trend: fairnessScore >= 70 ? 'up' : 'down',
        },
        {
          id: 'risk',
          title: 'Risk Status',
          value: riskStatus,
          helper: 'Risk based on fairness gaps and outcome balance.',
          accent: 'from-amber-500 to-orange-500',
          trend: riskStatus === 'Low Risk' ? 'down' : 'up',
        },
      ],
      groupData: [
        { label: 'Male', value: maleRate },
        { label: 'Female', value: femaleRate },
        { label: 'White', value: whiteRate },
        { label: 'Non-White', value: nonWhiteRate },
      ],
      pieData: [
        { name: 'Fair', value: fairnessScore },
        { name: 'Risk', value: 100 - fairnessScore },
      ],
      shapData: [
        { feature: 'age', impact: 0 },
        { feature: 'education', impact: 0 },
        { feature: 'hours-per-week', impact: 0 },
        { feature: 'occupation', impact: 0 },
        { feature: 'capital-gain', impact: 0 },
      ],
      groupRates: { maleRate, femaleRate, whiteRate, nonWhiteRate },
    };
  };

  const applyDatasetMetrics = (rows) => {
    const dataset = computeDatasetMetrics(rows);
    const active = dataset.parsedRows[0] ?? null;

    setMetrics(dataset.metrics);
    setGroupData(dataset.groupData);
    setPieData(dataset.pieData);
    setShapData(dataset.shapData);
    setGroupRates(dataset.groupRates);
    setDatasetRows(dataset.parsedRows);
    setActiveRecord(active);
    setHeroStats({
      demoDatasets: dataset.parsedRows.length,
      fairnessMetrics: 4,
      insights: 'Live',
    });
  };

  const handleLoadDemo = () => {
    setMetrics(demoMetrics);
    setGroupData(demoGroupData);
    setPieData(demoPieData);
    setShapData(demoShapData);
    setDatasetRows([]);
    setActiveRecord(null);
    setGroupRates({ maleRate: 0, femaleRate: 0, whiteRate: 0, nonWhiteRate: 0 });
    setHeroStats({
      demoDatasets: 1,
      fairnessMetrics: 8,
      insights: 'Live',
    });
    setSelectedFile(null);
    setFileName('Demo dataset');
    setAppliedStrategy('None');
    showToast('Demo dataset loaded successfully');
    scrollToMetrics();
  };

  const handleExport = () => {
    const payload = {
      timestamp: new Date().toISOString(),
      fileName: fileName || 'Demo dataset',
      metrics,
      groupData,
      pieData,
      shapData,
      appliedStrategy,
    };

    const file = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const fileURL = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = fileURL;
    link.download = `fairlens-report-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(fileURL);
    showToast('Report downloaded locally');
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setFileName(file.name);
    showToast(`Dataset selected: ${file.name}`);

    setAnalyzing(true);
    setProgress(12);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        applyDatasetMetrics(results.data);
        setAnalyzing(false);
        setProgress(0);
        setAppliedStrategy('None');
        showToast('Dataset analysis complete');
        scrollToMetrics();
      },
      error: () => {
        setAnalyzing(false);
        setProgress(0);
        showToast('Unable to parse the uploaded file.');
      },
    });
  };

  const handleAnalyze = () => {
    if (!selectedFile) {
      showToast('Please choose a dataset before analysis.');
      return;
    }

    setAnalyzing(true);
    setProgress(10);

    const updateSteps = [25, 42, 65, 84, 100];
    let step = 0;

    const interval = setInterval(() => {
      setProgress(updateSteps[step]);
      step += 1;

      if (step >= updateSteps.length) {
        clearInterval(interval);
        Papa.parse(selectedFile, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            applyDatasetMetrics(results.data);
            setAnalyzing(false);
            setProgress(0);
            setAppliedStrategy('None');
            showToast('Dataset analysis complete');
            scrollToMetrics();
          },
          error: () => {
            setAnalyzing(false);
            setProgress(0);
            showToast('Unable to parse the uploaded file.');
          },
        });
      }
    }, 360);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setFileName('');
    setAnalyzing(false);
    setProgress(0);
    setMetrics(initialMetrics);
    setGroupData(initialGroupData);
    setPieData(baselinePieData);
    setShapData(initialShapData);
    setDatasetRows([]);
    setActiveRecord(null);
    setGroupRates({ maleRate: 0, femaleRate: 0, whiteRate: 0, nonWhiteRate: 0 });
    setHeroStats({
      demoDatasets: 0,
      fairnessMetrics: 0,
      insights: 'Idle',
    });
    setAppliedStrategy('None');
    showToast('Upload state has been reset');
  };

  const handleApplyStrategy = (strategyId) => {
    const strategyTitles = {
      reweighting: 'Reweighting',
      thresholds: 'Threshold Adjustment',
      'feature-removal': 'Remove Sensitive Feature',
    };

    setAppliedStrategy(strategyTitles[strategyId] || 'Custom');
    setGroupData(strategyGroupData[strategyId]);
    setPieData(strategyPieData[strategyId]);

    if (strategyId === 'reweighting') {
      setMetrics([
        {
          id: 'gender',
          title: 'Gender Bias Gap',
          value: '4%',
          helper: 'Reweighting dramatically reduces gender disparity.',
          accent: 'from-emerald-500 to-teal-500',
          trend: 'down',
        },
        {
          id: 'race',
          title: 'Race Bias Gap',
          value: '6%',
          helper: 'Race gap narrows while preserving fairness.',
          accent: 'from-sky-500 to-cyan-500',
          trend: 'down',
        },
        {
          id: 'fairness',
          title: 'Fairness Score',
          value: '82 / 100',
          helper: 'Fairness improves after reweighting.',
          accent: 'from-emerald-500 to-teal-500',
          trend: 'up',
        },
        {
          id: 'risk',
          title: 'Risk Status',
          value: 'Moderate Risk',
          helper: 'Bias control reduces overall risk exposure.',
          accent: 'from-emerald-500 to-lime-500',
          trend: 'down',
        },
      ]);
    }

    if (strategyId === 'thresholds') {
      setMetrics([
        {
          id: 'gender',
          title: 'Gender Bias Gap',
          value: '6%',
          helper: 'Threshold adjustments protect underrepresented groups.',
          accent: 'from-sky-500 to-cyan-500',
          trend: 'down',
        },
        {
          id: 'race',
          title: 'Race Bias Gap',
          value: '8%',
          helper: 'Classification thresholds smooth disparity.',
          accent: 'from-indigo-500 to-violet-500',
          trend: 'down',
        },
        {
          id: 'fairness',
          title: 'Fairness Score',
          value: '78 / 100',
          helper: 'Fairness increases with calibrated decisions.',
          accent: 'from-sky-500 to-blue-600',
          trend: 'up',
        },
        {
          id: 'risk',
          title: 'Risk Status',
          value: 'Moderate Risk',
          helper: 'Risk shifts to a manageable range.',
          accent: 'from-emerald-500 to-lime-500',
          trend: 'down',
        },
      ]);
    }

    if (strategyId === 'feature-removal') {
      setMetrics([
        {
          id: 'gender',
          title: 'Gender Bias Gap',
          value: '9%',
          helper: 'Removing sensitive features lowers bias influence.',
          accent: 'from-amber-500 to-orange-500',
          trend: 'down',
        },
        {
          id: 'race',
          title: 'Race Bias Gap',
          value: '9%',
          helper: 'Correlation-driven bias is reduced through removal.',
          accent: 'from-amber-500 to-orange-500',
          trend: 'down',
        },
        {
          id: 'fairness',
          title: 'Fairness Score',
          value: '74 / 100',
          helper: 'Fairness improves with a small accuracy tradeoff.',
          accent: 'from-slate-500 to-slate-700',
          trend: 'up',
        },
        {
          id: 'risk',
          title: 'Risk Status',
          value: 'Low Risk',
          helper: 'Risk flag drops after sensitive input removal.',
          accent: 'from-emerald-500 to-lime-500',
          trend: 'down',
        },
      ]);
    }

    showToast(`${strategyTitles[strategyId]} applied`);
    scrollToMetrics();
  };

  return (
    <div className="min-h-screen text-slate-900">
      <Navbar onLoadDemo={handleLoadDemo} onExport={handleExport} />

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-16 shadow-soft sm:px-10 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative overflow-hidden bg-slate-950/90 shadow-2xl shadow-slate-950/20"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.18),_transparent_30%)]" />
            <div className="relative mx-auto max-w-6xl px-8 py-16 sm:px-12 sm:py-20">
              <div className="grid gap-12 xl:grid-cols-[1.3fr_0.7fr] xl:items-center xl:gap-16">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">AI Bias Detection Platform</p>
                    <h1 className="text-5xl font-bold leading-[1.1] text-white sm:text-6xl lg:text-7xl">
                      Detect hidden bias<br />
                      <span className="text-slate-300">in AI decisions</span>
                    </h1>
                  </div>
                  <p className="max-w-xl text-lg leading-8 text-slate-300">
                    Upload hiring, lending, or risk datasets to audit fairness, explain model behavior, and surface remediation recommendations on the fly.
                  </p>
                  <div className="flex flex-wrap gap-8 pt-4">
                    <div className="space-y-1">
                      <p className="text-sm text-slate-400">Records analyzed</p>
                      <p className="text-3xl font-bold text-white">{heroStats.demoDatasets}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-slate-400">Fairness metrics</p>
                      <p className="text-3xl font-bold text-white">{heroStats.fairnessMetrics}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-slate-400">Instant insights</p>
                      <p className="text-3xl font-bold text-white">{heroStats.insights}</p>
                    </div>
                  </div>
                </div>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="space-y-6"
                >
                  <div className="border border-slate-800/80 bg-slate-950/80 p-6 shadow-xl shadow-slate-950/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Live audit status</p>
                        <p className="mt-1 text-lg font-semibold text-white">Ready for your dataset</p>
                      </div>
                      <span className="inline-flex bg-emerald-500/10 px-2 py-1 text-xs font-medium uppercase tracking-[0.1em] text-emerald-300">
                        Active
                      </span>
                    </div>
                  </div>
                  <div className="border border-dashed border-slate-800/70 bg-slate-950/60 p-6 text-center">
                    <p className="text-sm font-medium text-white">Upload a CSV or JSON file to begin the fairness audit.</p>
                    <p className="mt-2 text-xs text-slate-400">All evaluation happens locally in the browser with mock analytics.</p>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="mt-16">
          <UploadCard
            fileName={fileName}
            hasFile={Boolean(selectedFile)}
            progress={progress}
            analyzing={analyzing}
            onFileSelect={handleFileSelect}
            onAnalyze={handleAnalyze}
            onClear={handleClear}
          />
        </section>

        <section ref={metricsRef} className="mt-16 space-y-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.1em] text-slate-500">Fairness metrics</p>
              <h2 className="text-3xl font-bold text-slate-950">Bias insights at a glance</h2>
              <p className="text-lg leading-7 text-slate-600 max-w-lg">Real-time analysis of demographic disparities and fairness scores.</p>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 text-sm text-slate-700">
              <span className="h-2 w-2 bg-emerald-500" />
              Metrics update after analysis
            </div>
          </div>
          <MetricsGrid metrics={metrics} />
        </section>

        <section className="mt-16 grid gap-8 xl:grid-cols-[1fr_0.94fr]">
          <BiasChart groupData={groupData} pieData={pieData} />
          <ShapPanel shapData={shapData} />
        </section>

        <section className="mt-16">
          <CounterfactualCard profile={activeRecord} allRecords={datasetRows} />
        </section>

        <section className="mt-16">
          <DebiasSection strategies={debiasStrategies} onApply={handleApplyStrategy} appliedStrategy={appliedStrategy} metrics={metrics} hasFile={Boolean(datasetRows.length) || fileName === 'Demo dataset'} />
        </section>
      </main>

      <Footer />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 w-[min(92vw,520px)] -translate-x-1/2 border border-slate-200 bg-slate-950/95 px-6 py-4 text-sm text-slate-100 shadow-2xl shadow-slate-950/25">
          {toast}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
