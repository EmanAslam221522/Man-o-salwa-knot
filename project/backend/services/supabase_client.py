from supabase import create_client, Client
from config import settings

def get_supabase_client() -> Client | None:
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        print("Warning: Supabase credentials missing.")
        return None
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

supabase_client = get_supabase_client()
