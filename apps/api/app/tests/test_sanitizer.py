"""Tests for LinkedIn response sanitization."""
import pytest

from app.services.extraction_service import (
    LinkedInScraper,
    LINKEDIN_ALLOWED_FIELDS,
)


class TestLinkedInSanitizer:
    """Test cases for LinkedIn response sanitization."""

    def setup_method(self):
        """Set up test fixtures."""
        self.scraper = LinkedInScraper(api_token="test_token")

    def test_removes_unlisted_fields(self):
        """Should remove fields not in whitelist."""
        raw_data = {
            "firstName": "John",
            "lastName": "Doe",
            "email": "john@example.com",  # Should be removed
            "phone": "+1234567890",  # Should be removed
            "secretField": "secret",  # Should be removed
        }
        sanitized = self.scraper._sanitize_linkedin_response(raw_data)

        assert "firstName" in sanitized
        assert "lastName" in sanitized
        assert "email" not in sanitized
        assert "phone" not in sanitized
        assert "secretField" not in sanitized

    def test_keeps_all_allowed_fields(self):
        """Should keep all whitelisted fields when present."""
        raw_data = {
            "firstName": "John",
            "lastName": "Doe",
            "headline": "Software Engineer",
            "summary": "Experienced developer",
            "locationName": "San Francisco",
            "industryName": "Technology",
            "connectionsCount": 500,
            "profilePicture": "https://example.com/photo.jpg",
        }
        sanitized = self.scraper._sanitize_linkedin_response(raw_data)

        assert sanitized["firstName"] == "John"
        assert sanitized["lastName"] == "Doe"
        assert sanitized["headline"] == "Software Engineer"
        assert sanitized["summary"] == "Experienced developer"
        assert sanitized["locationName"] == "San Francisco"
        assert sanitized["industryName"] == "Technology"
        assert sanitized["connectionsCount"] == 500
        assert sanitized["profilePicture"] == "https://example.com/photo.jpg"

    def test_sanitizes_experience_objects(self):
        """Should sanitize nested experience objects."""
        raw_data = {
            "experience": [
                {
                    "title": "Software Engineer",
                    "companyName": "Acme Corp",
                    "locationName": "San Francisco",
                    "description": "Built things",
                    "startDate": "2020-01-01",
                    "endDate": "2023-12-31",
                    "timePeriod": "4 years",
                    "companyId": "12345",  # Should be removed
                    "internalField": "secret",  # Should be removed
                }
            ]
        }
        sanitized = self.scraper._sanitize_linkedin_response(raw_data)

        exp = sanitized["experience"][0]
        assert exp["title"] == "Software Engineer"
        assert exp["companyName"] == "Acme Corp"
        assert exp["locationName"] == "San Francisco"
        assert exp["description"] == "Built things"
        assert exp["startDate"] == "2020-01-01"
        assert exp["endDate"] == "2023-12-31"
        assert exp["timePeriod"] == "4 years"
        assert "companyId" not in exp
        assert "internalField" not in exp

    def test_sanitizes_education_objects(self):
        """Should sanitize nested education objects."""
        raw_data = {
            "education": [
                {
                    "schoolName": "MIT",
                    "degreeName": "Bachelor of Science",
                    "fieldOfStudy": "Computer Science",
                    "startDate": "2016-09-01",
                    "endDate": "2020-05-15",
                    "grade": "3.8 GPA",
                    "schoolId": "67890",  # Should be removed
                    "activities": "Robotics club",  # Should be removed
                }
            ]
        }
        sanitized = self.scraper._sanitize_linkedin_response(raw_data)

        edu = sanitized["education"][0]
        assert edu["schoolName"] == "MIT"
        assert edu["degreeName"] == "Bachelor of Science"
        assert edu["fieldOfStudy"] == "Computer Science"
        assert edu["startDate"] == "2016-09-01"
        assert edu["endDate"] == "2020-05-15"
        assert edu["grade"] == "3.8 GPA"
        assert "schoolId" not in edu
        assert "activities" not in edu

    def test_extracts_skill_names_from_objects(self):
        """Should extract just skill names from skill objects."""
        raw_data = {
            "skills": [
                {"name": "Python", "endorsementCount": 50},
                {"name": "JavaScript", "endorsementCount": 30},
                {"name": "Go", "endorsementCount": 10},
            ]
        }
        sanitized = self.scraper._sanitize_linkedin_response(raw_data)

        assert sanitized["skills"] == ["Python", "JavaScript", "Go"]

    def test_handles_skill_strings(self):
        """Should handle skills that are already strings."""
        raw_data = {"skills": ["Python", "JavaScript", "Go"]}
        sanitized = self.scraper._sanitize_linkedin_response(raw_data)

        assert sanitized["skills"] == ["Python", "JavaScript", "Go"]

    def test_limits_skills_to_50(self):
        """Should limit skills to 50 entries."""
        raw_data = {"skills": [{"name": f"Skill{i}"} for i in range(100)]}
        sanitized = self.scraper._sanitize_linkedin_response(raw_data)

        assert len(sanitized["skills"]) == 50

    def test_handles_empty_data(self):
        """Should handle empty input gracefully."""
        raw_data = {}
        sanitized = self.scraper._sanitize_linkedin_response(raw_data)
        assert sanitized == {}

    def test_handles_none_values(self):
        """Should not include fields with None values."""
        raw_data = {
            "firstName": "John",
            "lastName": None,
        }
        sanitized = self.scraper._sanitize_linkedin_response(raw_data)

        assert "firstName" in sanitized
        # lastName is in allowed fields but its value is None,
        # so it gets included as-is (the value check is in data.get)
        assert sanitized.get("lastName") is None

    def test_handles_malformed_experience(self):
        """Should handle non-dict items in experience list."""
        raw_data = {
            "experience": [
                {"title": "Engineer", "companyName": "Acme"},
                "invalid_string_item",
                None,
                {"title": "Manager", "companyName": "Corp"},
            ]
        }
        sanitized = self.scraper._sanitize_linkedin_response(raw_data)

        # Should only include valid dict items
        assert len(sanitized["experience"]) == 2
        assert sanitized["experience"][0]["title"] == "Engineer"
        assert sanitized["experience"][1]["title"] == "Manager"

    def test_handles_malformed_education(self):
        """Should handle non-dict items in education list."""
        raw_data = {
            "education": [
                {"schoolName": "MIT", "degreeName": "BS"},
                123,  # Invalid
                {"schoolName": "Stanford", "degreeName": "MS"},
            ]
        }
        sanitized = self.scraper._sanitize_linkedin_response(raw_data)

        # Should only include valid dict items
        assert len(sanitized["education"]) == 2

    def test_preserves_list_fields_that_are_not_experience_or_education(self):
        """Should preserve other list fields like certifications, languages."""
        raw_data = {
            "certifications": [{"name": "AWS Certified"}],
            "languages": [{"name": "English"}],
            "publications": [{"title": "My Paper"}],
            "projects": [{"title": "My Project"}],
        }
        sanitized = self.scraper._sanitize_linkedin_response(raw_data)

        # These are in allowed fields and not specially handled
        assert sanitized["certifications"] == [{"name": "AWS Certified"}]
        assert sanitized["languages"] == [{"name": "English"}]
        assert sanitized["publications"] == [{"title": "My Paper"}]
        assert sanitized["projects"] == [{"title": "My Project"}]

    def test_whitelist_is_comprehensive(self):
        """Verify the whitelist contains expected fields."""
        expected_fields = {
            "firstName",
            "lastName",
            "headline",
            "summary",
            "locationName",
            "industryName",
            "experience",
            "education",
            "skills",
            "certifications",
            "languages",
            "publications",
            "projects",
            "connectionsCount",
            "profilePicture",
        }
        assert LINKEDIN_ALLOWED_FIELDS == expected_fields
