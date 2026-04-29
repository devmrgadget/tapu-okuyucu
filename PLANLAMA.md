# PROJE PLANLAMA VE VİZYON DOSYASI (Tapu Okuyucu -> Emlak Asistanı)

Bu belge, "Tapu Okuyucu" uygulamasının sadece bir şerh/haciz takip aracı olmaktan çıkıp, emlakçıların ve gayrimenkul profesyonellerinin günlük tüm işlerini yönetebileceği **çok platformlu (Masaüstü, Web, Mobil)** kapsamlı bir ekosisteme dönüşmesi için hazırlanmış stratejik planlama dosyasıdır.

---

## 1. Mevcut Durum Analizi ve Tespit Edilen Eksikler

Şu anki uygulama oldukça başarılı çalışan bir MVP (Minimum Viable Product) niteliğindedir. Ancak projeyi büyütmek için çözmemiz gereken temel mimari sorunlar bulunmaktadır:

### ❌ Mevcut Hatalı / Geliştirilmesi Gereken Yönler:
1. **Python Sidecar (Yan İşlem) Bağımlılığı:**
   - **Sorun:** Mevcut sistemde PDF okuma işi arka planda çalışan gömülü bir Python scripti ile (Tauri `run_python` API'si üzerinden) yapılıyor. Bu yapı masaüstünde harika çalışsa da, uygulamayı Web'e veya iOS/Android'e taşıdığımızda çöker. Çünkü tarayıcılar veya mobil cihazlar doğrudan yerel Python scriptlerini çalıştıramaz.
   - **Çözüm:** Python arka ucu tamamen bağımsız bir **REST API (FastAPI)** olarak kurgulanmalıdır. Masaüstü sürüm API'yi arka planda kendi çalıştırırken, Web ve Mobil sürümler bulutta barındırılan bu API'ye HTTP istekleri atmalıdır.
2. **Inline (Satır İçi) CSS ve Bileşen (Component) Eksikliği:**
   - **Sorun:** Arayüzde `style={{ display: 'flex', ... }}` şeklinde çok fazla satır içi stil bulunuyor. Ortak bir UI kütüphanesi yok. Bu durum, yeni bir ekran tasarlarken kodu kopyala-yapıştır yapmaya neden oluyor.
   - **Çözüm:** Ortak bir UI Component (Arayüz Bileşen) kütüphanesi (Design System) oluşturulmalıdır.
3. **Dar Odaklı Veritabanı Modeli:**
   - **Sorun:** Veritabanı sadece `Malik`, `Tapu_Record` ve `Serh_Entry` üzerine kurulu. Emlakçıların "Portföy (Ev/Arsa)", "Müşteri İletişim Bilgileri", "Randevular" gibi kavramlarına yer yok.
4. **State (Durum) Yönetimi:**
   - **Sorun:** Tüm durumlar `page.tsx` içinde `useState` ile tutuluyor. Proje büyüdükçe bu dosya yönetilemez hale gelir. `Zustand` veya `Redux` gibi bir Global State mekanizmasına geçilmelidir.

---

## 2. Gelecek Vizyonu: Hedeflenen Yeni Modüller

Uygulamayı bir emlakçının her ihtiyacını görecek hale getirmek için eklenecek temel modüller:

1. **Tapu ve Şerh Analizi (Mevcut Modül - Geliştirilecek):**
   - PDF okuma, haciz takibi, Excel dışa aktarma (Şu an var, optimize edilecek).
2. **Portföy (Mülk) Yönetimi:**
   - Satılık/Kiralık mülklerin kaydedilmesi, resim yüklenmesi, özelliklerinin (m2, oda sayısı) girilmesi.
3. **Müşteri İlişkileri (CRM):**
   - Müşteri rehberi. Hangi müşteri hangi portföy ile ilgileniyor? İletişim geçmişi ve notlar.
4. **Görev ve Randevu Takibi (Ajanda):**
   - Müşteriye ev gösterme randevuları, kapora/sözleşme son tarih hatırlatıcıları.
5. **Finans ve Sözleşme Modülü (İleri Aşama):**
   - Alınan komisyonlar, kira kontratı veya satış sözleşmesi şablonlarının otomatik PDF olarak doldurulması.

---

## 3. Platform Bağımsız Mimari Planı (Cross-Platform)

Uygulamanın aynı kod tabanı ile **Windows, Mac, Web, iOS ve Android** cihazlarda çalışabilmesi için mimarimiz şu şekilde olmalıdır:

### Frontend (Kullanıcı Arayüzü) - Next.js & React Native
- Çekirdek iş mantığı ve UI bileşenleri React ile yazılacak.
- Stiller için **Tailwind CSS** kullanılacak (Satır içi CSS'ler tamamen temizlenecek). Tailwind, responsive (mobil uyumlu) tasarımları çok hızlı yapmamızı sağlar.
- State yönetimi için **Zustand** kullanılacak.

### Backend (Arka Uç) - Python FastAPI & SQLite/PostgreSQL
- Python kodları (PDF okuma, Veritabanı yazma/okuma) bir FastAPI sunucusuna dönüştürülecek.
- **Masaüstü (Tauri):** Uygulama açıldığında arka planda `localhost` üzerinde FastAPI ayağa kalkacak ve UI buraya istek atacak.
- **Web/Mobil:** FastAPI sunucusu uzak bir sunucuya (örneğin AWS veya Render) yüklenecek. Mobil/Web uygulaması internet üzerinden bu sunucuya bağlanarak PDF analizini veya veritabanı işlemlerini yapacak.

---

## 4. Ortak Kullanılacak (Reusable) Component Planı

Kod tekrarını önlemek için projenin `components/ui/` dizininde kendi kütüphanemizi oluşturacağız. Yeni bir sayfa yaparken sadece bu parçaları birleştireceğiz:

1. **Temel Bileşenler (Atoms):**
   - `<Button />`: `variant="primary|secondary|danger"` ve `size="sm|md|lg"` özelliklerine sahip olacak.
   - `<Input />`: Metin, sayı veya tarih girişleri için standart hata mesajları barındıran kutu.
   - `<Badge />`: Şerh türlerini (İcrai Haciz vb.) veya Mülk durumunu (Satılık/Kiralık) gösteren renkli hap şeklindeki etiketler.
2. **Kapsayıcı Bileşenler (Molecules):**
   - `<Card />`: İçine bilgi konulan gölgeli ve yuvarlak hatlı kutular.
   - `<Modal />`: Üzerine açılan pop-up ekranları. Tüm modallar aynı yapıdan türeyecek.
3. **Veri Gösterim Bileşenleri (Organisms):**
   - `<DataTable />`: Şerh listesi veya Müşteri listesini gösteren, kendi içinde arama ve sayfalama yapabilen jenerik tablo.

---

## 5. Yeni Veritabanı Modeli (Data Schema)

Emlak işleyişini destekleyecek yeni tablo yapıları:

* **Clients (Müşteriler):** `id`, `name`, `phone`, `email`, `type` (Alıcı, Satıcı, Kiracı), `notes`
* **Properties (Portföyler):** `id`, `title`, `description`, `price`, `status` (Aktif, Satıldı, Kiralandı), `client_id` (Sahibi kim?)
* **Tapu_Records (Mevcut Tapu):** Artık sadece bir 'Malik'e değil, direkt olarak bir `Property (Portföy)` tablosuna da bağlanabilecek.
* **Serh_Entries (Mevcut Şerhler):** Tapu kayıtlarına bağlı kalmaya devam edecek.
* **Tasks (Görevler/Randevular):** `id`, `title`, `due_date`, `client_id`, `property_id`, `status` (Tamamlandı, Bekliyor)

---

## 6. Yol Haritası (Ne, Ne Zaman Yapılacak?)

Sistemi bozmadan aşama aşama ilerlemeliyiz. Lütfen hangisinden başlamak istediğine karar ver:

* **Aşama 1: Temizlik ve Standartlaştırma (Refactoring)**
  - Mevcut satır içi (inline) CSS'leri Tailwind CSS'e (veya standart CSS sınıflarına) çevirme.
  - Ortak `Button`, `Card`, `Modal` componentlerini oluşturup mevcut kodları bunlara geçirme.
* **Aşama 2: Backend'in API'ye Dönüşümü**
  - Python sidecar yapısını, HTTP isteklerine yanıt veren bir FastAPI yapısına dönüştürme (İleride web/mobile geçiş için kritik).
* **Aşama 3: Yeni Modüllerin Eklenmesi**
  - Müşteri (CRM) ve Portföy (Emlak) veritabanı tablolarının oluşturulması.
  - Menü sisteminin eklenmesi (Sol tarafa: Dashboard, Müşteriler, Portföyler, Tapu Şerhleri menüsü).
* **Aşama 4: Bulut ve Mobil Entegrasyon**
  - Verilerin istenirse yerelde (SQLite) istenirse bulutta tutulabilir hale gelmesi.
  - Mobil cihazlar için responsive (uyumlu) tasarımın kusursuzlaştırılması.

---

**Nasıl İlerleyelim?**
Bu dosya projemizin genel haritası olacak. Eğer bu plana onay veriyorsan, **"Aşama 1"** ile başlayıp mevcut UI kodlarını temiz, tekrar kullanılabilir bileşenler (components) haline getirebiliriz. İstersen önce **"Aşama 3"** diyerek yeni emlak modüllerini (Müşteri ve Portföy kaydı) eklemeye de başlayabiliriz. Seçim senin!
