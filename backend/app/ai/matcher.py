"""
Job-candidate matching — public API.

Phase 1: keyword-only scoring (exact match ratio)
Phase 3: hybrid scoring (60% semantic + 40% keyword) via semantic_matcher

Both functions are kept for backward compatibility.
The recommendation service uses calculate_score_v2() (semantic).
"""

from app.ai.semantic_matcher import calculate_score as _semantic_calculate


def calculate_score(
    user_skills: list[str],
    required_skills: list[str],
) -> dict:
    """
    Original keyword-only scorer — kept for backward compatibility.

    Score = |matching skills| / |required skills|

    Returns:
        {"score": float, "matching_skills": list, "missing_skills": list}
    """
    if not required_skills:
        return {"score": 0.0, "matching_skills": [], "missing_skills": []}

    user_lower     = {s.lower() for s in user_skills}
    required_lower = [s.lower() for s in required_skills]

    matching_lower = {s for s in required_lower if s in user_lower}
    missing_lower  = {s for s in required_lower if s not in user_lower}

    skill_map = {s.lower(): s for s in required_skills}
    matching  = [skill_map[s] for s in matching_lower]
    missing   = [skill_map[s] for s in missing_lower]

    return {
        "score":           round(len(matching) / len(required_skills), 4),
        "matching_skills": sorted(matching),
        "missing_skills":  sorted(missing),
    }


def calculate_score_v2(
    user_skills:     list[str],
    required_skills: list[str],
    user_text:       str = "",
    job_text:        str = "",
) -> dict:
    """
    Hybrid semantic + keyword scorer (Phase 3).

    final_score = 0.6 × semantic_cosine_similarity + 0.4 × keyword_ratio

    Args:
        user_skills:     User's skills list
        required_skills: Job's required skills list
        user_text:       Full user profile text for semantic embedding
        job_text:        Full job text (title + description + skills)

    Returns:
        {
          "score":           float   — combined score 0.0–1.0
          "semantic_score":  float   — cosine similarity component
          "keyword_score":   float   — exact match ratio
          "matching_skills": list
          "missing_skills":  list
          "explanation":     str     — human-readable breakdown
        }
    """
    return _semantic_calculate(
        user_skills=user_skills,
        required_skills=required_skills,
        user_text=user_text,
        job_text=job_text,
    )
