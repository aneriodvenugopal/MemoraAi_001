"""
Quick script to generate 5 test articles (one from each category)
"""
import asyncio
import sys
import os
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from services.article_generator import ArticleGenerator
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017/')
client = AsyncIOMotorClient(MONGO_URL)
db = client.retoerp_db

TEST_ARTICLES = [
    {
        "topic": "Are You Still Managing Real Estate Sales with Excel? Here's Why You're Losing Deals",
        "category": "saas",
        "sub_category": "problem-solution",
        "keywords": ["real estate management software", "property sales automation", "real estate CRM"],
    },
    {
        "topic": "How Top Real Estate Developers Are Selling 50+ Plots in 30 Days",
        "category": "saas",
        "sub_category": "problem-solution",
        "keywords": ["real estate sales automation", "property marketing software", "digital plot booking"],
    },
    {
        "topic": "Buy Your Dream Home from Anywhere: Complete Digital Journey",
        "category": "tenant",
        "sub_category": "customer-benefits",
        "keywords": ["online property booking", "digital real estate", "virtual plot viewing"],
    },
    {
        "topic": "Your Personal Property Dashboard: Track Everything in One Place",
        "category": "tenant",
        "sub_category": "customer-benefits",
        "keywords": ["customer portal", "property tracking", "real estate dashboard"],
    },
    {
        "topic": "Green Valley Estates: Where Nature Meets Luxury - Interactive Plot Selection Made Easy",
        "category": "project",
        "sub_category": "project-features",
        "keywords": ["residential plots", "gated community", "online plot booking", "virtual plot viewing"],
    }
]

async def generate_test_articles():
    generator = ArticleGenerator()
    
    print("\n" + "="*60)
    print("Generating 5 Test Articles using OpenAI GPT-5")
    print("="*60 + "\n")
    
    for i, article_data in enumerate(TEST_ARTICLES, 1):
        try:
            print(f"[{i}/5] Generating: {article_data['topic'][:60]}...")
            
            result = await generator.generate_article(
                topic=article_data['topic'],
                category=article_data['category'],
                sub_category=article_data['sub_category'],
                keywords=article_data['keywords'],
                target_word_count=1500
            )
            
            result["id"] = str(datetime.now().timestamp()).replace('.', '') + f"_test_{i}"
            result["created_at"] = datetime.now()
            result["updated_at"] = datetime.now()
            result["published_at"] = datetime.now()
            result["views"] = 0
            result["likes"] = 0
            result["deleted_at"] = None
            
            await db.articles.insert_one(result)
            
            print(f"✓ Generated: {result['title']}")
            print(f"  Slug: {result['slug']}")
            print(f"  Category: {result['category']}")
            print(f"  Reading time: {result['reading_time']} min\n")
            
        except Exception as e:
            print(f"✗ ERROR: {str(e)}\n")
    
    total = await db.articles.count_documents({"deleted_at": None})
    print("="*60)
    print(f"✓ Test generation complete! Total articles in DB: {total}")
    print("="*60 + "\n")

if __name__ == "__main__":
    asyncio.run(generate_test_articles())
