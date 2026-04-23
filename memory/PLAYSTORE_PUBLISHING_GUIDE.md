# AgentApex - Google Play Store Publishing Guide

## STEP 1: Google Play Console Account Setup

### Developer Account Registration
- **URL**: https://play.google.com/console/signup
- **Fee**: $25 USD (one-time, ~INR 2,100)
- **Email to use**: aneroid.venugopal@gmail.com
- **Review time**: Account verification takes 1-2 days

---

## STEP 2: Store Listing Fields (All Required)

### App Details

| Field | Your Value |
|---|---|
| **App Name** | AgentApex - Property Diary |
| **Short Description** (80 chars max) | Free pocket property diary for agents. Add property, app does business for you. |
| **Full Description** (4000 chars max) | See below |
| **App Category** | House & Home |
| **Tags** | Real Estate, Property, Agent, Broker |
| **Default Language** | English (en-US) |

### Full Description (Copy-paste this):
```
AgentApex - Your Free Pocket Property Diary

Just Add Property. App Will Do Business For You. Even While You Sleep.

AgentApex is the smartest property management app built for real estate agents, brokers, and property consultants in India. List your properties, track leads, manage follow-ups, and share properties with your branding - all from your phone.

KEY FEATURES:

PROPERTY MANAGEMENT
- Post properties instantly with photos and location
- Voice-based property posting - just speak and list
- Auto-generated Property IDs (AX-P-10001) for easy tracking
- Google Maps integration with exact location markers
- Manage property images - reorder, set cover, crop

PROPERTY SHARING WITH YOUR BRANDING
- Generate beautiful property share cards
- Share via WhatsApp with your name, photo & designation
- QR code for app download in every share card
- Your contact is protected - buyers enquire through the app

LEAD PIPELINE (Cold to Hot)
- Automatic lead tracking when buyers enquire
- Pipeline: New > Contacted > Warm > Hot > Closed
- Search and filter leads by status
- One-tap call or WhatsApp to any lead

FOLLOW-UP SYSTEM
- Add contacts from phone or manually
- Bulk add multiple contacts at once
- Schedule follow-up reminders
- Active / Hidden tabs to organize contacts
- Track follow-up history and notes

SMART SEARCH
- Search properties by Property ID
- Map-based search with location filter
- Google Places Autocomplete for accurate locations

FOR PROPERTY AGENTS:
- Profile with photo and designation badge
- "AgentApex Property Advisor" branding
- Invite other agents via WhatsApp
- Interest areas - get alerts for new listings

Download now and turn your phone into your property business partner!

AgentApex - A Product of RealApex
Website: agentapex.com
```

### Contact Details

| Field | Your Value |
|---|---|
| **Developer Name** | RealApex |
| **Contact Email** | aneroid.venugopal@gmail.com |
| **Contact Phone** | +91-9948303060 |
| **Website** | https://agentapex.com |
| **Privacy Policy URL** | https://agentapex.com/privacy-policy?app=agentapex#agentapex |

---

## STEP 3: Graphics Assets

### Required Graphics (Mandatory)

| Asset | Size | Format | Notes |
|---|---|---|---|
| **App Icon** | 512 x 512 px | PNG (32-bit) | No transparency, no rounded corners (Play Store rounds them) |
| **Feature Graphic** | 1024 x 500 px | PNG or JPG | Banner shown on top of store listing |
| **Screenshots (Phone)** | Min 2, Max 8 | 16:9 or 9:16, min 320px | Recommended: 1080 x 1920 or 1920 x 1080 |

### Recommended Screenshots (8 screens):
1. **Dashboard** - "Your Property Command Center"
2. **Post Property** - "List Properties in Seconds"
3. **Property Share Card** - "Share with Your Branding"
4. **Lead Pipeline** - "Track Hot, Warm & Cold Leads"
5. **Follow-ups** - "Never Miss a Follow-up"
6. **Map Search** - "Find Properties on Map"
7. **Search by Property ID** - "Instant Property Lookup"
8. **Profile** - "Your Agent Identity"

---

## STEP 4: App Content Rating (IARC)

### Content Rating Questionnaire Answers:

| Question | Answer |
|---|---|
| Does the app contain violence? | No |
| Does the app contain sexual content? | No |
| Does the app contain gambling? | No |
| Does the app contain controlled substances? | No |
| Does the app contain profanity? | No |
| Does the app allow user interaction? | Yes (lead enquiries) |
| Does the app share user location? | Yes (for map features, with permission) |
| Does the app allow purchases? | No (for now) |

**Expected Rating**: Everyone / Rated for 3+

---

## STEP 5: Data Safety Section

### Data Types Collected:

| Data Type | Collected | Shared | Purpose |
|---|---|---|---|
| Phone number | Yes | No | Authentication (OTP login) |
| Name | Yes | No | User profile |
| Email | Yes | No | User profile (optional) |
| Photos | Yes | No | Property images, profile photo |
| Location | Yes | No | Map features, property location |
| Contacts | Yes | No | Follow-up management (optional) |
| App interactions | Yes | No | Analytics and improvement |

### Data Safety Responses:

| Question | Answer |
|---|---|
| Does your app collect user data? | Yes |
| Is all collected data encrypted in transit? | Yes (SSL/TLS) |
| Do you provide a way for users to request data deletion? | Yes |
| Is this app designed for children? | No |

---

## STEP 6: App Access (For Review)

If your app requires login, you must provide demo credentials for Google reviewers:

| Field | Value |
|---|---|
| **Login method** | Phone + OTP |
| **Demo phone** | 9908290239 |
| **Demo OTP** | (Auto-shown on screen - "Demo OTP: XXXXXX") |
| **Instructions** | Enter phone number, click "Get OTP", OTP is shown on screen in demo mode |

---

## STEP 7: Target Audience & Declarations

| Field | Value |
|---|---|
| **Target audience** | 18+ (Real estate professionals) |
| **Contains ads?** | No |
| **App contains in-app purchases?** | No (for now) |
| **Is this a news app?** | No |
| **Is this a government app?** | No |
| **Is this an educational app?** | No |

---

## STEP 8: App Signing & Distribution

### TWA (Trusted Web Activity) Method - Recommended for PWA

1. Go to **https://www.pwabuilder.com**
2. Enter your app URL: `https://agentapex.com`
3. Select **Android** package
4. Configure:
   - Package name: `com.agentapex.app`
   - App name: AgentApex
   - Display mode: Standalone
   - Status bar color: #F59E0B
   - Start URL: /agentapex
5. Download `.aab` (Android App Bundle) file
6. Upload to Google Play Console

### Digital Asset Links (Required for TWA)
Add this file to your web server at `/.well-known/assetlinks.json`:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.agentapex.app",
    "sha256_cert_fingerprints": ["YOUR_SHA256_FROM_PLAY_CONSOLE"]
  }
}]
```
(Get the SHA256 from Google Play Console > Setup > App signing)

---

## STEP 9: Release Track

| Field | Value |
|---|---|
| **Track** | Production (or start with Internal testing) |
| **Countries** | India (primary), can add more later |
| **Rollout percentage** | 100% (full rollout) |

### Recommended Release Steps:
1. First do **Internal testing** (invite 5-10 testers)
2. Then **Closed testing** (invite 100+ testers)
3. Then **Open testing** (anyone can join)
4. Finally **Production** release

---

## STEP 10: Publishing Checklist

- [ ] Google Play Developer account created ($25)
- [ ] App icon 512x512 ready
- [ ] Feature graphic 1024x500 ready
- [ ] At least 2 phone screenshots (recommend 8)
- [ ] App name and description filled
- [ ] Privacy Policy page live at agentapex.com/privacy-policy
- [ ] Content rating questionnaire completed
- [ ] Data safety form completed
- [ ] Demo login credentials provided for review
- [ ] TWA/AAB file generated and uploaded
- [ ] assetlinks.json deployed on website
- [ ] Countries/distribution selected
- [ ] Review submitted

---

## TIMELINE

| Step | Time |
|---|---|
| Account setup | 1-2 days |
| Prepare assets & listing | 1 day |
| Build TWA/AAB | 30 minutes |
| Google review | 3-7 days |
| **Total** | **5-10 days** |

---

## IMPORTANT NOTES

1. **Package Name**: `com.agentapex.app` - Choose carefully, CANNOT be changed after publishing
2. **App Icon**: Must NOT have transparency. Use solid amber/orange background matching your brand
3. **Screenshots**: Take real screenshots from the app, don't use mockups
4. **Privacy Policy**: MUST be accessible via public URL before submission
5. **Demo Access**: Google reviewers MUST be able to test the full app
6. **$25 fee**: One-time, paid via Google Pay or credit/debit card

---

*Generated for AgentApex by RealApex Team - March 2026*
