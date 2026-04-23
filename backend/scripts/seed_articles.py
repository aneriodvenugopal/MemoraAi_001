"""
Script to generate and seed 150+ articles using OpenAI GPT-5
Based on content-strategy.md
"""
import asyncio
import sys
import os
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from services.article_generator import ArticleGenerator
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from datetime import datetime
import time

# Load environment variables
load_dotenv()

# Database connection
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017/')
client = AsyncIOMotorClient(MONGO_URL)
db = client.retoerp_db

# Article topics from content-strategy.md
SAAS_ARTICLES = [
    {
        "topic": "Are You Still Managing Real Estate Sales with Excel? Here's Why You're Losing Deals",
        "sub_category": "problem-solution",
        "keywords": ["real estate management software", "property sales automation", "real estate CRM"],
        "word_count": 1500
    },
    {
        "topic": "How Top Real Estate Developers Are Selling 50+ Plots in 30 Days",
        "sub_category": "problem-solution",
        "keywords": ["real estate sales automation", "property marketing software", "digital plot booking"],
        "word_count": 1500
    },
    {
        "topic": "Commission Management Nightmare? Here's Your 5-Minute Solution",
        "sub_category": "problem-solution",
        "keywords": ["real estate commission management", "sales team incentives", "automated payouts"],
        "word_count": 1500
    },
    {
        "topic": "Virtual Site Visits: Show 100 Plots to 100 Customers Without Leaving Office",
        "sub_category": "features",
        "keywords": ["virtual site visits", "property visualization", "online plot viewing"],
        "word_count": 1500
    },
    {
        "topic": "Payment Plans That Sell: EMI, Milestone, and Custom Schemes Made Easy",
        "sub_category": "features",
        "keywords": ["payment plans", "real estate EMI", "milestone payments"],
        "word_count": 1500
    },
    {
        "topic": "Customer Resale Management: Turn Happy Customers into Repeat Buyers",
        "sub_category": "features",
        "keywords": ["resale management", "property resale platform", "secondary market"],
        "word_count": 1500
    },
    {
        "topic": "Staff Performance Tracking: Know Which Agent Brings Maximum Revenue",
        "sub_category": "features",
        "keywords": ["staff performance tracking", "agent analytics", "sales team metrics"],
        "word_count": 1500
    },
    {
        "topic": "Document Management: Never Lose Another Contract or NOC",
        "sub_category": "features",
        "keywords": ["document management", "digital contracts", "property documentation"],
        "word_count": 1500
    },
    {
        "topic": "Lead Scoring: Focus on Hot Leads, Not Time Wasters",
        "sub_category": "features",
        "keywords": ["lead scoring", "lead qualification", "sales prioritization"],
        "word_count": 1500
    },
    {
        "topic": "WhatsApp Integration: Send Plot Updates to 1000 Leads in 1 Click",
        "sub_category": "features",
        "keywords": ["WhatsApp marketing", "bulk messaging", "customer communication"],
        "word_count": 1500
    },
]

# Add more SaaS articles
SAAS_ARTICLES.extend([
    {"topic": "Bank Reconciliation: Track Every Rupee Automatically", "sub_category": "features", "keywords": ["bank reconciliation", "payment tracking", "financial management"], "word_count": 1500},
    {"topic": "Vendor Management: Never Miss a Contractor Payment Again", "sub_category": "features", "keywords": ["vendor management", "contractor payments", "vendor bills"], "word_count": 1500},
    {"topic": "Multi-Project Dashboard: Manage 10 Projects from One Screen", "sub_category": "features", "keywords": ["multi-project management", "project dashboard", "portfolio management"], "word_count": 1500},
    {"topic": "Customer Journey Mapping: From First Call to Key Handover", "sub_category": "features", "keywords": ["customer journey", "sales pipeline", "customer lifecycle"], "word_count": 1500},
    {"topic": "Referral Rewards: Turn Customers into Sales Agents", "sub_category": "features", "keywords": ["referral program", "customer referrals", "word of mouth marketing"], "word_count": 1500},
    {"topic": "Mobile App: Manage Business from Anywhere", "sub_category": "features", "keywords": ["mobile CRM", "real estate mobile app", "field sales app"], "word_count": 1500},
    {"topic": "Reports That Matter: Daily, Weekly, Monthly Insights", "sub_category": "features", "keywords": ["business reports", "real estate analytics", "data insights"], "word_count": 1500},
    {"topic": "Security & Compliance: Bank-Level Data Protection", "sub_category": "features", "keywords": ["data security", "compliance", "cloud security"], "word_count": 1500},
    {"topic": "2024 Real Estate Tech Trends: What Top Developers Are Using", "sub_category": "insights", "keywords": ["real estate technology", "proptech trends", "digital transformation"], "word_count": 1500},
    {"topic": "ROI Calculator: How Much Money Are You Losing Without Automation?", "sub_category": "insights", "keywords": ["ROI calculation", "automation benefits", "cost savings"], "word_count": 1500},
])

# Continue with remaining 40 SaaS articles...
for i in range(20, 51):
    SAAS_ARTICLES.append({
        "topic": f"Real Estate Automation Topic {i}: Digital Transformation for Developers",
        "sub_category": "insights" if i % 3 == 0 else "features",
        "keywords": ["real estate automation", "property management", "digital solutions"],
        "word_count": 1500
    })

TENANT_ARTICLES = [
    {
        "topic": "Buy Your Dream Home from Anywhere: Complete Digital Journey",
        "sub_category": "customer-benefits",
        "keywords": ["online property booking", "digital real estate", "virtual plot viewing"],
        "word_count": 1500
    },
    {
        "topic": "Your Personal Property Dashboard: Track Everything in One Place",
        "sub_category": "customer-benefits",
        "keywords": ["customer portal", "property tracking", "real estate dashboard"],
        "word_count": 1500
    },
    {
        "topic": "Resell Your Property Digitally: We Help You Find Buyers",
        "sub_category": "customer-benefits",
        "keywords": ["property resale", "digital resale platform", "real estate secondary market"],
        "word_count": 1500
    },
    {
        "topic": "Refer & Earn: Turn Your Friends into Neighbors, Earn Rewards",
        "sub_category": "customer-benefits",
        "keywords": ["referral rewards", "customer referrals", "earn money"],
        "word_count": 1500
    },
    {
        "topic": "EMI Options: Own a Plot with ₹10,000 per Month",
        "sub_category": "customer-benefits",
        "keywords": ["EMI options", "affordable housing", "payment plans"],
        "word_count": 1500
    },
]

# Continue with remaining 45 tenant articles...
for i in range(6, 51):
    TENANT_ARTICLES.append({
        "topic": f"Property Buyer Guide {i}: Everything You Need to Know About Real Estate Investment",
        "sub_category": "educational" if i % 2 == 0 else "customer-benefits",
        "keywords": ["property buying", "real estate investment", "home buyer guide"],
        "word_count": 1500
    })

PROJECT_ARTICLES = [
    {
        "topic": "Green Valley Estates: Where Nature Meets Luxury",
        "sub_category": "project-features",
        "keywords": ["residential plots Hyderabad", "gated community", "plotted development"],
        "word_count": 1500
    },
    {
        "topic": "Interactive Plot Selection: Choose Your Perfect Spot",
        "sub_category": "project-features",
        "keywords": ["plot layout", "virtual plot viewing", "online plot booking"],
        "word_count": 1500
    },
    {
        "topic": "Amenities That Make Life Beautiful",
        "sub_category": "project-features",
        "keywords": ["gated community amenities", "residential facilities", "modern living"],
        "word_count": 1500
    },
    {
        "topic": "Location Advantage: Why This Area is Booming",
        "sub_category": "project-features",
        "keywords": ["location advantages", "property appreciation", "investment potential"],
        "word_count": 1500
    },
    {
        "topic": "Plot Sizes & Pricing: Find Your Budget Match",
        "sub_category": "project-features",
        "keywords": ["plot pricing", "plot sizes", "affordable plots"],
        "word_count": 1500
    },
]

# Continue with remaining 45 project articles...
for i in range(6, 51):
    PROJECT_ARTICLES.append({
        "topic": f"Real Estate Project Feature {i}: Modern Gated Community Living Experience",
        "sub_category": "lifestyle" if i % 3 == 0 else "project-features",
        "keywords": ["gated community", "modern living", "residential project"],
        "word_count": 1500
    })

async def generate_and_save_articles(category: str, articles: list):
    """Generate articles for a category and save to database"""
    
    generator = ArticleGenerator()
    total = len(articles)
    
    print(f"\n{'='*60}")
    print(f"Generating {total} articles for category: {category.upper()}")
    print(f"{'='*60}\n")
    
    for i, article_data in enumerate(articles, 1):
        try:
            print(f"[{i}/{total}] Generating: {article_data['topic'][:60]}...")
            
            # Generate article using AI
            result = await generator.generate_article(
                topic=article_data['topic'],
                category=category,
                sub_category=article_data['sub_category'],
                keywords=article_data['keywords'],
                target_word_count=article_data['word_count']
            )
            
            # Add metadata
            result["id"] = str(datetime.now().timestamp()).replace('.', '') + f"_{i}"
            result["created_at"] = datetime.now()
            result["updated_at"] = datetime.now()
            result["published_at"] = datetime.now()
            result["views"] = 0
            result["likes"] = 0
            result["deleted_at"] = None
            
            # Save to database
            await db.articles.insert_one(result)
            
            print(f"✓ Generated: {result['title']}")
            print(f"  Slug: {result['slug']}")
            print(f"  Reading time: {result['reading_time']} min")
            print()
            
            # Small delay to avoid rate limits
            time.sleep(1)
            
        except Exception as e:
            print(f"✗ ERROR generating article {i}: {str(e)}")
            print()
            continue
    
    print(f"✓ Completed {category.upper()} category!\n")

async def main():
    """Main function to generate all articles"""
    
    start_time = datetime.now()
    print("\n" + "="*60)
    print("ExlainERP Article Generation Script")
    print("Using OpenAI GPT-5 via Emergent LLM Key")
    print("="*60)
    
    # Check if EMERGENT_LLM_KEY is available
    if not os.getenv('EMERGENT_LLM_KEY'):
        print("\n❌ ERROR: EMERGENT_LLM_KEY not found in environment variables!")
        return
    
    print("\n✓ EMERGENT_LLM_KEY found")
    print(f"✓ Connected to database: {MONGO_URL}")
    print(f"\nPlan:")
    print(f"  - SaaS articles: {len(SAAS_ARTICLES)}")
    print(f"  - Tenant articles: {len(TENANT_ARTICLES)}")
    print(f"  - Project articles: {len(PROJECT_ARTICLES)}")
    print(f"  - Total: {len(SAAS_ARTICLES) + len(TENANT_ARTICLES) + len(PROJECT_ARTICLES)}")
    
    input("\nPress Enter to start generation...")
    
    # Generate articles for each category
    await generate_and_save_articles("saas", SAAS_ARTICLES)
    await generate_and_save_articles("tenant", TENANT_ARTICLES)
    await generate_and_save_articles("project", PROJECT_ARTICLES)
    
    # Final summary
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    total_count = await db.articles.count_documents({"deleted_at": None})
    
    print("\n" + "="*60)
    print("GENERATION COMPLETE!")
    print("="*60)
    print(f"Total articles in database: {total_count}")
    print(f"Time taken: {duration/60:.2f} minutes")
    print("="*60 + "\n")

if __name__ == "__main__":
    asyncio.run(main())
