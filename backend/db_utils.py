"""
Database utilities for data migration and management
"""
import json
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from database import db_manager, Model, Dataset, DatasetItem, EvaluationRun, EvaluationResult, ApiKey

def init_database():
    """Initialize the database with tables"""
    db_manager.init_db()
    print("Database initialized successfully")

def migrate_from_localstorage(data: Dict[str, Any]) -> Dict[str, int]:
    """Migrate data from localStorage format to database
    
    Args:
        data: Dictionary containing localStorage data with keys like 'models', 'datasets', 'runs'
        
    Returns:
        Dictionary with migration statistics
    """
    stats = {
        'models_migrated': 0,
        'datasets_migrated': 0,
        'dataset_items_migrated': 0,
        'runs_migrated': 0,
        'results_migrated': 0,
        'errors': []
    }
    
    session = db_manager.get_session()
    
    try:
        # Migrate models
        if 'models' in data:
            for model_data in data['models']:
                try:
                    # Check if model already exists
                    existing = session.query(Model).filter_by(id=model_data.get('id')).first()
                    if existing:
                        continue
                        
                    model = Model(
                        id=model_data.get('id', str(uuid.uuid4())),
                        name=model_data.get('name', ''),
                        provider=model_data.get('provider', ''),
                        base_url=model_data.get('baseUrl', ''),
                        api_key=model_data.get('apiKey', ''),
                        model_id=model_data.get('modelId', ''),
                        config=json.dumps(model_data.get('config', {}))
                    )
                    session.add(model)
                    stats['models_migrated'] += 1
                except Exception as e:
                    stats['errors'].append(f"Error migrating model {model_data.get('id', 'unknown')}: {str(e)}")
        
        # Migrate datasets
        if 'datasets' in data:
            for dataset_data in data['datasets']:
                try:
                    # Check if dataset already exists
                    existing = session.query(Dataset).filter_by(id=dataset_data.get('id')).first()
                    if existing:
                        continue
                        
                    dataset = Dataset(
                        id=dataset_data.get('id', str(uuid.uuid4())),
                        name=dataset_data.get('name', ''),
                        description=dataset_data.get('description', ''),
                        file_name=dataset_data.get('fileName', ''),
                        file_path=dataset_data.get('filePath', ''),
                        file_size=dataset_data.get('fileSize', 0),
                        item_count=dataset_data.get('itemCount', 0)
                    )
                    session.add(dataset)
                    stats['datasets_migrated'] += 1
                    
                    # Migrate dataset items
                    if 'items' in dataset_data:
                        for item_data in dataset_data['items']:
                            try:
                                item = DatasetItem(
                                    id=item_data.get('id', str(uuid.uuid4())),
                                    dataset_id=dataset.id,
                                    input_text=item_data.get('input', ''),
                                    reference_output=item_data.get('reference', ''),
                                    item_metadata=json.dumps(item_data.get('metadata', {}))
                                )
                                session.add(item)
                                stats['dataset_items_migrated'] += 1
                            except Exception as e:
                                stats['errors'].append(f"Error migrating dataset item: {str(e)}")
                                
                except Exception as e:
                    stats['errors'].append(f"Error migrating dataset {dataset_data.get('id', 'unknown')}: {str(e)}")
        
        # Migrate evaluation runs
        if 'runs' in data:
            for run_data in data['runs']:
                try:
                    # Check if run already exists
                    existing = session.query(EvaluationRun).filter_by(id=run_data.get('id')).first()
                    if existing:
                        continue
                        
                    # Parse timestamps
                    created_at = None
                    started_at = None
                    completed_at = None
                    
                    if 'createdAt' in run_data:
                        try:
                            created_at = datetime.fromisoformat(run_data['createdAt'].replace('Z', '+00:00'))
                        except:
                            pass
                            
                    if 'startedAt' in run_data:
                        try:
                            started_at = datetime.fromisoformat(run_data['startedAt'].replace('Z', '+00:00'))
                        except:
                            pass
                            
                    if 'completedAt' in run_data:
                        try:
                            completed_at = datetime.fromisoformat(run_data['completedAt'].replace('Z', '+00:00'))
                        except:
                            pass
                    
                    run = EvaluationRun(
                        id=run_data.get('id', str(uuid.uuid4())),
                        name=run_data.get('name', ''),
                        dataset_id=run_data.get('datasetId', ''),
                        model_ids=json.dumps(run_data.get('modelIds', [])),
                        status=run_data.get('status', 'pending'),
                        progress=run_data.get('progress', 0.0),
                        total_items=run_data.get('total', 0),
                        completed_items=run_data.get('completed', 0),
                        failed_items=run_data.get('failed', 0),
                        config_snapshot=json.dumps(run_data.get('configSnapshot', {})),
                        created_at=created_at,
                        started_at=started_at,
                        completed_at=completed_at
                    )
                    session.add(run)
                    stats['runs_migrated'] += 1
                    
                    # Migrate evaluation results
                    if 'results' in run_data:
                        for result_data in run_data['results']:
                            try:
                                result = EvaluationResult(
                                    id=result_data.get('id', str(uuid.uuid4())),
                                    run_id=run.id,
                                    dataset_item_id=result_data.get('datasetItemId', ''),
                                    model_id=result_data.get('modelId', ''),
                                    input_text=result_data.get('input', ''),
                                    expected_output=result_data.get('expected', ''),
                                    actual_output=result_data.get('actual', ''),
                                    metrics=json.dumps(result_data.get('metrics', {})),
                                    status=result_data.get('status', 'pending'),
                                    error_message=result_data.get('error'),
                                    processing_time_ms=result_data.get('processingTimeMs')
                                )
                                session.add(result)
                                stats['results_migrated'] += 1
                            except Exception as e:
                                stats['errors'].append(f"Error migrating result: {str(e)}")
                                
                except Exception as e:
                    stats['errors'].append(f"Error migrating run {run_data.get('id', 'unknown')}: {str(e)}")
        
        session.commit()
        
    except Exception as e:
        session.rollback()
        stats['errors'].append(f"Database error during migration: {str(e)}")
        raise
    finally:
        session.close()
    
    return stats

def generate_sample_data() -> Dict[str, int]:
    """Generate sample data for testing
    
    Returns:
        Dictionary with generation statistics
    """
    stats = {
        'models_created': 0,
        'datasets_created': 0,
        'dataset_items_created': 0,
        'runs_created': 0,
        'results_created': 0
    }
    
    session = db_manager.get_session()
    
    try:
        # Create sample models
        sample_models = [
            {
                'id': 'model-1',
                'name': 'GPT-3.5 Turbo',
                'provider': 'openai',
                'base_url': 'https://api.openai.com/v1',
                'api_key': 'sk-demo-key-1',
                'model_id': 'gpt-3.5-turbo',
                'config': {'temperature': 0.7, 'max_tokens': 1000}
            },
            {
                'id': 'model-2', 
                'name': 'Claude 3 Haiku',
                'provider': 'anthropic',
                'base_url': 'https://api.anthropic.com/v1',
                'api_key': 'sk-demo-key-2',
                'model_id': 'claude-3-haiku-20240307',
                'config': {'temperature': 0.8, 'max_tokens': 2000}
            },
            {
                'id': 'model-3',
                'name': 'Gemini Pro',
                'provider': 'google',
                'base_url': 'https://generativelanguage.googleapis.com/v1',
                'api_key': 'demo-key-3',
                'model_id': 'gemini-pro',
                'config': {'temperature': 0.9, 'max_tokens': 1500}
            }
        ]
        
        for model_data in sample_models:
            model = Model(
                id=model_data['id'],
                name=model_data['name'],
                provider=model_data['provider'],
                base_url=model_data['base_url'],
                api_key=model_data['api_key'],
                model_id=model_data['model_id'],
                config=json.dumps(model_data['config'])
            )
            session.add(model)
            stats['models_created'] += 1
        
        # Create sample datasets
        sample_datasets = [
            {
                'id': 'dataset-1',
                'name': '中文问答测试集',
                'description': '包含100个中文问答对，用于测试模型的中文理解能力',
                'file_name': 'chinese_qa.jsonl',
                'file_path': '/uploads/datasets/chinese_qa.jsonl',
                'file_size': 1024000,
                'item_count': 100
            },
            {
                'id': 'dataset-2',
                'name': '英文翻译测试集',
                'description': '包含50个中英文翻译对，用于测试翻译能力',
                'file_name': 'translation_en_zh.jsonl',
                'file_path': '/uploads/datasets/translation_en_zh.jsonl',
                'file_size': 512000,
                'item_count': 50
            }
        ]
        
        for dataset_data in sample_datasets:
            dataset = Dataset(
                id=dataset_data['id'],
                name=dataset_data['name'],
                description=dataset_data['description'],
                file_name=dataset_data['file_name'],
                file_path=dataset_data['file_path'],
                file_size=dataset_data['file_size'],
                item_count=dataset_data['item_count']
            )
            session.add(dataset)
            stats['datasets_created'] += 1
            
            # Create sample dataset items
            if dataset_data['id'] == 'dataset-1':
                sample_items = [
                    {'input': '中国的首都是哪里？', 'reference': '中国的首都是北京。'},
                    {'input': '请解释机器学习的概念', 'reference': '机器学习是人工智能的一个分支，让计算机通过数据学习规律。'},
                    {'input': '什么是深度学习？', 'reference': '深度学习是使用多层神经网络进行机器学习的方法。'},
                    {'input': '请介绍Python编程语言', 'reference': 'Python是一种高级编程语言，以简洁易读著称。'},
                    {'input': '人工智能和机器学习的关系？', 'reference': '机器学习是实现人工智能的一种技术手段。'}
                ]
            else:
                sample_items = [
                    {'input': 'Hello, how are you?', 'reference': '你好，你好吗？'},
                    {'input': 'The weather is nice today.', 'reference': '今天天气很好。'},
                    {'input': 'I love programming.', 'reference': '我热爱编程。'},
                    {'input': 'Machine learning is fascinating.', 'reference': '机器学习很迷人。'},
                    {'input': 'Good morning!', 'reference': '早上好！'}
                ]
            
            for i, item_data in enumerate(sample_items):
                item = DatasetItem(
                    id=f"{dataset_data['id']}-item-{i+1}",
                    dataset_id=dataset_data['id'],
                    input_text=item_data['input'],
                    reference_output=item_data['reference'],
                    item_metadata=json.dumps({'difficulty': 'medium', 'category': 'general'})
                )
                session.add(item)
                stats['dataset_items_created'] += 1
        
        # Create sample evaluation runs
        sample_runs = [
            {
                'id': 'run-1',
                'name': '中文问答评测 - GPT-3.5 vs Claude',
                'dataset_id': 'dataset-1',
                'model_ids': ['model-1', 'model-2'],
                'status': 'completed',
                'progress': 1.0,
                'total_items': 5,
                'completed_items': 5,
                'failed_items': 0
            },
            {
                'id': 'run-2',
                'name': '翻译能力评测 - 多模型对比',
                'dataset_id': 'dataset-2',
                'model_ids': ['model-1', 'model-2', 'model-3'],
                'status': 'running',
                'progress': 0.6,
                'total_items': 5,
                'completed_items': 3,
                'failed_items': 0
            }
        ]
        
        for run_data in sample_runs:
            run = EvaluationRun(
                id=run_data['id'],
                name=run_data['name'],
                dataset_id=run_data['dataset_id'],
                model_ids=json.dumps(run_data['model_ids']),
                status=run_data['status'],
                progress=run_data['progress'],
                total_items=run_data['total_items'],
                completed_items=run_data['completed_items'],
                failed_items=run_data['failed_items'],
                config_snapshot=json.dumps({'batch_size': 10, 'timeout': 30})
            )
            session.add(run)
            stats['runs_created'] += 1
            
            # Create sample evaluation results for completed run
            if run_data['id'] == 'run-1':
                for i in range(5):
                    result = EvaluationResult(
                        id=f"{run_data['id']}-result-{i+1}",
                        run_id=run_data['id'],
                        dataset_item_id=f"dataset-1-item-{i+1}",
                        model_id='model-1' if i < 3 else 'model-2',
                        input_text=f"测试输入 {i+1}",
                        expected_output=f"期望输出 {i+1}",
                        actual_output=f"实际输出 {i+1}",
                        metrics=json.dumps({'accuracy': 0.85, 'relevance': 0.9, 'fluency': 0.8}),
                        status='completed',
                        processing_time_ms=1200 + i * 100
                    )
                    session.add(result)
                    stats['results_created'] += 1
        
        session.commit()
        
    except Exception as e:
        session.rollback()
        raise
    finally:
        session.close()
    
    return stats

def clear_all_data():
    """Clear all data from database (use with caution)"""
    session = db_manager.get_session()
    try:
        # Delete in reverse order to respect foreign key constraints
        session.query(EvaluationResult).delete()
        session.query(EvaluationRun).delete()
        session.query(DatasetItem).delete()
        session.query(Dataset).delete()
        session.query(Model).delete()
        session.query(ApiKey).delete()
        session.commit()
        print("All data cleared from database")
    except Exception as e:
        session.rollback()
        raise
    finally:
        session.close()

def get_database_stats() -> Dict[str, int]:
    """Get statistics about the database contents"""
    session = db_manager.get_session()
    try:
        stats = {
            'models': session.query(Model).count(),
            'datasets': session.query(Dataset).count(),
            'dataset_items': session.query(DatasetItem).count(),
            'evaluation_runs': session.query(EvaluationRun).count(),
            'evaluation_results': session.query(EvaluationResult).count(),
            'api_keys': session.query(ApiKey).count()
        }
        return stats
    finally:
        session.close()