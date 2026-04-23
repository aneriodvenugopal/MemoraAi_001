import os
from datetime import datetime, timezone, timedelta
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import requests

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")

class GoogleCalendarService:
    """Service for Google Calendar integration"""
    
    @staticmethod
    def get_authorization_url(state: str = None):
        """Generate Google OAuth authorization URL"""
        from google_auth_oauthlib.flow import Flow
        
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [GOOGLE_REDIRECT_URI]
                }
            },
            scopes=[
                "https://www.googleapis.com/auth/calendar",
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/userinfo.profile"
            ],
            redirect_uri=GOOGLE_REDIRECT_URI
        )
        
        auth_url, state = flow.authorization_url(
            access_type='offline',
            prompt='consent',
            include_granted_scopes='true'
        )
        
        return auth_url, state
    
    @staticmethod
    async def exchange_code_for_tokens(code: str):
        """Exchange authorization code for access and refresh tokens"""
        token_resp = requests.post(
            'https://oauth2.googleapis.com/token',
            data={
                'code': code,
                'client_id': GOOGLE_CLIENT_ID,
                'client_secret': GOOGLE_CLIENT_SECRET,
                'redirect_uri': GOOGLE_REDIRECT_URI,
                'grant_type': 'authorization_code'
            }
        )
        
        if token_resp.status_code != 200:
            raise Exception(f"Token exchange failed: {token_resp.text}")
        
        tokens = token_resp.json()
        
        # Get user info
        user_info = requests.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            headers={'Authorization': f'Bearer {tokens["access_token"]}'}
        ).json()
        
        return {
            "tokens": tokens,
            "user_info": user_info
        }
    
    @staticmethod
    async def get_credentials(google_tokens: dict):
        """Get Google credentials with auto-refresh"""
        creds = Credentials(
            token=google_tokens.get('access_token'),
            refresh_token=google_tokens.get('refresh_token'),
            token_uri='https://oauth2.googleapis.com/token',
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET,
            scopes=[
                "https://www.googleapis.com/auth/calendar",
                "https://www.googleapis.com/auth/userinfo.email"
            ]
        )
        
        # Check if token expired and refresh
        if creds.expired and creds.refresh_token:
            try:
                creds.refresh(GoogleRequest())
                # Return updated tokens
                return creds, {
                    "access_token": creds.token,
                    "refresh_token": creds.refresh_token,
                    "expires_in": 3600
                }
            except Exception as e:
                print(f"Token refresh failed: {e}")
                raise Exception("Failed to refresh Google tokens. Please re-authorize.")
        
        return creds, None
    
    @staticmethod
    async def create_calendar_event(
        google_tokens: dict,
        summary: str,
        description: str,
        start_time: datetime,
        end_time: datetime,
        attendees: list = None,
        location: str = None,
        add_video_conference: bool = True
    ):
        """
        Create a calendar event
        
        Args:
            google_tokens: User's Google OAuth tokens
            summary: Event title
            description: Event description
            start_time: Event start (datetime object)
            end_time: Event end (datetime object)
            attendees: List of email addresses
            location: Event location
            add_video_conference: Add Google Meet link
        """
        try:
            creds, updated_tokens = await GoogleCalendarService.get_credentials(google_tokens)
            service = build('calendar', 'v3', credentials=creds)
            
            event_data = {
                'summary': summary,
                'description': description,
                'start': {
                    'dateTime': start_time.isoformat(),
                    'timeZone': 'Asia/Kolkata',  # Indian timezone
                },
                'end': {
                    'dateTime': end_time.isoformat(),
                    'timeZone': 'Asia/Kolkata',
                },
            }
            
            # Add location if provided
            if location:
                event_data['location'] = location
            
            # Add attendees if provided
            if attendees and len(attendees) > 0:
                event_data['attendees'] = [{'email': email} for email in attendees]
                event_data['sendUpdates'] = 'all'  # Send email invites
            
            # Add Google Meet link
            if add_video_conference:
                event_data['conferenceData'] = {
                    'createRequest': {
                        'requestId': f'meet-{int(datetime.now().timestamp())}',
                        'conferenceSolutionKey': {'type': 'hangoutsMeet'}
                    }
                }
            
            # Create event
            event = service.events().insert(
                calendarId='primary',
                body=event_data,
                conferenceDataVersion=1 if add_video_conference else 0,
                sendUpdates='all' if attendees else 'none'
            ).execute()
            
            return {
                "success": True,
                "event_id": event['id'],
                "event_link": event.get('htmlLink'),
                "meet_link": event.get('conferenceData', {}).get('entryPoints', [{}])[0].get('uri'),
                "updated_tokens": updated_tokens
            }
            
        except HttpError as error:
            print(f"Google Calendar API error: {error}")
            raise Exception(f"Failed to create calendar event: {str(error)}")
        except Exception as e:
            print(f"Calendar service error: {e}")
            raise
    
    @staticmethod
    async def list_upcoming_events(google_tokens: dict, max_results: int = 10):
        """List upcoming calendar events"""
        try:
            creds, updated_tokens = await GoogleCalendarService.get_credentials(google_tokens)
            service = build('calendar', 'v3', credentials=creds)
            
            now = datetime.now(timezone.utc).isoformat()
            
            events_result = service.events().list(
                calendarId='primary',
                timeMin=now,
                maxResults=max_results,
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            events = events_result.get('items', [])
            
            return {
                "success": True,
                "events": events,
                "updated_tokens": updated_tokens
            }
        except Exception as e:
            print(f"List events error: {e}")
            raise
    
    @staticmethod
    async def update_calendar_event(
        google_tokens: dict,
        event_id: str,
        summary: str = None,
        description: str = None,
        start_time: datetime = None,
        end_time: datetime = None,
        location: str = None
    ):
        """Update an existing calendar event"""
        try:
            creds, updated_tokens = await GoogleCalendarService.get_credentials(google_tokens)
            service = build('calendar', 'v3', credentials=creds)
            
            # Get existing event
            event = service.events().get(calendarId='primary', eventId=event_id).execute()
            
            # Update fields
            if summary:
                event['summary'] = summary
            if description:
                event['description'] = description
            if start_time:
                event['start']['dateTime'] = start_time.isoformat()
            if end_time:
                event['end']['dateTime'] = end_time.isoformat()
            if location:
                event['location'] = location
            
            # Update event
            updated_event = service.events().update(
                calendarId='primary',
                eventId=event_id,
                body=event,
                sendUpdates='all'
            ).execute()
            
            return {
                "success": True,
                "event_id": updated_event['id'],
                "updated_tokens": updated_tokens
            }
        except Exception as e:
            print(f"Update event error: {e}")
            raise
    
    @staticmethod
    async def delete_calendar_event(google_tokens: dict, event_id: str):
        """Delete a calendar event"""
        try:
            creds, updated_tokens = await GoogleCalendarService.get_credentials(google_tokens)
            service = build('calendar', 'v3', credentials=creds)
            
            service.events().delete(
                calendarId='primary',
                eventId=event_id,
                sendUpdates='all'
            ).execute()
            
            return {
                "success": True,
                "updated_tokens": updated_tokens
            }
        except Exception as e:
            print(f"Delete event error: {e}")
            raise
