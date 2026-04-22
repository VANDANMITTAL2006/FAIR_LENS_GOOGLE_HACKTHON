/**
 * Core fairness calculation utilities
 * Used consistently across all metrics, charts, and counterfactual analysis
 */

const normalizeHeader = (header) => header?.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

const detectColumnType = (header) => {
  const normalized = normalizeHeader(header);
  if (/^(sex|gender)$/.test(normalized) || normalized.includes('sex') || normalized.includes('gender')) return 'sex';
  if (/^(race|ethnicity)$/.test(normalized) || normalized.includes('race') || normalized.includes('ethnicity')) return 'race';
  if (/^(income|salary|target)$/.test(normalized) || normalized.includes('income')) return 'income';
  if (normalized.includes('age')) return 'age';
  if (normalized.includes('education')) return 'education';
  if (normalized.includes('occupation')) return 'occupation';
  if (normalized.includes('hours')) return 'hours-per-week';
  if (normalized.includes('capitalgain') || normalized.includes('capital-gain')) return 'capital-gain';
  return null;
};

const getCleanIncome = (value) => {
  if (!value) return false;
  const cleaned = String(value).trim().replace(/[.\s]/g, '').toLowerCase();
 return cleaned === '>50k' || cleaned === '50k+';
};

const buildRecord = (row, index) => {
  const mapped = { rowNumber: index + 1 };
  Object.entries(row).forEach(([key, value]) => {
    const field = detectColumnType(key);
    if (field) mapped[field] = String(value).trim();
  });
  return mapped;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * Parse raw CSV rows into structured records with standardized fields
 */
export const parseDataset = (rows) => {
  return rows.map(buildRecord).filter((row) => row.income);
};

/**
 * Calculate approval/positive outcome rate for a demographic group
 */
const getGroupRate = (records, field, value) => {
  const filtered = records.filter((r) => String(r[field] ?? '').toLowerCase().includes(String(value).toLowerCase()));
  if (!filtered.length) return 0;
  const positive = filtered.filter((r) => getCleanIncome(r.income)).length;
  return (positive / filtered.length) * 100;
};

/**
 * Calculate gender bias gap (difference in approval rates between male and female)
 */
export const calculateGenderGap = (records) => {
  if (!records || !records.length) return 0;
  const maleRate = getGroupRate(records, 'sex', 'male');
  const femaleRate = getGroupRate(records, 'sex', 'female');
  return Math.abs(maleRate - femaleRate);
};

/**
 * Calculate race bias gap (difference in approval rates between white and non-white)
 */
export const calculateRaceGap = (records) => {
  if (!records || !records.length) return 0;
  const whiteRate = getGroupRate(records, 'race', 'white');
  let nonWhiteCount = 0;
  let nonWhitePositive = 0;
  records.forEach((r) => {
    const race = String(r.race ?? '').toLowerCase();
    if (race && !race.includes('white')) {
      nonWhiteCount += 1;
      if (getCleanIncome(r.income)) nonWhitePositive += 1;
    }
  });
  const nonWhiteRate = nonWhiteCount ? (nonWhitePositive / nonWhiteCount) * 100 : 0;
  return Math.abs(whiteRate - nonWhiteRate);
};

/**
 * Calculate overall fairness score (0-100)
 * Higher score = more fair outcomes
 */
export const calculateFairnessScore = (records) => {
  if (!records || !records.length) return 0;
  const genderGap = calculateGenderGap(records);
  const raceGap = calculateRaceGap(records);
  return clamp(Math.round(100 - (genderGap + raceGap) / 2), 0, 100);
};

/**
 * Determine risk status based on fairness score
 */
export const calculateRiskStatus = (score) => {
  if (score >= 85) return 'Low Risk';
  if (score >= 70) return 'Medium Risk';
  return 'High Risk';
};

/**
 * Calculate approval rates for all demographic groups
 */
export const calculateApprovalRates = (records) => {
  const maleRate = getGroupRate(records, 'sex', 'male');
  const femaleRate = getGroupRate(records, 'sex', 'female');
  const whiteRate = getGroupRate(records, 'race', 'white');
  let nonWhiteCount = 0;
  let nonWhitePositive = 0;
  records.forEach((r) => {
    const race = String(r.race ?? '').toLowerCase();
    if (race && !race.includes('white')) {
      nonWhiteCount += 1;
      if (getCleanIncome(r.income)) nonWhitePositive += 1;
    }
  });
  const nonWhiteRate = nonWhiteCount ? (nonWhitePositive / nonWhiteCount) * 100 : 0;

  return {
    maleRate: Number(maleRate.toFixed(1)),
    femaleRate: Number(femaleRate.toFixed(1)),
    whiteRate: Number(whiteRate.toFixed(1)),
    nonWhiteRate: Number(nonWhiteRate.toFixed(1)),
  };
};

/**
 * Estimate a candidate's score based on their demographic profile and dataset rates
 * This is used in counterfactual analysis to show how identity changes affect outcomes
 */
export const estimateCandidateScore = (record, records) => {
  if (!record || !records || !records.length) return 0;

  const sex = String(record.sex ?? '').toLowerCase();
  const race = String(record.race ?? '').toLowerCase();

  const maleRate = getGroupRate(records, 'sex', 'male');
  const femaleRate = getGroupRate(records, 'sex', 'female');
  const whiteRate = getGroupRate(records, 'race', 'white');

  let nonWhiteCount = 0;
  let nonWhitePositive = 0;

  records.forEach((r) => {
    const currentRace = String(r.race ?? '').toLowerCase();
    if (currentRace && !currentRace.includes('white')) {
      nonWhiteCount++;
      if (getCleanIncome(r.income)) nonWhitePositive++;
    }
  });

  const nonWhiteRate = nonWhiteCount
    ? (nonWhitePositive / nonWhiteCount) * 100
    : 0;

  const sexRate = sex.includes('male') ? maleRate : femaleRate;
  const raceRate = race.includes('white') ? whiteRate : nonWhiteRate;

  return Math.round((sexRate + raceRate) / 2);
};
