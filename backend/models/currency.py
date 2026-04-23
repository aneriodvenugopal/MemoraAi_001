from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid

class Currency(BaseModel):
    """Currency model for multi-currency support"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str  # "INR", "USD", "EUR", "GBP", etc.
    name: str  # "Indian Rupee", "US Dollar", "Euro", etc.
    symbol: str  # "₹", "$", "€", "£", etc.
    
    # Exchange rates (relative to INR as base)
    exchange_rate_to_inr: float = 1.0  # 1 USD = 83 INR, so value would be 83
    
    # Status
    is_active: bool = True
    is_base_currency: bool = False  # INR is the base
    
    # Formatting
    decimal_places: int = 2
    thousand_separator: str = ","
    decimal_separator: str = "."
    
    # Display
    display_format: str = "{symbol}{amount}"  # How to display: ₹1,00,000 or $1,000.00
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CurrencyCreate(BaseModel):
    code: str
    name: str
    symbol: str
    exchange_rate_to_inr: float = 1.0
    decimal_places: int = 2
    is_base_currency: bool = False

class CurrencyUpdate(BaseModel):
    exchange_rate_to_inr: Optional[float] = None
    is_active: Optional[bool] = None
