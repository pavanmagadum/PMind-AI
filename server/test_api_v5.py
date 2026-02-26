from google import genai

API_KEY = 'AIzaSyDrcxnIbagnJs2lqra96BtmaZigbArwAh0'
try:
    client = genai.Client(api_key=API_KEY)
    response = client.models.generate_content(
        model='gemini-2.0-flash',
        contents='hi'
    )
    print("Success")
except Exception as e:
    print(f"Error: {e}")
