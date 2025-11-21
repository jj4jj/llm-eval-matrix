"""
Database configuration and models for EvalMatrix
"""
import json
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import create_engine, Column, String, Text, Integer, Float, DateTime, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session
from sqlalchemy.sql import func
import aiosqlite
import os

Base = declarative_base()

class Model(Base):
    """LLM Model configuration"""
    __tablename__ = "models"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    provider = Column(String, nullable=False)
    base_url = Column(String)
    api_key = Column(String)  # Will be encrypted in production
    model_id = Column(String, nullable=False)
    config = Column(Text)  # JSON string for additional configuration
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    evaluation_results = relationship("EvaluationResult", back_populates="model")

class Dataset(Base):
    """Dataset metadata"""
    __tablename__ = "datasets"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String)
    file_name = Column(String)
    file_path = Column(String)
    file_size = Column(Integer)
    item_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    items = relationship("DatasetItem", back_populates="dataset", cascade="all, delete-orphan")
    evaluation_runs = relationship("EvaluationRun", back_populates="dataset")

class DatasetItem(Base):
    """Individual dataset entries"""
    __tablename__ = "dataset_items"
    
    id = Column(String, primary_key=True)
    dataset_id = Column(String, ForeignKey("datasets.id", ondelete="CASCADE"))
    input_text = Column(Text, nullable=False)
    reference_output = Column(Text)
    item_metadata = Column(Text)  # JSON string for additional metadata
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    dataset = relationship("Dataset", back_populates="items")
    evaluation_results = relationship("EvaluationResult", back_populates="dataset_item")

class EvaluationRun(Base):
    """Evaluation task information"""
    __tablename__ = "evaluation_runs"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    dataset_id = Column(String, ForeignKey("datasets.id"))
    model_ids = Column(Text, nullable=False)  # JSON array of model IDs
    status = Column(String, nullable=False, default='pending')  # pending, running, completed, failed
    progress = Column(Float, default=0.0)
    total_items = Column(Integer, default=0)
    completed_items = Column(Integer, default=0)
    failed_items = Column(Integer, default=0)
    config_snapshot = Column(Text)  # JSON string of evaluation configuration
    created_at = Column(DateTime, default=func.now())
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    dataset = relationship("Dataset", back_populates="evaluation_runs")
    evaluation_results = relationship("EvaluationResult", back_populates="evaluation_run", cascade="all, delete-orphan")

class EvaluationResult(Base):
    """Individual evaluation results"""
    __tablename__ = "evaluation_results"
    
    id = Column(String, primary_key=True)
    run_id = Column(String, ForeignKey("evaluation_runs.id", ondelete="CASCADE"))
    dataset_item_id = Column(String, ForeignKey("dataset_items.id"))
    model_id = Column(String, ForeignKey("models.id"))
    input_text = Column(Text, nullable=False)
    expected_output = Column(Text)
    actual_output = Column(Text)
    metrics = Column(Text)  # JSON string containing evaluation metrics
    status = Column(String, default='pending')  # pending, completed, failed
    error_message = Column(String)
    processing_time_ms = Column(Integer)
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    evaluation_run = relationship("EvaluationRun", back_populates="evaluation_results")
    dataset_item = relationship("DatasetItem", back_populates="evaluation_results")
    model = relationship("Model", back_populates="evaluation_results")

class ApiKey(Base):
    """API keys for different providers (encrypted)"""
    __tablename__ = "api_keys"
    
    id = Column(String, primary_key=True)
    provider = Column(String, nullable=False)
    key_name = Column(String, nullable=False)
    encrypted_key = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class DatabaseManager:
    """Database connection and session management"""
    
    def __init__(self, db_path: str = "evalmatrix.db"):
        self.db_path = db_path
        self.engine = None
        self.SessionLocal = None
        
    def init_db(self):
        """Initialize database connection and create tables"""
        # Create data directory if it doesn't exist
        db_dir = os.path.dirname(self.db_path)
        if db_dir and not os.path.exists(db_dir):
            os.makedirs(db_dir)
            
        # Create engine
        self.engine = create_engine(
            f"sqlite:///{self.db_path}",
            echo=False,  # Set to True for SQL debugging
            future=True
        )
        
        # Create session factory
        self.SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine,
            class_=Session
        )
        
        # Create all tables
        Base.metadata.create_all(bind=self.engine)
        
    def get_session(self) -> Session:
        """Get a database session"""
        if not self.SessionLocal:
            self.init_db()
        return self.SessionLocal()
    
    def close(self):
        """Close database connection"""
        if self.engine:
            self.engine.dispose()

# Global database manager instance
db_manager = DatabaseManager("backend/evalmatrix.db")

def get_db():
    """Dependency for FastAPI to get database session"""
    db = db_manager.get_session()
    try:
        yield db
    finally:
        db.close()