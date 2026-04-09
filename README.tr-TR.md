<h1 align="center">Understand Anything</h1>

<p align="center">
  <strong>Herhangi bir kod tabanını, Dockerfile'ı veya dokümantasyonu keşfedebileceğin, arayabileceğin ve hakkında sorular sorabileceğin interaktif bir bilgi grafiğine dönüştür.</strong>
  <br />
  <em>Claude Code, Codex, Cursor, Copilot, Gemini CLI ve daha fazlasıyla çalışır.</em>
</p>

<p align="center">
  <a href="README.md">English</a> | <a href="README.zh-CN.md">简体中文</a> | <a href="README.zh-TW.md">繁體中文</a> | <a href="README.ja-JP.md">日本語</a> | <a href="README.tr-TR.md">Türkçe</a>
</p>

<p align="center">
  <a href="#-hızlı-başlangıç"><img src="https://img.shields.io/badge/Hızlı_Başlangıç-blue" alt="Hızlı Başlangıç" /></a>
  <a href="https://github.com/Lum1104/Understand-Anything/blob/main/LICENSE"><img src="https://img.shields.io/badge/Lisans-MIT-yellow" alt="Lisans: MIT" /></a>
  <a href="https://docs.anthropic.com/en/docs/claude-code"><img src="https://img.shields.io/badge/Claude_Code-8A2BE2" alt="Claude Code" /></a>
  <a href="#codex"><img src="https://img.shields.io/badge/Codex-000000" alt="Codex" /></a>
  <a href="#vs-code--github-copilot"><img src="https://img.shields.io/badge/Copilot-24292e" alt="Copilot" /></a>
  <a href="#gemini-cli"><img src="https://img.shields.io/badge/Gemini_CLI-4285F4" alt="Gemini CLI" /></a>
  <a href="#opencode"><img src="https://img.shields.io/badge/OpenCode-38bdf8" alt="OpenCode" /></a>
  <a href="https://lum1104.github.io/Understand-Anything"><img src="https://img.shields.io/badge/Ana_Sayfa-d4a574" alt="Ana Sayfa" /></a>
  <a href="https://lum1104.github.io/Understand-Anything/demo/"><img src="https://img.shields.io/badge/Canlı_Demo-00c853" alt="Canlı Demo" /></a>
</p>

<p align="center">
  <img src="assets/hero.jpg" alt="Understand Anything — Herhangi bir kod tabanını interaktif bir bilgi grafiğine dönüştür" width="800" />
</p>

---

> [!TIP]
> **Topluluğa çok teşekkürler!** Understand-Anything'e gösterilen destek inanılmaz oldu. Bu araç sana karmaşıklığı anlamak için birkaç dakika kazandırıyorsa, istediğim tek şey buydu. 🚀

**Yeni bir ekibe katıldın. Kod tabanı 200.000 satır kod. Nereden başlayacaksın bile bilemiyorsun?**

Understand Anything, projenizi çok-ajan hattıyla analiz eden, her dosya, fonksiyon, sınıf ve bağımlılığın bilgi grafiğini oluşturan ve hepsini görsel olarak keşfetmen için interaktif bir kontrol paneli sunan bir [Claude Code](https://docs.anthropic.com/en/docs/claude-code) eklentisidir. Kodu körü körüne okumayı bırak. Büyük resmi görmeye başla.

---

## ✨ Özellikler

### Yapısal grafiği keşfedin

Kod tabanınızı interaktif bir bilgi grafiği olarak görüntüleyin — her dosya, fonksiyon ve sınıf tıklanabilir, aranabilir ve keşfedilebilir bir düğümdür. Herhangi bir düğümü seçerek anlaşılır özetleri, bağımlılıkları ve rehberli turları görün.

<p align="center">
  <img src="assets/overview-structural.gif" alt="Yapısal grafik — dosyaları, fonksiyonları, sınıfları ve ilişkilerini keşfedin" width="750" />
</p>

### İş mantığını anlayın

Alan görünümüne geçin ve kodunuzun gerçek iş süreçleriyle nasıl eşleştiğini görün — alanlar, akışlar ve adımlar yatay bir grafik olarak sunulur.

<p align="center">
  <img src="assets/overview-domain.gif" alt="Alan grafiği — iş alanları, akışlar ve süreç adımları" width="750" />
</p>

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
```

---

## 🌐 Çoklu Platform Kurulumu

Understand-Anything birden fazla AI kodlama platformunda çalışır.

### Claude Code (Yerli)

```bash
/plugin marketplace add Lum1104/Understand-Anything
/plugin install understand-anything
```

### Codex

Codex'e söyle:
```
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.codex/INSTALL.md
```

### OpenCode

OpenCode'a söyle:
```
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.opencode/INSTALL.md
```

### OpenClaw

OpenClaw'a söyle:
```
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.openclaw/INSTALL.md
```

### Cursor

Bu depo klonlandığında Cursor, eklentiyi `.cursor-plugin/plugin.json` aracılığıyla otomatik olarak keşfeder. Manuel kurulum gerekmez — sadece klonla ve Cursor'da aç.

### VS Code + GitHub Copilot

GitHub Copilot uzantısı (v1.108+) yüklü VS Code, `.copilot-plugin/plugin.json` aracılığıyla eklentiyi otomatik keşfeder. Manuel kurulum gerekmez — sadece klonla ve VS Code'da aç.

Tüm projelerde kullanmak için kişisel beceri olarak kurmak istersen GitHub Copilot'a söyle:
```text
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.vscode/INSTALL.md
```

### Antigravity

Antigravity'e söyle:
```text
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.antigravity/INSTALL.md
```

### Gemini CLI

Gemini CLI'a söyle:
```text
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.gemini/INSTALL.md
```

### Pi Agent

Pi Agent'a söyle:
```text
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.pi/INSTALL.md
```

### Platform Uyumluluğu

| Platform | Durum | Kurulum Yöntemi |
|----------|--------|----------------|
| Claude Code | ✅ Yerli | Eklenti pazarı |
| Codex | ✅ Destekleniyor | AI güdümlü kurulum |
| OpenCode | ✅ Destekleniyor | AI güdümlü kurulum |
| OpenClaw | ✅ Destekleniyor | AI güdümlü kurulum |
| Cursor | ✅ Destekleniyor | Otomatik keşif |
| VS Code + GitHub Copilot | ✅ Destekleniyor | Otomatik keşif |
| Antigravity | ✅ Destekleniyor | AI güdümlü kurulum |
| Gemini CLI | ✅ Destekleniyor | AI güdümlü kurulum |
| Pi Agent | ✅ Destekleniyor | AI güdümlü kurulum |

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
  MIT Lisansı &copy; <a href="https://github.com/Lum1104">Lum1104</a>
</p>
