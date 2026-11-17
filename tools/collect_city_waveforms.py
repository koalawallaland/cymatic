#!/usr/bin/env python3
"""Publish recent real seismic station spectra; never substitute synthetic samples."""
import json, math, os
from datetime import datetime, timezone, timedelta
from pathlib import Path
from obspy.clients.fdsn import Client
from obspy import UTCDateTime
import numpy as np

CITIES={"Beverly Hills":(34.0736,-118.4004),"Helendale":(34.7433,-117.3248),"Wrightwood":(34.3608,-117.6334),"San Diego":(32.7157,-117.1611)}
OUT=Path("data/city-waveforms.json")
now=datetime.now(timezone.utc)
result={"generated_at":now.isoformat(),"mode":"recent-station-waveforms","cities":{}}
client=Client("IRIS",timeout=20)

for city,(lat,lon) in CITIES.items():
    record={"status":"unavailable","station":None,"sample_time":None,"dominant_hz":None,"rms_counts":None,"spectrum":[]}
    try:
        stations=client.get_stations(network="CI",channel="HHZ,BHZ,EHZ",latitude=lat,longitude=lon,maxradius=0.7,level="channel",starttime=UTCDateTime(now-timedelta(days=1)),endtime=UTCDateTime(now))
        candidates=[]
        for net in stations:
            for sta in net:
                dlat=math.radians(sta.latitude-lat);dlon=math.radians(sta.longitude-lon)
                a=math.sin(dlat/2)**2+math.cos(math.radians(lat))*math.cos(math.radians(sta.latitude))*math.sin(dlon/2)**2
                km=12742*math.asin(math.sqrt(a))
                for ch in sta.channels:
                    if ch.code in ("HHZ","BHZ","EHZ"):candidates.append((km,net.code,sta.code,ch.location_code,ch.code))
        candidates.sort()
        for _,net,sta,loc,ch in candidates[:8]:
            try:
                end=UTCDateTime(now-timedelta(seconds=45))
                start=end-90
                st=client.get_waveforms(net,sta,loc,ch,start,end,attach_response=False)
                if not st:continue
                st.merge(method=1,fill_value=None)
                tr=max(st,key=lambda t:t.stats.npts)
                data=np.asarray(tr.data,dtype=float)
                if np.ma.isMaskedArray(tr.data) and np.any(tr.data.mask):continue
                rate=float(tr.stats.sampling_rate)
                if not 1<=rate<=2000 or len(data)<256:continue
                data=data[-min(4096,2**int(math.log2(len(data)))):]
                data=data-np.mean(data)
                rms=float(np.sqrt(np.mean(data*data)))
                power=np.abs(np.fft.rfft(data*np.hanning(len(data))))**2
                freqs=np.fft.rfftfreq(len(data),1/rate)
                if len(power)<3:continue
                peak=int(np.argmax(power[1:])+1)
                # Downsample spectrum into fixed frequency bins for small static JSON.
                bins=np.array_split(np.arange(1,len(power)),96)
                spectrum=[{"hz":round(float(np.mean(freqs[b])),4),"power":round(float(np.max(power[b])),5)} for b in bins if len(b)]
                record={"status":"measured","station":f"{net}.{sta}.{loc}.{ch}","sample_time":str(tr.stats.endtime),"dominant_hz":round(float(freqs[peak]),4),"rms_counts":round(rms,6),"sample_rate":rate,"units":"raw instrument counts","spectrum":spectrum}
                break
            except Exception:continue
    except Exception as e:record["error_type"]=type(e).__name__
    result["cities"][city]=record
OUT.parent.mkdir(exist_ok=True,parents=True)
OUT.write_text(json.dumps(result,separators=(",",":"))+"\n")
print(json.dumps({k:v["status"] for k,v in result["cities"].items()}))
