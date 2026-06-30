let satuanSuhuSekarang = "C"; 
let kotaSekarang = "Jakarta"; 
let listFavorit = [];

function dapatkanKondisiCuaca(code) {
  if (code === 0) return "Cerah";
  if (code === 1 || code === 2 || code === 3) return "Berawan";
  if (code === 45 || code === 48) return "Berkabut";
  if (code >= 51 && code <= 57) return "Gerimis";
  if (code >= 61 && code <= 65) return "Hujan";
  if (code >= 95) return "Badai Petir";
  return "Normal";
}

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

function ubahSatuan(satuan) {
  satuanSuhuSekarang = satuan;
  ambilDataCuacaDariInternet(kotaSekarang);
}

function cariCuaca() {
  let kotaInput = document.getElementById("inputKota").value;
  if (kotaInput.trim() === "") {
    document.getElementById("pesanError").innerText = "Input tidak boleh kosong!";
    return;
  }
  kotaSekarang = kotaInput;
  ambilDataCuacaDariInternet(kotaInput);
}

async function ambilDataCuacaDariInternet(namaKota) {
  let loader = document.getElementById("loadingState");
  let errorBox = document.getElementById("pesanError");
  let cuacaBox = document.getElementById("tampilanCuaca");

  loader.style.display = "block";
  errorBox.innerText = "";
  cuacaBox.style.display = "none";

  try {
    let responGeo = await fetch(
      "https://geocoding-api.open-meteo.com/v1/search?name=" + namaKota + "&count=1&language=id&format=json"
    );
    let dataGeo = await responGeo.json();

    if (!dataGeo.results) {
      errorBox.innerText = "Kota '" + namaKota + "' tidak ditemukan!";
      loader.style.display = "none";
      return;
    }

    let lat = dataGeo.results[0].latitude;
    let lon = dataGeo.results[0].longitude;
    let negara = dataGeo.results[0].country || "Tidak diketahui";
    kotaSekarang = dataGeo.results[0].name; 

    let urlCuaca = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon + "&current_weather=true&hourly=relative_humidity_2m,apparent_temperature,pressure_msl,visibility&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto";
    
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
    
    // Data Detail Wajib
    document.getElementById("feelsLike").innerText = dataCuaca.hourly.apparent_temperature[0] + "°" + satuanSuhuSekarang;
    document.getElementById("humidity").innerText = dataCuaca.hourly.relative_humidity_2m[0];
    document.getElementById("windSpeed").innerText = info.windspeed;
    document.getElementById("pressure").innerText = dataCuaca.hourly.pressure_msl[0];
    document.getElementById("visibility").innerText = dataCuaca.hourly.visibility[0];

    document.getElementById("minTemp").innerText = dataCuaca.daily.temperature_2m_min[0] + "°" + satuanSuhuSekarang;
    document.getElementById("maxTemp").innerText = dataCuaca.daily.temperature_2m_max[0] + "°" + satuanSuhuSekarang;
    document.getElementById("sunrise").innerText = dataCuaca.daily.sunrise[0].split("T")[1];
    document.getElementById("sunset").innerText = dataCuaca.daily.sunset[0].split("T")[1];

    cuacaBox.style.display = "block";
    loader.style.display = "none";

  } catch (error) {
    errorBox.innerText = "Gagal mengambil data dari internet!";
    loader.style.display = "none";
  }
}

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