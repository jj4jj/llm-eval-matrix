-- EvalMatrix Database Schema
-- SQLite database schema for persistent storage of models, datasets, evaluation tasks, and results

-- Models table - stores LLM model configurations
CREATE TABLE models (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    base_url TEXT,
    api_key TEXT,
    model_id TEXT NOT NULL,
    config TEXT, -- JSON string for additional model configuration
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Datasets table - stores dataset metadata
CREATE TABLE datasets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    file_name TEXT,
    file_path TEXT,
    file_size INTEGER,
    item_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dataset items table - stores individual dataset entries
CREATE TABLE dataset_items (
    id TEXT PRIMARY KEY,
    dataset_id TEXT NOT NULL,
    input_text TEXT NOT NULL,
    reference_output TEXT,
    item_metadata TEXT, -- JSON string for additional item metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
);

-- Evaluation runs table - stores evaluation task information
CREATE TABLE evaluation_runs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    dataset_id TEXT NOT NULL,
    model_ids TEXT NOT NULL, -- JSON array of model IDs
    status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
    progress REAL DEFAULT 0.0,
    total_items INTEGER DEFAULT 0,
    completed_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    config_snapshot TEXT, -- JSON string of evaluation configuration
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dataset_id) REFERENCES datasets(id)
);

-- Evaluation results table - stores individual evaluation results
CREATE TABLE evaluation_results (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    dataset_item_id TEXT NOT NULL,
    model_id TEXT NOT NULL,
    input_text TEXT NOT NULL,
    expected_output TEXT,
    actual_output TEXT,
    metrics TEXT, -- JSON string containing evaluation metrics
    status TEXT DEFAULT 'pending', -- pending, completed, failed
    error_message TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES evaluation_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (dataset_item_id) REFERENCES dataset_items(id),
    FOREIGN KEY (model_id) REFERENCES models(id)
);

-- API keys table - stores encrypted API keys for different providers
CREATE TABLE api_keys (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    key_name TEXT NOT NULL,
    encrypted_key TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_models_provider ON models(provider);
CREATE INDEX idx_models_name ON models(name);
CREATE INDEX idx_dataset_items_dataset_id ON dataset_items(dataset_id);
CREATE INDEX idx_evaluation_runs_dataset_id ON evaluation_runs(dataset_id);
CREATE INDEX idx_evaluation_runs_status ON evaluation_runs(status);
CREATE INDEX idx_evaluation_results_run_id ON evaluation_results(run_id);
CREATE INDEX idx_evaluation_results_model_id ON evaluation_results(model_id);
CREATE INDEX idx_evaluation_results_status ON evaluation_results(status);
CREATE INDEX idx_api_keys_provider ON api_keys(provider);

-- Create triggers to automatically update the updated_at timestamp
CREATE TRIGGER update_models_timestamp 
    AFTER UPDATE ON models
    FOR EACH ROW
    BEGIN
        UPDATE models SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_datasets_timestamp 
    AFTER UPDATE ON datasets
    FOR EACH ROW
    BEGIN
        UPDATE datasets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_evaluation_runs_timestamp 
    AFTER UPDATE ON evaluation_runs
    FOR EACH ROW
    BEGIN
        UPDATE evaluation_runs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_api_keys_timestamp 
    AFTER UPDATE ON api_keys
    FOR EACH ROW
    BEGIN
        UPDATE api_keys SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;