# Requirements Document

## Introduction

The Disease Prediction API is a new FastAPI endpoint added to the MedVision AI backend that accepts multipart form data containing one or more clinical inputs (chest X-ray image, blood lab report PDF, manually entered blood values, patient symptoms, and doctor notes) and returns a merged, ranked list of disease predictions. The endpoint integrates the existing X-ray analysis service, blood prediction service, and Gemini-based symptom assessment into a single unified response.

## Glossary

- **Prediction_Endpoint**: The FastAPI route `POST /api/prediction/disease` implemented in `backend/app/routers/prediction.py`
- **Authenticated_User**: A user whose JWT has been validated by `get_current_user_from_token`
- **XRay_Service**: The `xray_service.analyse_image(image_bytes)` function that returns X-ray findings
- **PDF_Service**: The `pdf_service.extract_text_from_bytes(pdf_bytes)` function that extracts text from a PDF
- **Blood_Prediction_Service**: The service providing `extract_blood_values_from_report()` and `predict_from_blood_values()`
- **Gemini_Service**: The Gemini API used for symptom and clinical note assessment
- **Prediction**: A dict containing `disease`, `probability`, `evidence`, `source`, and `recommended_tests`
- **Merged_Prediction**: A deduplicated prediction combining results from multiple sources, keeping max probability, merged evidence, merged recommended tests, and all contributing sources
- **Evidence_Summary**: A human-readable string summarising all clinical inputs that contributed to the response

---

## Requirements

### Requirement 1: Authentication

**User Story:** As a clinician, I want the prediction endpoint to require a valid JWT, so that only authorised users can access patient prediction data.

#### Acceptance Criteria

1. WHEN a request is made without an `Authorization` header, THE Prediction_Endpoint SHALL return HTTP 401.
2. WHEN a request is made with an invalid or expired JWT, THE Prediction_Endpoint SHALL return HTTP 401.
3. WHEN a request is made with a valid JWT, THE Prediction_Endpoint SHALL proceed to process the request.

---

### Requirement 2: Input Validation

**User Story:** As a clinician, I want the endpoint to reject requests with no clinical inputs, so that meaningless empty predictions are never returned.

#### Acceptance Criteria

1. WHEN a request provides none of `xray_file`, `blood_report_file`, `blood_values_json`, `patient_symptoms`, or `doctor_notes`, THE Prediction_Endpoint SHALL return HTTP 422 with a descriptive error message.
2. WHEN a request provides at least one of the accepted input fields, THE Prediction_Endpoint SHALL accept the request and begin processing.
3. WHEN `blood_values_json` is provided and is not valid JSON, THE Prediction_Endpoint SHALL return HTTP 422 with a descriptive error message.
4. WHEN `xray_file` is provided and its content type is not `image/jpeg` or `image/png`, THE Prediction_Endpoint SHALL return HTTP 422 with a descriptive error message.
5. WHEN `blood_report_file` is provided and its content type is not `application/pdf`, THE Prediction_Endpoint SHALL return HTTP 422 with a descriptive error message.
6. WHEN `patient_age` is provided and is less than 0 or greater than 130, THE Prediction_Endpoint SHALL return HTTP 422 with a descriptive error message.

---

### Requirement 3: X-Ray Analysis

**User Story:** As a clinician, I want chest X-ray images to be analysed automatically, so that radiological findings contribute to the disease predictions.

#### Acceptance Criteria

1. WHEN `xray_file` is provided, THE Prediction_Endpoint SHALL read the file bytes and pass them to `XRay_Service.analyse_image()`.
2. WHEN `XRay_Service` returns `success: true`, THE Prediction_Endpoint SHALL collect the findings as X-ray-sourced predictions.
3. IF `XRay_Service` returns `success: false` or raises an exception, THEN THE Prediction_Endpoint SHALL record the failure and continue processing remaining inputs.

---

### Requirement 4: Blood Report PDF Analysis

**User Story:** As a clinician, I want uploaded blood lab PDFs to be parsed and analysed, so that lab values contribute to the disease predictions.

#### Acceptance Criteria

1. WHEN `blood_report_file` is provided, THE Prediction_Endpoint SHALL pass the file bytes to `PDF_Service.extract_text_from_bytes()` to obtain the report text.
2. WHEN report text is obtained, THE Prediction_Endpoint SHALL pass the text and the Gemini API key to `Blood_Prediction_Service.extract_blood_values_from_report()`.
3. WHEN blood values are extracted, THE Prediction_Endpoint SHALL pass them along with `patient_age` to `Blood_Prediction_Service.predict_from_blood_values()`.
4. IF any step in the blood report pipeline raises an exception, THEN THE Prediction_Endpoint SHALL record the failure and continue processing remaining inputs.

---

### Requirement 5: Manual Blood Values Analysis

**User Story:** As a clinician, I want to enter blood values manually as JSON, so that patients without a PDF report can still receive blood-based predictions.

#### Acceptance Criteria

1. WHEN `blood_values_json` is provided, THE Prediction_Endpoint SHALL parse the JSON string into a dict of blood values.
2. WHEN the blood values dict is obtained, THE Prediction_Endpoint SHALL pass it along with `patient_age` to `Blood_Prediction_Service.predict_from_blood_values()`.
3. IF `Blood_Prediction_Service.predict_from_blood_values()` raises an exception, THEN THE Prediction_Endpoint SHALL record the failure and continue processing remaining inputs.

---

### Requirement 6: Symptom and Clinical Note Assessment

**User Story:** As a clinician, I want patient symptoms and doctor notes to be assessed by an AI model, so that clinical observations contribute to the disease predictions.

#### Acceptance Criteria

1. WHEN `patient_symptoms` or `doctor_notes` is provided, THE Prediction_Endpoint SHALL construct a clinical assessment prompt and call the Gemini API.
2. WHEN the Gemini API returns a response, THE Prediction_Endpoint SHALL parse the response into a list of Prediction dicts with source `"symptom"`.
3. IF the Gemini API call fails or returns an unparseable response, THEN THE Prediction_Endpoint SHALL record the failure and continue processing remaining inputs.

---

### Requirement 7: Prediction Merging

**User Story:** As a clinician, I want predictions from all sources to be merged into a single deduplicated list, so that I receive a coherent ranked view of potential diagnoses.

#### Acceptance Criteria

1. THE Prediction_Endpoint SHALL deduplicate predictions by disease name (case-insensitive).
2. WHEN the same disease appears from multiple sources, THE Prediction_Endpoint SHALL retain the maximum probability value across all sources.
3. WHEN the same disease appears from multiple sources, THE Prediction_Endpoint SHALL merge `recommended_tests` lists, removing duplicates.
4. WHEN the same disease appears from multiple sources, THE Prediction_Endpoint SHALL concatenate `evidence` strings from all sources.
5. WHEN the same disease appears from multiple sources, THE Prediction_Endpoint SHALL collect all contributing source labels into the `sources` list.
6. THE Prediction_Endpoint SHALL sort the merged predictions list by probability in descending order.

---

### Requirement 8: Response Format

**User Story:** As a frontend developer, I want a consistent JSON response structure, so that the UI can reliably render prediction results.

#### Acceptance Criteria

1. WHEN at least one prediction is produced, THE Prediction_Endpoint SHALL return HTTP 200 with `status: "success"` and the merged predictions list.
2. WHEN all service calls fail but at least one was attempted, THE Prediction_Endpoint SHALL return HTTP 200 with `status: "partial"` and an empty or partial predictions list.
3. THE Prediction_Endpoint SHALL include an `evidence_summary` string in every response, summarising which input types contributed.
4. THE Prediction_Endpoint SHALL include a `disclaimer` string in every response stating that results are for informational purposes only and do not constitute medical advice.
5. WHEN a prediction is returned, THE Prediction_Endpoint SHALL include `disease`, `probability`, `evidence`, `sources`, and `recommended_tests` fields for each prediction.

---

### Requirement 9: Error Isolation

**User Story:** As a clinician, I want partial results to be returned even when some services fail, so that a single service outage does not block all predictions.

#### Acceptance Criteria

1. WHEN one or more service calls fail and at least one succeeds, THE Prediction_Endpoint SHALL return the successful predictions with `status: "success"`.
2. WHEN all service calls fail, THE Prediction_Endpoint SHALL return `status: "partial"` with an empty predictions list and an `evidence_summary` describing the failures.
3. IF an unhandled exception occurs during request processing, THEN THE Prediction_Endpoint SHALL return HTTP 500 with a generic error message and SHALL NOT expose internal stack traces.
