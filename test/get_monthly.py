import requests

API_URL = "https://vk5a4k1w22.execute-api.ap-northeast-1.amazonaws.com/dev/monthly"

# 2026年5月のデータを取得
response = requests.get(
    API_URL,
    params={'year_month': '202605'}
)

print(response.status_code)
print(response.json())
