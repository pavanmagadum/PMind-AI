from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import json
import asyncio
from google import genai
from google.genai import types
import os
from typing import List, Dict, Optional

app = FastAPI(
    title="Gemini Pro API",
    description="A high-performance AI chat backend with streaming support.",
    version="2.2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = os.getenv("GEMINI_API_KEY", 'AIzaSyDrcxnIbagnJs2lqra96BtmaZigbArwAh0')
MODEL_ID = "gemini-flash-latest"

SYSTEM_INSTRUCTION = (
    "You are an elite, proactive AI assistant. "
    "Maintain deep context across messages. "
    "If a user wants to perform a task (like translation or trip planning), do not assume details. "
    "Instead, ask the user clarifying questions to gather all necessary information (destinations, dates, languages, etc.) "
    "then provide a high-quality, professional result. "
    "Use markdown, bold text, and code blocks for readability."
)

client = genai.Client(api_key=API_KEY)

class GeminiEngine:
    async def generate_stream(self, history: List[Dict[str, str]], temperature: float = 0.7):
        contents = []
        for msg in history:
            role = "user" if msg["role"] == "user" else "model"
            if msg["content"].strip():
                contents.append(types.Content(
                    role=role, 
                    parts=[types.Part.from_text(text=msg["content"])]
                ))
        
        if contents and contents[0].role == "model":
            contents.pop(0)

        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            temperature=temperature,
            top_p=0.9,
            max_output_tokens=4096,
        )

        try:
            stream = client.models.generate_content_stream(
                model=MODEL_ID,
                contents=contents,
                config=config,
            )
            for chunk in stream:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            error_str = str(e)
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                yield "⚠️ **System Quota Reached**: You have reached the maximum allowed requests for your daily free tier. Please return tomorrow or wait for the reset to continue our session. Thank you for your patience!"
            else:
                print(f"Engine Error: {e}")
                yield f"⚠️ **Neural Link Disruption**: {error_str}"

engine = GeminiEngine()

@app.post("/api/v1/chat")
async def chat(request: Request):
    try:
        data = await request.json()
        history = data.get("history", [])
        temperature = data.get("temperature", 0.7)
        
        async def stream_wrapper():
            async for chunk in engine.generate_stream(history, temperature):
                yield chunk

        return StreamingResponse(stream_wrapper(), media_type="text/plain")
    except Exception as e:
        return {"error": str(e)}, 500

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=10000)
