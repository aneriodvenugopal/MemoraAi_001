"""
Generate 15 high-quality educational articles using AI
"""
import asyncio
import sys
import os
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import uuid
from datetime import datetime
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv(Path(__file__).parent.parent / '.env')

# Article topics mapped to categories
ARTICLE_TOPICS = [
    {
        "title": "How Lead Leakage is Costing Your Real Estate Business Crores",
        "category_slug": "lead-management-solutions",
        "prompt": "real estate lead leakage problem and automated CRM solution"
    },
    {
        "title": "5 Ways Automated Follow-ups Increased Sales by 40% for Real Estate Firms",
        "category_slug": "lead-management-solutions",
        "prompt": "automated follow-up systems in real estate and sales increase"
    },
    {
        "title": "Stop Chasing Payments: Automate and Get Paid On Time",
        "category_slug": "payment-automation",
        "prompt": "payment reminder automation for real estate businesses"
    },
    {
        "title": "How Payment Automation Reduced Collection Time by 60%",
        "category_slug": "payment-automation",
        "prompt": "payment automation ROI and collection efficiency"
    },
    {
        "title": "Never Miss a Commission Again: The Smart Tracking System",
        "category_slug": "commission-tracking",
        "prompt": "commission tracking automation for real estate agents"
    },
    {
        "title": "How Digital Property Layouts Increased Site Visits by 3X",
        "category_slug": "digital-property-layouts",
        "prompt": "interactive digital property layouts and customer engagement"
    },
    {
        "title": "From Paper to Digital: Transforming Property Showcasing",
        "category_slug": "digital-property-layouts",
        "prompt": "digital transformation of property layouts and benefits"
    },
    {
        "title": "Why Your Real Estate Business Needs a Dedicated CRM Today",
        "category_slug": "crm-for-real-estate",
        "prompt": "importance of CRM for real estate business growth"
    },
    {
        "title": "CRM Success Story: How We Closed 50+ Deals in 3 Months",
        "category_slug": "crm-for-real-estate",
        "prompt": "real estate CRM success story and deal closure"
    },
    {
        "title": "Data-Driven Real Estate: Making Decisions That Drive Profits",
        "category_slug": "analytics-insights",
        "prompt": "analytics and data-driven decision making in real estate"
    },
    {
        "title": "5 Analytics Metrics Every Real Estate Business Must Track",
        "category_slug": "analytics-insights",
        "prompt": "key analytics metrics for real estate business success"
    },
    {
        "title": "Building Long-Term Relationships: The Key to Repeat Business",
        "category_slug": "customer-retention",
        "prompt": "customer retention strategies in real estate"
    },
    {
        "title": "How Customer Retention Increased Revenue by 80%",
        "category_slug": "customer-retention",
        "prompt": "customer retention ROI and revenue growth"
    },
    {
        "title": "Turn Your Customers into Your Best Sales Team",
        "category_slug": "referral-growth",
        "prompt": "referral marketing and customer advocacy in real estate"
    },
    {
        "title": "Referral Programs That Actually Work: A Complete Guide",
        "category_slug": "referral-growth",
        "prompt": "successful referral programs for real estate businesses"
    }
]

async def generate_article_content(title, prompt_topic):
    """Generate article content using GPT-5"""
    
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    
    system_message = """You are an expert real estate technology content writer. 
Your goal is to write highly persuasive educational articles that:
1. Identify a specific problem real estate businesses face
2. Explain the business impact with real numbers
3. Present ExlainERP as the solution naturally
4. Show clear ROI and benefits
5. Include success metrics and CTAs

Write in a conversational, engaging tone. Use real-world examples.
Format the content in markdown with proper headings."""
    
    user_message_text = f"""Write a comprehensive article about: {prompt_topic}

Title: {title}

Structure the article with these sections:
1. Opening hook (2-3 sentences that grab attention)
2. Problem Statement (What's the pain point?)
3. Impact Analysis (How much is this costing businesses?)
4. The Solution (How ExlainERP solves this)
5. ROI & Benefits (Specific numbers and outcomes)
6. Success Metrics (What results to expect)
7. Conclusion with strong CTA

Make it 800-1000 words. Use real statistics where possible. Make it persuasive but educational."""
    
    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"article_gen_{uuid.uuid4()}",
            system_message=system_message
        ).with_model("openai", "gpt-5")
        
        user_message = UserMessage(text=user_message_text)
        content = await chat.send_message(user_message)
        
        return content
    except Exception as e:
        print(f"Error generating content: {e}")
        return None

async def generate_all_articles():
    """Generate and save all articles"""
    
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Get categories
    categories = await db.content_categories.find().to_list(length=None)
    category_map = {cat['slug']: cat for cat in categories}
    
    # Get or create admin user
    admin_user = await db.users.find_one({"role": "super_admin"})
    if not admin_user:
        print("No admin user found, using default ID")
        author_id = str(uuid.uuid4())
        author_name = "ExlainERP Team"
    else:
        author_id = admin_user['id']
        author_name = admin_user.get('name', 'ExlainERP Team')
    
    print(f"Starting to generate {len(ARTICLE_TOPICS)} articles...")
    print("This may take a few minutes...\n")
    
    articles_created = 0
    
    for idx, topic in enumerate(ARTICLE_TOPICS, 1):
        print(f"[{idx}/{len(ARTICLE_TOPICS)}] Generating: {topic['title']}")
        
        # Generate content
        content = await generate_article_content(topic['title'], topic['prompt'])
        
        if not content:
            print(f"  ❌ Failed to generate content")
            continue
        
        # Extract sections from content (basic parsing)
        # Split content into sections
        sections = content.split('\n\n')
        
        # Create excerpt from first 2-3 sentences
        excerpt_parts = content.split('.')[:3]
        excerpt = '. '.join(excerpt_parts) + '.'
        if len(excerpt) > 200:
            excerpt = excerpt[:197] + '...'
        
        # Get category
        category = category_map.get(topic['category_slug'])
        
        if not category:
            print(f"  ❌ Category not found: {topic['category_slug']}")
            continue
        
        # Create article
        slug = topic['title'].lower().replace(" ", "-").replace(":", "").replace("'", "")
        
        article = {
            "id": str(uuid.uuid4()),
            "title": topic['title'],
            "slug": slug,
            "excerpt": excerpt,
            "content": content,
            "featured_image": f"https://images.unsplash.com/photo-16{20+idx}090738077-75d2187fd892?crop=entropy&cs=srgb&fm=jpg&q=85",
            "category_id": category['id'],
            "tags": [],
            "author_id": author_id,
            "author_name": author_name,
            "problem_statement": f"Real estate businesses struggle with {topic['prompt']}",
            "impact_analysis": "This problem costs businesses crores in lost revenue annually",
            "solution_description": f"ExlainERP provides automated solutions for {topic['prompt']}",
            "roi_benefits": "40X faster growth, zero leakage, maximum profits",
            "success_metrics": "Increased sales by 40%, reduced costs by 60%",
            "reading_time": 7,
            "cta_text": "Start Free Trial",
            "cta_link": "/register",
            "status": "published",
            "view_count": 0,
            "share_count": 0,
            "lead_count": 0,
            "published_at": datetime.utcnow().isoformat(),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Insert article
        await db.articles.insert_one(article)
        articles_created += 1
        print(f"  ✅ Created successfully (ID: {article['id'][:8]}...)")
        
        # Small delay to avoid rate limiting
        await asyncio.sleep(2)
    
    print(f"\n✅ Successfully created {articles_created}/{len(ARTICLE_TOPICS)} articles")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(generate_all_articles())
