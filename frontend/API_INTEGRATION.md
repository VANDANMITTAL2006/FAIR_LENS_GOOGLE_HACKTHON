# FairLens API Integration Map

## Endpoints

### POST /upload
**Used by:** Upload Page (`src/app/pages/Upload.tsx`)
**Request:** `FormData` with file
**Response:** `DatasetMetadata`
```typescript
{
  id: string
  name: string
  rows: number
  columns: number
  features: string[]
  sensitive_attributes: string[]
  target_column: string
  created_at: string
}
```
**UI State:** uploading → metadata displayed → sensitive attribute selection

---

### POST /audit
**Used by:** Upload Page (`src/app/pages/Upload.tsx`)
**Request:**
```typescript
{
  dataset_id: string
  sensitive_attributes: string[]
}
```
**Response:** `FairnessMetrics`
```typescript
{
  demographic_parity: number
  equalized_odds: number
  disparate_impact: number
  group_metrics: Record<string, { tpr, fpr, precision, recall }>
  shap_values?: Record<string, number[]>
  counterfactuals?: Array<{ original, counterfactual, distance }>
  component_status: { shap, counterfactual }
  warnings?: string[]
}
```
**UI State:** running → navigate to Analysis page with results

---

### GET /stream?dataset_id={id} (SSE)
**Used by:** Upload Page (`src/app/pages/Upload.tsx`)
**Events:**
```typescript
{
  stage: string
  progress: number  // 0-100
  message: string
  status: 'running' | 'completed' | 'error'
}
```
**UI State:** ProgressBar shows real-time stage/progress/message

---

### POST /debias
**Used by:** Debias Lab (`src/app/pages/Debias.tsx`)
**Request:**
```typescript
{
  dataset_id: string
  strategy?: string  // optional, omit to get all strategies
}
```
**Response:** `DebiasResult`
```typescript
{
  strategies: Array<{
    id: string
    name: string
    description: string
    type: 'preprocessing' | 'inprocessing' | 'postprocessing'
    parameters: Record<string, any>
    improvement: { demographic_parity, equalized_odds, disparate_impact }
  }>
  selected_strategy?: string
  updated_metrics?: FairnessMetrics
}
```
**UI State:**
- No strategy → shows strategy cards
- With strategy → runs debias → shows before/after comparison

---

### GET /report?dataset_id={id}
**Used by:** Compliance Page (`src/app/pages/Compliance.tsx`)
**Response:** `ComplianceReport`
```typescript
{
  dataset_id: string
  generated_at: string
  compliance_score: number
  sections: Array<{
    title: string
    status: 'pass' | 'warning' | 'fail'
    content: string
  }>
  recommendations: string[]
}
```
**UI State:** displays structured report with export option

---

### GET /history
**Used by:** Dashboard (`src/app/pages/Dashboard.tsx`), History Page (`src/app/pages/History.tsx`)
**Response:** `AuditHistory[]`
```typescript
[{
  id: string
  dataset_name: string
  created_at: string
  status: 'completed' | 'failed' | 'running'
  metrics_summary: { demographic_parity, equalized_odds, disparate_impact }
}]
```
**UI State:** displays in table, latest audit shows on Dashboard

---

## Component Status Handling

### SHAP Analysis
**Field:** `metrics.component_status.shap`
**States:** `'success' | 'failed' | 'pending'`
**UI:**
- success → display SHAP chart
- failed → show "SHAP analysis unavailable"
- pending → loading state

### Counterfactuals
**Field:** `metrics.component_status.counterfactual`
**States:** `'success' | 'failed' | 'pending'`
**UI:**
- success → display counterfactual examples
- failed → show "Counterfactual analysis unavailable"
- pending → loading state

---

## Warnings
**Field:** `metrics.warnings?: string[]`
**UI:** Alert banner on Analysis page with amber styling

---

## Configuration

**Current Mode:** Mock Data (set `USE_MOCK = false` in `src/app/services/api.ts` to use real backend)

Set API base URL via environment variable:
```
VITE_API_BASE=http://localhost:8000
```
Default: `http://localhost:8000`

Mock mode provides realistic delays and complete data structures for all endpoints, allowing full UI testing without backend dependency.
