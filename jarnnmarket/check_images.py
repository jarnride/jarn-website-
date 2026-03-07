from pymongo import MongoClient
import json

client = MongoClient('mongodb://localhost:27017')
db = client['test_database']

# Get first auction to check image_url structure
auction = db.auctions.find_one()

if auction:
    print("First Auction Image Data:")
    print(json.dumps({
        'image_url': auction.get('image_url'),
        'image_ids': auction.get('image_ids'),
        'title': auction.get('title')
    }, indent=2, default=str))
else:
    print("No auctions found")
