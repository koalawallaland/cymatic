#!/usr/bin/env python3
"""Optional self-hosted EarthScope SeedLink -> browser JSON bridge.

Install: pip install obspy websockets requests
Run: python tools/seismic_bridge.py
Expose behind a TLS reverse proxy as wss://.../seismic (never expose an unauthenticated
public ingestion endpoint without rate limiting). This is a prototype, not a hosted service.
"""
import asyncio
import json
import math
import os
import threading
from datetime import datetime, timezone
from queue import Queue, Empty
import requests
from obspy.clients.seedlink.easyseedlink import EasySeedLinkClient
from websockets.asyncio.server import serve

CITIES = {
    "Beverly Hills": (34.0736, -118.4004),
    "Helendale": (34.7433, -117.3248),
    "Wrightwood": (34.3608, -117.6334),
    "San Diego": (32.7157, -117.1611),
}
EARTHSCOPE = "rtserve.earthscope.org:18000"
STATIONS = "https://service.earthscope.org/fdsnws/station/1/query"
queue = Queue(maxsize=1000)
clients = set()

def distance_km(a, b, c, d):
    p1, p2 = math.radians(a), math.radians(c)
    dp, dl = p2-p1, math.radians(d-b)
    q = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 12742 * math.asin(math.sqrt(q))

def station_candidates(city, lat, lon):
    r = requests.get(STATIONS, params={
        "format": "text", "level": "channel", "network": "CI",
        "channel": "HHZ,BHZ,EHZ", "latitude": lat, "longitude": lon,
        "maxradius": 1.5
    }, timeout=25)
    r.raise_for_status()
    choices = []
    for line in r.text.splitlines():
        if not line or line.startswith("#"): continue
        f = line.split("|")
        if len(f) < 8: continue
        try:
            net, sta, loc, chan = f[:4]
            slat, slon = float(f[4]), float(f[5])
            km = distance_km(lat, lon, slat, slon)
            choices.append((km, net, sta, loc, chan))
        except (ValueError, IndexError): continue
    # Deduplicate by station and prioritize nearby vertical broadband channels.
    choices.sort(key=lambda x: (x[0], {"HHZ":0,"BHZ":1,"EHZ":2}.get(x[4],3)))
    return choices

class Receiver(EasySeedLinkClient):
    def __init__(self, city, net, sta, channel):
        super().__init__(EARTHSCOPE)
        self.city, self.net, self.sta, self.channel = city, net, sta, channel
        self.select_stream(net, sta, channel)
    def on_data(self, trace):
        data = trace.data
        if len(data) == 0: return
        payload = {
            "city": self.city, "station": f"{trace.stats.network}.{trace.stats.station}.{trace.stats.channel}",
            "sample_rate": float(trace.stats.sampling_rate),
            "timestamp": str(trace.stats.starttime),
            "samples": data.astype(float).tolist(),
            "units": "raw instrument counts",
            "source": "EarthScope SeedLink",
        }
        try: queue.put_nowait(payload)
        except Exception: pass

def receiver_thread(city, choices):
    for _, net, sta, loc, channel in choices[:5]:
        try:
            print("Connecting", city, net, sta, channel, flush=True)
            Receiver(city, net, sta, channel).run()
        except Exception as e:
            print("Station unavailable", city, sta, str(e), flush=True)

async def handler(ws):
    clients.add(ws)
    try:
        async for _ in ws: pass
    finally:
        clients.discard(ws)

async def broadcast():
    while True:
        try: item = queue.get_nowait()
        except Empty:
            await asyncio.sleep(.1)
            continue
        if clients:
            message = json.dumps(item, separators=(",",":"))
            await asyncio.gather(*(ws.send(message) for ws in tuple(clients)), return_exceptions=True)

async def main():
    for city,(lat,lon) in CITIES.items():
        try:
            candidates = station_candidates(city,lat,lon)
            if not candidates:
                print("No matching station:",city,flush=True)
                continue
            threading.Thread(target=receiver_thread,args=(city,candidates),daemon=True).start()
        except Exception as e: print("Discovery failed",city,e,flush=True)
    port=int(os.environ.get("PORT","8765"))
    async with serve(handler,os.environ.get("HOST","127.0.0.1"),port,max_size=1024):
        print("Bridge listening on",port,flush=True)
        await broadcast()

if __name__ == "__main__":
    asyncio.run(main())
