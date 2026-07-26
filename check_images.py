import urllib.request
import re

CROP_IMAGES = {
  "Tomatoes": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&q=80",
  "Potatoes": "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=800&q=80",
  "Onions": "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=800&q=80",
  "Carrots": "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=800&q=80",
  "Spinach": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800&q=80",
  "Cabbage": "https://images.unsplash.com/photo-1593006240685-6ad18c3edfc2?w=800&q=80",
  "Cauliflower": "https://images.unsplash.com/photo-1568581789190-ae90a7da930b?w=800&q=80",
  "Peas": "https://images.unsplash.com/photo-1592688001602-09bb3ce35d67?w=800&q=80",
  "Mangoes": "https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&q=80",
  "Apples": "https://images.unsplash.com/photo-1560806887-1e4cd0b6fac6?w=800&q=80",
  "Bananas": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=800&q=80",
  "Grapes": "https://images.unsplash.com/photo-1596368708356-6e1e1025ee72?w=800&q=80",
  "Oranges": "https://images.unsplash.com/photo-1547514701-42782101795e?w=800&q=80",
  "Rice": "https://images.unsplash.com/photo-1586201375761-83865001e8ac?w=800&q=80",
  "Wheat": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&q=80",
  "Corn": "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=800&q=80",
  "Garlic": "https://images.unsplash.com/photo-1540148426945-04d9d8328c31?w=800&q=80",
  "Ginger": "https://images.unsplash.com/photo-1615485925600-97237c4fc1ec?w=800&q=80",
  "Turmeric": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800&q=80",
  "Sugarcane": "https://images.unsplash.com/photo-1593510574092-23c314de0413?w=800&q=80",
}

for name, url in CROP_IMAGES.items():
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        html = urllib.request.urlopen(req).read().decode('utf-8')
        title_match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE)
        alt_match = re.search(r'alt="(.*?)"', html, re.IGNORECASE)
        title = title_match.group(1) if title_match else "No title"
        print(f"{name}: {title}")
    except Exception as e:
        print(f"{name}: Error {e}")
