"""Service for fetching and filtering trending signals from external sources.

This service fetches trending topics from industry-specific RSS feeds and Google News,
then uses Gemini to filter and summarize them based on the user's primary focus.
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

# Industry to RSS feed mapping
INDUSTRY_FEEDS = {
    "Technology": [
        "http://feeds.feedburner.com/TechCrunch/",
        "https://www.theverge.com/rss/index.xml",
        "https://www.wired.com/feed/rss",
    ],
    "Marketing": [
        "https://marketingland.com/feed",
        "https://searchengineland.com/feed",
        "https://www.socialmediaexaminer.com/feed/",
    ],
    "Finance": [
        "https://www.cnbc.com/id/10000664/device/rss/rss.html",
        "https://feeds.bloomberg.com/markets/news.xml",
        "https://www.investopedia.com/feedbuilder/feed/getfeed/?feedName=rss_headline",
    ],
    "Healthcare": [
        "https://www.medicalnewstoday.com/feed",
        "https://www.medpagetoday.com/rss/headlines.xml",
    ],
    "Real Estate": [
        "https://www.inman.com/feed/",
        "https://www.realtor.com/news/feed/",
    ],
    # Default fallback for unmapped industries
    "General": [
        "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en",
    ]
}

class TrendingSignalsService:
    """Service to fetch and process trending signals."""

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
        topic_domains: List[str] = None
    ) -> str:
        """Fetch and return a string of relevant trending signals.
        
        Args:
            industry: User's industry (e.g., "Technology", "Marketing")
            primary_focus: User's specific niche or focus (e.g., "AI Agents", "SEO")
            topic_domains: Optional list of specific topic domains
            
        Returns:
            String containing 5-10 bullet points of relevant trends.
        """
        try:
            # 1. Gather distinct RSS URLs
            urls = set()
            
            # Add industry-specific feeds
            mapped_industry = self._map_industry(industry)
            urls.update(INDUSTRY_FEEDS.get(mapped_industry, INDUSTRY_FEEDS["General"]))
            
            # Add Google News search for primary focus
            if primary_focus:
                encoded_focus = quote_plus(primary_focus)
                urls.add(f"https://news.google.com/rss/search?q={encoded_focus}&hl=en-US&gl=US&ceid=US:en")
            
            # Add Google News search for industry trends
            if industry and industry != mapped_industry:
                 encoded_industry = quote_plus(f"{industry} trends")
                 urls.add(f"https://news.google.com/rss/search?q={encoded_industry}&hl=en-US&gl=US&ceid=US:en")

            # 2. Fetch feeds concurrently
            logger.info(f"Fetching trending signals for {industry}/{primary_focus} from {len(urls)} sources")
            raw_items = await self._fetch_all_feeds(list(urls))
            
            if not raw_items:
                return "No real-time trending signals available. Use general industry knowledge."

            # 3. Filter and Summarize with LLM
            signals = await self._process_signals_with_llm(raw_items, industry, primary_focus)
            return signals

        except Exception as e:
            logger.error(f"Error fetching trending signals: {e}", exc_info=True)
            return "Trending signal fetch failed. Rely on evergreen industry topics."

    def _map_industry(self, industry: str) -> str:
        """Map raw industry string to a key in INDUSTRY_FEEDS."""
        if not industry:
            return "General"
        
        industry_lower = industry.lower()
        if "tech" in industry_lower or "software" in industry_lower or "saas" in industry_lower:
            return "Technology"
        if "market" in industry_lower or "advert" in industry_lower or "brand" in industry_lower:
            return "Marketing"
        if "financ" in industry_lower or "invest" in industry_lower or "crypto" in industry_lower:
            return "Finance"
        if "health" in industry_lower or "medic" in industry_lower or "doctor" in industry_lower:
            return "Healthcare"
        if "estate" in industry_lower or "realt" in industry_lower or "property" in industry_lower:
            return "Real Estate"
        
        return "General"

    async def _fetch_feed(self, url: str) -> List[Dict]:
        """Fetch a single RSS feed asynchronously (uses run_in_executor for feedparser)."""
        loop = asyncio.get_event_loop()
        try:
            # feedparser is blocking, so run in executor
            feed = await loop.run_in_executor(None, feedparser.parse, url)
            
            # Extract simple dicts
            items = []
            for entry in feed.entries[:5]:  # Take top 5 from each feed
                items.append({
                    "title": entry.get("title", ""),
                    "summary": entry.get("summary", "")[:200],  # Truncate summary
                    "link": entry.get("link", ""),
                    "published": entry.get("published", "")
                })
            return items
        except Exception as e:
            logger.warning(f"Failed to fetch feed {url}: {e}")
            return []

    async def _fetch_all_feeds(self, urls: List[str]) -> List[Dict]:
        """Fetch multiple feeds concurrently and flatten results."""
        tasks = [self._fetch_feed(url) for url in urls]
        # Allow some to fail
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
                
        # Limit total items sent to LLM to avoid context window issues
        return unique_items[:30]

    async def _process_signals_with_llm(
        self, 
        items: List[Dict], 
        industry: str, 
        primary_focus: str
    ) -> str:
        """Use LLM to select relevant signals and summarize them."""
        
        # Format items for prompt
        items_text = ""
        for i, item in enumerate(items):
            items_text += f"{i+1}. {item['title']} - {item['summary']}\n"

        system_prompt = (
            "You are a Trend Analyst for a content agency. "
            "Your job is to identify the most relevant, high-impact news signals "
            "for a specific creator."
        )
        
        user_template = (
            "User Industry: {industry}\n"
            "User Primary Focus: {primary_focus}\n\n"
            "Raw News Items:\n"
            "{items_text}\n\n"
            "Task:\n"
            "1. Identify the top 5-7 news items that are most relevant to the user's focus.\n"
            "2. Ignore generic or irrelevant news.\n"
            "3. Rewrite them as a 'Trending Signals' list.\n"
            "4. Each signal must be a concise sentence explaining the trend and why it matters.\n\n"
            "Format:\n"
            "- [TREND] Signal description\n"
            "- [NEWS] Signal description\n"
        )
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", user_template)
        ])
        
        chain = prompt | self.llm | StrOutputParser()
        
        response = await chain.ainvoke({
            "industry": industry,
            "primary_focus": primary_focus,
            "items_text": items_text
        })
        
        return response
