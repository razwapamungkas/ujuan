let satuanSuhuSekarang = "C"; 
let kotaSekarang = "Jakarta"; 
let listFavorit = [];
let petaObjek = null; 
let penandaPeta = null; 
let chartObjek = null; // Penampung objek grafik Chart.js

// --- FUNGSI MENGATUR PETA AUTOMATIS ---
function updatePeta(lat, lon) {
  if (petaObjek === null) {
    petaObjek = L.map('map').setView([lat, lon], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(petaObjek);
    penandaPeta = L.marker([lat, lon]).addTo(petaObjek);
  } else {
    petaObjek.setView([lat, lon], 10);
    penandaPeta.setLatLng([lat, lon]);
  }
}

// --- FUNGSI UPDATE GRAFIK (SEPERTI NETLIFY) ---
function updateGrafik(jamLabels, dataSuhu) {
  let ctx = document.getElementById('grafikCuaca').getContext('2d');
  
  // Jika grafik sudah ada sebelumnya, hapus dulu agar tidak tumpang tindih
  if (chartObjek !== null) {
    chartObjek.destroy();
  }

  chartObjek = new Chart(ctx, {
    type: 'line',
    data: {
      labels: jamLabels,
      datasets: [{
        label: 'Suhu Per Jam (°' + satuanSuhuSekarang + ')',
        data: dataSuhu,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: false
        }
      }
    }
  });
}

// --- FUNGSI TERJEMAHAN KODE CUACA ---
function dapatkanKondisiCuaca(code) {
  if (code === 0) return "Cerah";
  if (code === 1 || code === 2 || code === 3) return "Berawan";
  if (code === 45 || code === 48) return "Berkabut";
  if (code >= 51 && code <= 57) return "Gerimis";
  if (code >= 61 && code <= 65) return "Hujan";
  if (code >= 95) return "Badai Petir";
  return "Normal";
}

// --- FUNGSI GANTI TEMA ---
function gantiTema() {
  let bodi = document.getElementById("bodiAplikasi");
  if (bodi.className === "light-theme") {
    bodi.className = "dark-theme";
    localStorage.setItem("tema", "dark");
  } else {
    bodi.className = "light-theme";
    localStorage.setItem("tema", "light");
  }
}

// --- FUNGSI UBAH SATUAN SUHU ---
function ubahSatuan(satuan) {
  satuanSuhuSekarang = satuan;
  ambilDataCuacaDariInternet(kotaSekarang);
}

// --- FUNGSI CARI KOTA VIA INPUT ---
function cariCuaca() {
  let kotaInput = document.getElementById("inputKota").value;
  if (kotaInput.trim() === "") {
    document.getElementById("pesanError").innerText = "Input tidak boleh kosong!";
    return;
  }
  kotaSekarang = kotaInput;
  ambilDataCuacaDariInternet(kotaInput);
}

// --- FUNGSI UTAMA: AMBIL DATA DARI INTERNET ---
async function ambilDataCuacaDariInternet(namaKota) {
  let loader = document.getElementById("loadingState");
  let errorBox = document.getElementById("pesanError");
  let cuacaBox = document.getElementById("tampilanCuaca");

  loader.style.display = "block";
  errorBox.innerText = "";
  cuacaBox.style.display = "none";

  try {
    let lat, lon, negara;

    if (namaKota.includes("&longitude=")) {
      let bagian = namaKota.split("&longitude=");
      lat = bagian[0];
      lon = bagian[1];
      negara = "Lokasi GPS Anda";
    } else {
      let responGeo = await fetch(
        "https://geocoding-api.open-meteo.com/v1/search?name=" + namaKota + "&count=1&language=id&format=json"
      );
      let dataGeo = await responGeo.json();

      if (!dataGeo.results) {
        errorBox.innerText = "Kota '" + namaKota + "' tidak ditemukan!";
        loader.style.display = "none";
        return;
      }

      lat = dataGeo.results[0].latitude;
      lon = dataGeo.results[0].longitude;
      negara = dataGeo.results[0].country || "Tidak diketahui";
      kotaSekarang = dataGeo.results[0].name; 
    }

    updatePeta(lat, lon);

    let urlCuaca = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon + "&current_weather=true&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,pressure_msl,visibility&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto";
    
    if (satuanSuhuSekarang === "F") {
      urlCuaca = urlCuaca + "&temperature_unit=fahrenheit";
    }

    let responCuaca = await fetch(urlCuaca);
    let dataCuaca = await responCuaca.json();
    
    let info = dataCuaca.current_weather;
    let teksKondisi = dapatkanKondisiCuaca(info.weathercode);

    document.getElementById("namaKotaNegara").innerText = kotaSekarang + ", " + negara;
    document.getElementById("angkaSuhu").innerText = info.temperature + "°" + satuanSuhuSekarang;
    document.getElementById("kondisiCuaca").innerText = teksKondisi;
    
    document.getElementById("feelsLike").innerText = dataCuaca.hourly.apparent_temperature[0] + "°" + satuanSuhuSekarang;
    document.getElementById("humidity").innerText = dataCuaca.hourly.relative_humidity_2m[0];
    document.getElementById("windSpeed").innerText = info.windspeed;
    document.getElementById("pressure").innerText = dataCuaca.hourly.pressure_msl[0];
    document.getElementById("visibility").innerText = dataCuaca.hourly.visibility[0];

    document.getElementById("minTemp").innerText = dataCuaca.daily.temperature_2m_min[0] + "°" + satuanSuhuSekarang;
    document.getElementById("maxTemp").innerText = dataCuaca.daily.temperature_2m_max[0] + "°" + satuanSuhuSekarang;
    document.getElementById("sunrise").innerText = dataCuaca.daily.sunrise[0].split("T")[1];
    document.getElementById("sunset").innerText = dataCuaca.daily.sunset[0].split("T")[1];

    // MEMPROSES DATA UNTUK GRAFIK (Ambil 24 Jam Pertama)
    let listJam = dataCuaca.hourly.time.slice(0, 24).map(t => t.split("T")[1]); 
    let listSuhu = dataCuaca.hourly.temperature_2m.slice(0, 24);
    
    // Panggil fungsi pembuat grafik
    updateGrafik(listJam, listSuhu);

    cuacaBox.style.display = "block";
    loader.style.display = "none";

  } catch (error) {
    errorBox.innerText = "Gagal mengambil data dari internet!";
    loader.style.display = "none";
  }
}

// --- FUNGSI AMBIL LOKASI VIA GPS ---
function ambilLokasiSaya() {
  let errorBox = document.getElementById("pesanError");
  errorBox.innerText = "";

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function (posisi) {
        let lat = posisi.coords.latitude;
        let lon = posisi.coords.longitude;
        
        kotaSekarang = "Lokasi Saya (" + lat.toFixed(2) + ", " + lon.toFixed(2) + ")";
        ambilDataCuacaDariInternet(lat + "&longitude=" + lon); 
        
        setTimeout(() => {
          document.getElementById("namaKotaNegara").innerText = "Lokasi Anda Saat Ini";
        }, 1000);
      },
      function () {
        errorBox.innerText = "Gagal memperoleh lokasi. Izinkan akses lokasi!";
      }
    );
  } else {
    errorBox.innerText = "Browser Anda tidak mendukung lokasi.";
  }
}

// --- KOTA FAVORIT ---
function tambahKeFavorit() {
  if (kotaSekarang.includes("Lokasi Saya")) return;

  if (!listFavorit.includes(kotaSekarang)) {
    listFavorit.push(kotaSekarang);
    localStorage.setItem("kotaFavorit", JSON.stringify(listFavorit));
    tampilkanDaftarFavoritHtml();
  }
}

function hapusFavorit(index) {
  listFavorit.splice(index, 1);
  localStorage.setItem("kotaFavorit", JSON.stringify(listFavorit));
  tampilkanDaftarFavoritHtml();
}

function tampilkanDaftarFavoritHtml() {
  let wadahUl = document.getElementById("daftarFavorit");
  wadahUl.innerHTML = ""; 

  for (let i = 0; i < listFavorit.length; i++) {
    let namaKota = listFavorit[i];
    wadahUl.innerHTML += 
      "<li>" +
        "<span style='cursor:pointer; color:blue;' onclick='pilihKotaFavorit(\"" + namaKota + "\")'>" + namaKota + "</span>" +
        " <button onclick='hapusFavorit(" + i + ")'>Hapus</button>" +
      "</li>";
  }
}

function pilihKotaFavorit(namaKota) {
  kotaSekarang = namaKota;
  ambilDataCuacaDariInternet(namaKota);
}

window.onload = function () {
  let temaDisimpan = localStorage.getItem("tema");
  if (temaDisimpan === "dark") {
    document.getElementById("bodiAplikasi").className = "dark-theme";
  }

  let favoritDisimpan = localStorage.getItem("kotaFavorit");
  if (favoritDisimpan) {
    listFavorit = JSON.parse(favoritDisimpan);
    tampilkanDaftarFavoritHtml();
  }

  ambilDataCuacaDariInternet(kotaSekarang);
};
