// map.js
// Ini adalah skrip khusus untuk halaman peta (peta.html).
// Semua kode Leaflet dan fungsionalitas peta ada di sini.

// Import Leaflet library
const L = window.L;

// Tunggu sampai semua elemen DOM selesai dimuat sebelum menjalankan skrip peta
document.addEventListener("DOMContentLoaded", () => {
    // Pastikan Leaflet library sudah dimuat
    if (typeof L === "undefined") {
        console.error("Error: Leaflet library tidak ditemukan. Pastikan leaflet.js dimuat di <head> atau sebelum map.js.");
        return;
    }

    // Pastikan element mapid ada di HTML
    const mapElement = document.getElementById("mapid");
    if (!mapElement) {
        console.error('Error: Element dengan ID "mapid" tidak ditemukan di HTML. Peta tidak dapat diinisialisasi.');
        return;
    }

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
        OpenStreetMap: openStreetMap,
        "Google Streets": googleStreets,
        Humanitarian: humanitarian,
        "Esri Satelit": esriSat,
    };

    // Objek untuk menyimpan Overlay Layers (akan diisi setelah data GeoJSON dimuat)
    const overlayMaps = {};

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
        L.DomEvent.disableClickPropagation(div); // Mencegah event klik menyebar ke peta
        return div;
    };
    homeBtn.addTo(map);

    // Tombol Fullscreen (membutuhkan plugin L.Control.Fullscreen)
    if (typeof L.Control.Fullscreen !== "undefined") {
        map.addControl(
            new L.Control.Fullscreen({
                title: {
                    false: "Masuk Mode Layar Penuh",
                    true: "Keluar dari Mode Layar Penuh",
                },
            }),
        );
    } else {
        console.warn("Peringatan: Plugin Leaflet Fullscreen tidak ditemukan. Pastikan Control.FullScreen.js dimuat.");
    }

    // Tombol Lokasi Saya (membutuhkan plugin L.control.locate)
    if (typeof L.control.locate !== "undefined") {
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
    } else {
        console.warn("Peringatan: Plugin Leaflet Locate Control tidak ditemukan. Pastikan L.Control.Locate.min.js dimuat.");
    }

    // --- Data Titik Kecelakaan dan Marker Cluster ---
    const titikKecelakaan = [
        { nama: "Jl. Raya Soreang - Banjaran", koordinat: [-7.0409287978562, 107.55262910875169], bobot: 3, penyebab: "Persimpangan ramai & jalan sempit", kecamatan: "Cangkuang", },
        { nama: "Jl. Raya Banjaran - Pangalengan", koordinat: [-7.130980463375122, 107.56083544602261], bobot: 5, penyebab: "Tanjakan curam & tikungan tajam", kecamatan: "Banjaran", },
        { nama: "Jl. Raya Majalaya - Ibun", koordinat: [-7.0537890408756505, 107.76300080971937], bobot: 4, penyebab: "Jalur industri padat & banyak truk", kecamatan: "Ibun", },
        { nama: "Jl. Raya Cicalengka - Nagreg", koordinat: [-7.020775507193189, 107.89015473350929], bobot: 3, penyebab: "Lalu lintas padat", kecamatan: "Nagreg",},
        { nama: "Jl. Raya Ciwidey - Rancabali", koordinat: [-7.127605676458165, 107.41957127066765], bobot: 2, penyebab: "Cuaca berkabut & jalan menurun", kecamatan: "Rancabali",}, // BOBOT DIUBAH MENJADI 2
        { nama: "Jl. Raya Bojongsoang", koordinat: [-6.983121814733036, 107.63243056074263], bobot: 3, penyebab: "Jalur alternatif padat & jalan sempit", kecamatan: "Bojongsoang",},
        { nama: "Jl. Raya Ciparay - Kertasari", koordinat: [-7.146380261809228, 107.69560056119639], bobot: 5, penyebab: "Jalan pegunungan & tikungan tajam", kecamatan: "Kertasari",},
        { nama: "Jl. Raya Cileunyi - Cikancung", koordinat: [-6.940258976622536, 107.74841086405151], bobot: 4, penyebab: "Persimpangan ramai & kecepatan tinggi", kecamatan: "Cileunyi",},
        { nama: "Jl. Raya Baleendah - Arjasari", koordinat: [-7.007933898128648, 107.6224394613756], bobot: 3, penyebab: "Jalan rusak", kecamatan: "Baleendah",},
        { nama: "Jl. Raya Dayeuhkolot - Baleendah", koordinat: [-6.9880705418620295, 107.62642492303632], bobot: 4, penyebab: "Lalu lintas padat & daerah rawan banjir", kecamatan: "Dayeuhkolot",},
        { nama: "Jl. Nagreg - Limbangan", koordinat: [-7.036418096295801, 107.9301283451837], bobot: 5, penyebab: "Tanjakan dan turunan curam", kecamatan: "Nagreg",},
    ];

    let markers;
    if (typeof L.markerClusterGroup !== "undefined") {
        markers = L.markerClusterGroup({
            chunkedLoading: true,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
        });
    } else {
        console.warn(
            "Peringatan: Plugin Leaflet MarkerCluster tidak ditemukan. Marker akan ditambahkan sebagai layer biasa.",
        );
        markers = L.layerGroup(); // Fallback jika MarkerCluster tidak tersedia
    }

    const penyebabSet = new Set();
    const kecamatanSet = new Set();

    // Fungsi untuk membuat marker
    function createMarker(titik) {
        penyebabSet.add(titik.penyebab);
        kecamatanSet.add(titik.kecamatan);

        let iconColor, tingkatBahayaLabel;
        const bobot = parseInt(titik.bobot);

        // Menentukan warna ikon dan label tingkat bahaya berdasarkan bobot
        // Asumsi: Bobot 5 (Sangat Tinggi), Bobot 4 (Tinggi), Bobot 3 (Sedang), Bobot 2 (Rendah)
        if (bobot === 5) {
            iconColor = "#e60000"; // Merah untuk Sangat Tinggi
            tingkatBahayaLabel = "Sangat Tinggi (Bobot 5)";
        } else if (bobot === 4) {
            iconColor = "#ff8c00"; // Oranye untuk Tinggi
            tingkatBahayaLabel = "Tinggi (Bobot 4)";
        } else if (bobot === 3) {
            iconColor = "#ffd700"; // Kuning untuk Sedang (Bobot 3)
            tingkatBahayaLabel = "Sedang (Bobot 3)";
        } else if (bobot === 2) {
            iconColor = "#00FF00"; // Hijau untuk Rendah (Bobot 2)
            tingkatBahayaLabel = "Rendah (Bobot 2)";
        } else {
            iconColor = "#808080"; // Abu-abu untuk bobot tidak valid
            tingkatBahayaLabel = "Tidak Diketahui";
        }

        // Membuat ikon kustom dengan warna yang sesuai
        const accidentIcon = L.divIcon({
            className: 'custom-accident-icon',
            html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${iconColor}" stroke="white" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="feather feather-alert-triangle">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>`,
            iconSize: [24, 24], // Ukuran ikon
            iconAnchor: [12, 24], // Titik jangkar ikon (pusat bawah)
            popupAnchor: [0, -20] // Titik jangkar popup relatif terhadap ikon
        });

        const marker = L.marker(titik.koordinat, { icon: accidentIcon }).bindPopup(`
                <div style="font-family: Arial, sans-serif; max-width: 300px;">
                  <h4 style="margin: 0 0 10px 0; color: #005f73; font-size: 14px;">${titik.nama}</h4>
                  <p style="margin: 5px 0; font-size: 12px;"><strong>📍 Kecamatan:</strong> ${titik.kecamatan}</p>
                  <p style="margin: 5px 0; font-size: 12px;"><strong>⚠️ Penyebab Utama:</strong> ${titik.penyebab}</p>
                  <p style="margin: 5px 0; font-size: 12px;"><strong>🔴 Tingkat Bahaya:</strong> ${tingkatBahayaLabel}</p>
                  <p style="margin: 5px 0; font-size: 12px;"><strong>⚖️ Bobot Penyebab:</strong> ${titik.bobot}</p>
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

    loadMarkers();
    overlayMaps["Titik Kecelakaan"] = markers;

    function fitToMarkers() {
        if (markers.getLayers && markers.getLayers().length > 0) {
            const group = new L.featureGroup(markers.getLayers());
            map.fitBounds(group.getBounds().pad(0.1));
        }
    }

    setTimeout(() => {
        fitToMarkers();
    }, 500);

    // --- Filter Marker ---
    function populateFilters() {
        const filterPenyebab = document.getElementById("filterPenyebab");
        const filterBobot = document.getElementById("filterBobot"); // Change to filterBobot

        if (filterPenyebab) {
            filterPenyebab.innerHTML =
                `<option value="semua">Semua Penyebab</option>` +
                [...penyebabSet].map((p) => `<option value="${p}">${p}</option>`).join("");
        }

        // Update filter Bobot
        if (filterBobot) {
            filterBobot.innerHTML = `
                <option value="semua">Semua</option>
                <option value="5">Sangat Tinggi (Bobot 5)</option>
                <option value="4">Tinggi (Bobot 4)</option>
                <option value="3">Sedang (Bobot 3)</option>
                <option value="2">Rendah (Bobot 2)</option>
            `;
        }
    }

    populateFilters();

    function applyFilter() {
        const filterPenyebab = document.getElementById("filterPenyebab");
        const filterBobot = document.getElementById("filterBobot"); // Get filterBobot

        if (!filterPenyebab || !filterBobot) { // Check both filters
            console.error("Filter dropdowns tidak ditemukan.");
            return;
        }

        const penyebabVal = filterPenyebab.value;
        const bobotVal = filterBobot.value; // Get bobot value

        markers.clearLayers();

        titikKecelakaan.forEach((titik) => {
            let showMarker = true;

            if (penyebabVal !== "semua" && titik.penyebab !== penyebabVal) {
                showMarker = false;
            }

            // Apply bobot filter
            if (bobotVal !== "semua") {
                const bobot = parseInt(titik.bobot);
                if (bobotVal === "5" && bobot !== 5) {
                    showMarker = false;
                } else if (bobotVal === "4" && bobot !== 4) {
                    showMarker = false;
                } else if (bobotVal === "3" && bobot !== 3) { // Ensure exact match for Bobot 3
                    showMarker = false;
                } else if (bobotVal === "2" && bobot !== 2) { // Ensure exact match for Bobot 2
                    showMarker = false;
                }
            }

            if (showMarker) {
                const marker = createMarker(titik);
                markers.addLayer(marker);
            }
        });
    }

    const filterPenyebab = document.getElementById("filterPenyebab");
    const filterBobotDropdown = document.getElementById("filterBobot"); // Rename to filterBobotDropdown

    if (filterPenyebab) {
        filterPenyebab.addEventListener("change", applyFilter);
    }
    if (filterBobotDropdown) { // Add event listener for filterBobotDropdown
        filterBobotDropdown.addEventListener("change", applyFilter);
    }

    // --- Legenda Kustom ---
    let legendIsOpen = false;

    const legendControl = L.control({ position: "topright" });
    legendControl.onAdd = () => {
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

    function toggleLegend() {
        const legend = document.getElementById("legend-container");
        const legendButton = document.getElementById("legend-button");

        if (legend && legendButton) {
            if (legendIsOpen) {
                legend.classList.add("hidden");
                legendButton.style.backgroundColor = "#0a9396";
                legendButton.style.boxShadow = "0 1px 5px rgba(0,0,0,0.65)";
                legendIsOpen = false;
            } else {
                legend.classList.remove("hidden");
                legendButton.style.backgroundColor = "#005f73";
                legendButton.style.boxShadow = "inset 0 1px 3px rgba(0,0,0,0.3)";
                legendIsOpen = true;
            }
        }
    }

    map.on("click", () => {
        if (legendIsOpen) {
            toggleLegend();
        }
    });

    const legendContainer = document.getElementById("legend-container");
    if (legendContainer) {
        legendContainer.addEventListener("click", (e) => {
            e.stopPropagation();
        });
    }

    // --- Pemuatan Data GeoJSON (Jalan dan Batas Administrasi) ---
    // GANTI PATH UNTUK DATA JALAN KE tiga_jalan.geojson
    Promise.all([
        fetch("asset/data-spasial/tiga_jalan.geojson").then((res) => { // <--- PERUBAHAN DI SINI
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status} for asset/data-spasial/tiga_jalan.geojson`);
            return res.json();
        }),
        fetch("asset/data-spasial/batas_administrasi.geojson").then((res) => {
            if (!res.ok)
                throw new Error(`HTTP error! status: ${res.status} for asset/data-spasial/batas_administrasi.geojson`);
            return res.json();
        }),
    ])
    .then(([dataJalan, dataBatas]) => {
        console.log("GeoJSON Jalan (tiga_jalan.geojson) berhasil dimuat."); // <-- LOG DISESUAIKAN
        console.log("GeoJSON Batas Administrasi berhasil dimuat.");

        // Debug: Log struktur data jalan
        console.log("Struktur data jalan:", dataJalan);
        if (dataJalan.features && dataJalan.features.length > 0) {
            console.log("Jumlah fitur jalan:", dataJalan.features.length);
            console.log("Contoh feature jalan pertama:", dataJalan.features[0]);
            console.log("Properties jalan pertama:", dataJalan.features[0].properties);
            const propertyNames = Object.keys(dataJalan.features[0].properties);
            console.log("Property names yang tersedia di data jalan:", propertyNames);

            // Test identifyRoadType for the first feature
            const firstRoadType = identifyRoadType(dataJalan.features[0]);
            console.log("Tipe jalan dari feature pertama:", firstRoadType);
            if (!firstRoadType) {
                console.warn("Peringatan: Tipe jalan untuk feature pertama tidak teridentifikasi. Pastikan properti fungsi jalan ada dan sesuai.");
                console.log("Coba periksa kembali nilai properti di GeoJSON Anda (misalnya 'FUNGSI', 'STATUS_JALAN', 'KELAS_JALAN', 'KLLRJL', 'FCODE').");
            }

        } else {
            console.warn("GeoJSON Jalan dimuat, tetapi tidak ada fitur jalan yang ditemukan (features array kosong atau tidak ada).");
        }


        // 1. Definisi warna dan ketebalan untuk setiap jenis jalan
        const jalanStyles = {
            arteri: { color: "#FF00FF", weight: 4, opacity: 0.8 }, // Ungu/Magenta, tebal
            kolektor: { color: "#FF8C00", weight: 3, opacity: 0.8 }, // Oranye, sedang
            lokal: { color: "#FF6347", weight: 2, opacity: 0.7 }, // Merah-oranye, tipis
            default: { color: "#000000", weight: 1, opacity: 0.5 } // Gaya default jika tidak teridentifikasi
        };

        // Fungsi untuk mengidentifikasi jenis jalan
        function identifyRoadType(feature) {
            // Sesuaikan properti ini berdasarkan GeoJSON Anda.
            // Dari metadata SHP sebelumnya, 'KLLRJL', 'KLSRJL', atau 'FCODE' mungkin relevan.
            // PENTING: Cek isi actual dari tiga_jalan.geojson untuk nilai properti yang digunakan untuk klasifikasi
            const possibleFunctionProps = [
                "KLLRJL", "KLSRJL", "FCODE", // Properti dari SHP metadata
                "FUNGSI", "STATUS_JALAN", "KELAS_JALAN", "TIPE_JALAN", "JENIS", "TYPE", "CLASS",
                // Tambahkan versi lowercase jika data mungkin menggunakan huruf kecil
                "fungsi", "status_jalan", "kelas_jalan", "tipe_jalan", "jenis", "type", "class",
            ];

            let fungsiJalan = null;

            for (const prop of possibleFunctionProps) {
                if (feature.properties && feature.properties[prop]) {
                    fungsiJalan = feature.properties[prop];
                    break;
                }
            }

            if (!fungsiJalan) {
                console.warn("Feature tanpa properti fungsi jalan yang teridentifikasi:", feature.properties);
                return null;
            }

            const normalizedName = fungsiJalan.toString().toLowerCase().trim();

            // LOGIKA KLASIFIKASI JALAN (SESUAIKAN DENGAN NILAI AKTUAL DI TIGA_JALAN.GEOJSON ANDA)
            // Berdasarkan metadata SHP, nilai untuk FCODE seperti 'CA02060360' (Arteri)
            // Jika tiga_jalan.geojson punya nilai FCODE seperti itu, kita bisa pakai.
            // Jika punya properti KLLRJL/KLSRJL dengan nilai 'AR', 'KO', 'LO', kita pakai itu.
            // Asumsi sementara untuk tiga_jalan.geojson:
            // Arteri: mengandung "arteri" atau "ar" atau FCODE yang spesifik
            // Kolektor: mengandung "kolektor" atau "ko"
            // Lokal: mengandung "lokal" atau "lo"

            // Contoh:
            if (normalizedName.includes("arteri") || normalizedName.includes("ar") || normalizedName.includes("ca02060360")) {
                return "arteri";
            } else if (normalizedName.includes("kolektor") || normalizedName.includes("ko") || normalizedName.includes("cb02060360")) { // Contoh FCODE untuk kolektor
                return "kolektor";
            } else if (normalizedName.includes("lokal") || normalizedName.includes("lo") || normalizedName.includes("cc02060360")) { // Contoh FCODE untuk lokal
                return "lokal";
            } else {
                console.log("Jenis jalan tidak dikenali (akan diberi gaya default):", fungsiJalan, "(normalized:", normalizedName, ")");
            }

            return null; // Tidak termasuk dalam kategori yang diinginkan
        }

        // Fungsi untuk menambahkan popup ke jalan
        function bindJalanPopup(feature, layer) {
            // Coba berbagai nama properti untuk nama jalan
            // 'NAMOBJ' adalah properti yang terlihat di metadata SHP
            const namaJalan =
                feature.properties.NAMOBJ ||
                feature.properties.NAMA_JALAN ||
                feature.properties.nama ||
                feature.properties.NAME ||
                feature.properties.name ||
                "Jalan Tidak Diketahui";

            // Coba berbagai nama properti untuk fungsi jalan
            const fungsiJalan =
                feature.properties.KLLRJL || // Properti dari SHP metadata
                feature.properties.KLSRJL || // Properti dari SHP metadata
                feature.properties.FCODE ||  // Properti dari SHP metadata
                feature.properties.FUNGSI ||
                feature.properties.STATUS_JALAN ||
                feature.properties.KELAS_JALAN ||
                feature.properties.fungsi ||
                feature.properties.status_jalan ||
                "Tidak Diketahui";

            layer.bindPopup(`
                        <div style="font-family: Arial, sans-serif; max-width: 300px;">
                            <h4 style="margin: 0 0 10px 0; color: #005f73; font-size: 14px;">${namaJalan}</h4>
                            <p style="margin: 5px 0; font-size: 12px;"><strong>🛣️ Fungsi Jalan:</strong> ${fungsiJalan}</p>
                            <p style="margin: 5px 0; font-size: 12px;"><strong>📍 Lokasi:</strong> Kabupaten Bandung</p>
                        </div>
                    `);
        }

        // Buat layer terpisah untuk setiap jenis jalan
        const jalanArteriLayer = L.geoJSON(null, {
            style: jalanStyles.arteri,
            onEachFeature: bindJalanPopup,
        });

        const jalanKolektorLayer = L.geoJSON(null, {
            style: jalanStyles.kolektor,
            onEachFeature: bindJalanPopup,
        });

        const jalanLokalLayer = L.geoJSON(null, {
            style: jalanStyles.lokal,
            onEachFeature: bindJalanPopup,
        });

        const jalanLainnyaLayer = L.geoJSON(null, { // Layer untuk jalan yang tidak terklasifikasi
            style: jalanStyles.default,
            onEachFeature: bindJalanPopup,
        });

        // Variabel untuk menghitung statistik
        let arteriCount = 0,
            kolektorCount = 0,
            lokalCount = 0,
            otherCount = 0;

        // Pilah data jalan berdasarkan jenisnya
        if (dataJalan.features) {
            dataJalan.features.forEach((feature) => {
                const roadType = identifyRoadType(feature);

                if (roadType === "arteri") {
                    jalanArteriLayer.addData(feature);
                    arteriCount++;
                } else if (roadType === "kolektor") {
                    jalanKolektorLayer.addData(feature);
                    kolektorCount++;
                } else if (roadType === "lokal") {
                    jalanLokalLayer.addData(feature);
                    lokalCount++;
                } else {
                    jalanLainnyaLayer.addData(feature); // Tambahkan ke layer "Lainnya"
                    otherCount++;
                }
            });
        }


        // Tambahkan layer jalan ke peta (default semua aktif)
        // HANYA TAMBAHKAN JIKA ADA DATA
        if (arteriCount > 0) jalanArteriLayer.addTo(map);
        if (kolektorCount > 0) jalanKolektorLayer.addTo(map);
        if (lokalCount > 0) jalanLokalLayer.addTo(map);
        if (otherCount > 0) {
            jalanLainnyaLayer.addTo(map);
        }


        // Tambahkan layer jalan ke overlayMaps untuk kontrol layer
        if (arteriCount > 0) overlayMaps["🟣 Jalan Arteri"] = jalanArteriLayer;
        if (kolektorCount > 0) overlayMaps["🟠 Jalan Kolektor"] = jalanKolektorLayer;
        if (lokalCount > 0) overlayMaps["🔴 Jalan Lokal"] = jalanLokalLayer;
        if (otherCount > 0) {
            overlayMaps["⚫ Jalan Lainnya"] = jalanLainnyaLayer;
        }


        // Log statistik jalan
        console.log(`Statistik Jalan yang Ditampilkan:
                    - Jalan Arteri: ${arteriCount}
                    - Jalan Kolektor: ${kolektorCount}
                    - Jalan Lokal: ${lokalCount}
                    - Jalan Lainnya (dengan gaya default): ${otherCount}
                    - Total keseluruhan fitur jalan di GeoJSON: ${dataJalan.features ? dataJalan.features.length : 0}`);


        // 3. Data batas administrasi dengan warna poligon perkecamatan
        // Fungsi untuk menghasilkan warna berdasarkan nama kecamatan
        function getColorByKecamatan(kecamatan) {
            const colors = [
                "#F8F9D7", "#E6E2AF", "#DBCB8E", "#C9D8C5", "#A8C8A4", "#8FBDA9", "#D3E8E1", "#FFCBA4", "#FFD8B1", "#FFEFD5",
                "#F0E68C", "#EEE8AA", "#F0FFF0", "#E6E6FA", "#FFF0F5", "#F5F5DC", "#FAFAD2", "#FFFACD", "#FFEFD5", "#FFE4B5",
                "#FFE4C4", "#FFE4E1", "#FFF5EE", "#F5FFFA", "#F0FFFF", "#F0F8FF", "#F8F8FF", "#F5F5F5", "#FFF8DC", "#FFFAF0", "#FFFFF0",
            ];

            let hash = 0;
            if (!kecamatan) return colors[0];

            for (let i = 0; i < kecamatan.length; i++) {
                hash = kecamatan.charCodeAt(i) + ((hash << 5) - hash);
            }

            return colors[Math.abs(hash) % colors.length];
        }

        // Fungsi untuk menambahkan popup ke batas administrasi
        function bindBatasPopup(feature, layer) {
            const namaKecamatan =
                feature.properties.kecamatan ||
                feature.properties.nama ||
                feature.properties.NAME ||
                feature.properties.name ||
                "Kecamatan Tidak Diketahui";

            layer.bindPopup(`
                        <div style="font-family: Arial, sans-serif; max-width: 300px;">
                            <h4 style="margin: 0 0 10px 0; color: #005f73; font-size: 14px;">Kecamatan ${namaKecamatan}</h4>
                            <p style="margin: 5px 0; font-size: 12px;"><strong>🏛️ Kabupaten:</strong> Bandung</p>
                        </div>
                    `);
        }

        // Buat layer batas administrasi dengan warna berbeda untuk setiap kecamatan
        const batasLayer = L.geoJSON(dataBatas, {
            style: (feature) => {
                const kecamatan =
                    feature.properties.kecamatan ||
                    feature.properties.nama ||
                    feature.properties.NAME ||
                    feature.properties.name ||
                    "";

                return {
                    color: "black",
                    weight: 1.5,
                    opacity: 1,
                    fillColor: getColorByKecamatan(kecamatan),
                    fillOpacity: 0.6,
                    lineJoin: "round",
                };
            },
            onEachFeature: bindBatasPopup,
        }).addTo(map);

        // Tambahkan layer batas administrasi ke overlayMaps
        overlayMaps["🗺️ Batas Administrasi"] = batasLayer;

        // Tambahkan layer control setelah semua base dan overlay maps siap
        L.control.layers(baseMaps, overlayMaps).addTo(map);

        // Update konten legenda setelah data jalan dimuat dan diproses
        updateLegendForRoads(arteriCount, kolektorCount, lokalCount, otherCount);

        // Update statistik di UI jika ada
        updateStatistics(arteriCount, kolektorCount, lokalCount, arteriCount + kolektorCount + lokalCount + otherCount);
    })
    .catch((error) => {
        console.error("Gagal memuat atau memproses data GeoJSON:", error);

        let errorMessage = "Gagal memuat data geografis:\n";
        if (error.message.includes("tiga_jalan.geojson")) { // <-- PESAN ERROR DISESUAIKAN
            errorMessage += "- File tiga_jalan.geojson tidak ditemukan atau tidak dapat diakses\n";
            errorMessage += "- Pastikan file ada di folder: asset/data-spasial/tiga_jalan.geojson\n";
        }
        if (error.message.includes("batas_administrasi.geojson")) {
            errorMessage += "- File batas_administrasi.geojson tidak ditemukan\n";
        }
        errorMessage += "\nSilakan periksa:\n";
        errorMessage += "1. Path file GeoJSON (case-sensitive!)\n";
        errorMessage += "2. Jalankan melalui server lokal (misal: `live-server` atau Python `http.server`) untuk menghindari masalah CORS\n";
        errorMessage += "3. Console browser (F12) untuk detail error lebih lanjut.\n";
        errorMessage += "4. Validasi file GeoJSON Anda menggunakan tools online (geojson.io)\n";
        errorMessage += "5. Pastikan file tiga_jalan.geojson memiliki fitur (tidak kosong) dan properti yang sesuai untuk klasifikasi jalan (cek console.log setelah ini berjalan).";

        alert(errorMessage);
    });

    // --- Lain-lain ---
    map.on("enterFullscreen", () => {
        console.log("Entered fullscreen mode");
    });

    map.on("exitFullscreen", () => {
        console.log("Exited fullscreen mode");
    });

    // Fungsi untuk memperbarui konten legenda dengan keterangan jalan
    function updateLegendForRoads(arteriCount, kolektorCount, lokalCount, otherCount) {
        const legendContent = document.getElementById("legend-content");
        if (legendContent) {
            legendContent.innerHTML = `
                        <h4>🚨 Tingkat Bahaya Kecelakaan (berdasarkan Bobot)</h4>
                        <div class="legend-item">
                            <i style="background:#e60000; mask: url('data:image/svg+xml;utf8,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 24 24&quot; fill=&quot;black&quot; stroke=&quot;black&quot; stroke-width=&quot;1&quot;><path d=&quot;M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z&quot;></path><line x1=&quot;12&quot; y1=&quot;9&quot; x2=&quot;12&quot; y2=&quot;13&quot;></line><line x1=&quot;12&quot; y1=&quot;17&quot; x2=&quot;12.01&quot; y2=&quot;17&quot;></line></svg>') no-repeat center / contain; -webkit-mask: url('data:image/svg+xml;utf8,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 24 24&quot; fill=&quot;black&quot; stroke=&quot;black&quot; stroke-width=&quot;1&quot;><path d=&quot;M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z&quot;></path><line x1=&quot;12&quot; y1=&quot;9&quot; x2=&quot;12&quot; y2=&quot;13&quot;></line><line x1=&quot;12&quot; y1=&quot;17&quot; x2=&quot;12.01&quot; y2=&quot;17&quot;></line></svg>') no-repeat center / contain; width: 18px; height: 18px; display: inline-block; vertical-align: middle;"></i>
                            Sangat Tinggi (Bobot 5)
                        </div>
                        <div class="legend-item">
                            <i style="background:#ff8c00; mask: url('data:image/svg+xml;utf8,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 24 24&quot; fill=&quot;black&quot; stroke=&quot;black&quot; stroke-width=&quot;1&quot;><path d=&quot;M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z&quot;></path><line x1=&quot;12&quot; y1=&quot;9&quot; x2=&quot;12&quot; y2=&quot;13&quot;></line><line x1=&quot;12&quot; y1=&quot;17&quot; x2=&quot;12.01&quot; y2=&quot;17&quot;></line></svg>') no-repeat center / contain; -webkit-mask: url('data:image/svg+xml;utf8,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 24 24&quot; fill=&quot;black&quot; stroke=&quot;black&quot; stroke-width=&quot;1&quot;><path d=&quot;M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z&quot;></path><line x1=&quot;12&quot; y1=&quot;9&quot; x2=&quot;12&quot; y2=&quot;13&quot;></line><line x1=&quot;12&quot; y1=&quot;17&quot; x2=&quot;12.01&quot; y2=&quot;17&quot;></line></svg>') no-repeat center / contain; width: 18px; height: 18px; display: inline-block; vertical-align: middle;"></i>
                            Tinggi (Bobot 4)
                        </div>
                        <div class="legend-item">
                            <i style="background:#ffd700; mask: url('data:image/svg+xml;utf8,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 24 24&quot; fill=&quot;black&quot; stroke=&quot;black&quot; stroke-width=&quot;1&quot;><path d=&quot;M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z&quot;></path><line x1=&quot;12&quot; y1=&quot;9&quot; x2=&quot;12&quot; y2=&quot;13&quot;></line><line x1=&quot;12&quot; y1=&quot;17&quot; x2=&quot;12.01&quot; y2=&quot;17&quot;></line></svg>') no-repeat center / contain; -webkit-mask: url('data:image/svg+xml;utf8,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 24 24&quot; fill=&quot;black&quot; stroke=&quot;black&quot; stroke-width=&quot;1&quot;><path d=&quot;M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z&quot;></path><line x1=&quot;12&quot; y1=&quot;9&quot; x2=&quot;12&quot; y2=&quot;13&quot;></line><line x1=&quot;12&quot; y1=&quot;17&quot; x2=&quot;12.01&quot; y2=&quot;17&quot;></line></svg>') no-repeat center / contain; width: 18px; height: 18px; display: inline-block; vertical-align: middle;"></i>
                            Sedang (Bobot 3)
                        </div>
                        <div class="legend-item">
                            <i style="background:#00FF00; mask: url('data:image/svg+xml;utf8,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 24 24&quot; fill=&quot;black&quot; stroke=&quot;black&quot; stroke-width=&quot;1&quot;><path d=&quot;M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z&quot;></path><line x1=&quot;12&quot; y1=&quot;9&quot; x2=&quot;12&quot; y2=&quot;13&quot;></line><line x1=&quot;12&quot; y1=&quot;17&quot; x2=&quot;12.01&quot; y2=&quot;17&quot;></line></svg>') no-repeat center / contain; -webkit-mask: url('data:image/svg+xml;utf8,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 24 24&quot; fill=&quot;black&quot; stroke=&quot;black&quot; stroke-width=&quot;1&quot;><path d=&quot;M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z&quot;></path><line x1=&quot;12&quot; y1=&quot;9&quot; x2=&quot;12&quot; y2=&quot;13&quot;></line><line x1=&quot;12&quot; y1=&quot;17&quot; x2=&quot;12.01&quot; y2=&quot;17&quot;></line></svg>') no-repeat center / contain; width: 18px; height: 18px; display: inline-block; vertical-align: middle;"></i>
                            Rendah (Bobot 2)
                        </div>
                        <h4 style="margin-top: 15px;">🛣️ Jenis Jalan</h4>
                        ${arteriCount > 0 ? `
                        <div class="legend-item">
                            <i style="background:${jalanStyles.arteri.color}; height: 3px; width: 30px; border-radius: 2px;"></i>
                            Jalan Arteri (${arteriCount} ruas)
                        </div>` : ''}
                        ${kolektorCount > 0 ? `
                        <div class="legend-item">
                            <i style="background:${jalanStyles.kolektor.color}; height: 2px; width: 30px; border-radius: 2px;"></i>
                            Jalan Kolektor (${kolektorCount} ruas)
                        </div>` : ''}
                        ${lokalCount > 0 ? `
                        <div class="legend-item">
                            <i style="background:${jalanStyles.lokal.color}; height: 1px; width: 30px; border-radius: 2px;"></i>
                            Jalan Lokal (${lokalCount} ruas)
                        </div>` : ''}
                        ${otherCount > 0 ? `
                        <div class="legend-item">
                            <i style="background:#000000; height: 1px; width: 30px; border-radius: 2px;"></i>
                            Jalan Lainnya (${otherCount} ruas)
                        </div>` : ''}

                        <h4 style="margin-top: 15px;">🏙️ Batas Administrasi</h4>
                        <div class="legend-item">
                            <i style="background: linear-gradient(45deg, #F8F9D7, #E6E2AF, #DBCB8E, #C9D8C5, #A8C8A4); height: 15px; width: 30px; border: 1px solid black;"></i>
                            Kecamatan (31 wilayah)
                        </div>

                        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee; font-size: 0.8em; color: #666;">
                            💡 Tip: Gunakan panel kontrol layer untuk mengaktifkan/menonaktifkan setiap jenis data
                        </div>
                    `;
        }
    }

    // Fungsi untuk update statistik di UI
    function updateStatistics(arteri, kolektor, lokal, total) {
        const totalRoadsEl = document.getElementById("total-roads");
        if (totalRoadsEl) {
            totalRoadsEl.textContent = total;
        }

        console.log(`UI Statistics updated: Arteri: ${arteri}, Kolektor: ${kolektor}, Lokal: ${lokal}, Total: ${total}`);
    }
});