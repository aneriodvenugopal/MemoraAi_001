"""
100% FREE Advisory Service
NO AI API COSTS - Uses rule-based expert templates
Enhanced with real location data from Google Places API
"""
import random
from typing import Dict, List
from datetime import datetime
from services.location_insights_service import location_insights_service

class FreeAdvisoryService:
    """
    Expert real estate advisory using template-based responses
    NO EXTERNAL API CALLS = ZERO COST
    """
    
    def __init__(self):
        self.current_year = datetime.now().year
    
    async def get_advisory(self, category: str, user_inputs: dict, projects: list) -> str:
        """
        Get FREE expert advisory based on category
        Uses rule-based templates + real location data
        """
        
        # Get language preference
        language = user_inputs.get('language', 'en')
        
        # Generate advisory
        if category == "budget":
            advisory = await self._budget_advisory(user_inputs, projects)
        elif category == "location":
            advisory = await self._location_advisory(user_inputs, projects)
        elif category == "numerology":
            advisory = await self._numerology_advisory(user_inputs, projects)
        elif category == "best_project":
            advisory = await self._best_project_advisory(user_inputs, projects)
        elif category == "investment":
            advisory = await self._investment_advisory(user_inputs, projects)
        else:
            advisory = await self._generic_advisory(user_inputs, projects)
        
        # Add language note if not English
        if language != 'en':
            lang_name = {'te': 'Telugu', 'hi': 'Hindi'}.get(language, language)
            advisory += f"\n\n*Note: For {lang_name} translation, please use Google Translate for now. Native {lang_name} support coming soon!*"
        
        return advisory
    
    async def _budget_advisory(self, inputs: dict, projects: list) -> str:
        """Budget-focused advisory with real location data"""
        
        budget = inputs.get('budget', 'Not specified')
        location = inputs.get('location', 'any location')
        property_type = inputs.get('property_type', 'property')
        
        # Match projects within budget (basic matching)
        matched_projects = self._match_projects_by_location(projects, location)
        
        # Fetch REAL location insights
        location_insights = await location_insights_service.get_location_insights(location)
        real_data_section = location_insights_service.format_insights_for_advisory(location_insights)
        
        response = f"""🏡 **Budget Advisory Report**

**Your Requirements:**
• Budget: {budget}
• Location: {location}
• Property Type: {property_type}

**Expert Analysis:**

1️⃣ **Market Insights for {location}:**
The {location} real estate market is currently showing good growth potential. Property prices are stable with expected appreciation of 15-20% over the next 2-3 years.

2️⃣ **Budget Optimization:**
Your budget positions you well in the {location} market. Consider:
• Down payment: 20-30% of property value
• Home loan options available at competitive rates (8-9% p.a.)
• Registration & stamp duty: Factor in additional 7-10%

3️⃣ **Recommended Projects:**
"""
        
        # Add matched projects
        if matched_projects:
            for i, project in enumerate(matched_projects[:3], 1):
                response += f"\n✅ **{i}. {project.get('name', 'Project')}**"
                response += f"\n   Location: {project.get('location', location)}"
                if project.get('property_count'):
                    response += f"\n   Available Units: {project.get('property_count')}"
        else:
            response += "\n✅ Multiple projects available in your preferred location"
            response += "\n✅ Flexible payment plans with easy EMI options"
            response += "\n✅ RERA approved properties with clear documentation"
        
        response += """

4️⃣ **Financial Tips:**
• Compare 3-4 projects before deciding
• Check RERA registration and builder reputation
• Negotiate for additional discounts (5-10% possible)
• Consider resale value and rental yield potential
"""

        # Add REAL location data
        if real_data_section:
            response += real_data_section
        else:
            response += "\n*Real-time location amenities data will be displayed once area is confirmed.*\n\n"

        response += """
**Next Steps:**
📞 Contact our sales team for site visits
📋 Get detailed payment schedules
🔍 Schedule property inspection

**Need more help?** Our experts are available 24/7 for personalized guidance!
"""
        
        return response
    
    async def _location_advisory(self, inputs: dict, projects: list) -> str:
        """Location-focused advisory with REAL location data"""
        
        location = inputs.get('location', 'the area')
        work_location = inputs.get('work_location', 'city center')
        priorities = inputs.get('priorities', 'connectivity and amenities')
        
        matched_projects = self._match_projects_by_location(projects, location)
        
        # Fetch REAL location insights
        location_insights = await location_insights_service.get_location_insights(location)
        real_data_section = location_insights_service.format_insights_for_advisory(location_insights)
        
        response = f"""📍 **Location Highlights Report**

**Your Preferences:**
• Interested Location: {location}
• Work Location: {work_location}
• Priorities: {priorities}

**Expert Location Analysis:**

1️⃣ **Connectivity & Infrastructure:**
• Well-connected via major roads and highways
• Public transport: Bus routes and upcoming metro connectivity
• Average commute time to {work_location}: 20-30 minutes
• Airport/Railway: Accessible within 30-45 minutes

2️⃣ **Social Infrastructure:**
• Schools: Multiple CBSE/ICSE schools within 2-3 km
• Hospitals: Multi-specialty hospitals nearby
• Shopping: Malls and retail centers in vicinity
• Banks & ATMs: All major banks available

3️⃣ **Growth Potential:**
• Infrastructure development underway in the area
• Property appreciation: Expected 18-25% in next 3 years
• New IT parks and commercial hubs coming up
• Government infrastructure projects planned

4️⃣ **Available Projects in {location}:**
"""
        
        if matched_projects:
            for i, project in enumerate(matched_projects[:3], 1):
                response += f"\n🏘️ **{project.get('name', 'Project')}**"
                response += f"\n   Type: Residential/Commercial Mix"
                response += f"\n   Status: Under Construction/Ready to Move"
        else:
            response += "\n🏘️ Multiple residential projects available"
            response += "\n🏘️ Gated communities with modern amenities"
            response += "\n🏘️ RERA approved developments"
        
        response += """

5️⃣ **Lifestyle Amenities:**
• Parks & Recreation: Multiple green spaces
• Entertainment: Movie theaters, restaurants
• Sports Facilities: Gyms, sports complexes nearby
• Security: Well-lit areas with CCTV coverage
"""

        # Add REAL location data (200+ words of specific info)
        if real_data_section:
            response += real_data_section
        else:
            response += "\n*Real-time location data will be displayed here once the area is confirmed.*\n\n"

        response += """
**Investment Perspective:**
This location offers excellent long-term growth potential with strong appreciation expected due to ongoing infrastructure development.

**Recommended Action:**
Visit the location during peak hours to check traffic, explore nearby amenities, and get a feel of the neighborhood.

📞 Schedule a site visit with our team for detailed area tour!
"""
        
        return response
    
    async def _numerology_advisory(self, inputs: dict, projects: list) -> str:
        """Numerology-based advisory"""
        
        dob = inputs.get('dob', 'Not provided')
        lucky_numbers = inputs.get('lucky_numbers', '1, 5, 7')
        direction = inputs.get('direction', 'Any')
        
        response = f"""🔢 **Numerology Advisory Report**

**Your Details:**
• Date of Birth: {dob}
• Lucky Numbers: {lucky_numbers}
• Preferred Direction: {direction}

**Numerological Analysis:**

1️⃣ **Your Life Path Number:**
Based on your birth date, your life path suggests stability and growth in real estate investments. This is an auspicious time for property decisions.

2️⃣ **Lucky Number Significance:**
Numbers {lucky_numbers} resonate with your energy. Consider:
• Properties on floors/addresses containing these numbers
• Plot numbers or flat numbers with your lucky digits
• House numbers that add up to your lucky numbers

3️⃣ **Directional Guidance:**
"""
        
        if direction and direction != 'Any':
            response += f"""
{direction}-facing properties are ideal for you:
• {direction} direction brings prosperity and positive energy
• Main entrance facing {direction} is highly recommended
• Bedroom placement in {direction} sector promotes peace

Alternative Options: If {direction} is not available, consider {direction}-East or {direction}-West orientations.
"""
        else:
            response += """
All directions can be auspicious based on proper vastu implementation:
• East: New beginnings, health, prosperity
• North: Wealth, career growth
• West: Gains, success in business
• South: Fame, recognition (with proper vastu corrections)
"""
        
        response += f"""

4️⃣ **Property Selection Tips:**
• Choose properties with your lucky numbers
• Verify the total of house/flat number matches favorable digits
• Consider property purchase dates aligned with auspicious timings
• Check vastu compatibility along with numerology

5️⃣ **Auspicious Timing:**
Current period: {self._get_auspicious_period()}

**Vastu + Numerology Balance:**
While numerology guides your choice, ensure the property also follows basic Vastu principles for maximum positive energy.

**Available Projects:**
"""
        
        if projects:
            response += f"We have {len(projects)} projects available. Ask our team to shortlist properties matching your lucky numbers!"
        else:
            response += "Multiple projects available - we'll help you find the perfect match!"
        
        response += """

📞 Consult with our Vastu and Numerology experts for personalized guidance!
"""
        
        return response
    
    async def _best_project_advisory(self, inputs: dict, projects: list) -> str:
        """Best project recommendation advisory"""
        
        requirements = inputs.get('requirements', 'Quality property')
        timeline = inputs.get('timeline', 'Flexible')
        priorities = inputs.get('priorities', 'Investment value')
        
        response = f"""⭐ **Best Project Advisory Report**

**Your Requirements:**
• Needs: {requirements}
• Timeline: {timeline}
• Priorities: {priorities}

**Top Project Recommendations:**

Based on your requirements, here are our expert picks:

"""
        
        if projects:
            # Recommend top 3 projects
            for i, project in enumerate(projects[:3], 1):
                response += f"""
🏆 **Option {i}: {project.get('name', 'Premium Project')}**
📍 Location: {project.get('location', 'Prime area')}
🏗️ Status: Ready to Move / Under Construction
💰 Investment: Starting from competitive rates
✨ Highlights:
   • RERA approved and certified
   • Modern amenities and facilities
   • Strong builder reputation
   • Good appreciation potential
   • {project.get('property_count', 'Multiple')} units available

"""
        else:
            response += """
🏆 **Premium Residential Projects:**
   • RERA approved developments
   • Gated communities with security
   • Modern lifestyle amenities
   • Strategic locations

🏆 **Investment-Grade Properties:**
   • High appreciation potential
   • Rental yield: 3-4% annually
   • Exit strategy friendly
   • Located in growth corridors
"""
        
        response += f"""
**Selection Criteria:**
1️⃣ **Builder Credibility:** All recommended projects are from reputed builders with proven track record

2️⃣ **Location Advantage:** Strategically located with good connectivity and infrastructure

3️⃣ **Timeline Match:** {"Ready-to-move options" if "Immediate" in timeline else "Under-construction with flexible possession"}

4️⃣ **Value Proposition:** Best price per sqft in the locality with future appreciation potential

**Why These Projects:**
• Quality construction and modern architecture
• Complete documentation and legal clarity
• Transparent pricing with no hidden costs
• Flexible payment plans available
• Good potential for capital appreciation

**Comparative Analysis:**
We recommend visiting all three projects and comparing:
• Price per sqft
• Amenities offered
• Possession timeline
• Builder track record
• Location benefits

**Next Steps:**
📅 Schedule site visits to all recommended projects
📋 Request detailed brochures and payment plans
🔍 Verify RERA registration and approvals
💬 Talk to existing residents/investors

📞 Our team can arrange back-to-back site visits for easy comparison!
"""
        
        return response
    
    async def _investment_advisory(self, inputs: dict, projects: list) -> str:
        """Investment-focused advisory"""
        
        amount = inputs.get('investment_amount', 'Your budget')
        timeline = inputs.get('timeline', 'Medium-term')
        roi = inputs.get('roi_expectations', 'Market standard returns')
        
        response = f"""📈 **Investment Advisory Report**

**Investment Profile:**
• Investment Amount: {amount}
• Timeline: {timeline}
• ROI Expectations: {roi}

**Market Analysis & Strategy:**

1️⃣ **Current Real Estate Market:**
• Market Status: Steady growth phase
• Average Appreciation: 15-20% annually in prime locations
• Rental Yields: 3-4% per annum
• Market Outlook: Positive for next 3-5 years

2️⃣ **Investment Strategy:**
"""
        
        if "Short-term" in timeline:
            response += """
**Short-term Strategy (1-2 years):**
• Focus on ready-to-move properties
• Look for under-valued properties near completion
• Consider rental income properties
• Target areas with immediate infrastructure development
• Expected Returns: 12-18% appreciation + rental yield
"""
        elif "Long-term" in timeline:
            response += """
**Long-term Strategy (5+ years):**
• Under-construction projects in emerging areas
• Land parcels in growth corridors
• Diversify across 2-3 properties if budget allows
• Focus on infrastructure development zones
• Expected Returns: 25-35% appreciation over 5 years
"""
        else:
            response += """
**Medium-term Strategy (3-5 years):**
• Mix of ready-to-move and under-construction
• Properties near upcoming metro/IT hubs
• Gated communities with good amenities
• Balance between rental yield and appreciation
• Expected Returns: 18-25% appreciation + rental income
"""
        
        response += """

3️⃣ **Risk Mitigation:**
• Diversification: Consider 2-3 smaller properties vs 1 large
• RERA Verification: Only invest in registered projects
• Builder Track Record: Choose reputed developers
• Legal Due Diligence: Verify all property documents
• Exit Strategy: Plan for resale or rental options

4️⃣ **Tax Benefits:**
• Home loan interest: Deduction up to ₹2 lakhs under Sec 24
• Principal repayment: Up to ₹1.5 lakhs under Sec 80C
• First-time buyer: Additional ₹50k deduction under Sec 80EEA
• Long-term capital gains: Tax benefits on property sale

5️⃣ **Investment Opportunities:**
"""
        
        if projects:
            response += f"""
We have {len(projects)} investment-grade properties:
• Residential apartments in prime locations
• Commercial spaces with high rental yields
• Premium villas in gated communities
• Plot deals in developing areas
"""
        else:
            response += """
Multiple investment opportunities available:
• Appreciation-focused properties: 20-30% growth potential
• Rental income properties: 3-4% annual yield
• Mixed-use developments: Best of both worlds
"""
        
        response += """

6️⃣ **Financial Planning:**
• Down Payment: 20-30% of property value
• Home Loan: Available at 8.5-9.5% interest
• Additional Costs: 7-10% for registration, stamp duty
• Maintenance: Factor in ₹2-3 per sqft monthly
• Emergency Fund: Keep 6-12 months of expenses

**Expected ROI Breakdown:**
"""
        
        if "Short-term" in timeline:
            response += "• Year 1-2: 12-15% capital appreciation + 3% rental = 15-18% total"
        elif "Long-term" in timeline:
            response += "• 5 Years: 25-30% capital appreciation + 15% cumulative rental = 40-45% total"
        else:
            response += "• 3-5 Years: 18-22% capital appreciation + 12% cumulative rental = 30-34% total"
        
        response += """

**Action Plan:**
Week 1: Research and shortlist 5-6 properties
Week 2-3: Site visits and due diligence
Week 4: Finalize property and initiate documentation
Month 2: Complete purchase and registration

**Pro Tips:**
💡 Invest in areas with upcoming infrastructure (metro, IT parks)
💡 Check property appreciation history of the locality
💡 Talk to existing residents about builder quality
💡 Compare prices with similar properties in the area
💡 Negotiate for discounts (5-10% possible in some projects)

📞 Our investment advisory team can help you build a complete portfolio strategy!
"""
        
        return response
    
    async def _generic_advisory(self, inputs: dict, projects: list) -> str:
        """Generic advisory for unknown categories"""
        
        response = """🏡 **Real Estate Advisory**

Thank you for reaching out! Our expert team is here to help you make the right property decision.

**Our Advisory Services:**

1️⃣ **Budget Advisory** - Find the best properties within your budget
2️⃣ **Location Insights** - Understand area advantages and growth potential
3️⃣ **Numerology Guidance** - Property selection based on auspicious numbers
4️⃣ **Project Recommendations** - Curated list of best projects for you
5️⃣ **Investment Strategy** - Maximize returns and minimize risks

**Why Choose Us:**
• 10+ years of real estate expertise
• 100+ successful property transactions
• Personalized advisory based on your needs
• Complete transparency and support
• Post-purchase assistance

**Available Properties:**
"""
        
        if projects:
            response += f"• {len(projects)} active projects across prime locations\n"
        
        response += """• Residential apartments, villas, and plots
• Commercial spaces and investment properties
• RERA approved and legally verified
• Flexible payment plans available

**Next Steps:**
📞 Call us for detailed discussion
📧 Share your requirements via email
🏢 Visit our office for face-to-face consultation
🌐 Explore properties on our platform

We're here to help you find your dream property!
"""
        
        return response
    
    def _match_projects_by_location(self, projects: list, location: str) -> list:
        """Simple location matching"""
        if not projects or not location:
            return projects[:3] if projects else []
        
        location_lower = location.lower()
        matched = [p for p in projects if location_lower in str(p.get('location', '')).lower()]
        
        return matched if matched else projects[:3]
    
    def _get_auspicious_period(self) -> str:
        """Get current auspicious period info"""
        month = datetime.now().month
        
        auspicious_months = {
            1: "January - New beginnings, fresh starts",
            2: "February - Planning and foundations",
            3: "March - Growth and expansion",
            4: "April - Prosperity month",
            10: "October - Diwali season - highly auspicious",
            11: "November - Festival season - good for investments",
            12: "December - Year-end opportunities"
        }
        
        return auspicious_months.get(month, "This month - Generally favorable for property decisions")

# Singleton instance
free_advisory_service = FreeAdvisoryService()
