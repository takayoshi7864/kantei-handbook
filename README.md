# 鑑定ハンドブック ビューア（PWA）
- 動作確認: `python3 -m http.server 8000` → http://localhost:8000
- スマホで使うには HTTPS で公開（Netlify / Cloudflare Pages / GitHub Pages 等）→「ホーム画面に追加」
- 初回のみPDFを選択（端末のIndexedDBに保存。以後オフラインで開ける）。PDF自体はアプリに含めない。
- 目次の元データ: toc.js ／ ページ補正は 設定タブで調整
