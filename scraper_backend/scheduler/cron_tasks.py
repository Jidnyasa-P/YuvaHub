import asyncio
from celery import Celery
from celery.schedules import crontab

# Celery app configured with Redis as broker
app = Celery("yuvahub_scraper", broker="redis://localhost:6379/0")

app.conf.beat_schedule = {
    # Run Internshala scraper every 6 hours
    'scrape-internshala': {
        'task': 'scheduler.cron_tasks.run_internshala_scraper',
        'schedule': crontab(hour='*/6', minute='0'),
    },
    # Run Devfolio scraper every 6 hours (staggered)
    'scrape-devfolio': {
        'task': 'scheduler.cron_tasks.run_devfolio_scraper',
        'schedule': crontab(hour='*/6', minute='30'),
    },
}

@app.task
def run_internshala_scraper():
    """Celery task wrapper to run async scraper."""
    from scraper_engine.sources.internships.internshala import InternshalaScraper
    
    async def _run():
        scraper = InternshalaScraper()
        results = await scraper.run("https://internshala.com/internships/")
        # Save to DB logic here
        print(f"Scraped {len(results)} items from Internshala.")
        
    asyncio.run(_run())

@app.task
def run_devfolio_scraper():
    """Celery task wrapper for Devfolio."""
    from scraper_engine.sources.hackathons.devfolio import DevfolioScraper
    
    async def _run():
        scraper = DevfolioScraper()
        results = await scraper.run("https://devfolio.co/hackathons")
        print(f"Scraped {len(results)} items from Devfolio.")
        
    asyncio.run(_run())
