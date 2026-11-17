"""Refresh public observatory caches for a static GitHub Pages site.

This is intentionally a best-effort collector: failed requests never overwrite
previous successful data. No user/device data is collected.
"""
import json
import os
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent / "data"
ROOT.mkdir(parents=True, exist_ok=True)
LOCATIONS = {
    "beverly": (34.0736, -118.4004),
    "helendale": (34.7439, -117.3248),
    "wrightwood": (34.3608, -117.6334),
    "sandiego": (32.7157, -117.1611),
}
HEADERS = {
    "User-Agent": "CymaticSkyObservatory/1.0 (+https://koalawallaland.github.io/cymatic/observatory/)",
    "Accept": "application/json,text/plain;q=0.8",
}

def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")

def get(url):
    request = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=25) as response:
        return response.read().decode("utf-8")

def load_json(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        return default

def save_json(path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

def refresh_satellites():
    meta_path = ROOT / "satellites-meta.json"
    tle_path = ROOT / "visual.tle"
    meta = load_json(meta_path, {})
    try:
        previous = datetime.fromisoformat(meta.get("fetchedAt", "").replace("Z", "+00:00"))
        age = time.time() - previous.timestamp()
    except (ValueError, TypeError):
        age = float("inf")
    if age < 90 * 60 and tle_path.exists() and tle_path.stat().st_size > 1000:
        print("Satellite TLE is recent; skipping.")
        return
    try:
        tle = get("https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=tle")
        if len(tle) < 1000 or "\n1 " not in tle or "\n2 " not in tle:
            raise ValueError("CelesTrak returned no valid TLE list")
        tle_path.write_text(tle.rstrip() + "\n", encoding="utf-8")
        save_json(meta_path, {"fetchedAt": utc_now(), "source": "CelesTrak GP visual", "format": "TLE"})
        print("Updated satellites:", len(tle), "bytes")
    except Exception as exc:
        print("Satellite cache not refreshed:", repr(exc))

def refresh_aircraft():
    path = ROOT / "aircraft.json"
    data = load_json(path, {"generatedAt": None, "locations": {}})
    data.setdefault("locations", {})
    successes = 0
    for name, (lat, lon) in LOCATIONS.items():
        url = f"https://api.adsb.lol/v2/point/{lat:.4f}/{lon:.4f}/100"
        try:
            response = json.loads(get(url))
            records = response.get("ac")
            if not isinstance(records, list):
                raise ValueError("Missing aircraft list")
            cleaned = [
                {key: item[key] for key in (
                    "hex", "flight", "r", "t", "lat", "lon",
                    "alt_baro", "alt_geom", "gs", "track", "seen_pos",
                ) if key in item}
                for item in records[:400] if isinstance(item, dict)
            ]
            # Use the provider's data timestamp if available.
            stamp = response.get("now")
            fetched = datetime.fromtimestamp(float(stamp), tz=timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z") if stamp else utc_now()
            data["locations"][name] = {"fetchedAt": fetched, "ac": cleaned}
            successes += 1
            print(f"{name}: {len(cleaned)} aircraft")
        except Exception as exc:
            print(f"{name}: prior snapshot kept; {exc!r}")
        time.sleep(1)
    if successes:
        data["generatedAt"] = utc_now()
        data["source"] = "ADSB.lol public positions"
        save_json(path, data)
    else:
        print("No aircraft updates; previous cache preserved.")

if __name__ == "__main__":
    refresh_satellites()
    refresh_aircraft()
