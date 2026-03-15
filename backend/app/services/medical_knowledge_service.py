"""
Medical Knowledge Service
Curated database of medical terminology with simplified explanations.
All information sourced from verified medical resources.
"""
from typing import List, Dict, Optional
from datetime import datetime

# Medical terminology knowledge base with verified sources
MEDICAL_KNOWLEDGE_BASE = {
    "lab_tests": {
        "name": "Common Lab Tests",
        "description": "Understanding your blood work and laboratory results",
        "icon": "flask",
        "terms": [
            {
                "id": "cbc",
                "name": "Complete Blood Count (CBC)",
                "short_description": "A test that measures different components of your blood",
                "detailed_explanation": """A Complete Blood Count (CBC) is one of the most common blood tests. It measures several components of your blood:

**Red Blood Cells (RBC)**: Carry oxygen throughout your body
**White Blood Cells (WBC)**: Fight infections and disease
**Hemoglobin**: The protein in red blood cells that carries oxygen
**Hematocrit**: The percentage of your blood that is red blood cells
**Platelets**: Help your blood clot

**Why is this test ordered?**
Doctors use CBC to screen for anemia, infections, and many other conditions. It helps them understand your overall health status.

**What do the numbers mean?**
- Low RBC/Hemoglobin may indicate anemia
- High WBC may suggest infection or inflammation
- Low platelets may mean bleeding risk""",
                "normal_ranges": {
                    "RBC (male)": "4.7-6.1 million cells/mcL",
                    "RBC (female)": "4.2-5.4 million cells/mcL",
                    "WBC": "4,500-11,000 cells/mcL",
                    "Hemoglobin (male)": "13.5-17.5 g/dL",
                    "Hemoglobin (female)": "12.0-16.0 g/dL",
                    "Platelets": "150,000-400,000 cells/mcL"
                },
                "references": [
                    {
                        "source": "MedlinePlus - National Library of Medicine",
                        "url": "https://medlineplus.gov/lab-tests/complete-blood-count-cbc/",
                        "section": "What is a complete blood count (CBC)?",
                        "accessed": "2024"
                    },
                    {
                        "source": "Mayo Clinic",
                        "url": "https://www.mayoclinic.org/tests-procedures/complete-blood-count/about/pac-20384919",
                        "section": "Overview",
                        "accessed": "2024"
                    }
                ]
            },
            {
                "id": "lipid_panel",
                "name": "Lipid Panel (Cholesterol Test)",
                "short_description": "Measures fats in your blood including cholesterol",
                "detailed_explanation": """A Lipid Panel measures the fats (lipids) in your blood. These fats are important for understanding your heart health.

**What it measures:**

**Total Cholesterol**: The overall amount of cholesterol in your blood
**LDL ("Bad" Cholesterol)**: Can build up in your arteries and increase heart disease risk
**HDL ("Good" Cholesterol)**: Helps remove bad cholesterol from your blood
**Triglycerides**: A type of fat your body uses for energy

**Why does this matter?**
High cholesterol usually has no symptoms, but it can lead to heart disease and stroke. Regular testing helps catch problems early.

**How to improve your numbers:**
- Eat more fruits, vegetables, and whole grains
- Exercise regularly
- Maintain a healthy weight
- Limit saturated and trans fats""",
                "normal_ranges": {
                    "Total Cholesterol": "Less than 200 mg/dL (desirable)",
                    "LDL": "Less than 100 mg/dL (optimal)",
                    "HDL": "60 mg/dL or higher (protective)",
                    "Triglycerides": "Less than 150 mg/dL (normal)"
                },
                "references": [
                    {
                        "source": "American Heart Association",
                        "url": "https://www.heart.org/en/health-topics/cholesterol/about-cholesterol/what-your-cholesterol-levels-mean",
                        "section": "Cholesterol Levels",
                        "accessed": "2024"
                    },
                    {
                        "source": "MedlinePlus - National Library of Medicine",
                        "url": "https://medlineplus.gov/lab-tests/lipid-panel/",
                        "section": "What is a lipid panel?",
                        "accessed": "2024"
                    }
                ]
            },
            {
                "id": "blood_glucose",
                "name": "Blood Glucose (Blood Sugar)",
                "short_description": "Measures the amount of sugar in your blood",
                "detailed_explanation": """Blood glucose tests measure how much sugar (glucose) is in your blood. Glucose is your body's main source of energy.

**Types of glucose tests:**

**Fasting Blood Sugar**: Taken after not eating for 8-12 hours
**Random Blood Sugar**: Taken at any time, regardless of eating
**HbA1c (A1C)**: Shows your average blood sugar over 2-3 months

**Why is this important?**
Blood sugar levels help diagnose and monitor diabetes. High blood sugar over time can damage your heart, kidneys, eyes, and nerves.

**Understanding your results:**

**Fasting Blood Sugar:**
- Normal: Less than 100 mg/dL
- Prediabetes: 100-125 mg/dL
- Diabetes: 126 mg/dL or higher

**HbA1c:**
- Normal: Below 5.7%
- Prediabetes: 5.7-6.4%
- Diabetes: 6.5% or higher""",
                "normal_ranges": {
                    "Fasting Blood Sugar": "Less than 100 mg/dL",
                    "Random Blood Sugar": "Less than 140 mg/dL",
                    "HbA1c": "Below 5.7%"
                },
                "references": [
                    {
                        "source": "Centers for Disease Control and Prevention (CDC)",
                        "url": "https://www.cdc.gov/diabetes/basics/getting-tested.html",
                        "section": "Blood Sugar Testing",
                        "accessed": "2024"
                    },
                    {
                        "source": "American Diabetes Association",
                        "url": "https://diabetes.org/diabetes/a1c",
                        "section": "Understanding A1C",
                        "accessed": "2024"
                    }
                ]
            }
        ]
    },
    "vital_signs": {
        "name": "Vital Signs",
        "description": "Key measurements that indicate your body's basic functions",
        "icon": "heart_pulse",
        "terms": [
            {
                "id": "blood_pressure",
                "name": "Blood Pressure",
                "short_description": "The force of blood pushing against your artery walls",
                "detailed_explanation": """Blood pressure is measured with two numbers:

**Systolic (top number)**: Pressure when your heart beats
**Diastolic (bottom number)**: Pressure when your heart rests between beats

**What do the numbers mean?**

**Normal**: Less than 120/80 mmHg
**Elevated**: 120-129/less than 80 mmHg
**High (Stage 1)**: 130-139/80-89 mmHg
**High (Stage 2)**: 140/90 mmHg or higher
**Crisis**: Higher than 180/120 mmHg (seek immediate care)

**Why it matters:**
High blood pressure (hypertension) often has no symptoms but can lead to heart disease, stroke, and kidney problems.

**How to maintain healthy blood pressure:**
- Reduce salt intake
- Exercise regularly
- Maintain a healthy weight
- Limit alcohol
- Manage stress""",
                "normal_ranges": {
                    "Normal": "Less than 120/80 mmHg",
                    "Elevated": "120-129/less than 80 mmHg"
                },
                "references": [
                    {
                        "source": "American Heart Association",
                        "url": "https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings",
                        "section": "Understanding Blood Pressure Readings",
                        "accessed": "2024"
                    },
                    {
                        "source": "World Health Organization (WHO)",
                        "url": "https://www.who.int/news-room/fact-sheets/detail/hypertension",
                        "section": "Hypertension Fact Sheet",
                        "accessed": "2024"
                    }
                ]
            },
            {
                "id": "heart_rate",
                "name": "Heart Rate (Pulse)",
                "short_description": "How many times your heart beats per minute",
                "detailed_explanation": """Your heart rate tells you how fast your heart is beating. It's measured in beats per minute (bpm).

**Normal resting heart rate:**
- Adults: 60-100 bpm
- Well-trained athletes: 40-60 bpm

**What affects heart rate?**
- Physical activity (increases it)
- Emotions like stress or excitement
- Caffeine and medications
- Illness or fever
- Body position (lying vs standing)

**When to be concerned:**
- Consistently above 100 bpm at rest (tachycardia)
- Below 60 bpm with symptoms like dizziness (bradycardia)
- Irregular heartbeat patterns

**How to check your pulse:**
Place two fingers on your wrist below your thumb, count beats for 15 seconds, multiply by 4.""",
                "normal_ranges": {
                    "Adults at rest": "60-100 bpm",
                    "Athletes at rest": "40-60 bpm"
                },
                "references": [
                    {
                        "source": "Mayo Clinic",
                        "url": "https://www.mayoclinic.org/healthy-lifestyle/fitness/expert-answers/heart-rate/faq-20057979",
                        "section": "What's a normal resting heart rate?",
                        "accessed": "2024"
                    },
                    {
                        "source": "American Heart Association",
                        "url": "https://www.heart.org/en/health-topics/high-blood-pressure/the-facts-about-high-blood-pressure/all-about-heart-rate-pulse",
                        "section": "All About Heart Rate",
                        "accessed": "2024"
                    }
                ]
            },
            {
                "id": "oxygen_saturation",
                "name": "Oxygen Saturation (SpO2)",
                "short_description": "How much oxygen your blood is carrying",
                "detailed_explanation": """Oxygen saturation (SpO2) shows the percentage of oxygen your red blood cells are carrying. It's usually measured with a pulse oximeter on your finger.

**Normal readings:**
- 95-100%: Normal range
- 91-94%: Low, may need monitoring
- Below 90%: Concerning, seek medical attention

**Why it matters:**
Your body needs adequate oxygen. Low levels can indicate:
- Lung problems (pneumonia, asthma, COPD)
- Heart conditions
- Anemia
- Circulation issues

**Tips for accurate readings:**
- Keep hands warm
- Remove nail polish
- Stay still during measurement
- Avoid bright lights on the sensor""",
                "normal_ranges": {
                    "Normal": "95-100%",
                    "Low": "91-94%",
                    "Concerning": "Below 90%"
                },
                "references": [
                    {
                        "source": "World Health Organization (WHO)",
                        "url": "https://www.who.int/publications/i/item/WHO-2019-nCoV-Pulse_Oximetry-2020.1",
                        "section": "Pulse Oximetry Training Manual",
                        "accessed": "2024"
                    },
                    {
                        "source": "Cleveland Clinic",
                        "url": "https://my.clevelandclinic.org/health/diagnostics/22447-pulse-oximetry",
                        "section": "Pulse Oximetry",
                        "accessed": "2024"
                    }
                ]
            }
        ]
    },
    "abbreviations": {
        "name": "Medical Abbreviations",
        "description": "Common shorthand used by healthcare providers",
        "icon": "file_text",
        "terms": [
            {
                "id": "rx_abbreviations",
                "name": "Prescription Abbreviations",
                "short_description": "Terms you'll see on medication labels",
                "detailed_explanation": """Understanding prescription abbreviations helps you take medications correctly:

**Frequency:**
- **QD** or **OD**: Once daily
- **BID**: Twice a day
- **TID**: Three times a day
- **QID**: Four times a day
- **PRN**: As needed (when you need it)
- **Q4H**: Every 4 hours
- **HS**: At bedtime (hora somni)

**Route of administration:**
- **PO**: By mouth (per os)
- **IV**: Into a vein (intravenous)
- **IM**: Into a muscle (intramuscular)
- **SQ/SC**: Under the skin (subcutaneous)
- **SL**: Under the tongue (sublingual)

**Other common terms:**
- **Rx**: Prescription
- **OTC**: Over the counter (no prescription needed)
- **NPO**: Nothing by mouth (nil per os)
- **STAT**: Immediately (from Latin statim)""",
                "normal_ranges": {},
                "references": [
                    {
                        "source": "Institute for Safe Medication Practices (ISMP)",
                        "url": "https://www.ismp.org/recommendations/error-prone-abbreviations-list",
                        "section": "ISMP's List of Error-Prone Abbreviations",
                        "accessed": "2024"
                    },
                    {
                        "source": "MedlinePlus - National Library of Medicine",
                        "url": "https://medlineplus.gov/ency/article/002219.htm",
                        "section": "Prescription Drug Labels",
                        "accessed": "2024"
                    }
                ]
            },
            {
                "id": "medical_terms",
                "name": "Common Medical Terms",
                "short_description": "Frequently used medical terminology",
                "detailed_explanation": """Here are common medical terms explained simply:

**Prefixes (word beginnings):**
- **Hyper-**: Too much (e.g., hypertension = high blood pressure)
- **Hypo-**: Too little (e.g., hypoglycemia = low blood sugar)
- **Tachy-**: Fast (e.g., tachycardia = fast heart rate)
- **Brady-**: Slow (e.g., bradycardia = slow heart rate)
- **-itis**: Inflammation (e.g., arthritis = joint inflammation)

**Body parts:**
- **Cardio-**: Heart
- **Pulmo-/Pneumo-**: Lungs
- **Gastro-**: Stomach
- **Hepato-**: Liver
- **Nephro-/Renal**: Kidneys
- **Neuro-**: Nervous system

**Procedures:**
- **-ectomy**: Surgical removal
- **-oscopy**: Looking inside with a camera
- **-plasty**: Surgical repair
- **-gram**: A recording or image""",
                "normal_ranges": {},
                "references": [
                    {
                        "source": "MedlinePlus - National Library of Medicine",
                        "url": "https://medlineplus.gov/medicalterminology.html",
                        "section": "Medical Terminology",
                        "accessed": "2024"
                    },
                    {
                        "source": "National Cancer Institute Dictionary",
                        "url": "https://www.cancer.gov/publications/dictionaries/cancer-terms",
                        "section": "NCI Dictionary of Cancer Terms",
                        "accessed": "2024"
                    }
                ]
            }
        ]
    },
    "conditions": {
        "name": "Common Conditions",
        "description": "Understanding frequently diagnosed health conditions",
        "icon": "stethoscope",
        "terms": [
            {
                "id": "diabetes",
                "name": "Diabetes",
                "short_description": "A condition where your body has trouble managing blood sugar",
                "detailed_explanation": """Diabetes is a chronic condition that affects how your body processes blood sugar (glucose).

**Types of Diabetes:**

**Type 1 Diabetes:**
- The immune system attacks cells that make insulin
- Usually diagnosed in children and young adults
- Requires insulin injections

**Type 2 Diabetes:**
- The body doesn't use insulin properly
- Most common type (90-95% of cases)
- Often related to lifestyle factors

**Gestational Diabetes:**
- Develops during pregnancy
- Usually goes away after delivery
- Increases risk of Type 2 later

**Warning signs:**
- Increased thirst and urination
- Unexplained weight loss
- Fatigue and weakness
- Blurred vision
- Slow-healing wounds

**Management:**
- Monitor blood sugar regularly
- Take medications as prescribed
- Eat balanced meals
- Stay physically active
- Regular doctor check-ups""",
                "normal_ranges": {},
                "references": [
                    {
                        "source": "Centers for Disease Control and Prevention (CDC)",
                        "url": "https://www.cdc.gov/diabetes/basics/diabetes.html",
                        "section": "What is Diabetes?",
                        "accessed": "2024"
                    },
                    {
                        "source": "World Health Organization (WHO)",
                        "url": "https://www.who.int/health-topics/diabetes",
                        "section": "Diabetes Overview",
                        "accessed": "2024"
                    }
                ]
            },
            {
                "id": "hypertension",
                "name": "Hypertension (High Blood Pressure)",
                "short_description": "When the force of blood against artery walls is too high",
                "detailed_explanation": """Hypertension, or high blood pressure, is often called the "silent killer" because it usually has no symptoms but can cause serious damage over time.

**What causes it?**
- Family history
- Being overweight
- Not being physically active
- Too much salt in diet
- Too much alcohol
- Stress
- Age (risk increases with age)

**Why it's dangerous:**
High blood pressure can damage:
- Heart (heart disease, heart failure)
- Brain (stroke)
- Kidneys (kidney disease)
- Eyes (vision problems)
- Blood vessels (aneurysms)

**Blood Pressure Categories:**
- Normal: Less than 120/80 mmHg
- Elevated: 120-129/less than 80 mmHg
- High (Stage 1): 130-139/80-89 mmHg
- High (Stage 2): 140/90 mmHg or higher

**Lifestyle changes that help:**
- Reduce sodium intake
- Eat more fruits and vegetables
- Exercise regularly
- Maintain healthy weight
- Limit alcohol
- Quit smoking
- Manage stress""",
                "normal_ranges": {},
                "references": [
                    {
                        "source": "American Heart Association",
                        "url": "https://www.heart.org/en/health-topics/high-blood-pressure",
                        "section": "High Blood Pressure",
                        "accessed": "2024"
                    },
                    {
                        "source": "National Heart, Lung, and Blood Institute (NHLBI)",
                        "url": "https://www.nhlbi.nih.gov/health-topics/high-blood-pressure",
                        "section": "High Blood Pressure",
                        "accessed": "2024"
                    }
                ]
            }
        ]
    }
}


class MedicalKnowledgeService:
    """Service for managing medical knowledge base and retrieval."""
    
    def __init__(self):
        self.knowledge_base = MEDICAL_KNOWLEDGE_BASE
    
    def get_categories(self) -> List[Dict]:
        """Get all available categories."""
        categories = []
        for cat_id, cat_data in self.knowledge_base.items():
            categories.append({
                "id": cat_id,
                "name": cat_data["name"],
                "description": cat_data["description"],
                "icon": cat_data["icon"],
                "term_count": len(cat_data["terms"])
            })
        return categories
    
    def get_category_terms(self, category_id: str) -> Optional[Dict]:
        """Get all terms for a specific category."""
        if category_id not in self.knowledge_base:
            return None
        
        cat = self.knowledge_base[category_id]
        return {
            "id": category_id,
            "name": cat["name"],
            "description": cat["description"],
            "icon": cat["icon"],
            "terms": [
                {
                    "id": term["id"],
                    "name": term["name"],
                    "short_description": term["short_description"]
                }
                for term in cat["terms"]
            ]
        }
    
    def get_term_details(self, category_id: str, term_id: str) -> Optional[Dict]:
        """Get detailed information about a specific term."""
        if category_id not in self.knowledge_base:
            return None
        
        for term in self.knowledge_base[category_id]["terms"]:
            if term["id"] == term_id:
                return {
                    "category_id": category_id,
                    "category_name": self.knowledge_base[category_id]["name"],
                    **term
                }
        return None
    
    def search_terms(self, query: str) -> List[Dict]:
        """Search across all terms."""
        results = []
        query_lower = query.lower()
        
        for cat_id, cat_data in self.knowledge_base.items():
            for term in cat_data["terms"]:
                if (query_lower in term["name"].lower() or 
                    query_lower in term["short_description"].lower() or
                    query_lower in term["detailed_explanation"].lower()):
                    results.append({
                        "category_id": cat_id,
                        "category_name": cat_data["name"],
                        "term_id": term["id"],
                        "term_name": term["name"],
                        "short_description": term["short_description"]
                    })
        return results
    
    def get_context_for_rag(self) -> str:
        """Generate context string for RAG queries."""
        context_parts = []
        
        for cat_id, cat_data in self.knowledge_base.items():
            context_parts.append(f"\n## {cat_data['name']}\n")
            for term in cat_data["terms"]:
                context_parts.append(f"\n### {term['name']}")
                context_parts.append(term["detailed_explanation"])
                
                if term.get("normal_ranges"):
                    context_parts.append("\nNormal Ranges:")
                    for range_name, range_value in term["normal_ranges"].items():
                        context_parts.append(f"- {range_name}: {range_value}")
                
                context_parts.append("\nReferences:")
                for ref in term["references"]:
                    context_parts.append(f"- {ref['source']}, Section: {ref['section']}, URL: {ref['url']}")
        
        return "\n".join(context_parts)


# Singleton instance
_medical_knowledge_service = MedicalKnowledgeService()


def get_medical_knowledge_service() -> MedicalKnowledgeService:
    """Get the medical knowledge service singleton."""
    return _medical_knowledge_service
