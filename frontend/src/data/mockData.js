export const initialMetrics = [
  {
    id: 'gender',
    title: 'Gender Bias Gap',
    value: '--',
    helper: 'Analyze a dataset to reveal bias gaps.',
    accent: 'from-rose-500 to-pink-500',
    trend: 'up',
  },
  {
    id: 'race',
    title: 'Race Bias Gap',
    value: '--',
    helper: 'Visible bias appears after analysis.',
    accent: 'from-violet-500 to-indigo-500',
    trend: 'up',
  },
  {
    id: 'fairness',
    title: 'Fairness Score',
    value: '--',
    helper: 'Higher score means fairer outcomes.',
    accent: 'from-sky-500 to-blue-600',
    trend: 'up',
  },
  {
    id: 'risk',
    title: 'Risk Status',
    value: 'Awaiting audit',
    helper: 'Upload data to evaluate risk level.',
    accent: 'from-amber-500 to-orange-500',
    trend: 'down',
  },
];

export const demoMetrics = [
  {
    id: 'gender',
    title: 'Gender Bias Gap',
    value: '23%',
    helper: 'Needs mitigation to meet fairness targets.',
    accent: 'from-rose-500 to-pink-500',
    trend: 'up',
  },
  {
    id: 'race',
    title: 'Race Bias Gap',
    value: '31%',
    helper: 'Significant disparity detected.',
    accent: 'from-violet-500 to-indigo-500',
    trend: 'up',
  },
  {
    id: 'fairness',
    title: 'Fairness Score',
    value: '62 / 100',
    helper: 'Model shows moderate fairness performance.',
    accent: 'from-sky-500 to-blue-600',
    trend: 'up',
  },
  {
    id: 'risk',
    title: 'Risk Status',
    value: 'High Risk',
    helper: 'Immediate remediation is recommended.',
    accent: 'from-amber-500 to-orange-500',
    trend: 'up',
  },
];

export const initialGroupData = [
  { label: 'Male', value: 0 },
  { label: 'Female', value: 0 },
  { label: 'White', value: 0 },
  { label: 'Non-White', value: 0 },
];

export const demoGroupData = [
  { label: 'Male', value: 72 },
  { label: 'Female', value: 49 },
  { label: 'White', value: 71 },
  { label: 'Non-White', value: 40 },
];

export const baselinePieData = [
  { name: 'Fair', value: 0 },
  { name: 'Risk', value: 0 },
];

export const demoPieData = [
  { name: 'Fair', value: 62 },
  { name: 'Risk', value: 38 },
];

export const reweightedPieData = [
  { name: 'Fair', value: 68 },
  { name: 'Risk', value: 32 },
];

export const initialShapData = [
  { feature: 'age', impact: 0 },
  { feature: 'education', impact: 0 },
  { feature: 'hours-per-week', impact: 0 },
  { feature: 'occupation', impact: 0 },
  { feature: 'capital-gain', impact: 0 },
];

export const demoShapData = [
  { feature: 'Career Gap', impact: -0.32 },
  { feature: 'College Name', impact: -0.21 },
  { feature: 'Years Experience', impact: 0.28 },
  { feature: 'Skill Score', impact: 0.34 },
  { feature: 'Location', impact: -0.10 },
];

export const debiasStrategies = [
  {
    id: 'reweighting',
    title: 'Reweighting',
    bestUseCase: 'When dataset is imbalanced across demographic groups',
    description: 'Adjust sample weights to minimize demographic disparity.',
    gain: '23% → 4%',
    cost: 'Accuracy loss: 1.2%',
    confidence: 85,
  },
  {
    id: 'thresholds',
    title: 'Threshold Adjustment',
    bestUseCase: 'When groups have unequal outcomes despite similar profiles',
    description: 'Calibrate decision boundaries to reduce bias.',
    gain: '23% → 6%',
    cost: 'Accuracy loss: 0.8%',
    confidence: 78,
  },
  {
    id: 'feature-removal',
    title: 'Remove Sensitive Feature',
    bestUseCase: 'When sensitive columns like gender or race are present',
    description: 'Exclude identity-related fields during model scoring.',
    gain: '23% → 9%',
    cost: 'Accuracy loss: 0.3%',
    confidence: 92,
  },
];

export const strategyGroupData = {
  reweighting: [
    { label: 'Male', value: 75 },
    { label: 'Female', value: 56 },
    { label: 'White', value: 74 },
    { label: 'Non-White', value: 47 },
  ],
  thresholds: [
    { label: 'Male', value: 74 },
    { label: 'Female', value: 54 },
    { label: 'White', value: 73 },
    { label: 'Non-White', value: 45 },
  ],
  'feature-removal': [
    { label: 'Male', value: 73 },
    { label: 'Female', value: 52 },
    { label: 'White', value: 72 },
    { label: 'Non-White', value: 43 },
  ],
};

export const strategyPieData = {
  reweighting: reweightedPieData,
  thresholds: [
    { name: 'Fair', value: 65 },
    { name: 'Risk', value: 35 },
  ],
  'feature-removal': [
    { name: 'Fair', value: 63 },
    { name: 'Risk', value: 37 },
  ],
};
