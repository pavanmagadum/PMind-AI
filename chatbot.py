
# AIzaSyD2t0PnljeYbDNKjXPhgZnCorAvMDCZLhc

import sys
import time

try:
    from google import genai
    from google.genai import types
except ImportError:
    print("  Install: py -3.10 -m pip install google-genai")
    sys.exit(1)

# ──────────────────────────────────────────────
# PASTE YOUR API KEY HERE
# ──────────────────────────────────────────────
API_KEY = "AIzaSyDrcxnIbagnJs2lqra96BtmaZigbArwAh0"

# Using gemini-2.5-flash (best free tier limits)
MODEL = "gemini-flash-latest"

SYSTEM_INSTRUCTION = (
    "You are a helpful, friendly, and knowledgeable AI assistant. "
    "Provide clear, concise, and accurate responses. "
    "If you're unsure about something, say so honestly."
)


class GeminiChatbot:
    def __init__(self):
        self.client = genai.Client(api_key=API_KEY)
        self.history = []
        self.turn_count = 0
        self.config = types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            temperature=0.7,
            top_p=0.95,
            top_k=40,
            max_output_tokens=2048,
        )

    def send_message_stream(self, user_input):
        self.history.append(
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=user_input)],
            )
        )

        try:
            stream = self.client.models.generate_content_stream(
                model=MODEL,
                contents=self.history,
                config=self.config,
            )

            full_reply = ""
            for chunk in stream:
                if chunk.text:
                    full_reply += chunk.text
                    yield chunk.text

            self.history.append(
                types.Content(
                    role="model",
                    parts=[types.Part.from_text(text=full_reply)],
                )
            )
            self.turn_count += 1

        except Exception as e:
            self.history.pop()
            error_str = str(e)
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                yield "\n⚠️  Rate limited! Waiting 60 seconds..."
                time.sleep(60)
                yield " Please try your message again."
            else:
                yield f"\n⚠️  Error: {e}"

    def get_stats(self):
        return f"📊 Model: {MODEL} | {self.turn_count} exchanges | {len(self.history)} messages"

    def reset(self):
        self.history.clear()
        self.turn_count = 0


BANNER = """
╔══════════════════════════════════════════════╗
║          🤖 Gemini AI Chatbot                ║
╠══════════════════════════════════════════════╣
║  Model: gemini-2.5-flash (free tier)         ║
║                                              ║
║  Commands:                                   ║
║    /reset   - Clear conversation history     ║
║    /stats   - Show conversation stats        ║
║    /help    - Show this help message         ║
║    /quit    - Exit the chatbot               ║
╚══════════════════════════════════════════════╝
"""


def main():
    if API_KEY == "YOUR_API_KEY_HERE" or not API_KEY.strip():
        print("\n  API KEY NOT SET!")
        print("  1. Open chatbot.py and paste your key on line 23")
        print("  2. Get a free key: https://aistudio.google.com/app/apikey")
        sys.exit(1)

    print(BANNER)

    # Test connection
    print("  Connecting...", end=" ", flush=True)
    try:
        client = genai.Client(api_key=API_KEY)
        client.models.generate_content(
            model=MODEL,
            contents="Hi",
            config=types.GenerateContentConfig(max_output_tokens=5),
        )
        print("✅ Connected!\n")
    except Exception as e:
        error_str = str(e)
        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
            print("⚠️  Rate limited right now. Wait 1 min and try again.")
            sys.exit(1)
        else:
            print(f"❌ Failed: {e}")
            sys.exit(1)

    bot = GeminiChatbot()
    print("  Type your message and press Enter.\n")

    while True:
        try:
            user_input = input("🧑 You: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\n\n👋 Goodbye!")
            break

        if not user_input:
            continue

        cmd = user_input.lower()
        if cmd in ("/quit", "/exit", "/q"):
            print("👋 Goodbye!")
            break
        elif cmd == "/reset":
            bot.reset()
            print("🔄 History cleared!\n")
            continue
        elif cmd == "/stats":
            print(bot.get_stats() + "\n")
            continue
        elif cmd == "/help":
            print(BANNER)
            continue

        print("\n🤖 Gemini: ", end="", flush=True)
        for chunk in bot.send_message_stream(user_input):
            print(chunk, end="", flush=True)
        print("\n")


if __name__ == "__main__":
    main()