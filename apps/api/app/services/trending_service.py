"""Service for fetching and filtering trending signals from external sources.

This service fetches trending topics from industry-specific RSS feeds and Google News,
then uses Gemini to filter and summarize them based on the user's identity data —
expertise areas, interests, content pillars, and primary focus.

The output is structured so the Scout agent can produce news-reactive content:
posts that react to, analyze, or provide a unique take on actual current events.
"""

import asyncio
import feedparser
import logging
from typing import List, Dict, Optional
from urllib.parse import quote_plus

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from app.core.config import settings
from app.services.agency_graph import _get_gcp_credentials

logger = logging.getLogger(__name__)

# ============================================================================
# Industry → RSS feed mapping (expanded with high-quality sources)
# ============================================================================

INDUSTRY_FEEDS = {
    "Technology": [
        "http://feeds.feedburner.com/TechCrunch/",
        "https://www.theverge.com/rss/index.xml",
        "https://www.wired.com/feed/rss",
        "https://arstechnica.com/feed/",
    ],
    "AI": [
        "http://feeds.feedburner.com/TechCrunch/",
        "https://www.theverge.com/rss/index.xml",
        "https://techcrunch.com/category/artificial-intelligence/feed/",
        "https://www.marktechpost.com/feed/",
        "https://syncedreview.com/feed/",
        "https://the-decoder.com/feed/",
    ],
    "Marketing": [
        "https://searchengineland.com/feed",
        "https://www.socialmediaexaminer.com/feed/",
        "https://contentmarketinginstitute.com/feed/",
        "https://martech.org/feed/",
    ],
    "Finance": [
        "https://www.cnbc.com/id/10000664/device/rss/rss.html",
        "https://www.investopedia.com/feedbuilder/feed/getfeed/?feedName=rss_headline",
    ],
    "Healthcare": [
        "https://www.medicalnewstoday.com/feed",
        "https://www.medpagetoday.com/rss/headlines.xml",
    ],
    "Real Estate": [
        "https://www.inman.com/feed/",
    ],
    "Startup": [
        "http://feeds.feedburner.com/TechCrunch/",
        "https://news.ycombinator.com/rss",
    ],
    # Default fallback for unmapped industries
    "General": [
        "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en",
    ],
}


class TrendingSignalsService:
    """Service to fetch and process trending signals personalized to a user's identity."""

    def __init__(self):
        self.llm = self._init_llm()

    def _init_llm(self) -> ChatGoogleGenerativeAI:
        """Initialize Gemini for filtering and summarizing signals."""
        credentials = _get_gcp_credentials()
        return ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            project=settings.GCP_PROJECT_ID,
            location=settings.GCP_LOCATION,
            credentials=credentials,
            temperature=0.3,  # Lower temperature for factual summarization
        )

    async def get_trending_signals(
        self,
        industry: str,
        primary_focus: str,
        expertise_areas: Optional[List[str]] = None,
        interests: Optional[List[str]] = None,
        content_pillars: Optional[List[str]] = None,
    ) -> str:
        """Fetch and return a string of relevant trending signals.

        Args:
            industry: User's industry (e.g., "Technology", "Marketing")
            primary_focus: User's specific niche (e.g., "AI Agents", "SEO")
            expertise_areas: User's declared expertise areas from identity graph
            interests: User's personal/professional interests
            content_pillars: User's declared content pillars

        Returns:
            String containing categorized trending signals for the Scout agent.
        """
        try:
            # 1. Gather distinct RSS URLs
            urls = set()

            # Add industry-specific feeds
            mapped_industry = self._map_industry(industry)
            urls.update(INDUSTRY_FEEDS.get(mapped_industry, INDUSTRY_FEEDS["General"]))

            # 2. Build personalized Google News searches from identity data
            search_keywords = self._build_search_keywords(
                industry=industry,
                primary_focus=primary_focus,
                expertise_areas=expertise_areas or [],
                interests=interests or [],
                content_pillars=content_pillars or [],
            )

            for keyword in search_keywords:
                encoded = quote_plus(keyword)
                urls.add(
                    f"https://news.google.com/rss/search?q={encoded}&hl=en-US&gl=US&ceid=US:en"
                )

            # 3. Fetch feeds concurrently
            logger.info(
                f"Fetching trending signals for {industry}/{primary_focus} "
                f"from {len(urls)} sources "
                f"(keywords: {search_keywords})"
            )
            raw_items = await self._fetch_all_feeds(list(urls))

            if not raw_items:
                return "No real-time trending signals available. Use general industry knowledge."

            # 4. Filter and Summarize with LLM — personalized to user identity
            signals = await self._process_signals_with_llm(
                items=raw_items,
                industry=industry,
                primary_focus=primary_focus,
                expertise_areas=expertise_areas or [],
                interests=interests or [],
                content_pillars=content_pillars or [],
            )
            return signals

        except Exception as e:
            logger.error(f"Error fetching trending signals: {e}", exc_info=True)
            return "Trending signal fetch failed. Rely on evergreen industry topics."

    def _build_search_keywords(
        self,
        industry: str,
        primary_focus: str,
        expertise_areas: List[str],
        interests: List[str],
        content_pillars: List[str],
    ) -> List[str]:
        """Build targeted Google News search queries from identity data.

        An AI engineer should get searches like:
        - "AI models new release 2026"
        - "RAG retrieval augmented generation"
        - "AI policy regulation"
        - "AI investment funding"

        A marketing person should get:
        - "marketing AI tools 2026"
        - "social media algorithm changes"
        - "brand marketing trends"
        """
        keywords = set()

        # Primary focus — always search for this
        if primary_focus:
            keywords.add(primary_focus)
            keywords.add(f"{primary_focus} news")

        # Expertise areas — top 3, highly specific searches
        for area in expertise_areas[:3]:
            keywords.add(area)

        # Interests — top 2, for adjacent topic discovery
        # These expand beyond the user's job (e.g., an AI engineer
        # interested in quantum computing or AI policy)
        for interest in interests[:2]:
            keywords.add(f"{interest} news")

        # Industry-level trends search
        if industry:
            keywords.add(f"{industry} latest developments")

        # Content pillars — what they want to write about
        for pillar in content_pillars[:2]:
            keywords.add(pillar)

        # Adjacent topics: investment/funding and policy are always relevant
        # for tech/AI professionals
        mapped = self._map_industry(industry)
        if mapped in ("Technology", "AI"):
            keywords.add("AI startup funding investment")
            keywords.add("AI regulation policy")
            keywords.add("new AI model release")

        # Cap at 8 to avoid too many HTTP requests
        return list(keywords)[:8]

    def _map_industry(self, industry: str) -> str:
        """Map raw industry string to a key in INDUSTRY_FEEDS."""
        if not industry:
            return "General"

        industry_lower = industry.lower()

        # AI/ML-specific mapping (more targeted than generic "Technology")
        if any(kw in industry_lower for kw in [
            "ai", "artificial intelligence", "machine learning", "ml",
            "deep learning", "data science", "nlp",
        ]):
            return "AI"
        if any(kw in industry_lower for kw in ["tech", "software", "saas", "engineer"]):
            return "Technology"
        if any(kw in industry_lower for kw in ["market", "advert", "brand"]):
            return "Marketing"
        if any(kw in industry_lower for kw in ["financ", "invest", "crypto", "fintech"]):
            return "Finance"
        if any(kw in industry_lower for kw in ["health", "medic", "doctor", "pharma"]):
            return "Healthcare"
        if any(kw in industry_lower for kw in ["estate", "realt", "property"]):
            return "Real Estate"
        if any(kw in industry_lower for kw in ["startup", "venture", "founder"]):
            return "Startup"

        return "General"

    async def _fetch_feed(self, url: str) -> List[Dict]:
        """Fetch a single RSS feed asynchronously (uses run_in_executor for feedparser)."""
        loop = asyncio.get_event_loop()
        try:
            # feedparser is blocking, so run in executor
            feed = await loop.run_in_executor(None, feedparser.parse, url)

            # Extract simple dicts — take top 5 per feed
            items = []
            for entry in feed.entries[:5]:
                items.append({
                    "title": entry.get("title", ""),
                    "summary": entry.get("summary", "")[:200],
                    "link": entry.get("link", ""),
                    "published": entry.get("published", ""),
                })
            return items
        except Exception as e:
            logger.warning(f"Failed to fetch feed {url}: {e}")
            return []

    async def _fetch_all_feeds(self, urls: List[str]) -> List[Dict]:
        """Fetch multiple feeds concurrently and flatten results."""
        tasks = [self._fetch_feed(url) for url in urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        all_items = []
        for res in results:
            if isinstance(res, list):
                all_items.extend(res)

        # Deduplicate by title
        seen_titles = set()
        unique_items = []
        for item in all_items:
            title = item["title"]
            if title and title not in seen_titles:
                seen_titles.add(title)
                unique_items.append(item)

        # Limit total items sent to LLM
        return unique_items[:40]

    async def _process_signals_with_llm(
        self,
        items: List[Dict],
        industry: str,
        primary_focus: str,
        expertise_areas: List[str],
        interests: List[str],
        content_pillars: List[str],
    ) -> str:
        """Use LLM to select relevant signals and produce structured output for the Scout."""

        # Format items for prompt
        items_text = ""
        for i, item in enumerate(items):
            items_text += f"{i+1}. [{item['title']}] {item['summary']} (source: {item['link']})\n"

        # Build a rich identity context for filtering
        identity_context_parts = [f"Industry: {industry}"]
        if primary_focus:
            identity_context_parts.append(f"Primary Focus: {primary_focus}")
        if expertise_areas:
            identity_context_parts.append(f"Expertise Areas: {', '.join(expertise_areas[:5])}")
        if interests:
            identity_context_parts.append(f"Interests: {', '.join(interests[:5])}")
        if content_pillars:
            identity_context_parts.append(f"Content Pillars: {', '.join(content_pillars[:5])}")

        identity_context = "\n".join(identity_context_parts)

        system_prompt = (
            "You are a Trend Analyst for a content agency. "
            "Your job is to identify high-impact, timely news signals that a specific creator "
            "can turn into compelling social media posts. "
            "Think beyond just their job title — consider their broader interests, "
            "opinions they might have, and adjacent topics their audience would care about."
        )

        user_template = (
            "=== CREATOR IDENTITY ===\n"
            "{identity_context}\n\n"
            "=== RAW NEWS ITEMS (last 24-48 hours) ===\n"
            "{items_text}\n\n"
            "=== TASK ===\n"
            "Select the 7-10 MOST COMPELLING news items for this creator. Focus on:\n"
            "1. BREAKING NEWS directly in their expertise (new models, tools, frameworks)\n"
            "2. INVESTMENT/FUNDING news in their industry\n"
            "3. POLICY/REGULATORY developments that affect their work\n"
            "4. ADJACENT TOPICS their audience would find fascinating (even if outside their core job)\n"
            "5. CONTRARIAN or SURPRISING developments that challenge conventional wisdom\n\n"
            "For each selected signal, output:\n"
            "- [CATEGORY] HEADLINE — One-sentence summary of WHY this matters for this creator\n"
            "  Source: URL\n\n"
            "Categories:\n"
            "- [BREAKING] — Major new release, announcement, or development\n"
            "- [INVESTMENT] — Funding, acquisitions, or market movements\n"
            "- [POLICY] — Regulation, governance, or industry standards\n"
            "- [TREND] — Emerging pattern or shift in the industry\n"
            "- [PRODUCT] — New tool, platform, or product launch\n"
            "- [RESEARCH] — New paper, benchmark, or study results\n\n"
            "IMPORTANT:\n"
            "- Prioritize RECENCY. News from today > yesterday > this week.\n"
            "- Include at least 1 signal that is ADJACENT to their core expertise (e.g., for an AI engineer: AI policy, investment news, quantum computing, hardware trends).\n"
            "- Skip generic listicles, opinion pieces with no news hook, and press releases with no substance.\n"
            "- The creator will use these signals to write posts. Make the 'why it matters' specific enough that they can immediately see their unique angle.\n"
        )

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", user_template),
        ])

        chain = prompt | self.llm | StrOutputParser()

        response = await chain.ainvoke({
            "identity_context": identity_context,
            "items_text": items_text,
        })

        return response
