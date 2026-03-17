# Implementation Plan: Disease Prediction API

## Overview

Implement `POST /api/prediction/disease` in `backend/app/routers/prediction.py`. The router fans out to existing services, merges predictions, and returns a ranked JSON response. Auth uses the existing `get_current_user_from_token` dependency.

## Tasks

- [x] 1. Define Pydantic response models and router skeleton
  - Create `PredictionItem` and `PredictionResponse` Pydantic models in `prediction.py`
  - Set up the `APIRouter` with `prefix="/api/prediction"` and `tags=["prediction"]`
  - Add the empty `predict_disease` endpoint stub with all form/file parameters and the `get_current_user_from_token` dependency
  - _Requirements: 1.1, 1.2, 8.5_

- [ ] 2. Implement input validation
  - [x] 2.1 Add validation logic inside `predict_disease`
    - Raise HTTP 422 if all five clinical input fields are `None`
    - Validate `blood_values_json` is parseable JSON when provided; raise HTTP 422 on failure
    - Validate `xray_file` content type is `image/jpeg` or `image/png`; raise HTTP 422 otherwise
    - Validate `blood_report_file` content type is `application/pdf`; raise HTTP 422 otherwise
    - Validate `patient_age` is in range [0, 130] when provided; raise HTTP 422 otherwise
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 2.2 Write unit tests for input validation
    - Test all-None inputs → HTTP 422
    - Test invalid JSON in `blood_values_json` → HTTP 422
    - Test wrong content type for `xray_file` → HTTP 422
    - Test wrong content type for `blood_report_file` → HTTP 422
    - Test `patient_age` = -1 and 131 → HTTP 422
    - Test missing `Authorization` header → HTTP 401
    - Test invalid JWT → HTTP 401
    - _Requirements: 1.1, 1.2, 2.1–2.6_

  - [ ]* 2.3 Write property test for no-input rejection (Property 1)
    - **Property 1: No-input rejection**
    - **Validates: Requirements 2.1**
    - Use `hypothesis` to generate requests with all clinical fields absent and assert HTTP 422

- [ ] 3. Implement the `_merge_predictions` helper
  - [x] 3.1 Write `_merge_predictions(raw: List[dict]) -> List[PredictionItem]`
    - Deduplicate by `disease` (case-insensitive key)
    - For duplicates: keep `max(probability)`, union `recommended_tests`, concatenate `evidence`, collect all `sources`
    - Sort result by `probability` descending
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 3.2 Write property test for deduplication (Property 2)
    - **Property 2: Deduplication by disease name**
    - **Validates: Requirements 7.1**
    - `# Feature: disease-prediction-api, Property 2: merged output has no duplicate disease names`

  - [ ]* 3.3 Write property test for max probability (Property 3)
    - **Property 3: Max probability preserved after merge**
    - **Validates: Requirements 7.2**
    - `# Feature: disease-prediction-api, Property 3: merged probability equals max of group`

  - [ ]* 3.4 Write property test for recommended tests union (Property 4)
    - **Property 4: Recommended tests union after merge**
    - **Validates: Requirements 7.3**
    - `# Feature: disease-prediction-api, Property 4: merged tests equal set-union of all inputs`

  - [ ]* 3.5 Write property test for sources completeness (Property 5)
    - **Property 5: Sources completeness after merge**
    - **Validates: Requirements 7.5**
    - `# Feature: disease-prediction-api, Property 5: merged sources contain all input source labels`

  - [ ]* 3.6 Write property test for sorted order (Property 6)
    - **Property 6: Predictions sorted descending by probability**
    - **Validates: Requirements 7.6**
    - `# Feature: disease-prediction-api, Property 6: adjacent pairs satisfy predictions[i].probability >= predictions[i+1].probability`

- [ ] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement service fan-out pipeline
  - [x] 5.1 Implement X-ray analysis branch
    - Read `xray_file` bytes and call `xray_service.analyse_image(bytes)`
    - On `success: true`, map findings to prediction dicts with `source="xray"`
    - On `success: false` or exception, log the error and continue
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 5.2 Implement blood report PDF branch
    - Read `blood_report_file` bytes, call `pdf_service.extract_text_from_bytes()`
    - Pass text and `settings.gemini_api_key` to `blood_prediction_service.extract_blood_values_from_report()`
    - Pass extracted values and `patient_age` to `blood_prediction_service.predict_from_blood_values()`
    - On any exception, log and continue
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 5.3 Implement manual blood values branch
    - Parse `blood_values_json` into a dict (already validated in step 2)
    - Pass to `blood_prediction_service.predict_from_blood_values()` with `patient_age`
    - On exception, log and continue
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 5.4 Implement `_call_gemini_symptom_assessment` helper
    - Build a structured clinical prompt from `patient_symptoms`, `doctor_notes`, and `patient_age`
    - Call the Gemini API using `settings.gemini_api_key`
    - Parse the response into prediction dicts with `source="symptom"`
    - Return `[]` on any failure
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 5.5 Write unit tests for service branches
    - Mock each service; assert correct predictions are collected per branch
    - Assert that a service exception in one branch does not prevent other branches from running
    - _Requirements: 3.1–3.3, 4.1–4.4, 5.1–5.3, 6.1–6.3_

  - [ ]* 5.6 Write property test for service failure isolation (Property 7)
    - **Property 7: Service failure isolation**
    - **Validates: Requirements 9.1**
    - `# Feature: disease-prediction-api, Property 7: for any subset of failing services, endpoint returns without raising`
    - Use `hypothesis` to generate random subsets of services to fail; assert response is always returned

- [ ] 6. Wire pipeline into response and build evidence summary
  - [x] 6.1 Collect all raw predictions from all branches, call `_merge_predictions`, build `evidence_summary`
    - `evidence_summary` lists which input types contributed (e.g. "Analysis based on: chest X-ray, blood report PDF.")
    - Set `status` to `"success"` if any predictions exist, `"partial"` if all services failed
    - Set `disclaimer` to `"These predictions are AI-assisted and must be reviewed by a qualified physician."`
    - Wrap in a top-level `try/except`; return HTTP 500 with generic message on unhandled exceptions
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.2, 9.3_

  - [ ]* 6.2 Write property test for response structure invariant (Property 8)
    - **Property 8: Disclaimer and evidence_summary always present**
    - **Validates: Requirements 8.3, 8.4**
    - `# Feature: disease-prediction-api, Property 8: every response contains disclaimer and evidence_summary`

  - [ ]* 6.3 Write unit tests for response assembly
    - All services return predictions → `status: "success"`
    - All services fail → `status: "partial"`, empty predictions list
    - Unhandled exception → HTTP 500, no stack trace in body
    - _Requirements: 8.1, 8.2, 9.2, 9.3_

- [x] 7. Register router in the FastAPI application
  - Import and include `prediction.router` in `backend/app/main.py` (or wherever routers are registered)
  - Verify the route appears in the OpenAPI schema at `/docs`
  - _Requirements: all_

- [x] 8. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- `hypothesis` is the property-based testing library; install with `pip install hypothesis` if not present
- Each property test must run a minimum of 100 iterations (`@settings(max_examples=100)`)
- Properties 2–6 test `_merge_predictions` directly (no HTTP layer) — they are fast and have no external dependencies
- All service calls must be wrapped in individual `try/except` blocks to satisfy the error isolation requirements
