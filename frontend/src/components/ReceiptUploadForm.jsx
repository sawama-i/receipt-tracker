import { useState } from "react";

// App.jsxから関数を渡される。
function ReceiptUploadForm({ apiBaseUrl, onUploadSuccess }) {
    const [selectedImage, setSelectedImage] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [cardType, setCardType] = useState("personal");

    //e:inputで画像を選んだ時にブラウザが自動で渡す情報の塊。
    // selectedImageに画像ファイルを格納してるだけ。
    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
        setSelectedImage(file);
        }
    };

    const handleUpload = async () => {
        if (!selectedImage) return;

      //uploadingがtrue「アップロード中」表示
      setUploading(true);

      const reader = new FileReader();
      // 読み込み完了後の処理を登録（ファイルをメモリに読み込む処理）
      reader.onload = async (e) => {
        const base64Image = e.target.result.split(",")[1];

        try {
            const response = await fetch(
                `${apiBaseUrl}/upload`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        image: base64Image,
                        card_type: cardType, // ← 追加
                    }),
                }
            );
            const data = await response.json();

            //アップロード完了で、「アップロード」表示
            setUploading(false);
            setSelectedImage(null);
            setCardType("personal");

            if (onUploadSuccess) {
            onUploadSuccess(data);
            }
        } catch (error) {
            console.error("Upload error:", error);
            setUploading(false);
        }
      };
      reader.readAsDataURL(selectedImage);
    };

    //return:条件なしで描画
    return (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">レシートをアップロード</h2>

      {/* カード種別選択 */}
      <div className="flex gap-4 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="cardType"
            value="personal"
            checked={cardType === "personal"}
            onChange={() => setCardType("personal")}
          />
          <span className="text-sm">自分カード</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="cardType"
            value="shared"
            checked={cardType === "shared"}
            onChange={() => setCardType("shared")}
          />
          <span className="text-sm">共有カード</span>
        </label>
      </div>

        <input
            type="file"
            accept="image/*"
            // ファイルを選択すると、handleImageSelectが発火
            onChange={handleImageSelect}
            className="mb-4 block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
        {/* アップロードボタンのみ条件付き
            selectedImageは状態管理で最初はnullだから非表示
        */}
        {selectedImage && (
            <button
            onClick={handleUpload}
            disabled={uploading}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
            {/* true:false */}
            {uploading ? "アップロード中..." : "アップロード"}
            </button>
        )}
        </div>
    );
}

export default ReceiptUploadForm;
