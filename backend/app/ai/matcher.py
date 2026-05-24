"""
Calculate compatibility score between a candidate's skills and a job's required skills.

Score formula:
    score = |matching_skills| / |required_skills|  (0.0 → 1.0)

Example:
    required = ["Python", "FastAPI", "PostgreSQL"]
    user     = ["Python", "FastAPI"]
    score    = 2/3 = 0.66  →  66%
"""


def calculate_score(
    user_skills: list[str],
    required_skills: list[str],
) -> dict:
    """
    Returns:
        {
          "score": float,           # 0.0 – 1.0
          "matching_skills": list,  # skills the user has
          "missing_skills": list,   # skills the user lacks
        }
    """
    if not required_skills:
        return {"score": 0.0, "matching_skills": [], "missing_skills": []}

    # Normalize to lowercase for comparison
    user_lower = {s.lower() for s in user_skills}
    required_lower = [s.lower() for s in required_skills]

    matching_lower = {s for s in required_lower if s in user_lower}
    missing_lower  = {s for s in required_lower if s not in user_lower}

    # Map back to original casing (use required_skills list as source of truth)
    skill_map = {s.lower(): s for s in required_skills}
    matching = [skill_map[s] for s in matching_lower]
    missing  = [skill_map[s] for s in missing_lower]

    score = len(matching) / len(required_skills)
    return {
        "score": round(score, 4),
        "matching_skills": sorted(matching),
        "missing_skills": sorted(missing),
    }
