"""
Location-Specific Insights using Google Places API
Uses existing Google Maps API key - No additional cost!
"""
import os
import httpx
from typing import Dict, List
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

class LocationInsightsService:
    """
    Get real location-specific data using Google Places API
    Shows nearby schools, hospitals, malls, restaurants with ratings
    """
    
    def __init__(self):
        self.api_key = os.environ.get("GOOGLE_MAPS_KEY")
        self.places_api = "https://maps.googleapis.com/maps/api/place"
    
    async def get_location_insights(self, location: str) -> Dict:
        """
        Get comprehensive location insights with real data
        Returns nearby facilities with names, ratings, distances
        """
        
        if not self.api_key:
            return self._get_fallback_insights(location)
        
        try:
            # Step 1: Geocode the location to get coordinates
            geocode_url = f"https://maps.googleapis.com/maps/api/geocode/json"
            async with httpx.AsyncClient(timeout=10.0) as client:
                geocode_response = await client.get(geocode_url, params={
                    'address': location,
                    'key': self.api_key
                })
                geocode_data = geocode_response.json()
            
            if geocode_data['status'] != 'OK' or not geocode_data.get('results'):
                return self._get_fallback_insights(location)
            
            # Get coordinates
            lat = geocode_data['results'][0]['geometry']['location']['lat']
            lng = geocode_data['results'][0]['geometry']['location']['lng']
            
            # Step 2: Get nearby places for different categories
            insights = {
                'location': location,
                'coordinates': {'lat': lat, 'lng': lng},
                'schools': await self._get_nearby_places(lat, lng, 'school', 5),
                'hospitals': await self._get_nearby_places(lat, lng, 'hospital', 3),
                'malls': await self._get_nearby_places(lat, lng, 'shopping_mall', 3),
                'restaurants': await self._get_nearby_places(lat, lng, 'restaurant', 5),
                'banks': await self._get_nearby_places(lat, lng, 'bank', 3),
                'metro_stations': await self._get_nearby_places(lat, lng, 'subway_station', 2),
            }
            
            return insights
            
        except Exception as e:
            print(f"Location insights error: {e}")
            return self._get_fallback_insights(location)
    
    async def _get_nearby_places(self, lat: float, lng: float, place_type: str, limit: int) -> List[Dict]:
        """Get nearby places of specific type"""
        
        try:
            nearby_url = f"{self.places_api}/nearbysearch/json"
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(nearby_url, params={
                    'location': f"{lat},{lng}",
                    'radius': 3000,  # 3km radius
                    'type': place_type,
                    'key': self.api_key
                })
                data = response.json()
            
            if data['status'] != 'OK':
                return []
            
            # Extract relevant info
            places = []
            for place in data.get('results', [])[:limit]:
                places.append({
                    'name': place.get('name', 'N/A'),
                    'rating': place.get('rating', 0),
                    'total_ratings': place.get('user_ratings_total', 0),
                    'vicinity': place.get('vicinity', ''),
                    'open_now': place.get('opening_hours', {}).get('open_now', None)
                })
            
            return places
            
        except Exception as e:
            print(f"Error fetching {place_type}: {e}")
            return []
    
    def _get_fallback_insights(self, location: str) -> Dict:
        """Fallback insights when API fails"""
        return {
            'location': location,
            'coordinates': None,
            'schools': [],
            'hospitals': [],
            'malls': [],
            'restaurants': [],
            'banks': [],
            'metro_stations': []
        }
    
    def format_insights_for_advisory(self, insights: Dict) -> str:
        """Format insights into readable text for advisory"""
        
        if not insights.get('coordinates'):
            return ""
        
        text = f"\n\n**📍 Real Location Insights for {insights['location']}:**\n\n"
        
        # Schools
        if insights.get('schools'):
            text += "**🏫 Nearby Schools:**\n"
            for school in insights['schools'][:3]:
                rating_text = f"⭐ {school['rating']}/5" if school['rating'] > 0 else ""
                text += f"• {school['name']} {rating_text}\n"
            text += "\n"
        
        # Hospitals
        if insights.get('hospitals'):
            text += "**🏥 Healthcare Facilities:**\n"
            for hospital in insights['hospitals'][:3]:
                rating_text = f"⭐ {hospital['rating']}/5" if hospital['rating'] > 0 else ""
                text += f"• {hospital['name']} {rating_text}\n"
            text += "\n"
        
        # Malls/Shopping
        if insights.get('malls'):
            text += "**🛍️ Shopping & Entertainment:**\n"
            for mall in insights['malls'][:3]:
                rating_text = f"⭐ {mall['rating']}/5" if mall['rating'] > 0 else ""
                text += f"• {mall['name']} {rating_text}\n"
            text += "\n"
        
        # Metro stations
        if insights.get('metro_stations'):
            text += "**🚇 Metro Connectivity:**\n"
            for station in insights['metro_stations']:
                text += f"• {station['name']}\n"
            text += "\n"
        
        # Banks
        if insights.get('banks'):
            text += "**🏦 Banking:**\n"
            bank_count = len(insights['banks'])
            text += f"• {bank_count} major banks within 3km radius\n\n"
        
        # Restaurants
        if insights.get('restaurants'):
            text += "**🍽️ Dining Options:**\n"
            top_restaurants = [r for r in insights['restaurants'] if r['rating'] >= 4.0][:3]
            if top_restaurants:
                for restaurant in top_restaurants:
                    text += f"• {restaurant['name']} ⭐ {restaurant['rating']}/5\n"
            else:
                text += f"• {len(insights['restaurants'])} restaurants within 3km\n"
            text += "\n"
        
        text += "*Data powered by Google Places - Real-time information*\n"
        
        return text

# Singleton
location_insights_service = LocationInsightsService()
