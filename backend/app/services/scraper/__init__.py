"""
Web scraping services package.
"""
from app.services.scraper.base import BrowserPool, ScraperConfig, with_retry
from app.services.scraper.ecommerce import scrape_ecommerce, scrape_product_page
from app.services.scraper.saas import scrape_saas
from app.services.scraper.personal import scrape_personal

__all__ = [
    "BrowserPool",
    "ScraperConfig",
    "with_retry",
    "scrape_ecommerce",
    "scrape_product_page",
    "scrape_saas",
    "scrape_personal",
]
