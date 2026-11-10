const $ = id => document.getElementById(id);
let position = null;
let flights = [];
let selected = null;
let busy = false;

function setMessage(text) { $("message").textContent = text; }
function fmt(value, suffix="") { return value == null ? "—" : `${value}${suffix}`; }

function render() {
  $("count").textContent = flights.length;
  $("rows").innerHTML = "";
  if (!flights.length) {
    $("rows").innerHTML = '<div class="empty">AUCUN APPAREIL SOUS 5 000 PI<br>DANS LE RAYON DE 5 KM</div>';
    clearDetails();
    return;
  }
  for (const f of flights) {
    const row = document.createElement("div");
    row.className = "flight-row" + (selected?.hex === f.hex ? " selected" : "");
    const vals = [
      [f.callsign,"flight"], [f.origin || "—", "muted"],
      [f.destination || "—","muted"], [fmt(f.altitude),"muted"],
      [fmt(f.distance,""),"muted"]
    ];
    for (const [v, cls] of vals) {
      const span = document.createElement("span");
      span.className = cls; span.textContent = v; row.appendChild(span);
    }
    row.addEventListener("click", () => { selected = f; render(); showDetails(f); });
    $("rows").appendChild(row);
  }
  const current = flights.find(f => f.hex === selected?.hex) || flights[0];
  selected = current; showDetails(current);
}
function clearDetails() {
  ["d-call","d-type","d-reg","d-speed","d-origin","d-dest"].forEach(id => $(id).textContent = "—");
}
function showDetails(f) {
  $("d-call").textContent = f.callsign || "—";
  $("d-type").textContent = f.type || "Inconnu";
  $("d-reg").textContent = f.registration || "—";
  $("d-speed").textContent = fmt(f.speed," kt");
  $("d-origin").textContent = f.origin || "Inconnue";
  $("d-dest").textContent = f.destination || "Inconnue";
}
async function update() {
  if (!position || busy) return;
  busy = true;
  try {
    const url = `/api/aircraft?lat=${encodeURIComponent(position.coords.latitude)}&lon=${encodeURIComponent(position.coords.longitude)}`;
    const response = await fetch(url, {cache:"no-store"});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Erreur de données");
    flights = data.aircraft || [];
    $("status").textContent = `DERNIÈRE MÀJ ${new Date().toLocaleTimeString("fr-CA")}`;
    setMessage(flights.length ? "SÉLECTIONNEZ UN VOL POUR VOIR LES DÉTAILS." : "AUCUN VOL CORRESPONDANT AUX FILTRES.");
    render();
  } catch (e) {
    $("status").textContent = "SIGNAL INDISPONIBLE";
    setMessage(e.message);
  } finally { busy = false; }
}
function startLocation() {
  if (!navigator.geolocation) { setMessage("La géolocalisation n'est pas prise en charge."); return; }
  navigator.geolocation.watchPosition(
    p => {
      position = p;
      $("status").textContent = "POSITION GPS ACQUISE";
      update();
    },
    e => setMessage("Autorisez la localisation dans Safari : " + e.message),
    { enableHighAccuracy:true, maximumAge:10000, timeout:20000 }
  );
}
setInterval(() => {
  $("clock").textContent = new Date().toLocaleTimeString("fr-CA");
}, 1000);
setInterval(update, 5000);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(()=>{});
startLocation();
