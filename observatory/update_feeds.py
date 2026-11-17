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

def aircraft_timestamp(raw):
    """Providers publish Unix seconds or milliseconds."""
    try:
        epoch = float(raw)
        if epoch > 1e12:
            epoch /= 1000
        if 1600000000 < epoch < time.time() + 3600:
            return datetime.fromtimestamp(epoch, tz=timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    except (ValueError, OverflowError, TypeError):
        pass
    return utc_now()

def refresh_aircraft():
    path = ROOT / "aircraft.json"
    data = load_json(path, {"generatedAt": None, "locations": {}})
    data.setdefault("locations", {})
    successes = 0
    # Fallbacks are needed because community feeds sometimes reject GitHub runner IPs.
    # Honor one request every ~2 seconds and keep source attribution.
    sources = [
        ("ADSB.lol", lambda lat, lon: f"https://api.adsb.lol/v2/point/{lat:.4f}/{lon:.4f}/100"),
        ("ADSB One", lambda lat, lon: f"https://api.adsb.one/v2/point/{lat:.4f}/{lon:.4f}/100"),
        ("adsb.fi", lambda lat, lon: f"https://opendata.adsb.fi/api/v3/lat/{lat:.4f}/lon/{lon:.4f}/dist/100"),
    ]
    failed_sources = set()
    for name, (lat, lon) in LOCATIONS.items():
        for source, url_factory in sources:
            if source in failed_sources:
                continue
            try:
                url = url_factory(lat, lon)
                response = json.loads(get(url))
                records = response.get("ac", response.get("aircraft"))
                if not isinstance(records, list):
                    raise ValueError("Missing aircraft list")
                cleaned = [
                    {key: item[key] for key in (
                        "hex", "flight", "r", "t", "lat", "lon",
                        "alt_baro", "alt_geom", "gs", "track", "seen_pos",
                    ) if key in item}
                    for item in records[:400] if isinstance(item, dict)
                ]
                stamp = aircraft_timestamp(response.get("now"))
                data["locations"][name] = {"fetchedAt": stamp, "source": source, "ac": cleaned}
                successes += 1
                print(f"{name}: {len(cleaned)} aircraft from {source}")
                break
            except Exception as exc:
                failed_sources.add(source)
                print(f"{source} failed for {name}: {exc!r}")
            finally:
                time.sleep(2.1)
        else:
            print(f"{name}: no providers available; previous snapshot kept")
    if successes:
        data["generatedAt"] = utc_now()
        data["source"] = "Community ADS-B positional data"
        save_json(path, data)
    else:
        print("No aircraft updates; previous cache preserved.")

if __name__ == "__main__":
    refresh_satellites()
    refresh_aircraft()
