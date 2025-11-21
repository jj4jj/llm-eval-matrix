"""
Data migration script for importing localStorage data to database
Usage: python migrate_data.py <localStorage_data.json>
"""
import json
import sys
import os
from datetime import datetime
from db_utils import migrate_from_localstorage, init_database, get_database_stats

def load_localstorage_data(file_path):
    """Load localStorage data from JSON file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading file {file_path}: {e}")
        return None

def create_sample_localstorage_data():
    """Create sample localStorage data for testing"""
    return {
        "models": [
            {
                "id": "model-local-1",
                "name": "GPT-4 Local",
                "provider": "openai",
                "baseUrl": "https://api.openai.com/v1",
                "apiKey": "sk-local-key-1",
                "modelId": "gpt-4",
                "config": {"temperature": 0.7, "max_tokens": 2000}
            },
            {
                "id": "model-local-2",
                "name": "Claude 3 Sonnet Local",
                "provider": "anthropic",
                "baseUrl": "https://api.anthropic.com/v1",
                "apiKey": "sk-local-key-2",
                "modelId": "claude-3-sonnet-20240229",
                "config": {"temperature": 0.8, "max_tokens": 3000}
            }
        ],
        "datasets": [
            {
                "id": "dataset-local-1",
                "name": "本地测试数据集",
                "description": "从本地存储导入的测试数据",
                "fileName": "local_test.jsonl",
                "filePath": "/uploads/local_test.jsonl",
                "fileSize": 2048,
                "itemCount": 10,
                "items": [
                    {
                        "id": "item-local-1",
                        "input": "这是一个本地测试问题？",
                        "reference": "这是本地测试答案。"
                    },
                    {
                        "id": "item-local-2",
                        "input": "本地存储的数据如何导入？",
                        "reference": "使用迁移工具可以导入本地存储的数据。"
                    }
                ]
            }
        ],
        "runs": [
            {
                "id": "run-local-1",
                "name": "本地评测任务",
                "datasetId": "dataset-local-1",
                "modelIds": ["model-local-1", "model-local-2"],
                "status": "completed",
                "progress": 1.0,
                "total": 2,
                "completed": 2,
                "failed": 0,
                "createdAt": datetime.now().isoformat(),
                "startedAt": datetime.now().isoformat(),
                "completedAt": datetime.now().isoformat(),
                "configSnapshot": {"batch_size": 5, "timeout": 60},
                "results": [
                    {
                        "id": "result-local-1",
                        "datasetItemId": "item-local-1",
                        "modelId": "model-local-1",
                        "input": "这是一个本地测试问题？",
                        "expected": "这是本地测试答案。",
                        "actual": "这是一个测试回答。",
                        "metrics": {"accuracy": 0.8, "relevance": 0.9},
                        "status": "completed",
                        "processingTimeMs": 1500
                    }
                ]
            }
        ]
    }

def main():
    """Main migration function"""
    print("=== EvalMatrix Data Migration Tool ===")
    print(f"Migration started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Initialize database
    print("\n1. Initializing database...")
    init_database()
    
    # Check if data file is provided
    if len(sys.argv) > 1:
        data_file = sys.argv[1]
        print(f"\n2. Loading data from file: {data_file}")
        data = load_localstorage_data(data_file)
        if not data:
            print("Failed to load data file. Exiting.")
            return
    else:
        print("\n2. No data file provided. Creating sample data for testing...")
        data = create_sample_localstorage_data()
        print("Sample data created successfully.")
    
    # Show current database stats before migration
    print("\n3. Database statistics before migration:")
    before_stats = get_database_stats()
    for key, value in before_stats.items():
        print(f"  {key}: {value}")
    
    # Migrate data
    print("\n4. Starting data migration...")
    try:
        migration_stats = migrate_from_localstorage(data)
        
        print("\nMigration completed successfully!")
        print(f"Models migrated: {migration_stats['models_migrated']}")
        print(f"Datasets migrated: {migration_stats['datasets_migrated']}")
        print(f"Dataset items migrated: {migration_stats['dataset_items_migrated']}")
        print(f"Runs migrated: {migration_stats['runs_migrated']}")
        print(f"Results migrated: {migration_stats['results_migrated']}")
        
        if migration_stats['errors']:
            print(f"\nErrors encountered: {len(migration_stats['errors'])}")
            for error in migration_stats['errors']:
                print(f"  - {error}")
        
    except Exception as e:
        print(f"\nMigration failed with error: {e}")
        return
    
    # Show database stats after migration
    print("\n5. Database statistics after migration:")
    after_stats = get_database_stats()
    for key, value in after_stats.items():
        print(f"  {key}: {value}")
    
    print(f"\n=== Migration finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===")
    print("\nYou can now start the backend server and access your migrated data!")

if __name__ == "__main__":
    main()