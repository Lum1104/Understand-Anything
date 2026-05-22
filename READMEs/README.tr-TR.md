<h1 align="center">Understand Anything</h1>

<p align="center">
  <strong>Herhangi bir kod tabanını, bilgi tabanını veya dokümantasyonu keşfedebileceğin, arayabileceğin ve hakkında sorular sorabileceğin interaktif bir bilgi grafiğine dönüştür.</strong>
  <br />
  <em>Claude Code, Codex, Cursor, Copilot, Antigravity CLI ve daha fazlasıyla çalışır.</em>
</p>

<p align="center">
  <a href="../README.md">English</a> | <a href="README.zh-CN.md">简体中文</a> | <a href="README.zh-TW.md">繁體中文</a> | <a href="README.ja-JP.md">日本語</a> | <a href="README.ko-KR.md">한국어</a> | <a href="README.es-ES.md">Español</a> | <a href="README.tr-TR.md">Türkçe</a> | <a href="README.ru-RU.md">Русский</a>
</p>

<p align="center">
  <a href="#-hızlı-başlangıç"><img src="https://img.shields.io/badge/Hızlı_Başlangıç-blue" alt="Hızlı Başlangıç" /></a>
  <a href="https://github.com/Lum1104/Understand-Anything/blob/main/LICENSE"><img src="https://img.shields.io/badge/Lisans-MIT-yellow" alt="Lisans: MIT" /></a>
  <a href="https://docs.anthropic.com/en/docs/claude-code"><img src="https://img.shields.io/badge/Claude_Code-8A2BE2" alt="Claude Code" /></a>
  <a href="#codex"><img src="https://img.shields.io/badge/Codex-000000" alt="Codex" /></a>
  <a href="#vs-code--github-copilot"><img src="https://img.shields.io/badge/Copilot-24292e" alt="Copilot" /></a>
  <a href="#copilot-cli"><img src="https://img.shields.io/badge/Copilot_CLI-24292e" alt="Copilot CLI" /></a>
  <a href="#antigravity-cli"><img src="https://img.shields.io/badge/Antigravity_CLI-4285F4" alt="Antigravity CLI" /></a>
  <a href="#opencode"><img src="https://img.shields.io/badge/OpenCode-38bdf8" alt="OpenCode" /></a>
  <a href="https://understand-anything.com"><img src="https://img.shields.io/badge/Ana_Sayfa-d4a574" alt="Ana Sayfa" /></a>
  <a href="https://understand-anything.com/demo/"><img src="https://img.shields.io/badge/Canlı_Demo-00c853" alt="Canlı Demo" /></a>
</p>

<p align="center">
  <img src="../assets/hero.png" alt="Understand Anything — Herhangi bir kod tabanını interaktif bir bilgi grafiğine dönüştür" width="800" />
</p>

<p align="center">
  <strong>💬 <a href="https://discord.gg/pydat66RY">Discord topluluğuna katıl &rarr;</a></strong>
  <br />
  <em>Sorular sor, yaptıklarını paylaş, topluluktan yardım al.</em>
</p>

---

**Yeni bir ekibe katıldın. Kod tabanı 200.000 satır kod. Nereden başlayacaksın bile bilemiyorsun?**

Understand Anything, projenizi çok-ajan hattıyla analiz eden, her dosya, fonksiyon, sınıf ve bağımlılığın bilgi grafiğini oluşturan ve hepsini görsel olarak keşfetmen için interaktif bir kontrol paneli sunan bir [Claude Code Plugin](https://code.claude.com/docs/en/plugins-reference#plugins-reference)'dir. Kodu körü körüne okumayı bırak. Büyük resmi görmeye başla.

> **Amaç, kod tabanının ne kadar karmaşık olduğunu görkemle gösteren bir grafik değil — her parçanın nasıl birbirine geçtiğini sessizce öğreten bir grafik.**

---

## ✨ Özellikler

> [!NOTE]
> **Hemen denemek ister misiniz?** [Ana sayfamızda](https://understand-anything.com/) [canlı demoyu](https://understand-anything.com/demo/) deneyin — doğrudan tarayıcınızda kaydırma, yakınlaştırma, arama ve keşfetme yapabileceğiniz tam etkileşimli bir kontrol paneli.

### Yapısal grafiği keşfedin

Kod tabanınızı interaktif bir bilgi grafiği olarak görüntüleyin — her dosya, fonksiyon ve sınıf tıklanabilir, aranabilir ve keşfedilebilir bir düğümdür. Herhangi bir düğümü seçerek anlaşılır özetleri, bağımlılıkları ve rehberli turları görün.

### İş mantığını anlayın

Alan görünümüne geçin ve kodunuzun gerçek iş süreçleriyle nasıl eşleştiğini görün — alanlar, akışlar ve adımlar yatay bir grafik olarak sunulur.

### Bilgi tabanlarını analiz et

`/understand-knowledge` komutunu bir [Karpathy deseni LLM Wiki'sine](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) yönlendirin ve topluluk kümeleme ile kuvvet yönelimli bir bilgi grafiği elde edin. Deterministik ayrıştırıcı `index.md`'den wikilinkleri ve kategorileri çıkarır, ardından LLM ajanları örtük ilişkileri keşfeder, varlıkları çıkarır ve iddiaları ortaya çıkarır — wiki'nizi gezinilebilir, birbirine bağlı fikirler grafiğine dönüştürür.

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🧭 Rehberli Turlar</h3>
      <p>Bağımlılığa göre sıralanmış, mimarinin otomatik oluşturulmuş gözden geçirmeleri. Kod tabanını doğru sırayla öğren.</p>
    </td>
    <td width="50%" valign="top">
      <h3>🔍 Bulanık ve Anlamsal Arama</h3>
      <p>İsme veya anlamına göre her şeyi bul. "Kimlik doğrulamayı hangi parçalar yönetiyor?" ara ve grafik boyunca ilgili sonuçları al.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>📊 Diff Etki Analizi</h3>
      <p>Değişikliklerinin sistemin hangi bölümlerini etkilediğini commit etmeden önce gör. Kod tabanı boyunca dalgalanma etkilerini anla.</p>
    </td>
    <td width="50%" valign="top">
      <h3>🎭 Kişiye Uyarlanabilir UI</h3>
      <p>Kontrol paneli, kim olduğuna göre ayrıntı seviyesini ayarlar — junior geliştirici, ürün yöneticisi veya güçlü kullanıcı.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🏗️ Katman Görselleştirmesi</h3>
      <p>Mimari katmana göre otomatik gruplama — API, Servis, Veri, UI, Yardımcı — renk kodlu efsaneyle.</p>
    </td>
    <td width="50%" valign="top">
      <h3>📚 Dil Kavramları</h3>
      <p>12 programlama deseni (generikler, kapanışlar, dekoratörler, vb.) göründükleri her yerde bağlam içinde açıklanır.</p>
    </td>
  </tr>
</table>

---

## 🚀 Hızlı Başlangıç

### 1. Eklentiyi yükle

```bash
/plugin marketplace add Lum1104/Understand-Anything
/plugin install understand-anything
```

### 2. Kod tabanını analiz et

```bash
/understand
```

Çok-ajan hattı projenizi tarar, her dosya, fonksiyon, sınıf ve bağımlılığı çıkarır, ardından `.understand-anything/knowledge-graph.json` dosyasına kaydedilen bir bilgi grafiği oluşturur.

**Yerelleştirilmiş çıktı:** İstediğiniz dilde içerik oluşturmak için `--language` kullanın:

```bash
# İstediğiniz dilde içerik oluştur (düğüm açıklamaları ve dashboard UI)
/understand --language en

# Desteklenen diller: en (varsayılan), zh, zh-TW, ja, ko, ru
```

`--language` parametresi şunları etkiler:
- Bilgi grafiğindeki düğüm özetleri ve açıklamalar
- Dashboard UI etiketleri, butonlar ve araç ipuçları
- Rehberli tur açıklamaları

### 3. Kontrol panelini keşfet

```bash
/understand-dashboard
```

Kod tabanın bir grafik olarak görselleştirilmiş, mimari katmana göre renklendirilmiş, aranabilir ve tıklanabilir interaktif bir web kontrol paneli açılır. Kodunu, ilişkilerini ve sade Türkçe açıklamasını görmek için herhangi bir düğüm seç.

### 4. Öğrenmeye devam et

```bash
# Kod tabanı hakkında her şeyi sor
/understand-chat Ödeme akışı nasıl çalışır?

# Mevcut değişikliklerinin etkisini analiz et
/understand-diff

# Belirli bir dosya veya fonksiyona derinlemesine dal
/understand-explain src/auth/login.ts

# Yeni ekip üyeleri için bir işe alıştırma rehberi oluştur
/understand-onboard

# İş alanı bilgisini çıkar (alanlar, akışlar, adımlar)
/understand-domain

# Karpathy deseni LLM Wiki bilgi tabanını analiz et
/understand-knowledge ~/path/to/wiki
```

---

## 🌐 Çoklu Platform Kurulumu

Understand-Anything birden fazla AI kodlama platformunda çalışır.

### Claude Code (Yerli)

```bash
/plugin marketplace add Lum1104/Understand-Anything
/plugin install understand-anything
```

### Tek satırlık kurulum (Codex / OpenCode / OpenClaw / Antigravity / Antigravity CLI / Pi Agent / Vibe CLI / VS Code Copilot / Hermes / Cline / KIMI CLI)

**macOS / Linux:**
```bash
curl -fsSL https://raw.githubusercontent.com/Lum1104/Understand-Anything/main/install.sh | bash
# veya platformu doğrudan geçirerek soruyu atla:
curl -fsSL https://raw.githubusercontent.com/Lum1104/Understand-Anything/main/install.sh | bash -s codex
```

**Windows (PowerShell):**
```powershell
iwr -useb https://raw.githubusercontent.com/Lum1104/Understand-Anything/main/install.ps1 | iex
```

Kurulum betiği depoyu `~/.understand-anything/repo` dizinine klonlar ve seçilen platform için uygun sembolik bağlantıları oluşturur. Sonrasında CLI/IDE'ni yeniden başlat.

- Desteklenen `<platform>` değerleri: `antigravity`, `codex`, `opencode`, `pi`, `openclaw`, `vibe`, `vscode`, `hermes`, `cline`, `kimi`
- Daha sonra güncelle: `./install.sh --update`
- Kaldır: `./install.sh --uninstall <platform>`

### Cursor

Bu depo klonlandığında Cursor, eklentiyi `.cursor-plugin/plugin.json` aracılığıyla otomatik olarak keşfeder. Manuel kurulum gerekmez — sadece klonla ve Cursor'da aç.

### VS Code + GitHub Copilot

GitHub Copilot uzantısı (v1.108+) yüklü VS Code, `.copilot-plugin/plugin.json` aracılığıyla eklentiyi otomatik keşfeder. Manuel kurulum gerekmez — sadece klonla ve VS Code'da aç.

Tüm projelerde kullanmak için kişisel beceri olarak kurmak istersen yukarıdaki `install.sh`'ı `vscode` platformuyla çalıştır.

### Copilot CLI

```bash
copilot plugin install Lum1104/Understand-Anything:understand-anything-plugin
```

### Platform Uyumluluğu

| Platform | Durum | Kurulum Yöntemi |
|----------|--------|----------------|
| Claude Code | ✅ Yerli | Eklenti pazarı |
| Cursor | ✅ Destekleniyor | Otomatik keşif |
| VS Code + GitHub Copilot | ✅ Destekleniyor | Otomatik keşif |
| Copilot CLI | ✅ Destekleniyor | Eklenti kurulumu |
| Codex | ✅ Destekleniyor | `install.sh codex` |
| OpenCode | ✅ Destekleniyor | `install.sh opencode` |
| OpenClaw | ✅ Destekleniyor | `install.sh openclaw` |
| Antigravity | ✅ Destekleniyor | `install.sh antigravity` |
| Antigravity CLI | ✅ Destekleniyor | `install.sh antigravity` |
| Pi Agent | ✅ Destekleniyor | `install.sh pi` |
| Vibe CLI | ✅ Destekleniyor | `install.sh vibe` |
| Hermes | ✅ Destekleniyor | `install.sh hermes` |
| Cline | ✅ Destekleniyor | `install.sh cline` |
| KIMI CLI | ✅ Destekleniyor | `install.sh kimi` |

---

## 📦 Grafı Ekibinizle Paylaşın

Graf yalnızca bir JSON dosyasıdır — **bir kez commit'leyin, ekip arkadaşlarınız pipeline'ı çalıştırmadan kullansın**. Yeni üye oryantasyonu, PR incelemeleri ve docs-as-code iş akışları için idealdir.

> **Örnek:** [GoogleCloudPlatform/microservices-demo (fork)](https://github.com/Lum1104/microservices-demo) — commit'lenmiş grafı içeren Go / Java / Python / Node çok dilli referans projesi.

**Neyi commit'leyin:** `.understand-anything/` içindeki her şey, *ancak* `intermediate/` ve `diff-overlay.json` hariç (bunlar yerel geçici dosyalardır).

```gitignore
.understand-anything/intermediate/
.understand-anything/diff-overlay.json
```

**Güncel tutun:** `/understand --auto-update` etkinleştirin — bir post-commit kancası grafı artımlı olarak yamalar, böylece her commit eşleşen bir grafla birlikte gelir. Veya sürümden önce `/understand` komutunu elle yeniden çalıştırın.

**Büyük graflar (10 MB+):** **git-lfs** ile takip edin.

```bash
git lfs install
git lfs track ".understand-anything/*.json"
git add .gitattributes .understand-anything/
```

---

## 🔧 Kaputun Altında

### Çok-Ajan Hattı

`/understand` komutu 5 özel ajan düzenler ve `/understand-domain` 6. ajanı ekler:

| Ajan | Rol |
|-------|------|
| `project-scanner` | Dosyaları keşfet, dilleri ve çerçeveleri tespit et |
| `file-analyzer` | Fonksiyonları, sınıfları, içe aktarmaları çıkar; grafik düğümleri ve kenarları üret |
| `architecture-analyzer` | Mimari katmanları tanımla |
| `tour-builder` | Rehberli öğrenme turları oluştur |
| `graph-reviewer` | Grafik bütünlüğünü ve referans bütünlüğünü doğrula |
| `domain-analyzer` | İş alanları, akışlar ve işlem adımlarını çıkar (`/understand-domain` tarafından kullanılır) |
| `article-analyzer` | Wiki makalelerinden varlıkları, iddiaları ve örtük ilişkileri çıkar (`/understand-knowledge` tarafından kullanılır) |

Dosya analizörleri paralel çalışır (en fazla 3 eşzamanlı). Artımlı güncellemeleri destekler — yalnızca son çalıştırmadan bu yana değişen dosyaları yeniden analiz eder.

---

## 🤝 Katkıda Bulunma

Katkılar memnuniyetle karşılanır! Başlamak için:

1. Depoyu fork'la
2. Bir özellik dalı oluştur (`git checkout -b feature/benim-ozellligim`)
3. Testleri çalıştır (`pnpm --filter @understand-anything/core test`)
4. Değişikliklerini commit et ve bir pull request aç

Büyük değişiklikler için lütfen önce bir issue aç ki yaklaşımı tartışalım.

---

<p align="center">
  <strong>Kodu körü körüne okumayı bırak. Her şeyi anlamaya başla.</strong>
</p>

## Star Geçmişi

<a href="https://www.star-history.com/?repos=Lum1104%2FUnderstand-Anything&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/image?repos=Lum1104/Understand-Anything&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/image?repos=Lum1104/Understand-Anything&type=date&legend=top-left" />
   <img alt="Star Geçmişi Grafiği" src="https://api.star-history.com/image?repos=Lum1104/Understand-Anything&type=date&legend=top-left" />
 </picture>
</a>

<p align="center">
  <em>Kullanan ve katkıda bulunan herkese teşekkürler — bunun insanlara zaman kazandırdığını bilmek, yapmaya değer kılan tek şeydi.</em>
</p>

<p align="center">
  MIT Lisansı &copy; <a href="https://github.com/Lum1104">Lum1104</a>
</p>
