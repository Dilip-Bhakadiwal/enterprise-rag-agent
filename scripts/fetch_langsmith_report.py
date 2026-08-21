import os
import json
from datetime import datetime
from dotenv import load_dotenv
from langsmith import Client

def fetch_report():
    load_dotenv(".env")
    client = Client()
    project_name = "enterprise-rag-agent"
    
    print("Fetching traces from LangSmith...")
    runs = list(client.list_runs(project_name=project_name, execution_order=1, limit=5))
    
    if not runs:
        print("No runs found in LangSmith!")
        return
        
    report = f"# LangSmith Traces Report - {project_name}\n\n"
    report += f"Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
    
    for i, run in enumerate(runs, 1):
        latency = (run.end_time - run.start_time).total_seconds() if run.end_time and run.start_time else 0
        total_tokens = run.total_tokens if hasattr(run, 'total_tokens') and run.total_tokens else "N/A"
        
        report += f"## Trace {i}: {run.name}\n"
        report += f"- **ID**: `{run.id}`\n"
        report += f"- **Status**: {'Success' if not run.error else 'Failed'}\n"
        report += f"- **Latency**: {latency:.2f} seconds\n"
        report += f"- **Tokens Used**: {total_tokens}\n"
        
        # Try to extract the input question
        try:
            inputs = run.inputs or {}
            question = inputs.get("query", inputs.get("question", str(inputs)))
            report += f"- **Input**: `{question}`\n"
        except:
            pass
            
        report += "\n---\n"
        
    artifact_path = r"C:\Users\EXNOX\.gemini\antigravity-ide\brain\7cd6f9e8-65ad-48a1-84c0-c0ecaeb78d02\langsmith_report.md"
    with open(artifact_path, "w", encoding="utf-8") as f:
        f.write(report)
        
    print(f"Report successfully saved to {artifact_path}")

if __name__ == "__main__":
    fetch_report()
