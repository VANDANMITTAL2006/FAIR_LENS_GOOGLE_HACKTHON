# FairLens — Dataset Bias Documentation
**Person D Deliverable | Day 1**

---

## Summary of 3 Datasets

| Dataset | Rows | Use Case | Primary Bias |
|---|---|---|---|
| `adult_cleaned.csv` | 9,994 | HR / Hiring | Gender & Race income gap |
| `compas_cleaned.csv` | 7,214 | Criminal Justice | Racial bias in risk scores |
| `hmda_cleaned.csv` | 10,000 | Lending / Mortgage | Racial disparity in loan approval |

---

## Dataset 1: UCI Adult Income (`adult_cleaned.csv`)

**Source:** UCI Machine Learning Repository — 1994 US Census  
**Use case:** Simulates a hiring/income prediction model  
**Target variable:** `income` (>50K or <=50K) / `income_binary` (1/0)

### Protected Attributes
- `sex` — Male / Female
- `race` — White, Black, Asian-Pac-Islander, Amer-Indian-Eskimo, Other

### Known Bias Patterns

**Bias 1 — Gender Income Gap (EEOC Violation)**
- Males earn >50K at **38.6%** rate
- Females earn >50K at **21.8%** rate
- Gap: **16.8 percentage points**
- Disparate Impact ratio: **0.565** (EEOC threshold = 0.8 → VIOLATION)
- Likely cause: model penalizes "career gaps" (correlated with maternity leave) and occupation categories dominated by women are lower-paid

**Bias 2 — Racial Income Gap (EEOC Violation)**
- White applicants earn >50K at **34.6%** rate
- Non-White applicants earn >50K at **23.7%** rate
- Disparate Impact ratio: **0.685** (→ VIOLATION)
- Likely cause: proxy discrimination through college/university names, zip codes, and occupation categories that correlate with race

**Bias 3 — Intersectional Bias**
- Non-white women face compounded discrimination from both axes
- A Black woman's predicted >50K probability is significantly lower than a White man's with identical qualifications

### ML-Ready Columns for Person C
- Features: `age`, `workclass`, `education_num`, `marital_status`, `occupation`, `relationship`, `hours_per_week`, `capital_gain_log`, `capital_loss_log`, `is_married`, `sex_binary`
- Label: `income_binary`
- Protected: `sex`, `race`, `sex_binary`, `race_group`

---

## Dataset 2: COMPAS Recidivism (`compas_cleaned.csv`)

**Source:** ProPublica COMPAS Analysis (2016) — Broward County, Florida  
**Use case:** Criminal justice risk assessment (bail/sentencing decisions)  
**Target variable:** `two_year_recid` (1 = reoffended within 2 years)  
**COMPAS score:** `decile_score` (1–10), `score_text` (Low/Medium/High)

### Protected Attributes
- `race` — African-American, Caucasian, Hispanic, Other, Asian, Native American
- `sex` — Male / Female
- `age` / `age_cat`

### Known Bias Patterns

**Bias 1 — Racial Disparity in Risk Scores (Core ProPublica Finding)**
- African-American defendants scored "High Risk": **30.8%**
- Caucasian defendants scored "High Risk": **11.2%**
- **Ratio: 2.8x** (matches original ProPublica ~2x finding)
- The COMPAS score systematically overestimates Black defendants' risk

**Bias 2 — False Positive Rate Disparity**
- Among defendants who did NOT reoffend:
  - African-Americans wrongly labeled High Risk: **28.4%**
  - Caucasians wrongly labeled High Risk: **10.7%**
  - Black defendants are **2.7x more likely** to be wrongly classified as high risk
- This means innocent Black defendants face harsher bail/sentencing decisions

**Bias 3 — False Negative Rate Disparity**
- Among defendants who DID reoffend:
  - African-Americans wrongly labeled Low Risk: **66.6%**
  - Caucasians wrongly labeled Low Risk: **88.1%**
- White defendants who actually reoffend are MORE likely to get a low-risk score and lighter treatment

### ML-Ready Columns for Person C
- Features: `age`, `sex_binary`, `priors_count`, `juv_fel_count`, `juv_misd_count`, `juv_other_count`, `charge_degree_binary`, `age_cat_encoded`, `is_african_american`, `is_caucasian`
- Label: `two_year_recid`
- COMPAS score (to audit): `decile_score`, `high_risk`
- Protected: `race`, `sex`, `age_cat`

---

## Dataset 3: HUD HMDA Mortgage (`hmda_cleaned.csv`)

**Source:** Home Mortgage Disclosure Act (HMDA) — US Dept. of Housing and Urban Development  
**Use case:** Mortgage/loan approval prediction  
**Target variable:** `action_taken` (1=approved, 3=denied) / use `action_taken == 1` as binary label

### Protected Attributes
- `applicant_race_1` — White, Black or African American, Hispanic or Latino, Asian, etc.
- `applicant_sex` — Male / Female

### Known Bias Patterns

**Bias 1 — Racial Disparity in Denial Rates (ECOA Violation)**
- White applicants denied: **15.2%**
- Black applicants denied: **36.1%**
- Hispanic applicants denied: **35.1%**
- **Black applicants are denied at 2.4x the rate of White applicants**
- Disparate Impact on approval: **0.700** (threshold 0.8 → ECOA VIOLATION)

**Bias 2 — Income-Adjusted Bias (Redlining Pattern)**
- Black applicants have average income of ~$63k vs White applicants' ~$90k
- BUT even after controlling for income and DTI, racial disparity in denials persists
- `census_tract_minority_pct` (neighborhood racial composition) is used as a proxy — this is a form of modern redlining

**Bias 3 — Intersectional: Race × Neighborhood**
- Applications from majority-minority census tracts (>60% minority) have lower approval rates regardless of individual financial profile
- This violates the Fair Housing Act (FHA) and Equal Credit Opportunity Act (ECOA)

### ML-Ready Columns for Person C
- Features: `loan_amount_000s`, `applicant_income_000s`, `debt_to_income_ratio`, `combined_loan_to_value`, `loan_type_code`, `loan_purpose_code`, `census_tract_minority_pct`, `sex_binary`, `race_white`, `race_black`, `race_hispanic`
- Label: `action_taken` (filter to 1 vs 3 for binary classification: `approved`)
- Protected: `applicant_race_1`, `applicant_sex`

---

## Regulatory Violations Summary (for Person C — Regulatory Radar)

| Dataset | Violation | Regulation |
|---|---|---|
| Adult Income | Gender disparate impact (DI=0.565) | EEOC 4/5ths Rule |
| Adult Income | Racial disparate impact (DI=0.685) | Title VII Civil Rights Act |
| COMPAS | Racial bias in risk score | Equal Protection (14th Amendment) |
| COMPAS | False positive rate disparity | Due Process |
| HMDA | Racial disparate impact in approvals (DI=0.700) | ECOA (Equal Credit Opportunity Act) |
| HMDA | Redlining via neighborhood race proxy | Fair Housing Act |

All violations are **above** EEOC/regulatory thresholds — these datasets will produce strong, clear results in the FairLens demo.

---

## Handoff to Person C (ML Lead)

**Function signature expected (per Day 1 standup schema contract):**
```python
audit(df: pd.DataFrame, 
      label_col: str, 
      protected_col: str, 
      privileged_group: str) -> dict
```

**For each dataset, call with:**
```python
# Adult Income
audit(pd.read_csv('adult_cleaned.csv'), 'income_binary', 'sex', 'Male')
audit(pd.read_csv('adult_cleaned.csv'), 'income_binary', 'race', 'White')

# COMPAS
audit(pd.read_csv('compas_cleaned.csv'), 'two_year_recid', 'race', 'Caucasian')

# HMDA
hmda = pd.read_csv('hmda_cleaned.csv')
hmda_binary = hmda[hmda['action_taken'].isin([1,3])].copy()
hmda_binary['approved'] = (hmda_binary['action_taken']==1).astype(int)
audit(hmda_binary, 'approved', 'applicant_race_1', 'White')
```
