"""Bounded temporary cache of generated speech, never microphone recordings."""
import time
from collections import OrderedDict

class SpeechCache:
    def __init__(self, max_bytes=16 * 1024 * 1024, ttl=600):
        self.entries = OrderedDict()
        self.max_bytes, self.ttl, self.size = max_bytes, ttl, 0
    def get(self, key):
        entry = self.entries.get(key)
        if not entry: return None
        at, content = entry
        if time.monotonic() - at >= self.ttl:
            self.size -= len(content); del self.entries[key]
            return None
        self.entries.move_to_end(key)
        return content
    def put(self, key, content):
        if len(content) > self.max_bytes: return
        existing = self.entries.pop(key, None)
        if existing: self.size -= len(existing[1])
        while self.entries and (self.size + len(content) > self.max_bytes or len(self.entries) >= 128):
            _, (_, old) = self.entries.popitem(last=False); self.size -= len(old)
        self.entries[key] = (time.monotonic(), content); self.size += len(content)
    def discard_session(self, session_id):
        for key in list(self.entries):
            if key[0] == session_id:
                self.size -= len(self.entries[key][1]); del self.entries[key]
