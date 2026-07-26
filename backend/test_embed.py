import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

response = client.models.embed_content(
    model='gemini-embedding-001',
    contents="Hello world",
    config=types.EmbedContentConfig(output_dimensionality=768)
)
print("Dimensions:", len(response.embeddings[0].values))
