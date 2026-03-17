"""
Tests for the Disease Prediction API.

Covers:
  - Unit tests: input validation, _merge_predictions, response assembly
  - Property-based tests (hypothesis): Properties 2–6 on _merge_predictions
"""

import sys
import os
import importlib
import types

# Ensure the backend package is importable when running from the backend/ dir
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from hypothesis import given, settings as h_settings
from hypothesis import strategies as st

# ── Import prediction.py directly, bypassing the app.routers package __init__
# (which would pull in all other routers and their heavy dependencies)
import importlib.util as _ilu

_spec = _ilu.spec_from_file_location(
    "prediction_module",
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "app", "routers", "prediction.py"),
)
_mod = _ilu.module_from_spec(_spec)

# Stub out heavy transitive imports before loading
_stub_modules = [
    "app", "app.config", "app.services", "app.services.auth_service",
    "app.services.blood_prediction_service", "app.services.pdf_service",
    "app.services.xray_service",
]
for _name in _stub_modules:
    if _name not in sys.modules:
        sys.modules[_name] = types.ModuleType(_name)

# Provide minimal stubs for symbols imported by prediction.py
_auth_stub = sys.modules["app.services.auth_service"]
_auth_stub.get_current_user_from_token = lambda: None  # type: ignore

_blood_stub = sys.modules["app.services.blood_prediction_service"]
_blood_stub.extract_blood_values_from_report = None  # type: ignore
_blood_stub.predict_from_blood_values = None  # type: ignore

_pdf_stub = sys.modules["app.services.pdf_service"]
_pdf_stub.extract_text_from_pdf = None  # type: ignore

_xray_stub = sys.modules["app.services.xray_service"]
_xray_stub.xray_service = MagicMock()  # type: ignore

# Stub app.config.settings
_config_stub = sys.modules["app.config"]
_settings_obj = types.SimpleNamespace(gemini_api_key="test-key")
_config_stub.settings = _settings_obj  # type: ignore

_spec.loader.exec_module(_mod)  # type: ignore

_merge_predictions = _mod._merge_predictions
PredictionItem = _mod.PredictionItem
DISCLAIMER = _mod.DISCLAIMER
_validate_inputs = _mod._validate_inputs


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def make_pred(disease: str, probability: float, source: str = "xray",
              evidence: str = "some evidence",
              recommended_tests=None) -> dict:
    return {
        "disease": disease,
        "probability": probability,
        "evidence": evidence,
        "source": source,
        "recommended_tests": recommended_tests or [],
    }


# ─────────────────────────────────────────────────────────────────────────────
# Unit tests — _merge_predictions
# ─────────────────────────────────────────────────────────────────────────────

class TestMergePredictions:
    def test_empty_list_returns_empty(self):
        assert _merge_predictions([]) == []

    def test_single_prediction_returned_unchanged(self):
        raw = [make_pred("Pneumonia", 0.8, recommended_tests=["CT scan"])]
        result = _merge_predictions(raw)
        assert len(result) == 1
        assert result[0].disease == "Pneumonia"
        assert result[0].probability == 0.8
        assert result[0].recommended_tests == ["CT scan"]

    def test_two_different_diseases_both_returned(self):
        raw = [
            make_pred("Pneumonia", 0.8),
            make_pred("Diabetes", 0.5),
        ]
        result = _merge_predictions(raw)
        assert len(result) == 2

    def test_duplicate_disease_case_insensitive_merged(self):
        raw = [
            make_pred("pneumonia", 0.7, source="xray"),
            make_pred("PNEUMONIA", 0.9, source="symptom"),
        ]
        result = _merge_predictions(raw)
        assert len(result) == 1

    def test_duplicate_keeps_max_probability(self):
        raw = [
            make_pred("Flu", 0.4, source="xray"),
            make_pred("Flu", 0.9, source="symptom"),
        ]
        result = _merge_predictions(raw)
        assert result[0].probability == 0.9

    def test_duplicate_merges_recommended_tests_no_duplicates(self):
        raw = [
            make_pred("Flu", 0.4, recommended_tests=["CBC", "X-ray"]),
            make_pred("Flu", 0.6, recommended_tests=["X-ray", "MRI"]),
        ]
        result = _merge_predictions(raw)
        tests = result[0].recommended_tests
        assert "CBC" in tests
        assert "X-ray" in tests
        assert "MRI" in tests
        assert tests.count("X-ray") == 1  # no duplicates

    def test_sorted_descending_by_probability(self):
        raw = [
            make_pred("Flu", 0.3),
            make_pred("Pneumonia", 0.9),
            make_pred("Diabetes", 0.6),
        ]
        result = _merge_predictions(raw)
        probs = [r.probability for r in result]
        assert probs == sorted(probs, reverse=True)

    def test_sources_collected_from_all_duplicates(self):
        raw = [
            make_pred("Flu", 0.4, source="xray"),
            make_pred("Flu", 0.6, source="symptom"),
        ]
        result = _merge_predictions(raw)
        assert "xray" in result[0].sources
        assert "symptom" in result[0].sources


# ─────────────────────────────────────────────────────────────────────────────
# Unit tests — input validation (via _validate_inputs directly)
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import HTTPException


class TestValidateInputs:
    def _mock_file(self, content_type: str):
        f = MagicMock()
        f.content_type = content_type
        return f

    def test_all_none_raises_422(self):
        with pytest.raises(HTTPException) as exc_info:
            _validate_inputs(None, None, None, None, None, None)
        assert exc_info.value.status_code == 422

    def test_at_least_one_input_passes(self):
        # Should not raise
        _validate_inputs(None, None, None, None, "cough", None)

    def test_xray_wrong_content_type_raises_422(self):
        f = self._mock_file("application/pdf")
        with pytest.raises(HTTPException) as exc_info:
            _validate_inputs(f, None, None, None, "cough", None)
        assert exc_info.value.status_code == 422

    def test_xray_jpeg_accepted(self):
        f = self._mock_file("image/jpeg")
        _validate_inputs(f, None, None, None, None, None)  # no raise

    def test_xray_png_accepted(self):
        f = self._mock_file("image/png")
        _validate_inputs(f, None, None, None, None, None)  # no raise

    def test_blood_report_wrong_content_type_raises_422(self):
        f = self._mock_file("image/jpeg")
        with pytest.raises(HTTPException) as exc_info:
            _validate_inputs(None, f, None, None, "cough", None)
        assert exc_info.value.status_code == 422

    def test_blood_report_pdf_accepted(self):
        f = self._mock_file("application/pdf")
        _validate_inputs(None, f, None, None, None, None)  # no raise

    def test_patient_age_negative_raises_422(self):
        with pytest.raises(HTTPException) as exc_info:
            _validate_inputs(None, None, None, -1, "cough", None)
        assert exc_info.value.status_code == 422

    def test_patient_age_131_raises_422(self):
        with pytest.raises(HTTPException) as exc_info:
            _validate_inputs(None, None, None, 131, "cough", None)
        assert exc_info.value.status_code == 422

    def test_patient_age_0_accepted(self):
        _validate_inputs(None, None, None, 0, "cough", None)  # no raise

    def test_patient_age_130_accepted(self):
        _validate_inputs(None, None, None, 130, "cough", None)  # no raise


# ─────────────────────────────────────────────────────────────────────────────
# Property-based tests — Properties 2–6 on _merge_predictions
# ─────────────────────────────────────────────────────────────────────────────

# Strategies
disease_name = st.text(min_size=1, max_size=30, alphabet=st.characters(
    whitelist_categories=("Lu", "Ll"), whitelist_characters=" -"
))
probability_st = st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False)
source_st = st.sampled_from(["xray", "blood_ml", "blood_rule", "symptom"])
test_name_st = st.text(min_size=1, max_size=20, alphabet=st.characters(
    whitelist_categories=("Lu", "Ll"), whitelist_characters=" -"
))

pred_st = st.fixed_dictionaries({
    "disease": disease_name,
    "probability": probability_st,
    "evidence": st.text(max_size=50),
    "source": source_st,
    "recommended_tests": st.lists(test_name_st, max_size=5),
})


# Feature: disease-prediction-api, Property 2: merged output has no duplicate disease names
@given(st.lists(pred_st, min_size=0, max_size=20))
@h_settings(max_examples=100)
def test_property2_no_duplicate_disease_names(raw):
    """Property 2: Deduplication by disease name — merged output has no duplicate disease names."""
    result = _merge_predictions(raw)
    names = [item.disease.strip().lower() for item in result]
    assert len(names) == len(set(names)), "Duplicate disease names found in merged output"


# Feature: disease-prediction-api, Property 3: merged probability equals max of group
@given(
    disease_name,
    st.lists(probability_st, min_size=1, max_size=10),
    source_st,
)
@h_settings(max_examples=100)
def test_property3_max_probability_preserved(disease, probs, source):
    """Property 3: Max probability preserved after merge."""
    raw = [make_pred(disease, p, source=source) for p in probs]
    result = _merge_predictions(raw)
    assert len(result) == 1
    assert abs(result[0].probability - max(probs)) < 1e-9, (
        f"Expected max prob {max(probs)}, got {result[0].probability}"
    )


# Feature: disease-prediction-api, Property 4: merged tests equal set-union of all inputs
@given(
    disease_name,
    st.lists(st.lists(test_name_st, max_size=5), min_size=1, max_size=5),
)
@h_settings(max_examples=100)
def test_property4_recommended_tests_union(disease, test_groups):
    """Property 4: Recommended tests union after merge."""
    raw = [make_pred(disease, 0.5, recommended_tests=tests) for tests in test_groups]
    result = _merge_predictions(raw)
    assert len(result) == 1
    merged_tests = set(result[0].recommended_tests)
    all_tests = set(t for group in test_groups for t in group)
    assert merged_tests == all_tests, (
        f"Expected tests {all_tests}, got {merged_tests}"
    )


# Feature: disease-prediction-api, Property 5: merged sources contain all input source labels
@given(
    disease_name,
    st.lists(source_st, min_size=1, max_size=4),
)
@h_settings(max_examples=100)
def test_property5_sources_completeness(disease, sources):
    """Property 5: Sources completeness after merge."""
    raw = [make_pred(disease, 0.5, source=s) for s in sources]
    result = _merge_predictions(raw)
    assert len(result) == 1
    merged_sources = set(result[0].sources)
    assert set(sources).issubset(merged_sources), (
        f"Expected all sources {set(sources)} in {merged_sources}"
    )


# Feature: disease-prediction-api, Property 6: adjacent pairs satisfy predictions[i].probability >= predictions[i+1].probability
@given(st.lists(pred_st, min_size=0, max_size=20))
@h_settings(max_examples=100)
def test_property6_sorted_descending(raw):
    """Property 6: Predictions sorted descending by probability."""
    result = _merge_predictions(raw)
    for i in range(len(result) - 1):
        assert result[i].probability >= result[i + 1].probability, (
            f"Not sorted at index {i}: {result[i].probability} < {result[i+1].probability}"
        )
