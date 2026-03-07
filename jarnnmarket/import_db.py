from pymongo import MongoClient
import json
from pathlib import Path

client = MongoClient('mongodb://localhost:27017')
db = client['test_database']

backup_path = Path('database_backup/database_export')
collections = ['users', 'auctions', 'bids', 'offers', 'messages', 'payment_transactions', 'email_verifications', 'wishlists', 'settings']

print("Importing data to MongoDB...\n")

for collection_name in collections:
    json_file = backup_path / f'{collection_name}.json'
    if json_file.exists():
        try:
            with open(json_file, 'r') as f:
                data = json.load(f)
            
            if isinstance(data, list) and len(data) > 0:
                db[collection_name].delete_many({})
                result = db[collection_name].insert_many(data)
                print(f'✓ {collection_name}: {len(result)} documents')
            else:
                print(f'✗ {collection_name}: empty')
        except Exception as e:
            print(f'✗ {collection_name}: {str(e)}')
    else:
        print(f'✗ {collection_name}: file not found')

print('\n✓ Database import complete!')
