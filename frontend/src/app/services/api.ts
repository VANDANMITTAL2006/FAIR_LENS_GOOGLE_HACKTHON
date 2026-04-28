const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export interface DatasetMetadata {
  id: string;
  name: string;
  rows: number;
  columns: number;
  features: string[];
  sensitive_attributes: string[];
  target_column: string;
  created_at: string;
}

export interface FairnessMetrics {
  demographic_parity: number;
  equalized_odds: number;
  disparate_impact: number;
  group_metrics: Record<string, {
    tpr: number;
    fpr: number;
    precision: number;
    recall: number;
  }>;
  shap_values?: Record<string, number[]>;
  counterfactuals?: Array<{
    original: Record<string, any>;
    counterfactual: Record<string, any>;
    distance: number;
  }>;
  component_status: {
    shap: 'success' | 'failed' | 'pending';
    counterfactual: 'success' | 'failed' | 'pending';
  };
  warnings?: string[];
}

export interface DebiasStrategy {
  id: string;
  name: string;
  description: string;
  type: 'preprocessing' | 'inprocessing' | 'postprocessing';
  parameters: Record<string, any>;
  improvement: {
    demographic_parity: number;
    equalized_odds: number;
    disparate_impact: number;
  };
}

export interface DebiasResult {
  strategies: DebiasStrategy[];
  selected_strategy?: string;
  updated_metrics?: FairnessMetrics;
}

export interface ComplianceReport {
  dataset_id: string;
  generated_at: string;
  compliance_score: number;
  sections: Array<{
    title: string;
    status: 'pass' | 'warning' | 'fail';
    content: string;
  }>;
  recommendations: string[];
}

export interface AuditHistory {
  id: string;
  dataset_name: string;
  created_at: string;
  status: 'completed' | 'failed' | 'running';
  metrics_summary: {
    demographic_parity: number;
    equalized_odds: number;
    disparate_impact: number;
  };
}

export interface StreamEvent {
  stage: string;
  progress: number;
  message: string;
  status: 'running' | 'completed' | 'error';
}

const USE_MOCK = true;

export const api = {
  async uploadDataset(file: File): Promise<DatasetMetadata> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 1200));
      return {
        id: `dataset-${Date.now()}`,
        name: file.name,
        rows: 15000,
        columns: 12,
        features: ['age', 'income', 'education', 'employment_status', 'credit_score', 'loan_amount'],
        sensitive_attributes: ['gender', 'race', 'age_group', 'disability_status'],
        target_column: 'loan_approved',
        created_at: new Date().toISOString(),
      };
    }

    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Upload failed');
    return response.json();
  },

  async runAudit(datasetId: string, sensitiveAttributes: string[]): Promise<FairnessMetrics> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return {
        demographic_parity: 0.82,
        equalized_odds: 0.75,
        disparate_impact: 0.68,
        group_metrics: {
          'Male': { tpr: 0.85, fpr: 0.12, precision: 0.88, recall: 0.85 },
          'Female': { tpr: 0.72, fpr: 0.18, precision: 0.79, recall: 0.72 },
          'Non-binary': { tpr: 0.68, fpr: 0.22, precision: 0.74, recall: 0.68 },
        },
        shap_values: {
          'credit_score': [0.45, 0.42, 0.38, 0.35, 0.32],
          'income': [0.38, 0.35, 0.29, 0.25, 0.22],
          'employment_status': [0.25, 0.23, 0.21, 0.19, 0.16],
          'education': [0.18, 0.16, 0.14, 0.12, 0.11],
          'age': [0.12, 0.11, 0.10, 0.09, 0.08],
        },
        counterfactuals: [
          {
            original: { age: 25, income: 45000, credit_score: 620, loan_approved: 0 },
            counterfactual: { age: 25, income: 52000, credit_score: 680, loan_approved: 1 },
            distance: 0.15,
          },
          {
            original: { age: 32, income: 38000, credit_score: 590, loan_approved: 0 },
            counterfactual: { age: 32, income: 48000, credit_score: 650, loan_approved: 1 },
            distance: 0.21,
          },
          {
            original: { age: 41, income: 65000, credit_score: 710, loan_approved: 0 },
            counterfactual: { age: 41, income: 65000, credit_score: 740, loan_approved: 1 },
            distance: 0.08,
          },
        ],
        component_status: {
          shap: 'success',
          counterfactual: 'success',
        },
        warnings: ['High disparity detected in Non-binary group', 'Disparate impact below regulatory threshold'],
      };
    }

    const response = await fetch(`${API_BASE}/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataset_id: datasetId,
        sensitive_attributes: sensitiveAttributes,
      }),
    });
    if (!response.ok) throw new Error('Audit failed');
    return response.json();
  },

  async runDebias(datasetId: string, strategy?: string): Promise<DebiasResult> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const strategies: DebiasStrategy[] = [
        {
          id: 'reweighing',
          name: 'Reweighing',
          description: 'Adjusts sample weights to remove bias in training data while preserving overall distribution.',
          type: 'preprocessing',
          parameters: { method: 'inverse_propensity' },
          improvement: { demographic_parity: 0.15, equalized_odds: 0.12, disparate_impact: 0.18 },
        },
        {
          id: 'adversarial',
          name: 'Adversarial Debiasing',
          description: 'Trains model with adversarial network that penalizes predictions correlated with sensitive attributes.',
          type: 'inprocessing',
          parameters: { adversary_loss_weight: 0.5 },
          improvement: { demographic_parity: 0.22, equalized_odds: 0.19, disparate_impact: 0.24 },
        },
        {
          id: 'calibration',
          name: 'Calibrated Equalized Odds',
          description: 'Post-processes predictions to satisfy equalized odds constraint with minimal accuracy loss.',
          type: 'postprocessing',
          parameters: { cost_constraint: 'weighted' },
          improvement: { demographic_parity: 0.18, equalized_odds: 0.25, disparate_impact: 0.16 },
        },
      ];

      return {
        strategies,
        selected_strategy: strategy,
        updated_metrics: strategy ? {
          demographic_parity: 0.97,
          equalized_odds: 0.94,
          disparate_impact: 0.92,
          group_metrics: {
            'Male': { tpr: 0.89, fpr: 0.10, precision: 0.91, recall: 0.89 },
            'Female': { tpr: 0.87, fpr: 0.11, precision: 0.89, recall: 0.87 },
            'Non-binary': { tpr: 0.86, fpr: 0.12, precision: 0.88, recall: 0.86 },
          },
          component_status: { shap: 'success', counterfactual: 'success' },
        } : undefined,
      };
    }

    const response = await fetch(`${API_BASE}/debias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataset_id: datasetId,
        strategy,
      }),
    });
    if (!response.ok) throw new Error('Debiasing failed');
    return response.json();
  },

  async getReport(datasetId: string): Promise<ComplianceReport> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 800));
      return {
        dataset_id: datasetId,
        generated_at: new Date().toISOString(),
        compliance_score: 78,
        sections: [
          {
            title: 'Data Governance',
            status: 'pass',
            content: 'Dataset includes proper documentation of sensitive attributes and consent mechanisms. All required metadata fields are present and complete.',
          },
          {
            title: 'Bias Assessment',
            status: 'warning',
            content: 'Demographic parity scores indicate moderate disparity across protected groups. Recommend implementing reweighing or adversarial debiasing strategies.',
          },
          {
            title: 'Model Transparency',
            status: 'pass',
            content: 'SHAP values successfully computed for all features. Feature importance rankings are available and interpretable.',
          },
          {
            title: 'Disparate Impact Analysis',
            status: 'fail',
            content: 'Disparate impact ratio of 0.68 falls below the 0.8 threshold recommended by regulatory guidelines. Immediate remediation required.',
          },
        ],
        recommendations: [
          'Apply adversarial debiasing to improve disparate impact ratio',
          'Implement continuous monitoring for model drift',
          'Document mitigation strategies in production deployment',
          'Schedule quarterly fairness audits',
        ],
      };
    }

    const response = await fetch(`${API_BASE}/report?dataset_id=${datasetId}`);
    if (!response.ok) throw new Error('Failed to fetch report');
    return response.json();
  },

  async getHistory(): Promise<AuditHistory[]> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 600));
      return [
        {
          id: 'audit-1',
          dataset_name: 'loan_applications_2024.csv',
          created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          status: 'completed',
          metrics_summary: { demographic_parity: 0.82, equalized_odds: 0.75, disparate_impact: 0.68 },
        },
        {
          id: 'audit-2',
          dataset_name: 'credit_decisions_q1.parquet',
          created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
          status: 'completed',
          metrics_summary: { demographic_parity: 0.88, equalized_odds: 0.84, disparate_impact: 0.79 },
        },
        {
          id: 'audit-3',
          dataset_name: 'hiring_data_2023.csv',
          created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
          status: 'completed',
          metrics_summary: { demographic_parity: 0.76, equalized_odds: 0.71, disparate_impact: 0.64 },
        },
        {
          id: 'audit-4',
          dataset_name: 'insurance_claims.json',
          created_at: new Date(Date.now() - 86400000 * 18).toISOString(),
          status: 'failed',
          metrics_summary: { demographic_parity: 0.0, equalized_odds: 0.0, disparate_impact: 0.0 },
        },
        {
          id: 'audit-5',
          dataset_name: 'mortgage_approvals_2024.csv',
          created_at: new Date(Date.now() - 86400000 * 25).toISOString(),
          status: 'completed',
          metrics_summary: { demographic_parity: 0.91, equalized_odds: 0.89, disparate_impact: 0.85 },
        },
      ];
    }

    const response = await fetch(`${API_BASE}/history`);
    if (!response.ok) throw new Error('Failed to fetch history');
    return response.json();
  },

  streamAudit(datasetId: string, onEvent: (event: StreamEvent) => void): () => void {
    if (USE_MOCK) {
      const stages = [
        { stage: 'Initializing', progress: 10, message: 'Loading dataset' },
        { stage: 'Data Validation', progress: 25, message: 'Validating schema and data types' },
        { stage: 'Computing Metrics', progress: 45, message: 'Calculating fairness metrics' },
        { stage: 'SHAP Analysis', progress: 65, message: 'Computing feature importance' },
        { stage: 'Counterfactuals', progress: 85, message: 'Generating counterfactual examples' },
        { stage: 'Finalizing', progress: 100, message: 'Audit complete' },
      ];

      let currentStage = 0;
      const interval = setInterval(() => {
        if (currentStage < stages.length) {
          onEvent({
            ...stages[currentStage],
            status: currentStage === stages.length - 1 ? 'completed' : 'running',
          });
          currentStage++;
        } else {
          clearInterval(interval);
        }
      }, 600);

      return () => clearInterval(interval);
    }

    const eventSource = new EventSource(`${API_BASE}/stream?dataset_id=${datasetId}`);
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onEvent(data);
    };
    return () => eventSource.close();
  },
};
