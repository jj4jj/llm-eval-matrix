from fastapi import FastAPI, HTTPException, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
import uuid
from datetime import datetime
import os
from sqlalchemy.orm import Session
from database import db_manager, get_db
from database import Model as DBModel, Dataset as DBDataset, DatasetItem as DBDatasetItem
from database import EvaluationRun as DBEvaluationRun, EvaluationResult as DBEvaluationResult
from db_utils import init_database, generate_sample_data, get_database_stats

app = FastAPI(title="EvalMatrix Backend", version="2.0.0")

# Initialize database on startup
init_database()

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for API requests/responses
class DatasetItem(BaseModel):
    id: str
    input: str | dict
    reference: Optional[str] = None

class Dataset(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    createdAt: str
    items: List[DatasetItem]
    itemCount: int = 0

class LLMModel(BaseModel):
    id: str
    name: str
    provider: str
    baseUrl: str
    apiKey: str
    modelId: str
    config: Optional[Dict[str, Any]] = None

class EvaluationRun(BaseModel):
    id: str
    name: str
    datasetId: str
    modelIds: List[str]
    status: str
    progress: float
    total: int
    completed: int
    failed: int
    createdAt: str
    startedAt: Optional[str] = None
    completedAt: Optional[str] = None
    configSnapshot: Optional[Dict[str, Any]] = None

class EvaluationResult(BaseModel):
    id: str
    runId: str
    datasetItemId: str
    modelId: str
    input: str
    expected: Optional[str] = None
    actual: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None
    status: str
    error: Optional[str] = None
    processingTimeMs: Optional[int] = None

# Helper functions
def db_model_to_pydantic(db_model: DBModel) -> LLMModel:
    """Convert database model to Pydantic model"""
    return LLMModel(
        id=db_model.id,
        name=db_model.name,
        provider=db_model.provider,
        baseUrl=db_model.base_url or "",
        apiKey=db_model.api_key or "",
        modelId=db_model.model_id,
        config=json.loads(db_model.config) if db_model.config else None
    )

def db_dataset_to_pydantic(db_dataset: DBDataset) -> Dataset:
    """Convert database dataset to Pydantic model"""
    items = []
    for item in db_dataset.items:
        items.append(DatasetItem(
            id=item.id,
            input=item.input_text,
            reference=item.reference_output
        ))
    
    return Dataset(
        id=db_dataset.id,
        name=db_dataset.name,
        description=db_dataset.description,
        createdAt=db_dataset.created_at.isoformat(),
        items=items,
        itemCount=len(items)
    )

def db_run_to_pydantic(db_run: DBEvaluationRun) -> EvaluationRun:
    """Convert database evaluation run to Pydantic model"""
    return EvaluationRun(
        id=db_run.id,
        name=db_run.name,
        datasetId=db_run.dataset_id,
        modelIds=json.loads(db_run.model_ids),
        status=db_run.status,
        progress=db_run.progress,
        total=db_run.total_items,
        completed=db_run.completed_items,
        failed=db_run.failed_items,
        createdAt=db_run.created_at.isoformat(),
        startedAt=db_run.started_at.isoformat() if db_run.started_at else None,
        completedAt=db_run.completed_at.isoformat() if db_run.completed_at else None,
        configSnapshot=json.loads(db_run.config_snapshot) if db_run.config_snapshot else None
    )

# API端点
@app.get("/")
def read_root():
    return {"message": "EvalMatrix Backend is running", "version": "2.0.0", "database": "SQLite"}

@app.get("/api/datasets")
def get_datasets(db: Session = Depends(get_db)) -> List[Dataset]:
    """Get all datasets"""
    db_datasets = db.query(DBDataset).all()
    return [db_dataset_to_pydantic(dataset) for dataset in db_datasets]

@app.post("/api/datasets")
async def create_dataset(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Create a new dataset from uploaded file"""
    try:
        content = await file.read()
        lines = content.decode('utf-8').strip().split('\n')
        
        items = []
        for i, line in enumerate(lines):
            try:
                data = json.loads(line)
                item = DatasetItem(
                    id=str(uuid.uuid4()),
                    input=data.get('input', data.get('prompt', '')),
                    reference=data.get('reference', data.get('output'))
                )
                items.append(item)
            except json.JSONDecodeError:
                continue
        
        # Create database dataset
        db_dataset = DBDataset(
            id=str(uuid.uuid4()),
            name=file.filename,
            description=f"Dataset uploaded from {file.filename}",
            file_name=file.filename,
            file_size=len(content),
            item_count=len(items)
        )
        db.add(db_dataset)
        db.flush()
        
        # Create dataset items
        for item in items:
            db_item = DBDatasetItem(
                id=item.id,
                dataset_id=db_dataset.id,
                input_text=str(item.input),
                reference_output=item.reference
            )
            db.add(db_item)
        
        db.commit()
        return db_dataset_to_pydantic(db_dataset)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/datasets/{dataset_id}")
def get_dataset(dataset_id: str, db: Session = Depends(get_db)) -> Dataset:
    """Get a specific dataset"""
    db_dataset = db.query(DBDataset).filter(DBDataset.id == dataset_id).first()
    if not db_dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return db_dataset_to_pydantic(db_dataset)

@app.get("/api/models")
def get_models(db: Session = Depends(get_db)) -> List[LLMModel]:
    """Get all models"""
    db_models = db.query(DBModel).all()
    return [db_model_to_pydantic(model) for model in db_models]

@app.post("/api/models")
def create_model(model: LLMModel, db: Session = Depends(get_db)):
    """Create a new model"""
    if not model.id:
        model.id = str(uuid.uuid4())
    
    # Check if model already exists
    existing = db.query(DBModel).filter(DBModel.id == model.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Model with this ID already exists")
    
    db_model = DBModel(
        id=model.id,
        name=model.name,
        provider=model.provider,
        base_url=model.baseUrl,
        api_key=model.apiKey,
        model_id=model.modelId,
        config=json.dumps(model.config) if model.config else None
    )
    db.add(db_model)
    db.commit()
    
    return db_model_to_pydantic(db_model)

@app.delete("/api/models/{model_id}")
def delete_model(model_id: str, db: Session = Depends(get_db)):
    """Delete a model"""
    db_model = db.query(DBModel).filter(DBModel.id == model_id).first()
    if not db_model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    db.delete(db_model)
    db.commit()
    return {"message": "Model deleted successfully"}

@app.get("/api/runs")
def get_runs(db: Session = Depends(get_db)) -> List[EvaluationRun]:
    """Get all evaluation runs"""
    db_runs = db.query(DBEvaluationRun).all()
    return [db_run_to_pydantic(run) for run in db_runs]

@app.post("/api/runs")
def create_run(config: dict, db: Session = Depends(get_db)):
    """Create a new evaluation run"""
    run_id = str(uuid.uuid4())
    
    # Get dataset to determine total items
    dataset = db.query(DBDataset).filter(DBDataset.id == config.get("datasetId")).first()
    total_items = dataset.item_count if dataset else 0
    
    db_run = DBEvaluationRun(
        id=run_id,
        name=config.get("name", f"Evaluation Run {run_id[:8]}"),
        dataset_id=config.get("datasetId", ""),
        model_ids=json.dumps(config.get("modelIds", [])),
        status="pending",
        progress=0.0,
        total_items=total_items,
        completed_items=0,
        failed_items=0,
        config_snapshot=json.dumps(config),
        created_at=datetime.now()
    )
    db.add(db_run)
    db.commit()
    
    return db_run_to_pydantic(db_run)

@app.get("/api/runs/{run_id}")
def get_run(run_id: str, db: Session = Depends(get_db)) -> EvaluationRun:
    """Get a specific evaluation run"""
    db_run = db.query(DBEvaluationRun).filter(DBEvaluationRun.id == run_id).first()
    if not db_run:
        raise HTTPException(status_code=404, detail="Run not found")
    return db_run_to_pydantic(db_run)

@app.put("/api/runs/{run_id}")
def update_run(run_id: str, updates: dict, db: Session = Depends(get_db)):
    """Update an evaluation run"""
    db_run = db.query(DBEvaluationRun).filter(DBEvaluationRun.id == run_id).first()
    if not db_run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    # Update fields
    if "status" in updates:
        db_run.status = updates["status"]
    if "progress" in updates:
        db_run.progress = updates["progress"]
    if "completed" in updates:
        db_run.completed_items = updates["completed"]
    if "failed" in updates:
        db_run.failed_items = updates["failed"]
    if "startedAt" in updates:
        db_run.started_at = datetime.fromisoformat(updates["startedAt"].replace('Z', '+00:00'))
    if "completedAt" in updates:
        db_run.completed_at = datetime.fromisoformat(updates["completedAt"].replace('Z', '+00:00'))
    
    db.commit()
    return db_run_to_pydantic(db_run)

@app.get("/api/runs/{run_id}/results")
def get_run_results(run_id: str, db: Session = Depends(get_db)) -> List[EvaluationResult]:
    """Get evaluation results for a specific run"""
    db_results = db.query(DBEvaluationResult).filter(DBEvaluationResult.run_id == run_id).all()
    
    results = []
    for db_result in db_results:
        results.append(EvaluationResult(
            id=db_result.id,
            runId=db_result.run_id,
            datasetItemId=db_result.dataset_item_id,
            modelId=db_result.model_id,
            input=db_result.input_text,
            expected=db_result.expected_output,
            actual=db_result.actual_output,
            metrics=json.loads(db_result.metrics) if db_result.metrics else None,
            status=db_result.status,
            error=db_result.error_message,
            processingTimeMs=db_result.processing_time_ms
        ))
    
    return results

@app.post("/api/runs/{run_id}/results")
def create_run_result(run_id: str, result: dict, db: Session = Depends(get_db)):
    """Create an evaluation result"""
    db_result = DBEvaluationResult(
        id=str(uuid.uuid4()),
        run_id=run_id,
        dataset_item_id=result.get("datasetItemId", ""),
        model_id=result.get("modelId", ""),
        input_text=result.get("input", ""),
        expected_output=result.get("expected"),
        actual_output=result.get("actual"),
        metrics=json.dumps(result.get("metrics")) if result.get("metrics") else None,
        status=result.get("status", "pending"),
        error_message=result.get("error"),
        processing_time_ms=result.get("processingTimeMs")
    )
    db.add(db_result)
    
    # Update run statistics
    db_run = db.query(DBEvaluationRun).filter(DBEvaluationRun.id == run_id).first()
    if db_run:
        db_run.completed_items += 1
        db_run.progress = db_run.completed_items / max(db_run.total_items, 1)
        
        # Update run status if all items are completed
        if db_run.completed_items >= db_run.total_items:
            db_run.status = "completed"
            db_run.completed_at = datetime.now()
    
    db.commit()
    return {"message": "Result created successfully"}

@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    """Get database statistics"""
    return get_database_stats()

@app.post("/api/generate-sample-data")
def generate_sample_data_endpoint(db: Session = Depends(get_db)):
    """Generate sample data for testing"""
    stats = generate_sample_data()
    return {"message": "Sample data generated successfully", "stats": stats}

# 健康检查端点
@app.get("/health")
def health_check():
    return {
        "status": "healthy", 
        "timestamp": datetime.now().isoformat(),
        "database": "connected"
    }

@app.get("/api/health")
def api_health_check():
    return {
        "status": "healthy", 
        "service": "EvalMatrix API", 
        "timestamp": datetime.now().isoformat(),
        "database": "connected"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)