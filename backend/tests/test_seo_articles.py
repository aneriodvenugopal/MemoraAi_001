"""
Test SEO Articles API Endpoints
Tests for:
- GET /api/realapex-demos/seo-articles (public listing)
- GET /api/realapex-demos/seo-article/{slug} (single article)
- PUT /api/realapex-demos/youtube-content/{id}/publish (publish as SEO)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://retomerp-memora.preview.emergentagent.com')


class TestSEOArticlesPublic:
    """Test public SEO article endpoints (no auth required)"""
    
    def test_seo_articles_listing(self):
        """Test /api/realapex-demos/seo-articles returns published articles"""
        response = requests.get(f"{BASE_URL}/api/realapex-demos/seo-articles")
        
        assert response.status_code == 200
        data = response.json()
        assert "articles" in data
        assert isinstance(data["articles"], list)
        
        # Check article structure
        if len(data["articles"]) > 0:
            article = data["articles"][0]
            assert "id" in article
            assert "topic" in article
            assert "category" in article
            assert "seo_slug" in article
            assert "created_at" in article
            print(f"✓ Found {len(data['articles'])} published articles")
            print(f"  First article: {article['topic']} ({article['seo_slug']})")
    
    def test_seo_article_by_slug_existing(self):
        """Test /api/realapex-demos/seo-article/{slug} returns article by slug"""
        slug = "legal-documents-check-property"  # Known existing slug
        response = requests.get(f"{BASE_URL}/api/realapex-demos/seo-article/{slug}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "article" in data
        
        article = data["article"]
        assert article["seo_slug"] == slug
        assert article["published"] == True
        assert "content" in article
        assert "topic" in article
        assert "category" in article
        print(f"✓ Article retrieved: {article['topic']}")
        print(f"  Content length: {len(article.get('content', ''))} chars")
    
    def test_seo_article_by_slug_not_found(self):
        """Test non-existent slug returns 404"""
        response = requests.get(f"{BASE_URL}/api/realapex-demos/seo-article/non-existent-slug-12345")
        
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data or "error" in data
        print("✓ Non-existent slug correctly returns 404")


class TestYouTubeContentHistory:
    """Test YouTube content history endpoint"""
    
    def test_youtube_content_history(self):
        """Test /api/realapex-demos/youtube-content/history returns history"""
        response = requests.get(f"{BASE_URL}/api/realapex-demos/youtube-content/history")
        
        assert response.status_code == 200
        data = response.json()
        assert "history" in data
        assert isinstance(data["history"], list)
        print(f"✓ YouTube content history: {len(data['history'])} items")
        
        # Check for published items
        published = [h for h in data["history"] if h.get("published")]
        print(f"  Published items: {len(published)}")
    
    def test_youtube_categories(self):
        """Test /api/realapex-demos/youtube-content/categories returns categories"""
        response = requests.get(f"{BASE_URL}/api/realapex-demos/youtube-content/categories")
        
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert len(data["categories"]) == 6
        
        expected_categories = ["property_tips", "area_reviews", "market_updates", 
                             "investment_guide", "legal_tips", "success_stories"]
        actual_ids = [c["id"] for c in data["categories"]]
        
        for cat_id in expected_categories:
            assert cat_id in actual_ids, f"Missing category: {cat_id}"
        
        print(f"✓ All 6 YouTube content categories present")


class TestPublishContentAuth:
    """Test publish content endpoint (requires auth)"""
    
    def get_auth_token(self):
        """Get auth token for tenant admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "rajam@retoerp.com",
            "password": "12345678"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        return None
    
    def test_publish_requires_valid_content_id(self):
        """Test publish endpoint with invalid content ID returns 404"""
        token = self.get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.put(
            f"{BASE_URL}/api/realapex-demos/youtube-content/invalid-id-12345/publish",
            params={"seo_slug": "test-slug"},
            headers=headers
        )
        
        assert response.status_code == 404
        print("✓ Invalid content ID correctly returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
