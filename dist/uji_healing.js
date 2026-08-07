"use strict";
// File ini sengaja dibuat dengan kesalahan TypeScript untuk demonstrasi
// Mendefinisikan variabel bertipe number tetapi diisi nilai string
let umur = 20; // Diperbaiki: number assigned to number type
// Kesalahan TypeScript lain untuk demonstrasi - sekarang diperbaiki
const nama = "Budi"; // Diperbaiki: string assigned to string type
const tinggi = 170; // Diperbaiki: number assigned to number type (tinggi badan dalam cm)
// Berikut kesalahan yang lebih jelas - sekarang diperbaiki
let berat;
berat = 50; // Diperbaiki: number assigned to number type
// Fungsi dengan parameter bertipe number tetapi dipanggil dengan string
function hitungBMI(tinggi, berat) {
    // Mengkonversi tinggi dari cm ke meter untuk perhitungan BMI yang benar
    const tinggiMeter = tinggi / 100;
    return berat / (tinggiMeter * tinggiMeter);
}
// Memanggil fungsi dengan argumen number yang sesuai (diperbaiki)
const bmi = hitungBMI(170, 50); // tinggi 170 cm, berat 50 kg
// Menampilkan hasil BMI
console.log(`BMI: ${bmi.toFixed(2)}`);
