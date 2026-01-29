"""Tests for LinkedIn URL validation."""
import pytest

from app.services.extraction_service import LINKEDIN_URL_PATTERN


class TestLinkedInURLValidation:
    """Test cases for LinkedIn URL validation."""

    def test_valid_linkedin_url_basic(self):
        """Test basic valid LinkedIn URL."""
        url = "https://linkedin.com/in/johndoe"
        assert LINKEDIN_URL_PATTERN.match(url) is not None

    def test_valid_linkedin_url_with_www(self):
        """Test valid LinkedIn URL with www prefix."""
        url = "https://www.linkedin.com/in/johndoe"
        assert LINKEDIN_URL_PATTERN.match(url) is not None

    def test_valid_linkedin_url_http(self):
        """Test valid LinkedIn URL with http (not https)."""
        url = "http://linkedin.com/in/johndoe"
        assert LINKEDIN_URL_PATTERN.match(url) is not None

    def test_valid_linkedin_url_with_trailing_slash(self):
        """Test valid LinkedIn URL with trailing slash."""
        url = "https://linkedin.com/in/johndoe/"
        assert LINKEDIN_URL_PATTERN.match(url) is not None

    def test_valid_linkedin_url_with_hyphen(self):
        """Test valid LinkedIn URL with hyphen in username."""
        url = "https://linkedin.com/in/john-doe-123"
        assert LINKEDIN_URL_PATTERN.match(url) is not None

    def test_valid_linkedin_url_with_numbers(self):
        """Test valid LinkedIn URL with numbers in username."""
        url = "https://linkedin.com/in/johndoe123"
        assert LINKEDIN_URL_PATTERN.match(url) is not None

    def test_valid_linkedin_url_uppercase(self):
        """Test valid LinkedIn URL with uppercase (case insensitive)."""
        url = "https://LINKEDIN.COM/in/JohnDoe"
        assert LINKEDIN_URL_PATTERN.match(url) is not None

    def test_invalid_linkedin_company_page(self):
        """Test invalid LinkedIn URL - company page."""
        url = "https://linkedin.com/company/acme-corp"
        assert LINKEDIN_URL_PATTERN.match(url) is None

    def test_invalid_linkedin_jobs_page(self):
        """Test invalid LinkedIn URL - jobs page."""
        url = "https://linkedin.com/jobs/view/123456"
        assert LINKEDIN_URL_PATTERN.match(url) is None

    def test_invalid_linkedin_feed(self):
        """Test invalid LinkedIn URL - feed."""
        url = "https://linkedin.com/feed"
        assert LINKEDIN_URL_PATTERN.match(url) is None

    def test_invalid_different_domain(self):
        """Test invalid URL - different domain."""
        url = "https://example.com/in/johndoe"
        assert LINKEDIN_URL_PATTERN.match(url) is None

    def test_invalid_linkedin_no_username(self):
        """Test invalid LinkedIn URL - no username."""
        url = "https://linkedin.com/in/"
        assert LINKEDIN_URL_PATTERN.match(url) is None

    def test_invalid_linkedin_profile_with_query(self):
        """Test invalid LinkedIn URL - has query parameters."""
        url = "https://linkedin.com/in/johndoe?utm_source=share"
        assert LINKEDIN_URL_PATTERN.match(url) is None

    def test_invalid_linkedin_pub_url(self):
        """Test invalid LinkedIn URL - old pub format."""
        url = "https://linkedin.com/pub/johndoe/12/345/678"
        assert LINKEDIN_URL_PATTERN.match(url) is None

    def test_invalid_empty_string(self):
        """Test invalid URL - empty string."""
        url = ""
        assert LINKEDIN_URL_PATTERN.match(url) is None

    def test_invalid_not_a_url(self):
        """Test invalid URL - not a URL at all."""
        url = "johndoe"
        assert LINKEDIN_URL_PATTERN.match(url) is None

    def test_invalid_linkedin_messaging(self):
        """Test invalid LinkedIn URL - messaging."""
        url = "https://linkedin.com/messaging/thread/123"
        assert LINKEDIN_URL_PATTERN.match(url) is None
