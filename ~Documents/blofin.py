import asyncio
import base64
import hmac
import hashlib
import json
import requests
import time
import websockets

async def sign_websocket_login(secret: str, api_key: str, passphrase: str) -> tuple[str, str, str]:
    """Generate WebSocket login signature."""
    timestamp = str(int(time.time() * 1000))
    nonce = timestamp
    
    # Fixed components for WebSocket auth
    method = "GET"
    path = "/users/self/verify"
    body = ""
    
    # Create signature string
    msg = f"{path}{method}{timestamp}{nonce}{body}"
    hex_signature = hmac.new(
        secret.encode(),
        msg.encode(),
        hashlib.sha256
    ).hexdigest().encode()
    
    return base64.b64encode(hex_signature).decode(), timestamp, nonce

async def trading_example():
    """Complete trading workflow example."""
    try:
        # Example credentials (replace with your own)
        api_key = "6d25db314497499987681bafa75f4bf0"
        secret = "8a964e2c76a54791822504eac9838c53"
        passphrase = "BlofinOnSteroids"
        
        # 1. Get order book price
        response = requests.get(
            "https://openapi.blofin.com/api/v1/market/books",
            params={"instId": "BTC-USDT", "size": "1"}
        )
        response.raise_for_status()
        best_ask = float(response.json()["data"][0]["asks"][0][0])  # Note: data[0] for first order book entry
        limit_price = round(best_ask * 0.9, 1)  # 10% below market, rounded to 0.1
        print(f"Best ask: {best_ask}, Limit price: {limit_price}")
        
        # 2. Connect to WebSocket and authenticate
        ws = await websockets.connect("wss://openapi.blofin.com/ws/private")
        sign, timestamp, nonce = await sign_websocket_login(secret, api_key, passphrase)
        
        # Login
        await ws.send(json.dumps({
            "op": "login",
            "args": [{
                "apiKey": api_key,
                "passphrase": passphrase,
                "timestamp": timestamp,
                "sign": sign,
                "nonce": nonce
            }]
        }))

        await asyncio.sleep(1)
        # Subscribe to orders channel
        await ws.send(json.dumps({
            "op": "subscribe",
            "args": [{"channel": "orders", "instId": "BTC-USDT"}]
        }))
        
        # 3. Place limit buy order
        order_request = {
            "instId": "BTC-USDT",
            "marginMode": "cross",
            "side": "buy",
            "orderType": "limit", 
            "price": str(limit_price),
            "size": "0.1",  # See /api/v1/market/instruments for contract sizes
            "leverage": "3",
            "positionSide": "long"
        }
        # order_request["brokerId"] = "your broker id" #if needed
        # Generate signature for REST API
        timestamp = str(int(time.time() * 1000))
        nonce = timestamp  # Use timestamp as nonce for consistency
        path = "/api/v1/trade/order"
        method = "POST"
        msg = f"{path}{method}{timestamp}{nonce}{json.dumps(order_request)}"
        print('msg:', msg)
        hex_signature = hmac.new(
            secret.encode('utf-8'),
            msg.encode('utf-8'),
            hashlib.sha256
        ).hexdigest().encode('utf-8')
        signature = base64.b64encode(hex_signature).decode()
        
        # Prepare headers with broker ID
        headers = {
            "ACCESS-KEY": api_key,
            "ACCESS-SIGN": signature,
            "ACCESS-TIMESTAMP": timestamp,
            "ACCESS-NONCE": nonce,
            "ACCESS-PASSPHRASE": passphrase,
            "Content-Type": "application/json"
        }
        
        # Place order
        response = requests.post(
            "https://openapi.blofin.com/api/v1/trade/order",
            headers=headers,
            json=order_request
        )
        response.raise_for_status()
        order_response = response.json()
        
        # Verify response format and success
        if not isinstance(order_response, dict):
            raise Exception(f"Invalid order response format: {order_response}")
            
        if "code" in order_response and order_response["code"] != "0":
            raise Exception(f"Order API error: {order_response}")
            
        if "data" not in order_response:
            raise Exception(f"No data in order response: {order_response}")
            
        order_id = order_response["data"][0]["orderId"]
        print(f"Order placed: {order_id}")
        
        # 4. Wait for order confirmation
        async def listen_for_confirmation():
            while True:
                data = json.loads(await ws.recv())
                if data.get("action") == "update":
                    for order in data.get("data", []):
                        if order.get("orderId") == order_id:
                            return order
                            
        try:
            order_update = await asyncio.wait_for(
                listen_for_confirmation(),
                timeout=10
            )
            print(f"Order confirmed: {order_update}")
        except asyncio.TimeoutError:
            print("Timeout waiting for order confirmation")
            raise
        
        # 5. Cancel order
        # Generate new signature for cancel request
        timestamp = str(int(time.time() * 1000))
        nonce = timestamp
        path = "/api/v1/trade/cancel-order"
        method = "POST"
        cancel_request = {"orderId": order_id}
        msg = f"{path}{method}{timestamp}{nonce}{json.dumps(cancel_request)}"
        hex_signature = hmac.new(
            secret.encode('utf-8'),
            msg.encode('utf-8'),
            hashlib.sha256
        ).hexdigest().encode('utf-8')
        signature = base64.b64encode(hex_signature).decode()
        
        # Update headers with new signature
        headers.update({
            "ACCESS-SIGN": signature,
            "ACCESS-TIMESTAMP": timestamp,
            "ACCESS-NONCE": nonce
        })
        
        response = requests.post(
            "https://openapi.blofin.com/api/v1/trade/cancel-order",
            headers=headers,
            json=cancel_request
        )
        response.raise_for_status()
        print("Order canceled")
        
        # Clean up WebSocket connection
        await ws.close()
        
    except Exception as e:
        print(f"Error: {str(e)}")
        if isinstance(e, requests.exceptions.RequestException):
            print(f"Request error details: {e.response.text if e.response else 'No response'}")
        if 'ws' in locals():
            await ws.close()
        raise  # Re-raise the exception after cleanup

if __name__ == "__main__":
    asyncio.run(trading_example())