// Import Leaflet library (pastikan Leaflet sudah dimuat di HTML)
const L = window.L;

// Inisialisasi peta dengan fokus tepat di tengah Kabupaten Bandung
const map = L.map("mapid").setView([-7.05, 107.6], 10);

// --- Base Layers ---
const openStreetMap = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
});

const googleStreets = L.tileLayer("http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
  subdomains: ["mt0", "mt1", "mt2", "mt3"],
  attribution: "© Google Maps",
});

const humanitarian = L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team",
});

const esriSat = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    attribution: "© Esri",
  },
);

// Atur OpenStreetMap sebagai default base layer
openStreetMap.addTo(map);

// Objek untuk menyimpan Base Layers (Peta Dasar)
const baseMaps = {
  "OpenStreetMap": openStreetMap,
  "Google Streets": googleStreets,
  "Humanitarian": humanitarian,
  "Esri Satelit": esriSat,
};

// Objek untuk menyimpan Overlay Layers (Data GeoJSON, Marker, dll.)
const overlayMaps = {}; // Akan diisi setelah data GeoJSON dimuat

// --- Tombol Kontrol Peta ---

// Tombol Home yang berfungsi - fokus ke tengah Kabupaten Bandung
const homeBtn = L.control({ position: "topleft" });
homeBtn.onAdd = () => {
  const div = L.DomUtil.create("div", "leaflet-bar leaflet-control leaflet-control-home");
  div.innerHTML = '<a href="#" title="Kembali ke Posisi Awal" role="button">⌂</a>';

  div.firstChild.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    map.setView([-7.05, 107.6], 10);
    return false;
  };

  L.DomEvent.disableClickPropagation(div);
  return div;
};
homeBtn.addTo(map);

// Tombol Fullscreen (membutuhkan plugin L.Control.Fullscreen)
if (L.Control.Fullscreen) {
  map.addControl(
    new L.Control.Fullscreen({
      title: {
        false: "Masuk Mode Layar Penuh",
        true: "Keluar dari Mode Layar Penuh",
      },
    }),
  );
}

// Tombol Lokasi Saya (membutuhkan plugin L.control.locate)
if (L.control.locate) {
  L.control
    .locate({
      position: "topleft",
      strings: {
        title: "Tampilkan Lokasi Saya",
      },
      locateOptions: {
        maxZoom: 16,
      },
    })
    .addTo(map);
}

// --- Data Titik Kecelakaan dan Marker Cluster ---
const titikKecelakaan = [
  // Data Anda di sini
  { nama: "Jl. Raya Soreang - Banjaran (Soreang)", koordinat: [-7.0326, 107.5186], kejadian: 15, penyebab: "Persimpangan ramai & jalan sempit", kecamatan: "Soreang", },
  { nama: "Jl. Raya Banjaran - Pangalengan (Banjaran)", koordinat: [-7.0545, 107.5877], kejadian: 12, penyebab: "Tanjakan curam & tikungan tajam", kecamatan: "Banjaran", },
  { nama: "Jl. Raya Majalaya - Ibun (Majalaya)", koordinat: [-7.0475, 107.7597], kejadian: 18, penyebab: "Jalur industri padat & banyak truk", kecamatan: "Majalaya", },
  { nama: "Jl. Raya Cicalengka - Nagreg (Cicalengka)", koordinat: [-7.1258, 107.7853], kejadian: 14, penyebab: "Jalan berlubang & lalu lintas padat", kecamatan: "Cicalengka", },
  { nama: "Jl. Raya Ciwidey - Rancabali (Ciwidey)", koordinat: [-7.1497, 107.4989], kejadian: 11, penyebab: "Kabut tebal & jalan menurun", kecamatan: "Ciwidey", },
  { nama: "Jl. Raya Pangalengan - Kertasari (Pangalengan)", koordinat: [-7.1125, 107.6031], kejadian: 9, penyebab: "Jalan pegunungan & cuaca ekstrem", kecamatan: "Pangalengan", },
  { nama: "Jl. Raya Katapang - Soreang (Katapang)", koordinat: [-6.9875, 107.5342], kejadian: 13, penyebab: "Persimpangan kompleks & traffic light", kecamatan: "Katapang", },
  { nama: "Jl. Raya Bojongsoang - Dayeuhkolot (Bojongsoang)", koordinat: [-6.9758, 107.6342], kejadian: 16, penyebab: "Jalur alternatif padat & jalan sempit", kecamatan: "Bojongsoang", },
  { nama: "Jl. Raya Rancaekek - Cicalengka (Rancaekek)", koordinat: [-6.9697, 107.7564], kejadian: 10, penyebab: "Zona industri & lalu lintas berat", kecamatan: "Rancaekek", },
  { nama: "Jl. Raya Pacet - Ciparay (Pacet)", koordinat: [-7.2014, 107.4456], kejadian: 8, penyebab: "Jalan pegunungan & tikungan tajam", kecamatan: "Pacet", },
  { nama: "Jl. Raya Cileunyi - Cikancung (Cileunyi)", koordinat: [-6.9389, 107.7331], kejadian: 12, penyebab: "Persimpangan ramai & kecepatan tinggi", kecamatan: "Cileunyi", },
  { nama: "Jl. Raya Baleendah - Arjasari (Baleendah)", koordinat: [-7.0653, 107.6297], kejadian: 7, penyebab: "Jalan menurun & rem blong", kecamatan: "Baleendah", },
];

const markers = L.markerClusterGroup({
  chunkedLoading: true,
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false,
  zoomToBoundsOnClick: true,
});

const penyebabSet = new Set();
const kecamatanSet = new Set();

// Fungsi untuk membuat marker
function createMarker(titik) {
  penyebabSet.add(titik.penyebab);
  kecamatanSet.add(titik.kecamatan);

  let iconUrl, tingkatBahaya;
  if (titik.kejadian >= 15) {
    iconUrl = "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png";
    tingkatBahaya = "Sangat Tinggi";
  } else if (titik.kejadian >= 10) {
    iconUrl = "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png";
    tingkatBahaya = "Tinggi";
  } else {
    iconUrl = "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png";
    tingkatBahaya = "Sedang";
  }

  const icon = L.icon({
    iconUrl: iconUrl,
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  const marker = L.marker(titik.koordinat, { icon }).bindPopup(`
    <div style="font-family: Arial, sans-serif; max-width: 300px;">
      <h4 style="margin: 0 0 10px 0; color: #005f73; font-size: 14px;">${titik.nama}</h4>
      <p style="margin: 5px 0; font-size: 12px;"><strong>📍 Kecamatan:</strong> ${titik.kecamatan}</p>
      <p style="margin: 5px 0; font-size: 12px;"><strong>🚧 Jumlah Kejadian:</strong> ${titik.kejadian} kasus</p>
      <p style="margin: 5px 0; font-size: 12px;"><strong>⚠️ Penyebab Utama:</strong> ${titik.penyebab}</p>
      <p style="margin: 5px 0; font-size: 12px;"><strong>🔴 Tingkat Bahaya:</strong> ${tingkatBahaya}</p>
    </div>
  `);

  return marker;
}

// Tambahkan semua marker ke cluster
function loadMarkers() {
  markers.clearLayers();
  titikKecelakaan.forEach((titik) => {
    const marker = createMarker(titik);
    markers.addLayer(marker);
  });
  map.addLayer(markers);
}

// Load markers saat halaman dimuat
loadMarkers();
// Tambahkan layer marker kecelakaan ke overlayMaps
overlayMaps["Titik Kecelakaan"] = markers;

// Fungsi untuk fit bounds ke semua marker setelah load
function fitToMarkers() {
  if (markers.getLayers().length > 0) {
    const group = new L.featureGroup(markers.getLayers());
    map.fitBounds(group.getBounds().pad(0.1));
  }
}

// Panggil fit bounds setelah markers dimuat
// Gunakan requestAnimationFrame atau DOMContentLoaded jika Anda mau
setTimeout(() => {
  fitToMarkers();
}, 1000);


// --- Filter Marker ---
// Populate filter dropdown
function populateFilters() {
  const filterPenyebab = document.getElementById("filterPenyebab");
  if (filterPenyebab) {
    filterPenyebab.innerHTML =
      `<option value="semua">Semua Penyebab</option>` +
      [...penyebabSet].map((p) => `<option value="${p}">${p}</option>`).join("");
  }
  // Tidak ada filterKecamatan di sini, tapi jika ada, tambahkan logikanya
}

// Panggil fungsi populate filters
populateFilters();

// Event listeners untuk filter
document.addEventListener("DOMContentLoaded", () => {
  const filterPenyebab = document.getElementById("filterPenyebab");
  const filterKejadian = document.getElementById("filterKejadian");

  if (filterPenyebab) {
    filterPenyebab.addEventListener("change", applyFilter);
  }

  if (filterKejadian) {
    filterKejadian.addEventListener("change", applyFilter);
  }
});

function applyFilter() {
  const filterPenyebab = document.getElementById("filterPenyebab");
  const filterKejadian = document.getElementById("filterKejadian");

  if (!filterPenyebab || !filterKejadian) return;

  const penyebabVal = filterPenyebab.value;
  const kejadianVal = filterKejadian.value;

  markers.clearLayers();

  titikKecelakaan.forEach((titik) => {
    let showMarker = true;

    // Filter berdasarkan penyebab
    if (penyebabVal !== "semua" && titik.penyebab !== penyebabVal) {
      showMarker = false;
    }

    // Filter berdasarkan jumlah kejadian
    if (kejadianVal !== "semua") {
      if (kejadianVal === ">10" && titik.kejadian <= 10) {
        showMarker = false;
      } else if (kejadianVal === "<=10" && titik.kejadian > 10) {
        showMarker = false;
      }
    }

    if (showMarker) {
      const marker = createMarker(titik);
      markers.addLayer(marker);
    }
  });
}

// --- Legenda Kustom ---
// Variable untuk menyimpan status legenda
let legendIsOpen = false;

// Custom Legenda Control - Ditambahkan di topright setelah layer control
const legendControl = L.control({ position: "topright" });
legendControl.onAdd = (map) => {
  const div = L.DomUtil.create("div", "leaflet-control leaflet-bar custom-map-control legend-control");
  div.innerHTML = '<a href="#" title="Legenda" role="button" id="legend-button">🛈 Legenda</a>';

  div.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleLegend();
    return false;
  };

  L.DomEvent.disableClickPropagation(div);
  return div;
};
legendControl.addTo(map);

// Legend toggle function dengan visual feedback
function toggleLegend() {
  const legend = document.getElementById("legend");
  const legendButton = document.getElementById("legend-button");

  if (legend && legendButton) {
    if (legendIsOpen) {
      // Tutup legenda
      legend.classList.add("hidden");
      legendButton.style.backgroundColor = "#0a9396";
      legendButton.style.boxShadow = "0 1px 5px rgba(0,0,0,0.65)";
      legendIsOpen = false;
    } else {
      // Buka legenda
      legend.classList.remove("hidden");
      legendButton.style.backgroundColor = "#005f73";
      legendButton.style.boxShadow = "inset 0 1px 3px rgba(0,0,0,0.3)";
      legendIsOpen = true;
    }
  }
}

// Tutup legenda ketika klik di area lain peta
map.on("click", () => {
  if (legendIsOpen) {
    toggleLegend();
  }
});

// Prevent map click when clicking on legend
document.addEventListener("DOMContentLoaded", () => {
  const legend = document.getElementById("legend");
  if (legend) {
    legend.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }
});

// --- Pemuatan Data GeoJSON (Jalan dan Batas Administrasi) ---
// Gunakan Promise.all untuk memuat semua GeoJSON secara bersamaan dan tunggu sampai selesai
Promise.all([
    fetch("jalan.geojson").then(res => res.json()),
    fetch("batas_administrasi.geojson").then(res => res.json())
])
.then(([dataJalan, dataBatas]) => {
    // Layer Jaringan Jalan
    const jalanLayer = L.geoJSON(dataJalan, {
        style: {
            color: "#ff7800",
            weight: 2,
        },
        onEachFeature: function (feature, layer) {
            const namaJalan = feature.properties.nama || "Jalan";
            layer.bindPopup(`<strong>Nama Jalan:</strong> ${namaJalan}`);
        },
    }).addTo(map); // Tambahkan langsung ke peta agar terlihat saat dimuat

    // Layer Batas Administrasi
    const batasLayer = L.geoJSON(dataBatas, {
        style: {
            color: "black", // Hitam
            weight: 2,
            opacity: 1,
            dashArray: '3,3,20,3,20,3,20,3,20,3,20',
            lineJoin: 'round',
            fillOpacity: 0.1, // Pastikan ada fillOpacity jika itu poligon
        },
        onEachFeature: function (feature, layer) {
            const namaWilayah = feature.properties.kecamatan || feature.properties.nama || "Wilayah";
            layer.bindPopup(`<strong>Kecamatan:</strong> ${namaWilayah}`);
        },
    }).addTo(map); // Tambahkan langsung ke peta agar terlihat saat dimuat

    // Tambahkan layer GeoJSON ke overlayMaps
    overlayMaps["Jaringan Jalan"] = jalanLayer;
    overlayMaps["Batas Administrasi"] = batasLayer;

    // Tambahkan layer control setelah semua base dan overlay maps siap
    // Hapus L.control.layers sebelumnya jika ada untuk menghindari duplikasi
    if (map.hasControl(map.layersControl)) { // Cek apakah control layer sudah ada
        map.removeControl(map.layersControl); // Hapus yang lama
    }
    L.control.layers(baseMaps, overlayMaps).addTo(map);
})
.catch(error => {
    console.error("Gagal memuat atau memproses data GeoJSON:", error);
});


// --- Lain-lain ---
// Smooth scrolling untuk navigasi (asumsi ini untuk elemen di luar peta)
document.querySelectorAll('.navbar a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });
});

// Event listener untuk fullscreen
map.on("enterFullscreen", () => {
  console.log("Entered fullscreen mode");
});

map.on("exitFullscreen", () => {
  console.log("Exited fullscreen mode");
});