"""
Unit tests for the two-pass SemanticMatcher algorithm.

These tests import calculate_score() and SemanticMatcher directly —
no HTTP client, no database, no mocking of the ML model.
The sentence-transformers model (all-MiniLM-L6-v2) is loaded once
from the local HuggingFace cache for the fuzzy-match tests.

Test groups
-----------
A) Exact keyword match (Pass 1 only)
B) Fuzzy / semantic match (Pass 2 — uses real model)
C) Edge cases (empty inputs, clamping)
D) SemanticMatcher class API (.score() and .match())
"""
import pytest

from app.ai.semantic_matcher import calculate_score, SemanticMatcher


# ── A: Exact keyword match ─────────────────────────────────────────────────────

def test_exact_all_skills_match():
    result = calculate_score(["Python", "Django"], ["Python", "Django"])
    assert result["score"]         == 1.0
    assert result["keyword_score"] == 1.0
    assert set(result["matching_skills"]) == {"Python", "Django"}
    assert result["missing_skills"] == []


def test_exact_partial_match():
    result = calculate_score(["Python"], ["Python", "Django"])
    assert result["keyword_score"] == pytest.approx(0.5, abs=0.001)
    assert "Python" in result["matching_skills"]
    assert "Django" in result["missing_skills"]


def test_exact_case_insensitive():
    result = calculate_score(["python", "DJANGO"], ["Python", "Django"])
    assert result["score"] == 1.0
    assert set(result["matching_skills"]) == {"Python", "Django"}


def test_exact_no_match():
    result = calculate_score(["Java"], ["Python", "Django"])
    assert result["keyword_score"] == 0.0


# ── B: Semantic / fuzzy match ──────────────────────────────────────────────────
# These tests load the real all-MiniLM-L6-v2 model.

def test_fuzzy_react_matches_reactjs():
    """'React' and 'ReactJS' are close synonyms — sim ≈ 0.89 > threshold 0.72."""
    result = calculate_score(["React"], ["ReactJS"])
    assert result["score"] >= 0.72, f"React/ReactJS score too low: {result['score']}"
    assert "ReactJS" in result["fuzzy_matches"], "Expected a fuzzy match for ReactJS"
    assert result["fuzzy_matches"]["ReactJS"]["matched_to"] == "React"


def test_fuzzy_ml_matches_machine_learning():
    """
    'ML' embeds poorly on its own but TECH_ALIASES expands it to
    'machine learning' before encoding → sim ≈ 1.0.
    """
    result = calculate_score(["ML"], ["Machine Learning"])
    assert result["score"] >= 0.90, f"ML/Machine Learning score too low: {result['score']}"


def test_fuzzy_postgres_matches_postgresql():
    result = calculate_score(["Postgres"], ["PostgreSQL"])
    assert result["score"] >= 0.72


def test_fuzzy_js_matches_javascript():
    result = calculate_score(["JS"], ["JavaScript"])
    assert result["score"] >= 0.72


def test_k8s_matches_kubernetes():
    """k8s → 'kubernetes' via TECH_ALIASES before encoding."""
    result = calculate_score(["k8s"], ["Kubernetes"])
    assert result["score"] >= 0.90


def test_different_domains_score_near_zero():
    """Python/Django vs Java/Spring Boot should score very low."""
    result = calculate_score(
        ["Python", "Django"],
        ["Java", "Spring Boot", "Oracle DB"],
    )
    assert result["score"] < 0.30, f"Different domain score too high: {result['score']}"
    assert set(result["missing_skills"]) == {"Java", "Spring Boot", "Oracle DB"}


def test_mixed_exact_and_fuzzy():
    """Python matches exactly; ReactJS matches React via fuzzy."""
    result = calculate_score(
        ["Python", "React"],
        ["Python", "ReactJS", "SQL"],
    )
    assert "Python" in result["matching_skills"]
    assert "ReactJS" in result["fuzzy_matches"]
    assert "SQL"     in result["missing_skills"]
    assert result["keyword_score"] == pytest.approx(1 / 3, abs=0.01)
    assert result["score"] > result["keyword_score"]  # fuzzy raised it


# ── C: Edge cases ──────────────────────────────────────────────────────────────

def test_empty_required_skills():
    result = calculate_score(["Python"], [])
    assert result["score"] == 0.0
    assert result["explanation"] == "No required skills listed"


def test_empty_user_skills():
    result = calculate_score([], ["Python", "Django"])
    assert result["score"] == 0.0
    assert set(result["missing_skills"]) == {"Python", "Django"}


def test_both_empty():
    result = calculate_score([], [])
    assert result["score"] == 0.0


def test_score_never_exceeds_1():
    """Score must be clamped to 1.0 even if fuzzy similarities sum > 1."""
    result = calculate_score(
        ["Python", "Django", "Flask", "FastAPI", "PostgreSQL"],
        ["Python"],
    )
    assert result["score"] <= 1.0


def test_result_keys_present():
    """calculate_score must always return all documented keys."""
    result = calculate_score(["Python"], ["Python", "Django"])
    expected_keys = {
        "score", "keyword_score", "semantic_score",
        "matching_skills", "fuzzy_matches", "missing_skills", "explanation",
    }
    assert expected_keys.issubset(result.keys())


# ── D: SemanticMatcher class API ───────────────────────────────────────────────

def test_matcher_score_returns_percentage():
    m = SemanticMatcher()
    pct = m.score(["Python", "Django"], ["Python", "Django"])
    assert pct == pytest.approx(100.0, abs=0.1)


def test_matcher_score_range():
    m = SemanticMatcher()
    pct = m.score(["Python"], ["Python", "Django"])
    assert 0.0 <= pct <= 100.0


def test_matcher_match_returns_dict():
    m = SemanticMatcher()
    result = m.match(["Python"], ["Python", "Django"])
    assert isinstance(result, dict)
    assert 0.0 <= result["score"] <= 1.0
    assert "missing_skills" in result
    assert "Django" in result["missing_skills"]
