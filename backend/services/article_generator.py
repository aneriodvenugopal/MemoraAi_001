from emergentintegrations.llm.chat import LlmChat, UserMessage
import os
from dotenv import load_dotenv
import asyncio
import re
from datetime import datetime

# Load environment variables
load_dotenv()

class ArticleGenerator:
    def __init__(self):
        self.api_key = os.getenv('EMERGENT_LLM_KEY')
        if not self.api_key:
            raise ValueError("EMERGENT_LLM_KEY not found in environment variables")
        
    async def generate_article(self, topic: str, category: str, sub_category: str, 
                              keywords: list, target_word_count: int = 1500) -> dict:
        """Generate a single SEO-optimized article using OpenAI GPT-5"""
        
        # Create unique session ID for this article
        session_id = f"article_{category}_{int(datetime.now().timestamp())}"
        
        # Initialize LLM chat with GPT-5
        chat = LlmChat(
            api_key=self.api_key,
            session_id=session_id,
            system_message="You are an expert content writer specializing in real estate technology and ERP systems. Write comprehensive, SEO-optimized articles that are informative, engaging, and actionable."
        )
        chat.with_model("openai", "gpt-5")
        
        # Create detailed prompt based on category
        if category == "saas":
            target_audience = "real estate developers and companies (potential SaaS customers)"
            cta_type = "Request Demo, Start Free Trial, Schedule Call"
        elif category == "tenant":
            target_audience = "property buyers and end customers"
            cta_type = "View Properties, Request Site Visit, Register Interest"
        else:  # project
            target_audience = "property seekers looking to book plots"
            cta_type = "Book Site Visit, Reserve Plot, Contact Sales"
        
        prompt = f"""Write a comprehensive, SEO-optimized article about: "{topic}"

Category: {category}
Sub-category: {sub_category}
Target Audience: {target_audience}
SEO Keywords: {', '.join(keywords)}
Target Word Count: {target_word_count} words

Requirements:
1. Create an engaging title (50-60 characters)
2. Write a compelling meta description (150-160 characters)
3. Structure with clear H2 and H3 headings
4. Include bullet points and lists for readability
5. Add real-world examples and statistics
6. Use actionable language
7. Include a strong call-to-action: {cta_type}
8. Naturally incorporate the SEO keywords
9. Make it informative and valuable

Format your response as:
---TITLE---
[Article title here]

---META_DESCRIPTION---
[Meta description here]

---EXCERPT---
[Short 150-200 character excerpt for preview]

---CONTENT---
[Full article content in markdown format with ## for H2, ### for H3, bullet points, etc.]

---TAGS---
[Comma-separated relevant tags]
"""
        
        # Generate article
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse response
        article_data = self._parse_ai_response(response, category, sub_category, keywords)
        
        return article_data
    
    def _parse_ai_response(self, response: str, category: str, sub_category: str, keywords: list) -> dict:
        """Parse AI response into structured article data"""
        
        # Extract sections using markers
        title_match = re.search(r'---TITLE---(.*?)---', response, re.DOTALL)
        meta_match = re.search(r'---META_DESCRIPTION---(.*?)---', response, re.DOTALL)
        excerpt_match = re.search(r'---EXCERPT---(.*?)---', response, re.DOTALL)
        content_match = re.search(r'---CONTENT---(.*?)---', response, re.DOTALL)
        tags_match = re.search(r'---TAGS---(.*?)(?:---|$)', response, re.DOTALL)
        
        title = title_match.group(1).strip() if title_match else "Untitled Article"
        meta_description = meta_match.group(1).strip() if meta_match else ""
        excerpt = excerpt_match.group(1).strip() if excerpt_match else ""
        content = content_match.group(1).strip() if content_match else response
        tags_str = tags_match.group(1).strip() if tags_match else ""
        
        # Create slug from title
        slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
        
        # Parse tags
        tags = [tag.strip() for tag in tags_str.split(',') if tag.strip()]
        
        # Calculate reading time (average 200 words per minute)
        word_count = len(content.split())
        reading_time = max(1, round(word_count / 200))
        
        return {
            "title": title,
            "slug": slug,
            "content": content,
            "excerpt": excerpt,
            "category": category,
            "sub_category": sub_category,
            "keywords": keywords,
            "meta_description": meta_description,
            "tags": tags,
            "reading_time": reading_time,
            "status": "published"
        }
    
    async def generate_bulk_articles(self, category: str, count: int, article_topics: list) -> list:
        """Generate multiple articles concurrently"""
        
        tasks = []
        for i, topic_data in enumerate(article_topics[:count]):
            task = self.generate_article(
                topic=topic_data['topic'],
                category=category,
                sub_category=topic_data.get('sub_category', 'general'),
                keywords=topic_data.get('keywords', []),
                target_word_count=topic_data.get('word_count', 1500)
            )
            tasks.append(task)
            
            # Generate in batches of 10 to avoid rate limits
            if (i + 1) % 10 == 0:
                batch_results = await asyncio.gather(*tasks)
                yield batch_results
                tasks = []
                # Small delay between batches
                await asyncio.sleep(2)
        
        # Generate remaining articles
        if tasks:
            batch_results = await asyncio.gather(*tasks)
            yield batch_results
