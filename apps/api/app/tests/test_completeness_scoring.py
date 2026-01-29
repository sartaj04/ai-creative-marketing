"""Tests for identity graph completeness scoring."""
import pytest
from unittest.mock import MagicMock

from app.services.onboarding_service import OnboardingService


class TestCompletenessScoring:
    """Test cases for completeness score calculation."""

    def setup_method(self):
        """Set up test fixtures."""
        # Create a mock db session (not used in scoring calculation)
        self.mock_db = MagicMock()
        self.service = OnboardingService(self.mock_db)

    def _create_mock_graph(self, **kwargs):
        """Create a mock identity graph with given attributes."""
        graph = MagicMock()
        # Set defaults
        graph.current_role = None
        graph.industry = None
        graph.expertise_areas = None
        graph.target_audience = None
        graph.goals = None
        graph.unique_angles = None
        graph.career_highlights = None
        graph.interests = None
        graph.beliefs = None
        graph.content_pillars = None
        # Override with provided values
        for key, value in kwargs.items():
            setattr(graph, key, value)
        return graph

    def test_empty_graph_scores_zero(self):
        """Empty identity graph should score 0."""
        graph = self._create_mock_graph()
        score = self.service._calculate_completeness_score(graph)
        assert score == 0

    def test_full_graph_scores_100(self):
        """Fully populated identity graph should score 100."""
        graph = self._create_mock_graph(
            current_role="Software Engineer",
            industry="Technology",
            expertise_areas=["Python", "Machine Learning"],
            target_audience="Tech startups",
            goals="Build thought leadership",
            unique_angles=["AI ethics perspective"],
            career_highlights=["Led major project", "Scaled team 10x"],
            interests=["Open source"],
            beliefs=["Technology should be accessible"],
            content_pillars=["Technical tutorials"],
        )
        score = self.service._calculate_completeness_score(graph)
        assert score == 100

    def test_current_role_adds_15_points(self):
        """current_role should add 15 points."""
        graph = self._create_mock_graph(current_role="Software Engineer")
        score = self.service._calculate_completeness_score(graph)
        assert score == 15

    def test_industry_adds_10_points(self):
        """industry should add 10 points."""
        graph = self._create_mock_graph(industry="Technology")
        score = self.service._calculate_completeness_score(graph)
        assert score == 10

    def test_expertise_areas_single_adds_8_points(self):
        """Single expertise area should add 8 points."""
        graph = self._create_mock_graph(expertise_areas=["Python"])
        score = self.service._calculate_completeness_score(graph)
        assert score == 8

    def test_expertise_areas_two_or_more_adds_15_points(self):
        """Two or more expertise areas should add 15 points."""
        graph = self._create_mock_graph(expertise_areas=["Python", "JavaScript"])
        score = self.service._calculate_completeness_score(graph)
        assert score == 15

    def test_target_audience_adds_15_points(self):
        """target_audience should add 15 points."""
        graph = self._create_mock_graph(target_audience="Tech startups")
        score = self.service._calculate_completeness_score(graph)
        assert score == 15

    def test_goals_adds_10_points(self):
        """goals should add 10 points."""
        graph = self._create_mock_graph(goals="Build thought leadership")
        score = self.service._calculate_completeness_score(graph)
        assert score == 10

    def test_unique_angles_adds_10_points(self):
        """At least one unique angle should add 10 points."""
        graph = self._create_mock_graph(unique_angles=["AI ethics perspective"])
        score = self.service._calculate_completeness_score(graph)
        assert score == 10

    def test_career_highlights_single_adds_5_points(self):
        """Single career highlight should add 5 points."""
        graph = self._create_mock_graph(career_highlights=["Led major project"])
        score = self.service._calculate_completeness_score(graph)
        assert score == 5

    def test_career_highlights_two_or_more_adds_10_points(self):
        """Two or more career highlights should add 10 points."""
        graph = self._create_mock_graph(
            career_highlights=["Led major project", "Scaled team"]
        )
        score = self.service._calculate_completeness_score(graph)
        assert score == 10

    def test_interests_adds_5_points(self):
        """At least one interest should add 5 points."""
        graph = self._create_mock_graph(interests=["Open source"])
        score = self.service._calculate_completeness_score(graph)
        assert score == 5

    def test_beliefs_adds_5_points(self):
        """At least one belief should add 5 points."""
        graph = self._create_mock_graph(beliefs=["Technology should be accessible"])
        score = self.service._calculate_completeness_score(graph)
        assert score == 5

    def test_content_pillars_adds_5_points(self):
        """At least one content pillar should add 5 points."""
        graph = self._create_mock_graph(content_pillars=["Technical tutorials"])
        score = self.service._calculate_completeness_score(graph)
        assert score == 5

    def test_core_identity_fields_total_40_points(self):
        """Core identity fields (role, industry, 2+ expertise) should total 40 points."""
        graph = self._create_mock_graph(
            current_role="Software Engineer",
            industry="Technology",
            expertise_areas=["Python", "JavaScript"],
        )
        score = self.service._calculate_completeness_score(graph)
        assert score == 40  # 15 + 10 + 15

    def test_strategy_fields_total_35_points(self):
        """Strategy fields (audience, goals, angles) should total 35 points."""
        graph = self._create_mock_graph(
            target_audience="Tech startups",
            goals="Build thought leadership",
            unique_angles=["AI ethics perspective"],
        )
        score = self.service._calculate_completeness_score(graph)
        assert score == 35  # 15 + 10 + 10

    def test_content_personality_fields_total_25_points(self):
        """Content/personality fields should total 25 points."""
        graph = self._create_mock_graph(
            career_highlights=["Led project", "Scaled team"],
            interests=["Open source"],
            beliefs=["Accessibility"],
            content_pillars=["Tutorials"],
        )
        score = self.service._calculate_completeness_score(graph)
        assert score == 25  # 10 + 5 + 5 + 5

    def test_score_capped_at_100(self):
        """Score should never exceed 100."""
        # Even if somehow more fields exist, cap at 100
        graph = self._create_mock_graph(
            current_role="Software Engineer",
            industry="Technology",
            expertise_areas=["Python", "JavaScript", "Go", "Rust"],
            target_audience="Tech startups",
            goals="Build thought leadership",
            unique_angles=["AI ethics", "Open source", "Accessibility"],
            career_highlights=["Led project", "Scaled team", "Award winner"],
            interests=["Open source", "Gaming"],
            beliefs=["Accessibility", "Privacy"],
            content_pillars=["Tutorials", "Case studies"],
        )
        score = self.service._calculate_completeness_score(graph)
        assert score <= 100

    def test_empty_lists_count_as_missing(self):
        """Empty lists should not contribute to score."""
        graph = self._create_mock_graph(
            expertise_areas=[],
            unique_angles=[],
            career_highlights=[],
            interests=[],
            beliefs=[],
            content_pillars=[],
        )
        score = self.service._calculate_completeness_score(graph)
        assert score == 0

    def test_partial_completion_example(self):
        """Test a realistic partial completion scenario."""
        # User completed LinkedIn extraction but minimal chat
        graph = self._create_mock_graph(
            current_role="Product Manager",  # 15
            industry="SaaS",  # 10
            expertise_areas=["Product Strategy"],  # 8 (only 1)
            career_highlights=["Launched product"],  # 5 (only 1)
        )
        score = self.service._calculate_completeness_score(graph)
        assert score == 38  # 15 + 10 + 8 + 5
