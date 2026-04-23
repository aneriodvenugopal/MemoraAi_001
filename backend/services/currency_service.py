from typing import Optional, Dict
import requests
import os

class CurrencyService:
    def __init__(self, db):
        self.db = db
        self.collection = db.currencies
        self.api_key = os.environ.get('EXCHANGE_RATE_API_KEY', '')
    
    async def update_exchange_rates(self) -> bool:
        """Update exchange rates from API"""
        try:
            # Using free exchange rate API (you can change to your preferred provider)
            url = "https://api.exchangerate-api.com/v4/latest/USD"
            response = requests.get(url)
            
            if response.status_code == 200:
                data = response.json()
                rates = data.get('rates', {})
                
                for code, rate in rates.items():
                    await self.collection.update_one(
                        {'code': code},
                        {'$set': {'exchange_rate': rate, 'updated_at': data.get('date')}}
                    )
                
                return True
        except Exception as e:
            print(f"Error updating exchange rates: {e}")
        return False
    
    async def convert(self, amount: float, from_currency: str, to_currency: str) -> float:
        """Convert amount between currencies"""
        if from_currency == to_currency:
            return amount
        
        from_curr = await self.collection.find_one({'code': from_currency}, {"_id": 0})
        to_curr = await self.collection.find_one({'code': to_currency}, {"_id": 0})
        
        if not from_curr or not to_curr:
            raise Exception("Currency not found")
        
        # Convert to USD first, then to target currency
        amount_in_usd = amount / from_curr['exchange_rate']
        return amount_in_usd * to_curr['exchange_rate']
    
    def format_currency(self, amount: float, currency_code: str) -> str:
        """Format currency display"""
        # This is a simplified version - you can enhance it for different locales
        symbols = {
            'INR': '₹',
            'USD': '$',
            'SAR': 'SAR ',
            'AED': 'AED ',
            'GBP': '£',
            'EUR': '€'
        }
        
        symbol = symbols.get(currency_code, currency_code + ' ')
        
        if currency_code == 'INR':
            return symbol + self._format_indian(amount)
        else:
            return symbol + f"{amount:,.2f}"
    
    def _format_indian(self, amount: float) -> str:
        """Format amount in Indian numbering system (lakhs, crores)"""
        amount = round(amount, 2)
        amount_str = f"{amount:.2f}"
        parts = amount_str.split('.')
        integer = parts[0]
        decimal = parts[1] if len(parts) > 1 else '00'
        
        if len(integer) <= 3:
            return f"{integer}.{decimal}"
        
        last_three = integer[-3:]
        remaining = integer[:-3]
        
        result = ''
        while len(remaining) > 2:
            result = ',' + remaining[-2:] + result
            remaining = remaining[:-2]
        
        if remaining:
            result = remaining + result
        
        return result + ',' + last_three + '.' + decimal
