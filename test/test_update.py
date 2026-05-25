import requests

# API GatewayのURLを入れる
API_URL = "https://vk5a4k1w22.execute-api.ap-northeast-1.amazonaws.com/dev/update"

# さっき作成されたreceipt_idを使う
data = {
    "receipt_id": "receipt_20260504_074512",  # ←実際のIDに変更
    "category": "共有"  # または "自分"
}

response = requests.patch(
    API_URL,
    json=data
)

print(response.status_code)
print(response.json())
