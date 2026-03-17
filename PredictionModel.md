# PredictionModel — Technical Documentation

> **Audience:** This document is written so a beginner can follow the concepts, while covering every detail a professional developer needs to understand, extend, or debug the feature.

---

## Table of Contents

1. [What Was Built](#1-what-was-built)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Backend — API Endpoint](#3-backend--api-endpoint)
   - 3.1 [File Location](#31-file-location)
   - 3.2 [Authentication](#32-authentication)
   - 3.3 [Request Format](#33-request-format)
   - 3.4 [Input Validation](#34-input-validation)
   - 3.5 [Service Fan-Out Pipeline](#35-service-fan-out-pipeline)
   - 3.6 [Prediction Merging](#36-prediction-merging)
   - 3.7 [Response Format](#37-response-format)
   - 3.8 [Error Handling](#38-error-handling)
4. [Backend — Router Registration](#4-backend--router-registration)
5. [Backend — Test Suite](#5-backend--test-suite)
   - 5.1 [Unit Tests](#51-unit-tests)
   - 5.2 [Property-Based Tests](#52-property-based-tests)
   - 5.3 [Running the Tests](#53-running-the-tests)
6. [Frontend — PredictionPanel Component](#6-frontend--predictionpanel-component)
   - 6.1 [File Location](#61-file-location)
   - 6.2 [Props](#62-props)
   - 6.3 [Inputs](#63-inputs)
   - 6.4 [API Call](#64-api-call)
   - 6.5 [Results Display](#65-results-display)
   - 6.6 [Using the Component](#66-using-the-component)
7. [Frontend — Consultation Page Integration](#7-frontend--consultation-page-integration)
8. [Developer Tooling — Kiro Hook](#8-developer-tooling--kiro-hook)
9. [Data Flow — End to End](#9-data-flow--end-to-end)
10. [Correctness Properties](#10-correctness-properties)
11. [Environment Variables](#11-environment-variables)
12. [Extending the Feature](#12-extending-the-feature)
13. [Glossary](#13-glossary)

---

## 1. What Was Built

The **Disease Prediction** feature adds a single API endpoint and a matching UI panel that lets a clinician submit any combination of clinical inputs and receive a ranked, deduplicated list of possible diseases.

**Clinical inputs accepted:**
- Chest X-ray image (JPEG or PNG)
- Blood lab report (PDF)
- Manually typed blood values (JSON string)
- Patient symptoms (free text)
- Doctor notes (free text)

**What comes back:**
- A ranked list of diseases, each with a probability score, evidence text, recommended follow-up tests, and the source(s) that flagged it
- A human-readable summary of which inputs contributed
- A medical disclaimer

---

## 2. High-Level Architecture

```
Browser (React)
    │
    │  POST /api/prediction/disease
    │  multipart/form-data
    │  Authorization: Bearer <JWT>
    ▼
FastAPI Router  ──► JWT guard (get_current_user_from_token)
    │
    ├─► _validate_inputs()          ← rejects bad/missing inputs early
    │
    ├─► Branch A: xray_service.analyse_image()
    ├─► Branch B: pdf_service → blood_prediction_service (PDF path)
    ├─► Branch C: blood_prediction_service (manual JSON path)
    └─► Branch D: Gemini API (symptoms + notes)
            │
            ▼
    _merge_predictions()            ← deduplicates, keeps max probability,
            │                          unions tests, collects sources, sorts
            ▼
    PredictionResponse (JSON)
            │
            ▼
Browser renders PredictionPanel
```

Each branch runs independently. If one service throws an exception, the others continue — partial results are always returned.

---

## 3. Backend — API Endpoint

### 3.1 File Location

```
backend/app/routers/prediction.py
```

This is the only new backend file. All service calls use existing modules.

### 3.2 Authentication

The endpoint uses the same JWT dependency pattern as every other router in the project:

```python
from app.services.auth_service import get_current_user_from_token

@router.post("/disease")
async def predict_disease(
    ...,
    current_user: dict = Depends(get_current_user_from_token),
):
```

- No `Authorization` header → **HTTP 401**
- Invalid or expired token → **HTTP 401**
- Valid token → request proceeds

### 3.3 Request Format

`POST /api/prediction/disease` — `multipart/form-data`

| Field | Type | Required | Notes |
|---|---|---|---|
| `xray_file` | File upload | No | Must be `image/jpeg` or `image/png` |
| `blood_report_file` | File upload | No | Must be `application/pdf` |
| `blood_values_json` | String (form field) | No | Must be valid JSON |
| `patient_age` | Integer (form field) | No | Must be 0–130 inclusive |
| `patient_symptoms` | String (form field) | No | Free text |
| `doctor_notes` | String (form field) | No | Free text |

At least one of `xray_file`, `blood_report_file`, `blood_values_json`, `patient_symptoms`, or `doctor_notes` must be provided.

### 3.4 Input Validation

Handled by the internal `_validate_inputs()` function. All failures return **HTTP 422** with a descriptive message:

| Condition | Error message |
|---|---|
| All five clinical fields are `None` | `"At least one clinical input must be provided."` |
| `xray_file` content type not jpeg/png | `"xray_file must be image/jpeg or image/png, got '...'"` |
| `blood_report_file` content type not pdf | `"blood_report_file must be application/pdf, got '...'"` |
| `patient_age` < 0 or > 130 | `"patient_age must be between 0 and 130."` |
| `blood_values_json` is not valid JSON | `"blood_values_json is not valid JSON."` |

### 3.5 Service Fan-Out Pipeline

After validation, the endpoint fans out to up to four independent branches. Each branch is wrapped in its own `try/except` — a failure in one never blocks the others.

**Branch A — X-ray analysis**
```python
image_bytes = await xray_file.read()
result = xray_service.analyse_image(image_bytes)
# Maps findings → prediction dicts with source="xray"
```

**Branch B — Blood report PDF**
```python
pdf_bytes = await blood_report_file.read()
text = extract_text_from_pdf(pdf_bytes)
blood_values = extract_blood_values_from_report(text, gemini_api_key)
predictions = predict_from_blood_values(blood_values, patient_age)
# source tagged as "blood_ml" or "blood_rule"
```

**Branch C — Manual blood values**
```python
blood_values = json.loads(blood_values_json)   # already validated
predictions = predict_from_blood_values(blood_values, patient_age)
```

**Branch D — Symptom / notes assessment**
```python
# Builds a structured clinical prompt, calls Gemini REST API
# Parses JSON array response → prediction dicts with source="symptom"
```

### 3.6 Prediction Merging

`_merge_predictions(raw: List[dict]) -> List[PredictionItem]`

This pure function takes all raw predictions from all branches and produces a clean, deduplicated, sorted list.

**Algorithm:**
1. Group predictions by `disease.strip().lower()` (case-insensitive key)
2. For each group:
   - `probability` → keep the **maximum** across all entries
   - `evidence` → **concatenate** with ` | ` separator
   - `sources` → **collect all unique** source labels
   - `recommended_tests` → **set-union** (no duplicates)
3. Convert to `PredictionItem` Pydantic objects
4. **Sort descending** by probability

**Example:**

Input (two branches both flagged "Pneumonia"):
```python
[
  {"disease": "Pneumonia", "probability": 0.72, "source": "xray",    "recommended_tests": ["Chest CT"]},
  {"disease": "pneumonia", "probability": 0.85, "source": "symptom", "recommended_tests": ["Chest CT", "Sputum culture"]},
]
```

Output (one merged entry):
```python
PredictionItem(
  disease="Pneumonia",
  probability=0.85,
  sources=["xray", "symptom"],
  recommended_tests=["Chest CT", "Sputum culture"],
  evidence="X-ray finding: ... | Symptom assessment: ..."
)
```

### 3.7 Response Format

```json
{
  "status": "success",
  "predictions": [
    {
      "disease": "Pneumonia",
      "probability": 0.87,
      "evidence": "X-ray opacity in lower lobe | elevated WBC",
      "sources": ["xray", "blood_ml"],
      "recommended_tests": ["Chest CT", "Sputum culture"]
    }
  ],
  "evidence_summary": "Analysis based on: chest X-ray, blood report PDF.",
  "disclaimer": "These predictions are AI-assisted and must be reviewed by a qualified physician. They do not constitute medical advice or diagnosis."
}
```

`status` values:
- `"success"` — at least one service returned predictions
- `"partial"` — all services failed or returned nothing; `predictions` will be empty

### 3.8 Error Handling

| Scenario | HTTP status | Body |
|---|---|---|
| Missing/invalid JWT | 401 | FastAPI default |
| No clinical inputs | 422 | Descriptive message |
| Bad file type / age / JSON | 422 | Descriptive message |
| Individual service exception | — | Logged; branch returns `[]`; processing continues |
| All services fail | 200 | `status: "partial"`, empty predictions |
| Unhandled exception | 500 | `"An unexpected error occurred."` — no stack trace |

---

## 4. Backend — Router Registration

The router is registered in `backend/app/main.py`:

```python
# Import (line 11 — added alongside existing routers)
from app.routers import ..., prediction

# Registration (last include_router call)
app.include_router(prediction.router, tags=["Prediction"])
```

The router itself declares `prefix="/api/prediction"`, so the full path is `/api/prediction/disease`. It appears in the OpenAPI docs at `/docs` under the **Prediction** tag.

---

## 5. Backend — Test Suite

### 5.1 Unit Tests

File: `backend/tests/test_prediction.py`

**`TestMergePredictions`** — tests the pure `_merge_predictions` function:

| Test | What it checks |
|---|---|
| `test_empty_list_returns_empty` | `[]` in → `[]` out |
| `test_single_prediction_returned_unchanged` | single entry passes through intact |
| `test_two_different_diseases_both_returned` | two distinct diseases → two entries |
| `test_duplicate_disease_case_insensitive_merged` | `"pneumonia"` and `"PNEUMONIA"` → one entry |
| `test_duplicate_keeps_max_probability` | max of 0.4 and 0.9 → 0.9 |
| `test_duplicate_merges_recommended_tests_no_duplicates` | union with no repeats |
| `test_sorted_descending_by_probability` | output order is highest → lowest |
| `test_sources_collected_from_all_duplicates` | all source labels present |

**`TestValidateInputs`** — tests `_validate_inputs` directly:

| Test | What it checks |
|---|---|
| `test_all_none_raises_422` | all-None → HTTP 422 |
| `test_at_least_one_input_passes` | one field present → no exception |
| `test_xray_wrong_content_type_raises_422` | PDF as X-ray → 422 |
| `test_xray_jpeg_accepted` | `image/jpeg` → no exception |
| `test_xray_png_accepted` | `image/png` → no exception |
| `test_blood_report_wrong_content_type_raises_422` | image as PDF → 422 |
| `test_blood_report_pdf_accepted` | `application/pdf` → no exception |
| `test_patient_age_negative_raises_422` | age = -1 → 422 |
| `test_patient_age_131_raises_422` | age = 131 → 422 |
| `test_patient_age_0_accepted` | age = 0 → no exception |
| `test_patient_age_130_accepted` | age = 130 → no exception |

### 5.2 Property-Based Tests

Uses the `hypothesis` library. Each test runs **100 iterations** with randomly generated inputs, giving much broader coverage than hand-written examples.

| Property | What it proves |
|---|---|
| **Property 2** — No duplicate disease names | For any list of raw predictions, merged output never has two entries with the same disease name (case-insensitive) |
| **Property 3** — Max probability preserved | For any group sharing a disease name, merged probability equals `max()` of the group |
| **Property 4** — Recommended tests union | Merged tests equal the set-union of all input test lists |
| **Property 5** — Sources completeness | Every source label from every input appears in the merged entry |
| **Property 6** — Sorted descending | For every adjacent pair `(i, i+1)`, `predictions[i].probability >= predictions[i+1].probability` |

Each test is tagged with a comment in the format:
```python
# Feature: disease-prediction-api, Property N: <description>
```

### 5.3 Running the Tests

```bash
# From the backend/ directory
venv\Scripts\python.exe -m pytest tests/test_prediction.py -v
```

Expected output: **24 passed**.

Dependencies needed (already installed in the project venv):
```
pytest
hypothesis
fastapi
pydantic
```

---

## 6. Frontend — PredictionPanel Component

### 6.1 File Location

```
frontend/src/components/PredictionPanel.tsx
```

### 6.2 Props

```typescript
interface PredictionPanelProps {
  patientAge?: number   // optional — pre-fills patient_age in the FormData
}
```

### 6.3 Inputs

The panel renders four input controls:

| Control | Type | Maps to API field |
|---|---|---|
| Chest X-Ray | File upload (drag-and-drop) | `xray_file` |
| Blood Report PDF | File upload (drag-and-drop) | `blood_report_file` |
| Patient Symptoms | `<textarea>` | `patient_symptoms` |
| Doctor Notes | `<textarea>` | `doctor_notes` |

File upload slots use the same drag-and-drop pattern as `DocumentUploadSection.tsx` — dashed border, hover highlight, file preview row with name and size after selection.

### 6.4 API Call

On "Run Disease Prediction" click:

```typescript
const form = new FormData()
if (xrayFile)              form.append('xray_file', xrayFile)
if (bloodFile)             form.append('blood_report_file', bloodFile)
if (symptoms.trim())       form.append('patient_symptoms', symptoms.trim())
if (notes.trim())          form.append('doctor_notes', notes.trim())
if (patientAge !== undefined) form.append('patient_age', String(patientAge))

const token = localStorage.getItem('auth_token') || localStorage.getItem('token')

fetch(`${API_URL}/api/prediction/disease`, {
  method: 'POST',
  headers: token ? { Authorization: `Bearer ${token}` } : {},
  body: form,
})
```

> **Note:** `Content-Type` is intentionally omitted from headers. When sending `FormData`, the browser automatically sets `multipart/form-data` with the correct boundary string. Setting it manually would break the request.

The `API_URL` is read from `process.env.NEXT_PUBLIC_API_URL` (falls back to `http://localhost:8001`).

### 6.5 Results Display

**Loading state:** spinner replaces button text while the request is in flight.

**Error state:** red alert box with the error message from the API.

**Results:**

Each prediction renders as a collapsible `PredictionCard`:
- Header row: rank number, disease name, probability bar, colour-coded badge
- Expanded section: evidence text, recommended tests as pills, source labels

**Colour coding by probability:**

| Range | Colour | Label |
|---|---|---|
| > 75% | Red | High |
| > 45% | Amber | Moderate |
| ≤ 45% | Blue | Low |

The first card is auto-expanded; the rest are collapsed by default.

**Disclaimer** is rendered below the list in muted small text.

### 6.6 Using the Component

Minimal usage (standalone):
```tsx
import PredictionPanel from '@/components/PredictionPanel'

export default function MyPage() {
  return <PredictionPanel />
}
```

With patient age pre-filled:
```tsx
<PredictionPanel patientAge={patient.basic_info.age} />
```

---

## 7. Frontend — Consultation Page Integration

File: `frontend/src/app/dashboard/consultation/[id]/page.tsx`

**Changes made:**

1. Import added at the top of the file:
```tsx
import PredictionPanel from '@/components/PredictionPanel'
```

2. Inside the **AI Analysis** tab (`activeTab === 'ai'`), the existing 2-column grid (MedVision AI Analysis + AI Chat) is now wrapped in a React fragment `<>...</>` alongside a new full-width section below it:

```tsx
{activeTab === 'ai' && (
  <>
    {/* existing 2-column grid */}
    <div className="grid lg:grid-cols-2 gap-6">
      ...
    </div>

    {/* NEW — Disease Prediction Panel */}
    <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-6">
      <h3>Disease Prediction</h3>
      <p>... Token #{appointment?.queue_number}</p>
      <PredictionPanel patientAge={patientProfile?.basic_info?.age ?? undefined} />
    </div>
  </>
)}
```

The patient's age is sourced from `patientProfile.basic_info.age`, which is already loaded by `fetchConsultationData()` when the page mounts. The queue token number is shown in the subtitle for context.

> **Why the fragment was needed:** A JSX `&&` expression must return a single root element. Adding a sibling `<div>` next to the grid without a wrapper caused a parse error (`Expected '</>', got '{'`). The `<>...</>` fragment groups both elements without adding a DOM node.

---

## 8. Developer Tooling — Kiro Hook

File: `.kiro/hooks/python-lint-on-save.json`

This hook fires automatically whenever any `.py` file is saved inside `backend/app/services/` or `backend/app/routers/`.

```json
{
  "name": "Python Lint on Save",
  "version": "1.0.0",
  "description": "Checks syntax and docstring coverage on save",
  "when": {
    "type": "fileEdited",
    "patterns": [
      "backend/app/services/*.py",
      "backend/app/routers/*.py"
    ]
  },
  "then": {
    "type": "askAgent",
    "prompt": "..."
  }
}
```

**What the hook checks:**

1. **Syntax** — runs `backend/venv/Scripts/python.exe -m py_compile <file>`. A non-zero exit means a syntax error; the compiler's error message is shown as a warning.

2. **Docstrings** — scans every `def` and `async def` in the file. Any function whose body does not start with a string literal is flagged by name.

**Outcomes:**

| Result | Message shown |
|---|---|
| Both checks pass | `✓ <file> — syntax OK, all functions documented` |
| Syntax error | Warning with the compiler error output |
| Missing docstring(s) | Warning listing each undocumented function name |

The hook never modifies files — it only reports.

---

## 9. Data Flow — End to End

```
1. Doctor opens the Consultation page for a patient
2. Page loads → fetchConsultationData() → patientProfile.basic_info.age is populated
3. Doctor clicks the "AI Analysis" tab
4. PredictionPanel renders below the existing AI analysis grid
5. Doctor uploads an X-ray and/or types symptoms, clicks "Run Disease Prediction"
6. PredictionPanel builds a FormData object:
     - xray_file, patient_symptoms, patient_age (from prop), etc.
     - reads JWT from localStorage
7. POST /api/prediction/disease is sent
8. FastAPI validates JWT → validates inputs → fans out to services
9. Each service branch runs independently:
     - xray_service.analyse_image() → findings
     - pdf_service + blood_prediction_service → blood predictions
     - Gemini API → symptom-based predictions
10. _merge_predictions() deduplicates and sorts
11. PredictionResponse JSON is returned
12. PredictionPanel renders ranked PredictionCards, colour-coded by probability
13. Doctor reviews results alongside the existing AI analysis
```

---

## 10. Correctness Properties

These are formal guarantees that the system upholds, verified by the property-based test suite:

| # | Property | Verified by |
|---|---|---|
| 1 | Any request with all clinical fields absent returns HTTP 422 | Unit test |
| 2 | Merged output has no duplicate disease names (case-insensitive) | `test_property2_no_duplicate_disease_names` |
| 3 | Merged probability equals the maximum across all inputs for that disease | `test_property3_max_probability_preserved` |
| 4 | Merged recommended tests equal the set-union of all inputs | `test_property4_recommended_tests_union` |
| 5 | Merged sources contain every source label from all inputs | `test_property5_sources_completeness` |
| 6 | Output is sorted by probability descending | `test_property6_sorted_descending` |
| 7 | A service exception in one branch never prevents other branches from running | Architecture (try/except per branch) |
| 8 | Every response includes the disclaimer string | Architecture (hardcoded constant) |

---

## 11. Environment Variables

| Variable | Where set | Used by | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | `PredictionPanel.tsx`, `api.ts` | Base URL for all API calls |
| `GEMINI_API_KEY` | `backend/.env` | `settings.gemini_api_key` | Gemini API calls in symptom branch |

---

## 12. Extending the Feature

**Add a new input type (e.g. ECG file):**
1. Add a new `Optional[UploadFile]` parameter to `predict_disease` in `prediction.py`
2. Add a validation rule in `_validate_inputs`
3. Add a new branch function (e.g. `_run_ecg_branch`) wrapped in `try/except`
4. Call it in the fan-out section and extend `contributing_sources`
5. Add a `FileSlot` in `PredictionPanel.tsx`

**Add a new service to the merge:**
The `_merge_predictions` function is source-agnostic — it only cares about the `source` string field. Any new branch just needs to produce dicts with the standard shape:
```python
{
  "disease": str,
  "probability": float,   # 0.0 – 1.0
  "evidence": str,
  "source": str,
  "recommended_tests": List[str],
}
```

**Change the probability colour thresholds:**
Edit the `probabilityColor` function in `PredictionPanel.tsx`:
```typescript
function probabilityColor(p: number) {
  if (p > 0.75) return { ... }   // ← change threshold here
  if (p > 0.45) return { ... }   // ← and here
  return { ... }
}
```

---

## 13. Glossary

| Term | Meaning |
|---|---|
| **Multipart form-data** | An HTTP encoding format that allows files and text fields to be sent together in a single request |
| **JWT (JSON Web Token)** | A compact, signed token used to prove a user is authenticated. Sent in the `Authorization: Bearer <token>` header |
| **Fan-out** | Running multiple independent operations (service calls) from a single entry point |
| **Deduplication** | Removing duplicate entries — here, merging predictions for the same disease from different sources |
| **Property-based testing** | A testing technique where you define a rule that must always hold, then the library generates hundreds of random inputs to try to break it |
| **Hypothesis** | The Python property-based testing library used in this project |
| **Pydantic model** | A Python class that validates and serialises data. Used here for `PredictionItem` and `PredictionResponse` |
| **FormData** | A browser API for building multipart/form-data request bodies in JavaScript |
| **React fragment (`<>...</>`)** | A wrapper that groups multiple JSX elements without adding an extra DOM node |
| **Kiro hook** | An automation rule that triggers an agent action when an IDE event occurs (e.g. file save) |
