"""Minimal client for the hosted Clipkit MCP endpoint (JSON-RPC over HTTP/SSE)."""
import json, base64, urllib.request

URL = "https://www.clipkit.dev/mcp"

class Clipkit:
    def __init__(self):
        self.sid = None
        self.n = 0
        r = self._rpc("initialize", {"protocolVersion": "2025-03-26", "capabilities": {},
                                     "clientInfo": {"name": "mindglitch-pipeline", "version": "1"}})
        self._notify("notifications/initialized")

    def _post(self, payload):
        h = {"content-type": "application/json", "accept": "application/json, text/event-stream"}
        if self.sid: h["mcp-session-id"] = self.sid
        req = urllib.request.Request(URL, data=json.dumps(payload).encode(), headers=h)
        with urllib.request.urlopen(req, timeout=300) as resp:
            self.sid = resp.headers.get("mcp-session-id") or self.sid
            body = resp.read().decode()
        if body.startswith("event:") or "\ndata:" in body or body.startswith("data:"):
            datas = [l[5:].strip() for l in body.splitlines() if l.startswith("data:")]
            return json.loads(datas[-1]) if datas else None
        return json.loads(body) if body.strip() else None

    def _rpc(self, method, params):
        self.n += 1
        r = self._post({"jsonrpc": "2.0", "id": self.n, "method": method, "params": params})
        if r and "error" in r: raise RuntimeError(r["error"])
        return r["result"]

    def _notify(self, method):
        try: self._post({"jsonrpc": "2.0", "method": method})
        except Exception: pass

    def tools(self):
        return [t["name"] for t in self._rpc("tools/list", {})["tools"]]

    def call(self, name, args):
        res = self._rpc("tools/call", {"name": name, "arguments": args})
        if res.get("isError"):
            raise RuntimeError(json.dumps(res["content"])[:2000])
        return res["content"]

    def call_json(self, name, args):
        for c in self.call(name, args):
            if c["type"] == "text":
                try: return json.loads(c["text"])
                except Exception: return c["text"]

    def still(self, project_id, t, path):
        import time
        for attempt in range(8):
            try:
                content = self.call("preview_still", {"project_id": project_id, "time": t}); break
            except RuntimeError as e:
                if "Rate limited" not in str(e) or attempt == 7: raise
                time.sleep(10 * (attempt + 1))
        for c in content:
            if c["type"] == "image":
                open(path, "wb").write(base64.b64decode(c["data"]))
                return path
        raise RuntimeError("no image")
