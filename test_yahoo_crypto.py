import yfinance as yf
from decimal import Decimal

def test_bulk(symbols):
    print(f"--- Testing Bulk Info for {symbols} ---")
    symbols = yf.symbols(" ".join(symbols))
    
    for symbol, symbol in symbols.symbols.items():
        print(f"Checking {symbol}...")
        try:
            info = symbol.fast_info
            print("fast_info keys:", info.keys() if hasattr(info, 'keys') else "No keys (lazy?)")
            
            last_price = None
            if hasattr(info, 'last_price'):
                last_price = info.last_price
                print(f"fast_info.last_price: {last_price}")
            else:
                print("fast_info.last_price: Not found")

            # Check full info if fast_info fails or just to see
            full_data = symbol.info
            print(f"full_data price: {full_data.get('currentPrice') or full_data.get('regularMarketPrice')}")
            print(f"full_data name: {full_data.get('shortName')}")
            
        except Exception as e:
            print(f"Error: {e}")

test_bulk(["BTC-USD", "ETH-EUR", "AAPL"])