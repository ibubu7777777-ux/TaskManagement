# タスク管理アプリ（Trello風）

Trelloのように、カードを列（未着手・作業中・完了）に並べてタスクを管理できる、タスク管理アプリです。

現在、**React + TypeScript（フロントエンド）+ Java/Spring Boot（バックエンド）+ PostgreSQL（データベース）** 構成で開発中です。

## フォルダ構成

```
frontend/   Reactアプリ（開発中）
backend/    Spring Bootアプリ（開発中）
legacy/     旧バージョン（HTML/CSS/JSのみ、learning用に保存）
docs/       要件定義の詳細ドキュメント
```

## 旧バージョン（HTML/CSS/JSのみ）について

学習の最初のステップとして作成した、`localStorage`でデータを保存するシンプルなバージョンは [legacy/](legacy/) に保存してあります。`legacy/index.html` をブラウザで直接開けば、今でも動作します。

## 詳しい仕様

機能要件・画面設計・データベース設計・技術スタックなどの詳細は [要件定義書.md](要件定義書.md) を入口として、`docs/`配下の各ドキュメントにまとめています。
