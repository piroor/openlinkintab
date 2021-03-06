# 更新履歴

 - master/HEAD
   * キーボード操作でリンクを開く場合にも対応
   * 隠し設定 `extensions.openlinkintab@piro.sakura.ne.jp.link.invertDefaultBehavior` を削除（原理的に実現できなくなったため）。
     代替として[Open Link in Current](https://addons.mozilla.org/firefox/addon/open-link-in-current/)の利用が推奨されます。
 - 1.0.2016011401
   * e10s（マルチプロセス）に対応
   * Firefox 37およびそれ以前のサポートを終了
 - 0.1.2014070301
   * Nightly 33.0a1に対応
   * mousedownイベントでリンク先をリダイレクタに置き換えるページ（例：Googleの検索結果）において、別サイトへのリンクかどうかを正しく判別できない問題を修正
 - 0.1.2014050101
   * Nightly 32.0a1に対応
   * Firefox 23以下のバージョンへの対応を終了
   * NoScriptとの互換性を向上
 - 0.1.2013100801
   * Firefox 25に対応
   * jarファイルを含めない形のパッケージングに変更
 - 0.1.2012122901
   * Nightly 20.0a1に対応
   * スクリプトによってリンク先が動的に変更されるために外部サイトへのリンクと判別できない場合について、変更される前のリンク先に基づいて外部サイトかどうかを判別する機能を追加（初期状態ではGoogleの検索結果ページなどのみで有効：設定で適用サイトを追加可能）
   * mailto:へのリンクを新しいタブで開かないようにした
 - 0.1.2011120101
   * アンインストール時の処理が期待通りに働いていなかったのを修正
 - 0.1.2010121601
   * 別のユーザのホームに属しているURI（ /~username/ の部分が異なる場合）は別のサイトと見なすようにした（ extensions.openlinkintab@piro.sakura.ne.jp.checkUserHome=false で従来の動作）
   * 設定ダイアログで選択されている項目がハイライト表示されていなかったのを修正
 - 0.1.2010112601
   * 公開
