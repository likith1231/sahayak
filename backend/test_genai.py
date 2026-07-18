import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()
try:
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    client = genai.Client(api_key=gemini_api_key)
    
    # Let's list models to see what they have access to
    print("Available models:")
    for m in client.models.list():
        if "gemini" in m.name:
            print(m.name)
except Exception as e:
    import traceback
    traceback.print_exc()
