import requests

# API GatewayのURLを入れる
API_URL = "https://vk5a4k1w22.execute-api.ap-northeast-1.amazonaws.com/dev/"

data = {
    "receipt_id": "receipt_20260505_094400",
    "item_index": 3,
    "category": "共有"
}

response = requests.patch(
    API_URL,
    json = data
)

print(response.status_code)
print(response.json())
