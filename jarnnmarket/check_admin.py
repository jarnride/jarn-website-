from pymongo import MongoClient
import json

try:
    client = MongoClient('mongodb://localhost:27017', serverSelectionTimeoutMS=5000)
    db = client['test_database']
    
    # Test connection
    db.command('ping')
    print("✅ MongoDB connected!")
    
    # Check admin user
    admin = db.users.find_one({'email': 'admin@jarnnmarket.com'})
    
    if admin:
        print("\n✅ Admin user FOUND!")
        print(json.dumps({
            'email': admin.get('email'),
            'name': admin.get('name'),
            'role': admin.get('role')
        }, indent=2))
    else:
        print("\n❌ Admin user NOT found!")
        print("\nAll users in database:")
        for user in db.users.find():
            print(f"  - {user.get('email')} | {user.get('name')}")
            
except Exception as e:
    print(f"❌ Error: {e}")
