import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;
const ROUTE_TTL_MS = 6 * 60 * 60 * 1000;
const routeCache = new Map();

app.use(express.static("public", { maxAge: "1h" }));

async function fetchJson(url, timeoutMs = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "RadarMaison/1.1 (personal non-commercial project)" }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const rad = d => d * Math.PI / 180;
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 +
    Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function lookupRoute(callsign) {
  const key = (callsign || "").trim().toUpperCase();
  if (!key || key.length < 3) return null;

  const cached = routeCache.get(key);
  if (cached && Date.now() - cached.time < ROUTE_TTL_MS) return cached.value;

  try {
    const data = await fetchJson(
      `https://api.adsbdb.com/v0/callsign/${encodeURIComponent(key)}`, 7000
    );
    const route = data?.response?.flightroute;
    const value = route ? {
      origin: route.origin?.iata_code || route.origin?.icao_code || null,
      destination: route.destination?.iata_code || route.destination?.icao_code || null
    } : null;
    routeCache.set(key, { time: Date.now(), value });
    return value;
  } catch {
    // Avoid repeatedly querying a missing/unavailable route on every refresh.
    routeCache.set(key, { time: Date.now(), value: null });
    return null;
  }
}

app.get("/api/aircraft", async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) ||
      Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return res.status(400).json({ error: "Coordonnées GPS invalides." });
  }

  try {
    // adsb.lol radius is expressed in nautical miles. 5 km ≈ 2.7 NM.
    const data = await fetchJson(
      `https://api.adsb.lol/v2/point/${lat}/${lon}/2.7`, 12000
    );
    const aircraft = (data.ac || []).map(a => {
      const distance = (Number.isFinite(a.lat) && Number.isFinite(a.lon))
        ? haversineKm(lat, lon, a.lat, a.lon) : null;
      return {
        callsign: (a.flight || "").trim() || "SANS INDICATIF",
        hex: a.hex || null,
        registration: a.r || null,
        type: a.t || null,
        altitude: typeof a.alt_baro === "number" ? a.alt_baro : null,
        speed: typeof a.gs === "number" ? Math.round(a.gs) : null,
        distance: distance === null ? null : Number(distance.toFixed(1)),
        seen: typeof a.seen_pos === "number" ? a.seen_pos : null
      };
    }).filter(a =>
      a.distance !== null &&
      a.distance <= 5 &&
      a.altitude !== null &&
      a.altitude >= 0 &&
      a.altitude < 5000 &&
      (a.seen === null || a.seen < 30)
    ).sort((a,b) => a.distance - b.distance);

    // Resolve routes only for aircraft that pass the local filters.
    // A short concurrency cap keeps this free public service load reasonable.
    let cursor = 0;
    const workers = Array.from({length: Math.min(4, aircraft.length)}, async () => {
      while (cursor < aircraft.length) {
        const item = aircraft[cursor++];
        const route = await lookupRoute(item.callsign);
        item.origin = route?.origin || null;
        item.destination = route?.destination || null;
      }
    });
    await Promise.all(workers);

    res.set("Cache-Control", "no-store");
    res.json({
      updatedAt: new Date().toISOString(),
      source: "adsb.lol + adsbdb",
      count: aircraft.length,
      aircraft
    });
  } catch (error) {
    res.status(502).json({
      error: "Les données aériennes sont temporairement indisponibles.",
      detail: error.message
    });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));
app.listen(PORT, () => console.log(`Radar Maison actif sur le port ${PORT}`));
