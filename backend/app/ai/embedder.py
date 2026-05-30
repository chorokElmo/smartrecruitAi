"""
Singleton sentence-transformers model for encoding text into embeddings.

MODEL: all-MiniLM-L6-v2
  - 22 million parameters
  - 384-dimensional output vectors
  - Trained specifically for semantic similarity tasks
  - ~80 MB download (cached in ~/.cache/huggingface/ after first use)
  - Inference: ~5ms per sentence on CPU

WHY SINGLETON?
  Loading a transformer model takes ~1 second and ~200 MB RAM.
  We load it once at startup (warmup()) and reuse it for every request.
  All recommendation generation calls share the same model instance.

USAGE:
  from app.ai.embedder import encode, warmup

  # At startup:
  warmup()

  # In recommendation service:
  embeddings = encode(["Python developer 5 years", "Django REST API PostgreSQL"])
  # → numpy array shape (2, 384), L2-normalized
  # → cosine similarity = simple dot product between rows
"""

import logging
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# Model configuration
# ─────────────────────────────────────────────────────────────

MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_DIM = 384

# Module-level singleton — loaded once, never unloaded
_model = None
_load_failed = False   # guard: don't retry loading if it already failed once


# ─────────────────────────────────────────────────────────────
# Internal loader
# ─────────────────────────────────────────────────────────────

def _get_model():
    """
    Load the model on first call, return cached instance on all subsequent calls.

    Sets _load_failed=True on import error so we don't retry 260 times
    during a recommendation batch when sentence_transformers is missing.
    """
    global _model, _load_failed
    if _load_failed:
        raise ImportError(
            "sentence_transformers could not be loaded. "
            "Run: pip install sentence-transformers==2.7.0"
        )
    if _model is None:
        logger.info(f"Loading sentence-transformers model '{MODEL_NAME}' ...")
        try:
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer(MODEL_NAME)
            logger.info(f"Model '{MODEL_NAME}' loaded — embedding dim={EMBEDDING_DIM}")
        except ImportError as e:
            _load_failed = True
            raise
    return _model


# ─────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────

def encode(texts: list[str], batch_size: int = 32) -> np.ndarray:
    """
    Encode a list of text strings into L2-normalized embedding vectors.

    The vectors are L2-normalized so that cosine similarity equals the
    dot product — which is much faster to compute (no division needed).

    Args:
        texts:      List of text strings to encode. May be short (skill names)
                    or long (job descriptions).
        batch_size: Number of texts to process per GPU/CPU batch.
                    32 is a safe default for CPU inference.

    Returns:
        numpy array of shape (len(texts), EMBEDDING_DIM=384).
        Each row is a unit vector (L2 norm = 1.0).

    Example:
        >>> emb = encode(["Python developer", "data engineer"])
        >>> emb.shape
        (2, 384)
        >>> float(emb[0] @ emb[1])   # cosine similarity
        0.73...
    """
    if not texts:
        return np.zeros((0, EMBEDDING_DIM), dtype=np.float32)

    model = _get_model()
    return model.encode(
        texts,
        batch_size=batch_size,
        normalize_embeddings=True,   # ensures cosine = dot product
        show_progress_bar=False,
        convert_to_numpy=True,
    )


def cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    """
    Compute cosine similarity between two L2-normalized vectors.

    Since encode() returns L2-normalized vectors, this is just a dot product.
    Clamps result to [0.0, 1.0] — negative similarity is treated as 0.

    Args:
        vec_a, vec_b: 1-D numpy arrays of shape (EMBEDDING_DIM,)

    Returns:
        float in [0.0, 1.0]
    """
    sim = float(np.dot(vec_a, vec_b))
    return max(0.0, min(1.0, sim))


def warmup() -> None:
    """
    Pre-load the model at application startup.

    Call this from FastAPI's lifespan so the first recommendation request
    doesn't suffer a 1-second delay from model loading.

    If the model is already cached by sentence-transformers (from a previous
    run), this completes in ~100ms. On first ever run it downloads ~80 MB.
    """
    _get_model()
    logger.info("Embedder ready")
