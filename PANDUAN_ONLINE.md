
# Panduan Membuat Dashboard Online (Sync Google Drive)

Aplikasi ini menggunakan teknologi **Serverless** dengan memanfaatkan Google Sheet Anda sebagai database gratis.

### Langkah 1: Buat Database
1. Buka [Google Sheets](https://sheets.google.com/create).
2. Beri nama file, misal: `DB_JNE_DASHBOARD`.

### Langkah 2: Pasang Mesin (Script)
1. Di Google Sheet, klik menu **Extensions** > **Apps Script**.
2. Hapus kode yang ada, ganti dengan kode di bawah ini:

```javascript
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  // Lock untuk mencegah tabrakan data saat banyak user akses bersamaan
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // READ DATA
    if (!e.postData || e.parameter.action === 'read') {
      var data = sheet.getRange("A1").getValue();
      if (!data || data === "") {
        return ContentService.createTextOutput(JSON.stringify({ 
          jobs: [], users: [], validationLogs: [] 
        })).setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(data).setMimeType(ContentService.MimeType.JSON);
    }

    // SAVE DATA
    var jsonString = e.postData.contents;
    sheet.getRange("A1").setValue(jsonString); // Simpan semua data di Sel A1
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
```

### Langkah 3: Deploy (PENTING!)
Agar Script bisa diakses oleh Aplikasi Dashboard:

1. Klik tombol **Deploy** (Biru, kanan atas) -> **New Deployment**.
2. Klik icon Roda Gigi (Select type) -> pilih **Web App**.
3. Konfigurasi Wajib:
   - **Execute as**: `Me` (Email Anda)
   - **Who has access**: `Anyone` (Siapa Saja) <--- JANGAN SALAH PILIH
4. Klik **Deploy**.
5. Berikan izin akses (Review Permissions -> Pilih Akun -> Advanced -> Go to ... (unsafe) -> Allow).
6. **Copy URL Web App** yang muncul (berakhiran `/exec`).

### Langkah 4: Koneksikan
1. Buka Dashboard JNE.
2. Klik tombol **Settings** di kanan atas (sebelah status koneksi).
3. Pilih **Google Apps Script**.
4. Paste URL tadi ke kolom yang tersedia.
5. Klik **Simpan**.

Status akan berubah menjadi **Hijau (Cloud Connected)**.
