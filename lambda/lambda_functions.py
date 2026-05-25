import json
import boto3
import base64
import os
from datetime import datetime
import urllib.request

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
BUCKET_NAME = 'receipt-tracker-share'
TABLE_NAME = 'Receipts'
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY')

def extract_text_claude(image_base64):
    """Claude APIで画像からテキスト抽出"""
    url = "https://api.anthropic.com/v1/messages"

    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }

    data = {
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 1024,
        "messages": [{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/jpeg",
                        "data": image_base64
                    }
                },
                {
                    "type": "text",
                    "text": """このレシートから以下の情報をJSON形式で抽出してください：
                    {
                    "store": "店名",
                    "date": "日付（YYYY年MM月DD日形式）",
                    "items": [
                        {"name": "商品名1", "price": 価格（数字のみ）},
                        {"name": "商品名2", "price": 価格（数字のみ）}
                    ],
                    "total": レシートの「合計」のうち最も大きな金額。
                    }
                    商品リストは購入した全ての商品を抽出してください。"""
                }
            ]
        }]
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers=headers
    )

    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            print(f"★result:{result}")
            text_content = result['content'][0]['text']

            # JSONブロックを抽出（```json ``` を除去）
            if '```json' in text_content:
                text_content = text_content.split('```json')[1].split('```')[0].strip()
            return json.loads(text_content)
    except (json.JSONDecodeError, KeyError, IndexError) as e:
        # JSONパース失敗時はエラーログを出して再raise
        print(f"OCR result parse error: {str(e)}, raw content: {text_content if 'text_content' in locals() else 'N/A'}")
        raise
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"HTTP Error {e.code}: {error_body}")  # ←詳細をログに出力
        raise


def update_category(receipt_id, category):
    """レシートのカテゴリを更新"""
    table = dynamodb.Table(TABLE_NAME)

    table.update_item(
        Key={'receipt_id': receipt_id},
        UpdateExpression='SET category = :cat',
        ExpressionAttributeValues={':cat': category}
    )

    return {'message': 'Category updated', 'receipt_id': receipt_id, 'category': category}


def update_item_category(receipt_id, item_index, category):
    """特定の商品のカテゴリを更新"""
    table = dynamodb.Table(TABLE_NAME)

    # まず既存データを取得
    response = table.get_item(Key={'receipt_id': receipt_id})
    print(f"★GET response: {response}")
    if 'Item' not in response:
        raise ValueError(f"Receipt {receipt_id} not found")

    items_list = response['Item'].get('items', [])
    print(f"★items_list BEFORE update: {items_list}")

    # 指定されたindexの商品のカテゴリを更新
    if item_index >= len(items_list):
        raise ValueError(f"Item index {item_index} out of range")

    items_list[item_index]['category'] = category
    print(f"★items_list AFTER update: {items_list}")
    # DynamoDBを更新（予約語を回避）
    update_response = table.update_item(
        Key={'receipt_id': receipt_id},
        UpdateExpression='SET #items = :items',
        ExpressionAttributeNames={
            '#items': 'items'  # 予約語をエイリアスで回避
        },
        ExpressionAttributeValues={':items': items_list}
    )
    print(f"★UPDATE response: {update_response}")
    return {
        'message': 'Item category updated',
        'receipt_id': receipt_id,
        'item_index': item_index,
        'category': category
    }

def get_monthly_total(year_month):
    """指定月の合計金額を商品別カテゴリで集計"""
    table = dynamodb.Table(TABLE_NAME)
    # scanからqueryに変更
    response = table.query(
        IndexName='year_month-index',
        KeyConditionExpression='year_month = :ym',
        ExpressionAttributeValues={':ym': year_month}
    )
    items = response['Items']

    total_shared = 0
    total_personal = 0

    for item in items:
        # date_str = item.get('upload_date', '')
        # item_year_month = date_str[:6]

        # if item_year_month == year_month:
        card_type = item.get('card_type', 'personal')  # ← 追加
        # 商品ごとにカテゴリを見て集計
        for product in item.get('items', []):
            price = int(product.get('price', 0))
            category = product.get('category', '未分類')

            if card_type == 'personal' and category == '共有':
                total_shared += price
            elif card_type == 'shared' and category == '自分':
                total_personal += price

    return {
        'year_month': year_month,
        'total_shared': total_shared,
        'total_personal': total_personal,
        'balance': total_shared - total_personal
    }


def get_all_receipts():
    """全レシートを取得"""
    table = dynamodb.Table(TABLE_NAME)
    response = table.scan()
    items = response['Items']

    # upload_dateで降順ソート（新しい順）
    items.sort(key=lambda x: x.get('upload_date', ''), reverse=True)

    return items

def lambda_handler(event, context):
    print(f"★event: {json.dumps(event)}")
    # CORS用のヘッダー
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS'
    }
    try:
        # まず method を取得
        method = event.get('requestContext', {}).get('http', {}).get('method', '')
        print(f"method:{method}")
        # それ以外の処理
        path = event.get('rawPath', '').removeprefix('/dev').removeprefix('/prod')
        print(f"path after removeprefix:{path}")

        # OPTIONSリクエストは最優先で処理
        if method == 'OPTIONS':
            print("OPTIONS detected - returning CORS headers")
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': ''
            }

        # PUT /update でカテゴリ更新
        if path == '/update' and method == 'PATCH':
            body = json.loads(event.get('body', '{}'))
            receipt_id = body.get('receipt_id')
            category = body.get('category')

            if not receipt_id or not category:
                return {
                    'statusCode': 400,
                    'headers': cors_headers,
                    'body': json.dumps({'error': 'receipt_id and category required'})
                }

            result = update_category(receipt_id, category)
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps(result)
            }
        # PATCH /update-item で商品別カテゴリ更新
        elif path == '/update-item' and method == 'PATCH':
            body = json.loads(event.get('body', '{}'))
            receipt_id = body.get('receipt_id')
            item_index = body.get('item_index')
            category = body.get('category')

            if receipt_id is None or item_index is None or not category:
                return {
                    'statusCode': 400,
                    'headers': cors_headers,
                    'body': json.dumps({'error': 'receipt_id, item_index, and category required'})
                }

            result = update_item_category(receipt_id, item_index, category)
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps(result)
            }
        # POST /upload で画像アップロード（既存の処理）
        elif path == '/upload' and method == 'POST':
            body = json.loads(event.get('body', '{}'))
            image_data = body.get('image')
            card_type = body.get('card_type', 'personal')  # デフォルトはpersonal
            if not image_data:
                return {
                    'statusCode': 400,
                    'headers': cors_headers,
                    'body': json.dumps({'error': 'No image data'})
                }

            # S3にアップロード
            image_bytes = base64.b64decode(image_data)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            file_name = f"receipts/{timestamp}.jpg"

            s3.put_object(
                Bucket=BUCKET_NAME,
                Key=file_name,
                Body=image_bytes,
                ContentType='image/jpeg'
            )

            # OCR実行
            extracted = extract_text_claude(image_data)
            print(f"★extracted:{extracted}")
            # DynamoDBに保存
            table = dynamodb.Table(TABLE_NAME)
            receipt_id = f"receipt_{timestamp}"

            table.put_item(Item={
                'receipt_id': receipt_id,
                'upload_date': timestamp,
                'year_month': timestamp[:6],
                'image_url': f"s3://{BUCKET_NAME}/{file_name}",
                'store': extracted.get('store', ''),
                'date': extracted.get('date', ''),
                'items': extracted.get('items', []),  # ←追加
                'total': extracted.get('total', ''),
                'category': '未分類',
                'card_type': card_type  # ← 追加
            })

            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({
                    'message': 'Success',
                    'receipt_id': receipt_id,
                    'extracted': extracted
                })
            }
        # GET /monthly?year_month=202605 で月別合計
        elif path == '/monthly' and method == 'GET':
            # クエリパラメータから年月を取得
            query_params = event.get('queryStringParameters', {}) or {}
            year_month = query_params.get('year_month')

            if not year_month:
                return {
                    'statusCode': 400,
                    'headers': cors_headers,
                    'body': json.dumps({'error': 'year_month parameter required (format: YYYYMM)'})
                }

            result = get_monthly_total(year_month)
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps(result)
            }
        # GET /receipts で全レシート取得
        elif path == '/receipts' and method == 'GET':
            receipts = get_all_receipts()
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps(receipts, default=str)  # default=strでDecimal型に対応
            }
        else:
            return {
                'statusCode': 404,
                'headers': cors_headers,
                'body': json.dumps({'error': 'Not found'})
            }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({'error': str(e)})
        }
