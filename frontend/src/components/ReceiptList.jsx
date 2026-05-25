import { useState, useMemo } from "react";

function ReceiptList({ receipts, apiBaseUrl, onUpdateSuccess }) {
  // 状態管理
  //レシートID
  const [editingReceipt, setEditingReceipt] = useState(null);
  const [categories, setCategories] = useState({});
  const [selectedFilter, setSelectedFilter] = useState("latest");

  // アップロード日フォーマット関数
  const formatUploadDate = (uploadDate) => {
    if (!uploadDate) return "";
    const year = uploadDate.substring(0, 4);
    const month = uploadDate.substring(4, 6);
    const day = uploadDate.substring(6, 8);
    return `${year}年${month}月${day}日`;
  };

  // receiptsから年月一覧を自動生成（重複なし・降順）
  // [receipts] の部分が「receipts が変わったときだけ再計算」
  const yearMonthOptions = useMemo(() => {
    const months = new Set(
      receipts.map((r) => r.upload_date?.substring(0, 6)).filter(Boolean)
    );
    console.log("months");
    console.log(months);
    // [...months]→配列　b.localeCompare(a)→降順
    return [...months].sort((a, b) => b.localeCompare(a));
  }, [receipts]);

    // フィルター条件に応じて表示するレシートを絞り込む
    const LATEST_COUNTS = {
      latest: 5,
      latest_10: 10,
    };
    const filteredReceipts = useMemo(() => {
        if (selectedFilter in LATEST_COUNTS) {
            return receipts.slice(0, LATEST_COUNTS[selectedFilter]);
        }
        return receipts.filter(
            (r) => r.upload_date?.substring(0, 6) === selectedFilter
        );
    }, [receipts, selectedFilter]);

// card_typeに応じてカード種別ラベルを返す
  const getCardLabel = (cardType) => {
    return cardType === "shared" ? "共有カード" : "自分カード";
  };

  // card_typeに応じてレシートの枠の色を返す
  // 自分カード：青系、共有カード：緑系
  const getCardBorderClass = (cardType) => {
    return cardType === "shared"
      ? "border-green-300 bg-green-50"
      : "border-blue-300 bg-blue-50";
  };

  // card_typeに応じてカテゴリ選択肢を返す
  // 自分カード：「共有」のみ（自分は当たり前だから不要）
  // 共有カード：「自分」のみ（共有は当たり前だから不要）
  const getCategoryOptions = (cardType) => {
    if (cardType === "personal") return ["未分類", "共有"];
    if (cardType === "shared") return ["未分類", "自分"];
    return ["未分類", "共有", "自分"]; // card_typeなし（既存データ）はフル表示
  };

  // 編集ボタン押下
  const handleEdit = (receipt) => {
    setEditingReceipt(receipt.receipt_id);
    // editingReceipt = レシートID

    const initialCategories = {};
    receipt.items?.forEach((item, index) => {
      initialCategories[index] = item.category || "未分類";
    });
    setCategories(initialCategories);
  };

  // itemIndex:１レシートの商品インデックス値
  const handleCategoryChange = (itemIndex, category) => {
    setCategories({ ...categories, [itemIndex]: category });
  };

  const handleSave = async (receipt) => {
    const updates = [];
    for (const [index, category] of Object.entries(categories)) {
        const itemIndex = parseInt(index);
        const currentCategory = receipt.items[itemIndex]?.category || "未分類";
        if (category !== currentCategory) {
            updates.push(
            fetch(`${apiBaseUrl}/update-item`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                receipt_id: receipt.receipt_id,
                item_index: itemIndex,
                category,
                }),
            })
            );
        }
    }
    try {
        await Promise.all(updates);
        // 全部成功したら↓に進む

        setEditingReceipt(null);

        // 最新の一覧取得
        if (onUpdateSuccess)
            onUpdateSuccess();
    } catch (error) {
        console.error("Update error:", error);
    }
  };

    const handleCancel = () => {
        //   編集中レシートID null
        setEditingReceipt(null);
        setCategories({});
    };

    const formatYearMonth = (ym) => {
        return `${ym.substring(0, 4)}年${ym.substring(4, 6)}月`;
    };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">レシート一覧</h2>

        {/* フィルタープルダウン */}
        <select
          value={selectedFilter}
          onChange={(e) => setSelectedFilter(e.target.value)}
          className="text-sm border rounded px-2 py-1 text-gray-700"
        >
          <option value="latest">最新5件</option>
          <option value="latest_10">最新10件</option>
          {yearMonthOptions.map((ym) => (
            <option key={ym} value={ym}>
              {formatYearMonth(ym)}
            </option>
            ))}
        </select>
      </div>
      {filteredReceipts.length === 0 ? (
        <p className="text-gray-500">レシートがありません</p>
      ) : (
        <div className="space-y-4">
          {filteredReceipts.map((receipt) => (
            <div
              key={receipt.receipt_id}
              // card_typeに応じて枠の色を変える
              className={`border rounded-lg p-4 ${getCardBorderClass(receipt.card_type)}`}
            >
              <div className="flex justify-between items-center mb-2">
              <p className="text-xs text-gray-400">
                アップロード日: {formatUploadDate(receipt.upload_date)}
              </p>
{/* カード種別バッジ */}
                <span
                  className={`text-xs px-2 py-1 rounded font-medium ${
                    receipt.card_type === "shared"
                      ? "bg-green-200 text-green-800"
                      : "bg-blue-200 text-blue-800"
                  }`}
                >
                  {getCardLabel(receipt.card_type)}
                </span>
              </div>
              <div className="flex justify-between mb-2">
                <div>
                  <p className="font-medium">{receipt.store}</p>
                  <p className="text-sm text-gray-500">{receipt.date}</p>
                </div>
                <p className="font-bold">¥{receipt.total?.toLocaleString()}</p>
              </div>
              <div className="mt-3">
                <p className="text-sm font-medium mb-2">商品：</p>
                <ul className="space-y-2">
                  {receipt.items?.map((item, index) => (
                    <li key={index} className="text-sm border-b pb-2">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <span>{item.name}</span>
                          <span className="ml-4">¥{item.price}</span>
                        </div>
                        {/* 編集ボタン押下→ editingReceipt＝レシートID*/}
                        {editingReceipt === receipt.receipt_id ? (
                          <div className="flex gap-2">
                            {/* card_typeに応じて選択肢を変える */}
                            {getCategoryOptions(receipt.card_type).map((cat) => (
                              <label
                                key={cat}
                                className="flex items-center text-xs"
                              >
                                <input
                                  type="radio"
                                  name={`category-${receipt.receipt_id}-${index}`}
                                  value={cat}
                                  // 編集ボタン（handleEdit）押下時に取得した現在のカテゴリにチェック
                                  checked={categories[index] === cat}
                                  onChange={() =>
                                    handleCategoryChange(index, cat)
                                  }
                                  className="mr-1"
                                />
                                {cat}
                              </label>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded bg-gray-100">
                            {item.category || "未分類"}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                {editingReceipt === receipt.receipt_id ? (
                  <div>
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 mr-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={() => handleSave(receipt)}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      保存
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEdit(receipt)}
                    className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
                  >
                    編集
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
export default ReceiptList;
