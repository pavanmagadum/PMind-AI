from google import genai

API_KEY = 'AIzaSyDrcxnIbagnJs2lqra96BtmaZigbArwAh0'
try:
    client = genai.Client(api_key=API_KEY)
    print("Listing Models...")
    for model in client.models.list():
        print(model.name)
except Exception as e:
    print(f"Error: {e}")
