"""
Trajectory Prediction Prompt
Predicts patient outcomes based on similar cases.
"""

TRAJECTORY_PROMPT = """
Based on the complete patient history provided, predict the likely trajectory.

TASK: For each of the following treatment options, provide:
1. Estimated response probability (percentage)
2. Expected progression-free survival (months range)
3. Key factors supporting this prediction (from patient data)
4. Potential risks and side effects
5. Recommendation level

Treatment options to evaluate: {treatment_options}

FORMAT YOUR RESPONSE AS:

## Treatment Option: [Name]

### Predicted Outcomes
- Response probability: X%
- Progression-free survival: X-X months
- Overall survival benefit: X months (estimated)

### Supporting Factors from Patient History
- Cite specific data points from the patient's history
- Reference genetic markers, prior treatment responses
- Note relevant lab trends

### Risk Factors
- List potential risks based on patient profile
- Note drug interactions if applicable

### Recommendation Level
Choose one: STRONGLY RECOMMENDED | RECOMMENDED | CONSIDER | NOT RECOMMENDED

Provide a brief rationale for the recommendation.

---

After evaluating all options, provide:

## Overall Recommendation
Summarize the best course of action with confidence level (high/medium/low).

## Key Uncertainties
Note any factors that could change the prediction.
"""


TRAJECTORY_COMPARISON_PROMPT = """
Compare these treatment trajectories and provide a clear recommendation:

{trajectories}

Based on this patient's specific profile and history, which treatment path 
offers the best balance of efficacy and quality of life?

Provide your recommendation with:
1. Primary recommended treatment
2. Alternative if primary is not tolerated
3. Key monitoring points
4. Expected timeline for response assessment
"""
