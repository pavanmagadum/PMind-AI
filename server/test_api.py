from google import genai
import os

API_KEY = 'AIzaSyDrcxnIbagnJs2lqra96BtmaZigbArwAh0'
client = genai.Client(api_key=API_KEY)
try:
    response = client.models.generate_content(
        model='gemini-2.0-flash',
        contents='hi'
    )
    print("Success")
    print(response.text)
except Exception as e:
    print(f"Error: {e}")
