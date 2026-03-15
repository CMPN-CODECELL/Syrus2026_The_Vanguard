"""
Report Simplification Prompt
Converts medical reports to plain language for patients.
"""

SIMPLIFY_REPORT_PROMPT = """
You are a friendly medical translator. Your job is to extract data from lab results and return it as structured JSON, while also providing simple explanations.

LAB REPORT:
{report_text}

---

Return a valid JSON object with the following structure:
{{
  "results": [
    {{
      "test_name": "Name of the test",
      "value": "Value with unit",
      "normal_range": "Range if available",
      "status": "NORMAL | ELEVATED | LOW | CRITICAL",
      "explanation": "1-2 simple sentences explaining what this measures and what the result means",
      "action_needed": "Brief actionable advice"
    }}
  ],
  "summary": "2-3 sentence summary of overall results",
  "questions": [
    "Question 1",
    "Question 2",
    "Question 3"
  ],
  "simplified": "A full text markdown version of the report explanation for display"
}}

IMPORTANT:
- The `simplified` field should contain the human-readable explanation formatted in Markdown, exactly as you would have produced it before (with ## Headers).
- `results` should contain the raw data extracted.
- Ensure the JSON is valid. Do not include markdown code blocks (```json) in the response, just return the raw JSON object.
"""


MEDICAL_TERM_EXPLANATION_PROMPT = """
Explain this medical term in simple language:

Term: {term}

Provide:
1. Simple definition (1-2 sentences)
2. Pronunciation guide
3. Why it matters for health
4. Related terms they might see

Write at a 6th-grade reading level. Avoid medical jargon.
"""
