import requests
import base64

# API GatewayのURLを入れる
API_URL = "https://vk5a4k1w22.execute-api.ap-northeast-1.amazonaws.com/dev/upload"


# テスト用の画像ファイルを読み込む（先に適当な画像を用意しておく）
with open("test_receipt.jpg", "rb") as f:
    image_data = base64.b64encode(f.read()).decode('utf-8')

# APIにPOST
response = requests.post(
    API_URL,
    json={"image": image_data}
)


print(response.status_code)
print(response.json())
