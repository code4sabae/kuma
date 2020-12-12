import L from "https://code4sabae.github.io/leaflet-mjs/leaflet.mjs";
import { CSV } from "https://code4sabae.github.io/js/CSV.js";
import { rnd } from "https://code4sabae.github.io/js/rnd.js";

class MapGSICSV extends HTMLElement {
  constructor () {
    super();

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://code4sabae.github.io/leaflet-mjs/leaflet.css";
    this.appendChild(link);
    link.onload = () => this.init();
  }
  async init () {
    const div = document.createElement("div");
    this.appendChild(div);
    div.style.width = this.getAttribute("width") || "100%";
    div.style.height = this.getAttribute("height") || "60vh";

    const map = L.map(div);
    // set 国土地理院地図 https://maps.gsi.go.jp/development/ichiran.html
    L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png", {
      attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>"',
      maxZoom: 18,
    }).addTo(map);

    const iconlayer = L.layerGroup();
    iconlayer.addTo(map);

    const fn = this.getAttribute("src");
    console.log(fn);
    const data = CSV.toJSON(await CSV.fetch(fn));

    console.log(data);
    const lls = [];
    for (const d of data) {
      const lat = d["schema:latitude"];
      const long = d["schema:longitude"];
      if (!lat || !long) {
        continue;
      }
      const ll = [lat, long];
      const title = d["schema:name"];
      const url = d["schema:url"];
      const opt = { title };
      const marker = L.marker(ll, opt);
      marker.bindPopup(`<a href=${url}>${title}</a>`);
      iconlayer.addLayer(marker);
      lls.push(ll);
    }
    if (lls.length) {
      map.fitBounds(lls);
    }
  }
}

customElements.define('map-gsi-csv', MapGSICSV);

