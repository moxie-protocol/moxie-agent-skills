<div dir="rtl">

# الیزا 🤖

<div align="center">
  <img src="./docs/static/img/eliza_banner.jpg" alt="Eliza Banner" width="100%" />
</div>

<div align="center">

📖 [Documnet](https://elizaos.github.io/eliza/) | 🎯 [نمونه‌ها](https://github.com/thejoven/awesome-eliza)

</div>

## 🌍 ترجمه‌های README

[中文说明](./README_CN.md) | [日本語の説明](./README_JA.md) | [한국어 설명](./README_KOR.md) | [Français](./README_FR.md) | [Português](./README_PTBR.md) | [Türkçe](./README_TR.md) | [Русский](./README_RU.md) | [Español](./README_ES.md) | [Italiano](./README_IT.md) | [ไทย](./README_TH.md) | [Deutsch](./README_DE.md) | [Tiếng Việt](./README_VI.md) | [עִברִית](https://github.com/elizaos/Elisa/blob/main/README_HE.md) | [Tagalog](./README_TG.md) | [Polski](./README_PL.md) | [Arabic](./README_AR.md) | [Hungarian](./README_HU.md) | [Srpski](./README_RS.md)| [Persian](./README_FARSI.md)

## 🚩 نمای کلی

<div align="center">
  <img src="./docs/static/img/eliza_diagram.jpg" alt="Eliza Diagram" width="100%" />
</div>

## ✨ ویژگی‌ها

- 🛠️ رابط‌های کامل برای دیسکورد، توییتر و تلگرام
- 🔗 پشتیبانی از تمام مدل‌ها (Llama, Grok, OpenAI, Anthropic و غیره)
- 👥 پشتیبانی از چند Agent و Room
- 📚 وارد کردن و تعامل آسان با Document شما
- 💾 حافظه و ذخیره‌سازی اسناد قابل بازیابی
- 🚀 بسیار قابل گسترش - ایجاد اقدامات و مشتریان خود
- ☁️ پشتیبانی از مدل‌های متعدد (Llama local، OpenAI، Anthropic، Groq و غیره)
- 📦 به سادگی کار می‌کند!


## ویدیوهای آموزشی

[مدرسه توسعه عامل هوش مصنوعی](https://www.youtube.com/watch?v=ArptLpQiKfI&list=PLx5pnFXdPTRzWla0RaOxALTSTnVq53fKL)

## 🎯 موارد استفاده

- 🤖 ربات‌های چت
- 🕵️ Agentهای خودکار
- 📈 مدیریت فرآیندهای تجاری
- 🎮 NPC در بازی‌های ویدیویی
- 🧠 معامله‌گری

## 🚀 شروع سریع

### پیش‌نیازها

- [پایتون ۲.۷+](https://www.python.org/downloads/)
- [نود جی‌اس ۲۳+](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [pnpm](https://pnpm.io/installation)

> **نکته برای کاربران ویندوز:** [WSL 2](https://learn.microsoft.com/en-us/windows/wsl/install-manual) مورد نیاز است.

### استفاده از Starter (توصیه شده)

```bash
git clone https://github.com/elizaos/eliza-starter.git
cd eliza-starter
cp .env.example .env
pnpm i && pnpm build && pnpm start
```

پس از اجرای Agent، باید پیامی برای اجرای "pnpm start:client" در انتها مشاهده کنید.
یک ترمینال دیگر باز کنید و به همان دایرکتوری بروید و سپس دستور زیر را اجرا کنید و URL را دنبال کنید تا با Agent خود چت کنید.

```bash
pnpm start:client
```

سپس [Document](https://elizaos.github.io/eliza/) را بخوانید تا یاد بگیرید چگونه الیزای خود را سفارشی کنید.

### راه‌اندازی دستی الیزا (فقط برای برنامه نویسان توصیه می‌شود)

```bash
# کلون کردن مخزن
git clone https://github.com/elizaos/eliza.git

# چک‌اوت آخرین نسخه
# این پروژه به سرعت به‌روز می‌شود، بنابراین توصیه می‌کنیم آخرین نسخه را چک‌اوت کنید
git checkout $(git describe --tags --abbrev=0)
```

### شروع الیزا با Gitpod

[![باز کردن در Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/elizaos/eliza/tree/main)

### ویرایش فایل .env

فایل .env.example را به .env کپی کنید و مقادیر مناسب را پر کنید.

```
cp .env.example .env
```

نکته: .env اختیاری است. اگر قصد اجرای چندین عامل متمایز را دارید، می‌توانید رمزها را از طریق JSON کاراکتر منتقل کنید.

### راه‌اندازی خودکار الیزا

این Script همه چیز را برای راه‌اندازی پروژه و شروع ربات با کاراکتر پیش‌فرض اجرا می‌کند.

```bash
sh scripts/start.sh
```

### ویرایش فایل شخصیت

۱. `packages/core/src/defaultCharacter.ts` را برای تغییر شخصیت پیش‌فرض باز کنید. توضیحات را حذف و ویرایش کنید.

۲. برای بارگذاری شخصیت‌های سفارشی: - از `pnpm start --characters="path/to/your/character.json"`
استفاده کنید - چندین فایل شخصیت می‌توانند همزمان بارگذاری شوند

۳.اتصال به X (توییتر) - `"clients": []` را به `"clients": ["twitter"]` در فایل شخصیت تغییر دهید تا به X متصل شوید

### راه‌اندازی دستی الیزا

```bash
pnpm i
pnpm build
pnpm start

# پروژه به سرعت به‌روز می‌شود، گاهی اوقات اگر به پروژه برمی‌گردید نیاز به پاک‌سازی پروژه دارید
pnpm clean
```

#### نیازمندی‌های اضافی

ممکن است نیاز به نصب Sharp داشته باشید. اگر هنگام راه‌اندازی خطایی مشاهده کردید، سعی کنید آن را با دستور زیر نصب کنید:

```
pnpm install --include=optional sharp
```

### Community و Contact

- [GitHub Issues](https://github.com/elizaos/eliza/issues). بهترین گزینه برای: باگ‌هایی که در استفاده از الیزا با آن‌ها مواجه می‌شوید و پیشنهادات ویژگی‌ها.
- [Discord](https://discord.gg/ai16z). بهترین گزینه برای: به اشتراک‌گذاری برنامه‌های خود و گذراندن وقت با کامیونیتی.

## مشارکت‌کنندگان

<a href="https://github.com/elizaos/eliza/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=elizaos/eliza" />
</a>

## تاریخچه Star

[![نمودار تاریخچه ستاره‌ها](https://api.star-history.com/svg?repos=elizaos/eliza&type=Date)](https://star-history.com/#elizaos/eliza&Date)

</div>
