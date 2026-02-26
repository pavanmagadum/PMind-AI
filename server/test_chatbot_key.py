from google import genai

API_KEY = "AIzaSyBmuZJmpZjOg-FsjGVt51OLanb9cGFzeGM"
print(f"Testing with API Key from chatbot.py: {API_KEY[:10]}...")
try:
    client = genai.Client(api_key=API_KEY)
    response = client.models.generate_content(
        model='gemini-1.5-flash',
        contents='hi'
    )
    print("Success")
    print(response.text)
except Exception as e:
    print(f"Error: {e}")
