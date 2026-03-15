"""
Country-specific document requirements for doctor verification.
Each country has different medical licensing bodies and required credentials.
"""

# Default requirements for countries not specifically defined
DEFAULT_REQUIREMENTS = {
    "required": [
        {
            "type": "medical_degree",
            "name": "Medical Degree Certificate",
            "description": "Official degree certificate from recognized medical school"
        },
        {
            "type": "medical_license",
            "name": "Medical License/Registration",
            "description": "Valid medical practice license from regulatory authority"
        }
    ],
    "optional": [
        {
            "type": "hospital_id",
            "name": "Hospital/Clinic ID",
            "description": "Current employment verification"
        }
    ],
    "registration_format": "Varies by country",
    "notes": "Please upload your medical credentials for verification"
}

DOCUMENT_REQUIREMENTS = {
    # ==================== ASIA ====================
    "India": {
        "required": [
            {
                "type": "degree_certificate",
                "name": "MBBS/MD/MS Degree Certificate",
                "description": "From MCI/NMC recognized university"
            },
            {
                "type": "medical_council_registration",
                "name": "State Medical Council Registration",
                "description": "Valid SMC certificate with registration number"
            }
        ],
        "optional": [
            {
                "type": "hospital_id",
                "name": "Current Hospital ID",
                "description": "Employment verification"
            },
            {
                "type": "aadhar_card",
                "name": "Aadhaar Card",
                "description": "For identity verification"
            }
        ],
        "registration_format": "State abbreviation followed by numbers (e.g., MH-12345, DL-67890)",
        "regulatory_body": "National Medical Commission (NMC)",
        "notes": "Ensure your SMC registration is current and not expired"
    },
    
    "Singapore": {
        "required": [
            {
                "type": "medical_degree",
                "name": "Medical Degree (MBBS/MD)",
                "description": "From SMC recognized institution"
            },
            {
                "type": "smc_registration",
                "name": "SMC Practising Certificate",
                "description": "Singapore Medical Council registration"
            }
        ],
        "optional": [
            {
                "type": "specialist_accreditation",
                "name": "Specialist Accreditation",
                "description": "If applicable to your specialty"
            }
        ],
        "registration_format": "M followed by 5 digits (e.g., M12345)",
        "regulatory_body": "Singapore Medical Council (SMC)",
        "notes": "Practising certificate must be valid and current"
    },
    
    "Japan": {
        "required": [
            {
                "type": "medical_degree",
                "name": "Medical License (医師免許証)",
                "description": "Japanese national medical license"
            }
        ],
        "optional": [
            {
                "type": "specialist_certification",
                "name": "Specialist Board Certification",
                "description": "Specialty society certification"
            }
        ],
        "registration_format": "6-digit license number",
        "regulatory_body": "Ministry of Health, Labour and Welfare",
        "notes": "Foreign medical graduates must pass Japanese medical licensing exam"
    },
    
    "China": {
        "required": [
            {
                "type": "medical_degree",
                "name": "Medical Degree Certificate",
                "description": "From recognized Chinese medical university"
            },
            {
                "type": "physician_certificate",
                "name": "Physician Practicing Certificate",
                "description": "执业医师资格证书"
            }
        ],
        "optional": [
            {
                "type": "hospital_employment",
                "name": "Hospital Employment Certificate",
                "description": "Current employment verification"
            }
        ],
        "registration_format": "Provincial code + year + number",
        "regulatory_body": "National Health Commission",
        "notes": "Both qualification and practicing certificates required"
    },
    
    "South Korea": {
        "required": [
            {
                "type": "medical_license",
                "name": "Korean Medical License",
                "description": "From Ministry of Health and Welfare"
            }
        ],
        "optional": [
            {
                "type": "specialist_certificate",
                "name": "Specialist Certificate",
                "description": "Board certification"
            }
        ],
        "registration_format": "License number format varies",
        "regulatory_body": "Korean Medical Association",
        "notes": ""
    },
    
    # ==================== MIDDLE EAST ====================
    "United Arab Emirates": {
        "required": [
            {
                "type": "medical_degree",
                "name": "Medical Degree Certificate",
                "description": "From recognized medical school"
            },
            {
                "type": "dha_license",
                "name": "DHA/HAAD/MOH License",
                "description": "Dubai Health Authority or equivalent"
            },
            {
                "type": "good_standing",
                "name": "Certificate of Good Standing",
                "description": "From home country medical council"
            }
        ],
        "optional": [
            {
                "type": "dataflow_report",
                "name": "DataFlow Verification Report",
                "description": "Primary source verification"
            }
        ],
        "registration_format": "Authority prefix + number (e.g., DHA-P-12345)",
        "regulatory_body": "DHA/HAAD/MOH depending on emirate",
        "notes": "Good standing certificate required from country of qualification"
    },
    
    "Saudi Arabia": {
        "required": [
            {
                "type": "medical_degree",
                "name": "Medical Degree Certificate",
                "description": "Attested by relevant authorities"
            },
            {
                "type": "scfhs_license",
                "name": "SCFHS License",
                "description": "Saudi Commission for Health Specialties"
            }
        ],
        "optional": [
            {
                "type": "dataflow_report",
                "name": "DataFlow Report",
                "description": "Primary source verification"
            }
        ],
        "registration_format": "SCFHS number format",
        "regulatory_body": "Saudi Commission for Health Specialties (SCFHS)",
        "notes": "All documents must be attested by Ministry of Foreign Affairs"
    },
    
    # ==================== EUROPE ====================
    "United Kingdom": {
        "required": [
            {
                "type": "medical_degree",
                "name": "Medical Degree (MBBS/MBChB)",
                "description": "From GMC recognized institution"
            },
            {
                "type": "gmc_registration",
                "name": "GMC Registration Certificate",
                "description": "General Medical Council full registration"
            }
        ],
        "optional": [
            {
                "type": "specialist_register",
                "name": "Specialist Register Entry",
                "description": "For consultants/specialists"
            },
            {
                "type": "dbs_certificate",
                "name": "DBS Certificate",
                "description": "Disclosure and Barring Service check"
            }
        ],
        "registration_format": "7-digit GMC number (e.g., 1234567)",
        "regulatory_body": "General Medical Council (GMC)",
        "notes": "GMC registration must show 'Registered with a licence to practise'"
    },
    
    "Germany": {
        "required": [
            {
                "type": "approbation",
                "name": "Approbation Certificate",
                "description": "Full medical license to practice"
            },
            {
                "type": "medical_degree",
                "name": "Medical Degree (Staatsexamen)",
                "description": "German medical examination or recognized equivalent"
            }
        ],
        "optional": [
            {
                "type": "specialist_title",
                "name": "Facharzt Title",
                "description": "Specialist qualification"
            }
        ],
        "registration_format": "Approbation issued by Landesamt",
        "regulatory_body": "Landesärztekammer (State Medical Chamber)",
        "notes": "Approbation required for independent practice"
    },
    
    "France": {
        "required": [
            {
                "type": "medical_degree",
                "name": "Diplôme d'État de docteur en médecine",
                "description": "French medical doctorate"
            },
            {
                "type": "ordre_inscription",
                "name": "Ordre des Médecins Inscription",
                "description": "Registration with Medical Council"
            }
        ],
        "optional": [
            {
                "type": "specialist_diploma",
                "name": "DES/DESC",
                "description": "Specialist diploma"
            }
        ],
        "registration_format": "RPPS number (11 digits)",
        "regulatory_body": "Conseil National de l'Ordre des Médecins",
        "notes": ""
    },
    
    # ==================== NORTH AMERICA ====================
    "United States": {
        "required": [
            {
                "type": "medical_degree",
                "name": "MD or DO Degree",
                "description": "From LCME/AOA accredited medical school"
            },
            {
                "type": "state_license",
                "name": "State Medical License",
                "description": "Active license from state medical board"
            },
            {
                "type": "dea_registration",
                "name": "DEA Registration",
                "description": "Drug Enforcement Administration certificate"
            }
        ],
        "optional": [
            {
                "type": "board_certification",
                "name": "Board Certification",
                "description": "ABMS or AOA specialty board certification"
            },
            {
                "type": "npi_number",
                "name": "NPI Certificate",
                "description": "National Provider Identifier"
            }
        ],
        "registration_format": "State code + license number (e.g., CA-G12345)",
        "regulatory_body": "State Medical Board (varies by state)",
        "notes": "DEA registration required for prescribing controlled substances"
    },
    
    "Canada": {
        "required": [
            {
                "type": "medical_degree",
                "name": "MD/MDCM Degree",
                "description": "From CACMS accredited medical school"
            },
            {
                "type": "provincial_license",
                "name": "Provincial Medical License",
                "description": "From provincial College (e.g., CPSO, CPSBC)"
            },
            {
                "type": "lmcc",
                "name": "LMCC Certificate",
                "description": "Licentiate of Medical Council of Canada"
            }
        ],
        "optional": [
            {
                "type": "royal_college",
                "name": "Royal College Certification",
                "description": "Specialty certification"
            }
        ],
        "registration_format": "Province specific (e.g., CPSO-12345)",
        "regulatory_body": "Provincial Medical Regulatory Authority",
        "notes": "Each province has its own licensing body"
    },
    
    # ==================== OCEANIA ====================
    "Australia": {
        "required": [
            {
                "type": "medical_degree",
                "name": "Medical Degree (MBBS/BMed)",
                "description": "From AMC recognized institution"
            },
            {
                "type": "ahpra_registration",
                "name": "AHPRA Registration",
                "description": "Australian Health Practitioner Regulation Agency"
            }
        ],
        "optional": [
            {
                "type": "specialist_registration",
                "name": "Specialist Registration",
                "description": "For recognized medical specialists"
            }
        ],
        "registration_format": "MED followed by 10 digits (e.g., MED0001234567)",
        "regulatory_body": "Medical Board of Australia via AHPRA",
        "notes": "AHPRA registration must be current with no conditions"
    },
    
    "New Zealand": {
        "required": [
            {
                "type": "medical_degree",
                "name": "Medical Degree",
                "description": "From MCNZ recognized institution"
            },
            {
                "type": "mcnz_registration",
                "name": "MCNZ Registration",
                "description": "Medical Council of New Zealand registration"
            },
            {
                "type": "apc",
                "name": "Annual Practising Certificate",
                "description": "Current APC"
            }
        ],
        "optional": [],
        "registration_format": "MCNZ registration number",
        "regulatory_body": "Medical Council of New Zealand (MCNZ)",
        "notes": "APC must be current for the practice year"
    },
    
    # ==================== AFRICA ====================
    "South Africa": {
        "required": [
            {
                "type": "medical_degree",
                "name": "MBChB Degree",
                "description": "From HPCSA recognized institution"
            },
            {
                "type": "hpcsa_registration",
                "name": "HPCSA Registration",
                "description": "Health Professions Council of South Africa"
            }
        ],
        "optional": [
            {
                "type": "specialist_registration",
                "name": "Specialist Registration",
                "description": "If applicable"
            }
        ],
        "registration_format": "MP followed by number",
        "regulatory_body": "Health Professions Council of South Africa (HPCSA)",
        "notes": ""
    },
    
    "Nigeria": {
        "required": [
            {
                "type": "medical_degree",
                "name": "MBBS/MBChB Degree",
                "description": "From MDCN recognized institution"
            },
            {
                "type": "mdcn_license",
                "name": "MDCN Full Registration",
                "description": "Medical and Dental Council of Nigeria"
            }
        ],
        "optional": [
            {
                "type": "specialist_fellowship",
                "name": "Fellowship Certificate",
                "description": "FWACS, FMCP, etc."
            }
        ],
        "registration_format": "MDCN/R/followed by numbers",
        "regulatory_body": "Medical and Dental Council of Nigeria (MDCN)",
        "notes": "Annual practising license must be current"
    },
    
    # ==================== SOUTH AMERICA ====================
    "Brazil": {
        "required": [
            {
                "type": "medical_degree",
                "name": "Diploma de Medicina",
                "description": "From MEC recognized medical school"
            },
            {
                "type": "crm_registration",
                "name": "CRM Registration",
                "description": "Conselho Regional de Medicina"
            }
        ],
        "optional": [
            {
                "type": "specialist_title",
                "name": "RQE - Specialist Title",
                "description": "Registered specialty qualification"
            }
        ],
        "registration_format": "CRM-State/Number (e.g., CRM-SP/123456)",
        "regulatory_body": "Conselho Federal de Medicina (CFM)",
        "notes": "CRM registration is state-specific"
    }
}


def get_requirements_for_country(country: str) -> dict:
    """Get document requirements for a specific country."""
    return DOCUMENT_REQUIREMENTS.get(country, DEFAULT_REQUIREMENTS)


def get_all_supported_countries() -> list:
    """Get list of all countries with specific requirements."""
    return list(DOCUMENT_REQUIREMENTS.keys())


def get_required_document_types(country: str) -> list:
    """Get list of required document types for a country."""
    requirements = get_requirements_for_country(country)
    return [doc["type"] for doc in requirements.get("required", [])]


def validate_documents_for_country(country: str, uploaded_types: list) -> dict:
    """Validate if all required documents are uploaded for a country."""
    requirements = get_requirements_for_country(country)
    required_types = [doc["type"] for doc in requirements.get("required", [])]
    
    missing = [t for t in required_types if t not in uploaded_types]
    
    return {
        "complete": len(missing) == 0,
        "missing_documents": missing,
        "required_count": len(required_types),
        "uploaded_count": len([t for t in uploaded_types if t in required_types])
    }
