import React, { useState, useMemo } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { Play, TrendingUp, TrendingDown } from 'lucide-react';

const CounterfactualBiasDemo = ({ data }) => {
  const columns = useMemo(() => (data && data.length > 0 ? Object.keys(data[0]) : []), [data]);
  const sensitiveAttrs = useMemo(() => {
    const possibles = ['gender', 'sex', 'race', 'ethnicity', 'age', 'zipcode'];
    return columns.filter(col => possibles.some(p => col.toLowerCase().includes(p)));
  }, [columns]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [counterfactualScore, setCounterfactualScore] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [changedAttr, setChangedAttr] = useState('');

  const computeScore = (row) => {
    if (!row) return 0;
    let score = 0;
    if (row.age) score += (parseInt(row.age) || 0) * 0.5;
    if (row.sex && row.sex.toLowerCase() === 'male') score += 10;
    if (row.race && row.race.toLowerCase() === 'white') score += 5;
    if (row.income && row.income.toLowerCase().includes('>50k')) score += 20;
    return Math.round(score);
  };

  const selectedRow = data ? data[selectedIndex] : null;

  const originalScore = useMemo(() => selectedRow ? computeScore(selectedRow) : 0, [selectedRow]);

  const runCounterfactual = () => {
    if (!selectedRow || sensitiveAttrs.length === 0) return;
    setIsRunning(true);
    const attr = sensitiveAttrs[0];
    const values = [...new Set(data.map(r => r[attr]).filter(v => v))];
    if (values.length < 2) {
      setIsRunning(false);
      return;
    }
    const current = selectedRow[attr];
    const other = values.find(v => String(v).toLowerCase() !== String(current).toLowerCase());
    if (!other) {
      setIsRunning(false);
      return;
    }
    const cfRow = { ...selectedRow, [attr]: other };
    const cfScore = computeScore(cfRow);
    setChangedAttr(`${attr}: ${current} → ${other}`);
    setTimeout(() => {
      setCounterfactualScore(cfScore);
      setIsRunning(false);
    }, 1500);
  };

  const difference = counterfactualScore - originalScore;
  const differencePercent = originalScore ? ((difference / originalScore) * 100).toFixed(2) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl mx-auto p-6 space-y-6"
    >
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">Counterfactual Bias Demo</h2>
        <p className="text-slate-400">Test how changing sensitive attributes affects outcomes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Row Selector */}
        <motion.div
          className="rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 shadow-2xl shadow-black/30"
          whileHover={{ scale: 1.02 }}
        >
          <h3 className="text-xl font-semibold text-white mb-4">Select Row</h3>
          <select
            value={selectedIndex}
            onChange={(e) => {
              setSelectedIndex(parseInt(e.target.value));
              setCounterfactualScore(0);
              setChangedAttr('');
            }}
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          >
            {data && data.map((_, i) => (
              <option key={i} value={i}>Row {i + 1}</option>
            ))}
          </select>
        </motion.div>

        {/* Selected Row Card */}
        <motion.div
          className="rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 shadow-2xl shadow-black/30"
          whileHover={{ scale: 1.02 }}
        >
          <h3 className="text-xl font-semibold text-white mb-4">Selected Row Data</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {selectedRow && columns.map((col) => (
              <div key={col} className="flex justify-between text-sm">
                <span className="text-slate-400 capitalize">{col.replace(/_/g, ' ')}:</span>
                <span className="text-white font-medium">{selectedRow[col]}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Run Button */}
      <motion.div
        className="text-center"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <button
          onClick={runCounterfactual}
          disabled={isRunning || !data || data.length === 0}
          className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-full shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
        >
          <Play size={20} />
          {isRunning ? 'Running...' : 'Run Counterfactual Test'}
        </button>
      </motion.div>

      {/* Results */}
      {counterfactualScore !== 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <motion.div
            className="rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 shadow-2xl shadow-black/30 text-center"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 0.5 }}
          >
            <h4 className="text-lg font-semibold text-slate-400 mb-2">Original Score</h4>
            <p className="text-3xl font-bold text-white">{originalScore}</p>
          </motion.div>

          <motion.div
            className="rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 shadow-2xl shadow-black/30 text-center"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h4 className="text-lg font-semibold text-slate-400 mb-2">Counterfactual Score</h4>
            <p className="text-3xl font-bold text-white">{counterfactualScore}</p>
            <p className="text-sm text-slate-500 mt-1">{changedAttr}</p>
          </motion.div>

          <motion.div
            className={`rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 shadow-2xl shadow-black/30 text-center ${difference > 0 ? 'border-green-500/50' : 'border-red-500/50'}`}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h4 className="text-lg font-semibold text-slate-400 mb-2">Difference</h4>
            <p className={`text-3xl font-bold ${difference > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {difference > 0 ? '+' : ''}{differencePercent}%
            </p>
            <div className="flex justify-center mt-2">
              {difference > 0 ? <TrendingUp className="text-green-400" size={24} /> : <TrendingDown className="text-red-400" size={24} />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default CounterfactualBiasDemo;