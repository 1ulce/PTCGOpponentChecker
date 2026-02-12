# Swapable (借り放題) System Specification

このskillは、KAURIRUの借り放題システム（Swapable）の仕様書と実装ガイドです。

## 概要

借り放題システムは、サブスクリプション型のレンタルサービスで、月額料金を支払うことで登録された商品を借り放題で利用できるサービスです。

### システム名称の統一
- システム内部では「Swapable」という名称を使用
- ユーザー向けには「借り放題」として表示
- レンタルの単位は「枠」として統一

## 基本仕様

### 排他仕様
- **従来のサブスク・レンタルストアと借り放題ストアは同時に開設できない**
- 通常のレンタルサブスクと0円ストアレンタルサブスクの関係に近い
- 例：mymenteストアと別のストア（ex. mymenteカリホ）が立ち上がる関係性はなし（最初は在庫も連携しない）
- 管理画面には別々のIDでログインする必要がある

## プラン契約 (Swapable::Contract)

### プラン契約開始について

#### 契約開始日の定義
- **初回注文時の商品発送日 = プラン契約開始日**（初回決済日・注文日ではない）
- 更新時（2回目の決済）は、初回決済日の1ヶ月後ではなく、**プラン契約開始日の1ヶ月後**が課金日となる

#### 受取日の制約
- 未来の受取日などを指定されると課金ができない期間が生じるため、**受取日の選択はなし**
- 注文された最速で発送を行う

#### 初回注文時の流れ
1. 商品を選択して注文前に**プラン（契約）に申し込み**を行う
2. 注文完了時に決済も実行する
3. 出店都合キャンセルなどがあった場合は、**注文とプラン申し込みが両方ともキャンセル**される

#### 2回目以降注文時の流れ
1. 商品注文後、出店都合キャンセルなどがあった場合は**注文のみキャンセル**される
2. **プランはキャンセルされず契約は継続**する

### プラン変更について

#### ダウングレード（上位→下位プラン）
- そのまま適用され、次回決済から下位プランの金額で請求される
- **差額は返金されない**

#### アップグレード（下位→上位プラン）
- プランの価格の差額を次の契約更新日までの日数で**日割り計算**して上乗せ請求する

### プラン解約について

#### 解約条件
- 契約の途中で解約を行っても**日割りによる返金は行わない**
- **すべての商品が返却完了**になってから解約申請ができる（利用してる商品がある間は解約できない）

#### 解約タイミング
- 解約申請してすぐに更新日となった場合、**翌月も課金される**
- [メチャカリの解約ポリシーを参考](https://faq.mechakari.com/hc/ja/articles/360002231616)

## 決済方法

- **クレジットカード決済のみ**提供
- 決済プロバイダー: GMO Fincode

## 受取方法

- **配送のみ**提供
- 配送業者: 佐川急便など

## 交換手数料について

- **「送料」**として交換するたびにかかる
- 無料設定も可能

## リリース1（初期リリース）

### 提供機能

#### プラン設定 (Swapable::Plan)
- 提供する利用プラン（月額利用料金）は**1種類のみ**とする
- ストアごとに月額利用料金を設定できる
- プランで利用できる商品は**1枠のみ**とする（単位の呼び方は「枠」で固定）

#### 送料（交換手数料）
- 送料（交換手数料）が設定でき、交換するたびにプラン利用料とは別に都度請求される
- 無料の設定もできる

#### 返却・次回注文
- レンタル中のアイテムを返却し、**ステータスが返却完了**になったらユーザーに通知が送信される
- 返却完了後、次の商品が予約できるようになる

#### 在庫連携
- **ZAIKA未連携**（リリース2以降で対応）

#### 利用制限機能
- 利用者が多く来すぎたことによる在庫切れを避けるために、**新規プラン加入制限機能**を設ける
- プランごとに利用人数（user_limit）が設定できる
- 実際には全商品が入荷待ちになっている想定での制限

#### その他
- 休会制度はなし

### データモデル構造（リリース1）

```ruby
# プラン
Swapable::Plan
  - price: 月額料金
  - rental_slot_limit: 1（固定）
  - user_limit: 利用者数上限
  - service_name: プラン名

# 契約
Swapable::Contract
  - swapable_plan_id: プランID
  - contracted_on: 契約開始日（初回発送日）
  - next_billing_on: 次回課金日
  - status: pending/contracted/billing_failure/planned_termination/terminated/forcibly_terminated

# 注文
Swapable::Order
  - swapable_contract_id: 契約ID

# レンタル
Swapable::Rental
  - swapable_order_id: 注文ID
  - status: temporary_reserved/prepare_shipment/ready/rentaling/returning/returned など
```

## リリース2以降（将来実装）

### 追加機能

#### 複数プラン提供
- 提供する利用プランは**3種類**とする
- 例: ライトプラン2980円、スタンダードプラン5480円、プレミアムプラン6980円
- プランごとに「プラン名」「月額利用料」が設定できる

#### プラン変更のタイミング制御
- プラン変更を行った場合、その契約の反映は**次回更新日以降**になる
- プラン変更は次回更新日前までに実施する必要がある

#### 借りてる商品の購入機能
- レンタル中の商品を購入できる機能を追加

#### ZAIKA連携
- 注文単位（伝票番号）をアイテム単位にバラす改修が必要

#### 交換回数制限
- 1ヶ月（次の契約更新日までの1サイクル）の間に交換できる回数の制限が設定できる

#### 自動予約機能
- 次に借りたい商品を予約しておくと、返却完了と同時に自動的に発送される機能

## 既存実装の確認ポイント

### モデル
- `app/models/swapable/contract.rb`: 契約管理、AASMによるステータス遷移
- `app/models/swapable/plan.rb`: プラン設定、利用者数上限チェック
- `app/models/swapable/order.rb`: 注文管理
- `app/models/swapable/rental.rb`: レンタル品のステータス管理
- `app/models/swapable/billing.rb`: 請求管理
- `app/models/swapable/plan_item.rb`: プランで利用できる商品の紐付け

### コントローラー
- `app/controllers/admin/swapable/`: 管理画面用コントローラー
  - `contracts_controller.rb`: 契約管理
  - `plans_controller.rb`: プラン管理
  - `orders_controller.rb`: 注文管理
  - `rentals_controller.rb`: レンタル管理
  - `billings_controller.rb`: 請求管理
- `app/controllers/api/v1/swapable/`: API用コントローラー
  - `carts_controller.rb`: カート処理
  - `rentals_controller.rb`: レンタル処理

### 重要なビジネスロジック

#### 次回課金日の計算
```ruby
# app/models/swapable/contract.rb:499
def self.calc_next_month_date(start_date, renewal_date = nil)
  # 契約開始日を基準に1ヶ月後を計算
  # 月末日の考慮あり
end
```

#### 契約ステータス遷移（AASM）
- `pending` → `contracted`: 初回レンタル開始時
- `contracted` → `billing_failure`: 課金失敗時
- `contracted` → `planned_termination`: 解約申請時
- `planned_termination` → `terminated`: 解約予定日経過時
- `billing_failure` → `forcibly_terminated`: 再課金期限超過時

#### レンタルステータス遷移（AASM）
- `temporary_reserved` → `prepare_shipment`: 予約確定時
- `prepare_shipment` → `ready`: 準備完了時
- `ready` → `rentaling`: レンタル開始時
- `rentaling` → `returning`: 返却申請時
- `returning` → `returned`: 返却完了時

## 開発時の注意事項

### テスト
- 借り放題機能の開発時は必ずspecを作成すること
- `spec/models/swapable/` 配下にモデルのspecがある
- AASMのステート遷移のテストを忘れずに実装すること

### 命名規則
- ユーザー向け表示: 「借り放題」
- システム内部: `Swapable`（大文字始まり）
- レンタル単位: 「枠」

### マイグレーション
- テーブル名は `swapable_` プレフィックスを使用
- 例: `swapable_contracts`, `swapable_plans`, `swapable_orders`

### 決済処理
- GMO Fincodeを使用
- `PaymentGateway::Proxy.factory(gateway: :gmo_fincode, ...)`
- 3Dセキュア認証対応が必要

### マルチテナント対応
- ベンダーごとに独立した借り放題ストアを運営
- `belongs_to :vendor` の関連を必ず設定すること

## 参考ドキュメント

- プロダクト概要: `docs/.kiro/steering/product.md`
- 技術スタック: `docs/.kiro/steering/tech.md`
- プロジェクト構造: `docs/.kiro/steering/structure.md`

## よくある質問

### Q: 初回注文がキャンセルされた場合、契約はどうなる？
A: 初回注文の場合は、注文と契約の両方がキャンセルされます（`Contract#order_cancel_by_admin`）。

### Q: 2回目以降の注文がキャンセルされた場合は？
A: 注文のみキャンセルされ、契約は継続します。

### Q: 解約申請後、すぐに更新日が来た場合は？
A: 翌月も課金されます。解約は次回更新日の前日（`planned_termination_on`）まで有効です。

### Q: プラン変更時の差額精算は？
A: アップグレードの場合は日割り計算で差額を請求。ダウングレードの場合は返金なし。

### Q: 返却完了のタイミングは？
A: 管理者が `returned_by_admin_rental` イベントを実行したとき。ユーザーへの通知も送信されます。
