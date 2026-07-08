import urllib.request
import json
import os

API_KEY = os.environ.get("GEMINI_API_KEY", "")

# Actually we can't get the user's API key from the environment.
# Is there an open endpoint to list models? No, it requires an API key.
