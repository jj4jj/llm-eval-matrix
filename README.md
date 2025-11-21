
# EvalMatrix - LLM Evaluation Platform

EvalMatrix is a robust, containerized platform for managing, evaluating, and benchmarking Large Language Models (LLMs) compatible with OpenAI's API format. It supports custom datasets, parallel execution, and comprehensive visualization of results.

## 🏗 Architecture

EvalMatrix uses a hybrid architecture designed for performance and data persistence.

### System Components

1.  **Frontend (Client-Side Engine)**
    *   **Tech Stack**: React 18, TypeScript, Vite, Tailwind CSS, Recharts.
    *   **Role**: Handles UI rendering, visualization, and **direct LLM API interactions**.
    *   **Why Client-Side Execution?**: To enable massive parallelism without bottling up the backend server. The browser directly calls APIs (OpenAI, OpenRouter, Local LLMs), reducing latency and server load.

2.  **Backend (Data Persistence)**
    *   **Tech Stack**: Python FastAPI, Pydantic.
    *   **Role**: Acts as the source of truth. Stores Datasets, Model Configurations, and Evaluation Results to disk (`/data` volume).
    *   **Storage**: JSON-based file storage for simplicity and portability (no complex DB setup required).

3.  **Reverse Proxy**
    *   **Tech Stack**: Nginx.
    *   **Role**: Serves the static React assets and proxies `/api/*` requests to the FastAPI backend to handle CORS and routing in a production-like environment.

### Data Flow

```mermaid
graph LR
    User[User Browser] -- HTTP (React App) --> Nginx[Nginx (Port 80)]
    User -- API Calls (Models/Datasets) --> Nginx
    Nginx -- /api/* --> Backend[FastAPI (Port 8000)]
    Backend -- Read/Write --> Volume[(./data/)]
    
    User -- Chat Completions (Parallel) --> External[LLM Providers (OpenAI/OpenRouter)]
    User -- Chat Completions --> Local[Local LLM (e.g., LiteLLM)]
```

---

## 🚀 Getting Started

### Prerequisites

*   [Docker](https://docs.docker.com/get-docker/) installed.
*   [Docker Compose](https://docs.docker.com/compose/install/) installed.

### Installation & Running

1.  **Clone the repository** (if applicable) or ensure all files are in the project directory.

2.  **Build and Start**
    Run the following command in the project root:
    ```bash
    docker-compose up --build
    ```

3.  **Access the Application**
    Open your browser and navigate to:
    ```
    http://localhost
    ```

### Persistent Data
All data (uploaded datasets, configured models, and evaluation results) is stored in the `./data` directory on your host machine. This directory is mounted to the backend container, ensuring data survives container restarts.

---

## 📖 User Guide

### 1. Configuration (Models)
Navigate to the **Models** page.
