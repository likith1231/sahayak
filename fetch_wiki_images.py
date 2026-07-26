import urllib.request
import json
import ssl
import time

CROPS = [
    "Bananas", "Grapes", "Oranges", "Rice", "Wheat", "Corn",
    "Garlic", "Ginger", "Turmeric", "Sugarcane"
]

CROP_SEARCH_TERMS = {
    "Bananas": "Banana",
    "Grapes": "Grape",
    "Oranges": "Orange_(fruit)",
    "Rice": "Rice",
    "Wheat": "Wheat",
    "Corn": "Maize",
    "Garlic": "Garlic",
    "Ginger": "Ginger",
    "Turmeric": "Turmeric",
    "Sugarcane": "Sugarcane"
}

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

results = []

for crop in CROPS:
    search = CROP_SEARCH_TERMS[crop]
    url = f"https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles={search}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'SahayakBot/1.0 (likith@example.com)'})
        response = urllib.request.urlopen(req, context=ctx).read().decode('utf-8')
        data = json.loads(response)
        pages = data['query']['pages']
        page = list(pages.values())[0]
        image_url = page.get('original', {}).get('source', '')
        if not image_url:
            print(f"Could not find image for {crop}")
        else:
            results.append(f'  {crop}: "{image_url}",')
    except Exception as e:
        print(f"Error fetching for {crop}: {e}")
    time.sleep(1)

for res in results:
    print(res)

