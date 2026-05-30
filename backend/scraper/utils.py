"""
Shared utilities for all scrapers.

Provides:
  - get_http_client()  : pre-configured httpx client with browser headers
  - RateLimiter        : delays between requests to avoid IP bans
  - clean_html()       : strip HTML tags, get plain text
  - safe_get()         : HTTP GET with graceful error handling
  - setup_scraper_logging() : configure structured log output
"""

import logging
import random
import re
import time
import unicodedata
from typing import Optional

import httpx
from bs4 import BeautifulSoup


# ─────────────────────────────────────────────────────────────
# HTTP client
# ─────────────────────────────────────────────────────────────

# Rotate user agents to look like a real browser
# (some sites block known bot user agents)
_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) "
    "Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (X11; Linux x86_64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
]


def _random_headers() -> dict[str, str]:
    """Build browser-like request headers with a random user agent."""
    return {
        "User-Agent": random.choice(_USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-MA,fr;q=0.9,ar;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }


def get_http_client(source_name: str = "scraper") -> httpx.Client:
    """
    Create a pre-configured httpx.Client for scraping.

    Features:
      - Random browser user agent (rotated per client creation)
      - 30-second timeout (connect + read)
      - Automatic redirect following (up to 5 hops)
      - Keep-alive connections reused within the client lifetime

    Usage:
        with scraper.get_http_client() as client:
            resp = client.get("https://example.com/jobs")

    Args:
        source_name: Used in log messages to identify which scraper this is.
    """
    return httpx.Client(
        headers=_random_headers(),
        timeout=httpx.Timeout(30.0, connect=10.0),
        follow_redirects=True,
    )


# ─────────────────────────────────────────────────────────────
# Rate limiter
# ─────────────────────────────────────────────────────────────

class RateLimiter:
    """
    Enforces a minimum delay between HTTP requests.

    Why:
      - Respects the target website's server load
      - Reduces the chance of being detected and blocked
      - Jitter (random ± variation) makes traffic look more human

    Usage:
        limiter = RateLimiter(delay=1.5)
        for url in job_urls:
            limiter.wait()           # blocks until enough time has passed
            response = client.get(url)

    Args:
        delay : base seconds to wait between requests
        jitter: ± random variation added to delay (makes it less robotic)
    """

    def __init__(self, delay: float = 1.5, jitter: float = 0.5):
        self.delay = delay
        self.jitter = jitter
        self._last_call_at: float = 0.0

    def wait(self) -> None:
        """Block until the minimum interval has elapsed since last call."""
        elapsed = time.monotonic() - self._last_call_at
        # Apply jitter: actual wait varies between (delay-jitter) and (delay+jitter)
        target = self.delay + random.uniform(-self.jitter, self.jitter)
        target = max(0.2, target)   # never wait less than 200ms

        remaining = target - elapsed
        if remaining > 0:
            time.sleep(remaining)

        self._last_call_at = time.monotonic()


# ─────────────────────────────────────────────────────────────
# HTML utilities
# ─────────────────────────────────────────────────────────────

def clean_html(html: str) -> str:
    """
    Convert HTML to clean plain text.

    - Preserves paragraph breaks from <p>, <br>, <li>
    - Removes all remaining HTML tags
    - Collapses multiple blank lines
    - Strips leading/trailing whitespace

    Args:
        html: Raw HTML string (can also be plain text, returns as-is)

    Returns:
        Clean plain text string

    Example:
        Input:  "<p>We need a <b>Python</b> developer.</p><br>Apply now."
        Output: "We need a Python developer.\nApply now."
    """
    if not html:
        return ""

    soup = BeautifulSoup(html, "lxml")

    # Insert newlines before block-level elements
    for tag in soup.find_all(["p", "br", "li", "h1", "h2", "h3", "h4", "h5", "div"]):
        tag.insert_before("\n")

    text = soup.get_text(separator=" ")
    # Normalise whitespace: collapse runs of spaces
    text = re.sub(r" {2,}", " ", text)
    # Collapse runs of newlines (keep max 2)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_text(html: str, selector: str, attr: str = None) -> str:
    """
    Extract text (or an attribute value) from the first element matching a CSS selector.

    Args:
        html:     Raw HTML page content
        selector: CSS selector, e.g. "h1.job-title", "div.company-name a"
        attr:     If provided, return this attribute instead of text, e.g. "href"

    Returns:
        Stripped text or attribute value, or "" if selector matches nothing.

    Example:
        title   = extract_text(page_html, "h1.job-title")
        url     = extract_text(page_html, "a.apply-btn", attr="href")
    """
    soup = BeautifulSoup(html, "lxml")
    element = soup.select_one(selector)
    if element is None:
        return ""
    if attr:
        return (element.get(attr) or "").strip()
    return element.get_text(separator=" ", strip=True)


def extract_all_text(html: str, selector: str) -> list[str]:
    """
    Extract text from ALL elements matching a CSS selector.

    Useful for scraping job cards from a listing page.

    Returns:
        List of text strings (may be empty).
    """
    soup = BeautifulSoup(html, "lxml")
    return [el.get_text(separator=" ", strip=True) for el in soup.select(selector)]


# ─────────────────────────────────────────────────────────────
# Safe HTTP request
# ─────────────────────────────────────────────────────────────

def safe_get(
    url: str,
    client: httpx.Client,
    logger: logging.Logger,
    rate_limiter: Optional[RateLimiter] = None,
) -> Optional[httpx.Response]:
    """
    Perform an HTTP GET with rate limiting and graceful error handling.

    Returns None on any failure (caller can skip this URL).
    Logs all errors at WARNING level so the scheduler can track them.

    Args:
        url:          Target URL
        client:       httpx.Client (reuse across calls for keep-alive)
        logger:       Logger instance for error messages
        rate_limiter: If provided, waits before making the request

    Returns:
        httpx.Response on success, None on any HTTP or network error.
    """
    if rate_limiter:
        rate_limiter.wait()

    try:
        response = client.get(url)
        response.raise_for_status()
        return response
    except httpx.HTTPStatusError as e:
        logger.warning(f"HTTP {e.response.status_code} for {url}")
        return None
    except httpx.TimeoutException:
        logger.warning(f"Timeout for {url}")
        return None
    except httpx.RequestError as e:
        logger.warning(f"Request error for {url}: {e}")
        return None


# ─────────────────────────────────────────────────────────────
# Logging setup
# ─────────────────────────────────────────────────────────────

def setup_scraper_logging(level: int = logging.INFO) -> None:
    """
    Configure structured logging for the scraper package.

    Output format:
        2026-05-26 14:30:00 | scraper.Rekrute         | INFO     | Fetched 45 raw jobs

    Call once at application startup (before any scrapers run).
    """
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(name)-28s | %(levelname)-8s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
