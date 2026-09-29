import json
import os
import statistics
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

TARGET = "http://proxy"
ALLOWED_PROFILES = {"baseline", "flood", "auth", "payload"}

PROFILE = os.environ.get("ATTACK_PROFILE", "flood").strip().lower()
if PROFILE not in ALLOWED_PROFILES:
    raise SystemExit(f"Unknown ATTACK_PROFILE={PROFILE!r}. Allowed: {sorted(ALLOWED_PROFILES)}")

def request_once(path, method="GET", body=None, timeout=2.5):
    url = TARGET + path
    data = None if body is None else json.dumps(body).encode("utf-8")
    headers = {
        "User-Agent": "IJR-Controlled-Lab-Runner/1.0",
        "X-IJR-Lab-Traffic": "controlled"
    }
    if data is not None:
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            response.read(1024)
            code = int(response.status)
    except urllib.error.HTTPError as error:
        error.read(1024)
        code = int(error.code)
    except Exception:
        code = 0
    return {
        "code": code,
        "latency_ms": round((time.perf_counter() - started) * 1000, 2)
    }

def profile_spec(name):
    if name == "baseline":
        return {
            "workers": 1,
            "duration": 6,
            "path": "/",
            "method": "GET",
            "body_factory": lambda i: None
        }
    if name == "flood":
        return {
            "workers": 18,
            "duration": 12,
            "path": "/api/report",
            "method": "GET",
            "body_factory": lambda i: None
        }
    if name == "auth":
        return {
            "workers": 10,
            "duration": 10,
            "path": "/login",
            "method": "POST",
            "body_factory": lambda i: {
                "username": f"test-user-{i % 8}",
                "password": "incorrect-lab-password"
            }
        }
    return {
        "workers": 8,
        "duration": 8,
        "path": "/api/echo",
        "method": "POST",
        "body_factory": lambda i: {
            "label": "controlled-payload",
            "payload": "A" * (64 * 1024)
        }
    }

def worker(worker_id, spec, deadline):
    results = []
    sequence = 0
    while time.monotonic() < deadline:
        body = spec["body_factory"](worker_id * 100000 + sequence)
        results.append(request_once(spec["path"], spec["method"], body))
        sequence += 1
    return results

spec = profile_spec(PROFILE)
deadline = time.monotonic() + spec["duration"]
started = time.perf_counter()

all_results = []
with ThreadPoolExecutor(max_workers=spec["workers"]) as pool:
    futures = [pool.submit(worker, i, spec, deadline) for i in range(spec["workers"])]
    for future in as_completed(futures):
        all_results.extend(future.result())

elapsed = max(0.001, time.perf_counter() - started)
latencies = [item["latency_ms"] for item in all_results]
status_counts = {}
for item in all_results:
    status_counts[str(item["code"])] = status_counts.get(str(item["code"]), 0) + 1

latencies_sorted = sorted(latencies)
p95 = 0
if latencies_sorted:
    index = min(len(latencies_sorted) - 1, max(0, int(len(latencies_sorted) * 0.95) - 1))
    p95 = round(latencies_sorted[index], 2)

summary = {
    "lab_only": True,
    "target": TARGET,
    "profile": PROFILE,
    "workers": spec["workers"],
    "duration_seconds_requested": spec["duration"],
    "elapsed_seconds": round(elapsed, 2),
    "requests": len(all_results),
    "requests_per_second": round(len(all_results) / elapsed, 2),
    "status_counts": status_counts,
    "latency_ms": {
        "mean": round(statistics.mean(latencies), 2) if latencies else 0,
        "p95": p95,
        "max": round(max(latencies), 2) if latencies else 0
    }
}

print(json.dumps(summary, indent=2))
