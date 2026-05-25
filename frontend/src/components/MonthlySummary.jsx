import { useState } from "react";

function MonthlySummary({ apiBaseUrl }) {
  const [selectedMonth, setSelectedMonth] = useState("");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  // 過去6ヶ月分の選択肢を生成
  const getMonthOptions = () => {
    const options = [];
    const now = new Date();

    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const value = `${year}${month}`;
      const label = `${year}年${month}月`;
      options.push({ value, label });
    }

    return options;
  };

  const handleFetch = async () => {
    if (!selectedMonth) return;

    setLoading(true);

    try {
      const response = await fetch(
        `${apiBaseUrl}/monthly?year_month=${selectedMonth}`
      );
      const data = await response.json();
      setSummary(data);
      setLoading(false);
    } catch (error) {
      console.error("Fetch summary error:", error);
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">月別集計</h2>

      <div className="flex gap-4 mb-4">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-4 py-2 border rounded-md"
        >
          <option value="">月を選択</option>
          {/* map:配列の各要素に処理を適用して新しい配列を返す */}
          {getMonthOptions().map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          onClick={handleFetch}
          disabled={!selectedMonth || loading}
          className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
        >
          {loading ? "集計中..." : "集計"}
        </button>
      </div>

      {summary && (
        <div className="border-t pt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded">
              <p className="text-sm text-gray-600 mb-1">共有口座から受取</p>
              <p className="text-2xl font-bold text-blue-600">
                ¥{summary.total_shared?.toLocaleString()}
              </p>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded">
              <p className="text-sm text-gray-600 mb-1">共有口座へ返す</p>
              <p className="text-2xl font-bold text-purple-600">
                ¥{summary.total_personal?.toLocaleString()}
              </p>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-600 mb-1">差し引き</p>
              <p className="text-2xl font-bold text-gray-800">
                ¥{summary.balance?.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MonthlySummary;
