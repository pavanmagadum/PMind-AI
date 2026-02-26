from google import genai
import sys

API_KEY = 'AIzaSyDrcxnIbagnJs2lqra96BtmaZigbArwAh0'
print(f"Testing with API Key: {API_KEY[:10]}...")
try:
    client = genai.Client(api_key=API_KEY)
    print("Client initialized")
    response = client.models.generate_content(
        model='gemini-1.5-flash',
        contents='hi'
    )
    print("Success")
    print(response.text)
except Exception as e:
    print(f"Error: {e}")
