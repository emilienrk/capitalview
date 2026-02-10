import requests
import json

def test_search(query):
    print(f"--- Searching for '{query}' ---")
    url = "https://query2.finance.yahoo.com/v1/finance/search"
    params = {
        "q": query,
        "quotesCount": 15,
        "newsCount": 0,
        "enableFuzzyQuery": False,
        "quotesQueryId": "tss_match_phrase_query"
    }
    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        resp = requests.get(url, params=params, headers=headers, timeout=5)
        data = resp.json()
        
        if "quotes" in data:
            for quote in data["quotes"]:
                print(f"Symbol: {quote.get('symbol')}, Name: {quote.get('shortname')}, Type: {quote.get('quoteType')}, isYahoo: {quote.get('isYahooFinance')}")
        else:
            print("No quotes found.")
    except Exception as e:
        print(f"Error: {e}")

test_search("Apple")
test_search("Bitcoin")
test_search("BTC-USD")
test_search("Air Liquide")
