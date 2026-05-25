import { useState, useEffect } from "react";

// 関数インポート
import ReceiptUploadForm from "./components/ReceiptUploadForm";
import ReceiptList from "./components/ReceiptList";
import MonthlySummary from "./components/MonthlySummary";

function App() {
    //状態管理 値が変わったら画面に反映させるため。
    // const [現在の値, セッター関数] = useState([]);
    const [receipts, setReceipts] = useState([]);
    const API_BASE_URL =
      "https://vk5a4k1w22.execute-api.ap-northeast-1.amazonaws.com/dev";

    // レシート一覧取得
    const fetchReceipts = async () => {
        try {
            // fetchの第二引数にメソッドを指定。デフォルトはget
            // response:生のhttp通信の情報が全部入ってる。
            const response = await fetch(`${API_BASE_URL}/receipts`);
            // console.log(response.ok);

            //json変換で初めて中身をjsonとして読み込める。
            const data = await response.json();
            setReceipts(data);
        } catch (error) {
            console.error("Fetch receipts error:", error);
        }
    };

    // アップロード
    const handleUploadSuccess = (data) => {
      // アップロードに成功したら、最新一覧を表示
      fetchReceipts();
    };

    // useEffect レンダリング後にこの処理をする。
    // ★レンダリング後、現在の一覧を表示
    useEffect(() => {
        fetchReceipts();
    }, []);

    // 状態管理→returnがすべて再実行
    // 前回の結果と、比較して変わったところだけ画面に反映
    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">レシート管理</h1>
            <ReceiptUploadForm
                apiBaseUrl={API_BASE_URL}
                onUploadSuccess={handleUploadSuccess}
            />
            <MonthlySummary apiBaseUrl={API_BASE_URL} />
            <ReceiptList
                receipts={receipts}
                apiBaseUrl={API_BASE_URL}
                onUpdateSuccess={fetchReceipts}
            />
            </div>
        </div>
    );
}

export default App;
