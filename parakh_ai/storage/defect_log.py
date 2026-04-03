import sqlite3
import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Optional

class DefectLog:
    """
    SQLite-based defect event logging with analytics queries.
    """
    def __init__(self, db_path: str = "data/parakh.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
        
    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS inspections (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    anomaly_score REAL NOT NULL,
                    is_defective INTEGER NOT NULL,
                    severity TEXT NOT NULL,
                    defect_coverage_pct REAL,
                    inference_time_ms REAL,
                    image_path TEXT,
                    bbox_json TEXT
                )
            ''')
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_inspections_session ON inspections(session_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_inspections_timestamp ON inspections(timestamp)")
            
    def log_inspection(self, result, image_path: Optional[str] = None):
        """result is InferenceResponse type"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO inspections (
                    session_id, timestamp, anomaly_score, is_defective, severity, 
                    defect_coverage_pct, inference_time_ms, image_path, bbox_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                result.session_id,
                result.timestamp.isoformat(),
                result.anomaly_score,
                int(result.is_defective),
                result.severity,
                getattr(result, 'defect_coverage_pct', 0.0),
                result.inference_time_ms,
                image_path,
                json.dumps([b.__dict__ for b in getattr(result, 'defect_bboxes', [])])
            ))
            
    def get_defect_rate(self, session_id: str, window_minutes: int = 60) -> float:
        cutoff = (datetime.utcnow() - timedelta(minutes=window_minutes)).isoformat()
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT COUNT(*) as total, SUM(is_defective) as defects
                FROM inspections
                WHERE session_id = ? AND timestamp >= ?
            ''', (session_id, cutoff))
            row = cursor.fetchone()
            if not row or row[0] == 0:
                return 0.0
            return float(row[1]) / float(row[0])
            
    def get_recent_defects(self, session_id: str, limit: int = 20) -> List[Dict]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM inspections
                WHERE session_id = ? AND is_defective = 1
                ORDER BY timestamp DESC LIMIT ?
            ''', (session_id, limit))
            return [dict(row) for row in cursor.fetchall()]

    def export_csv(self, session_id: str, output_path: str) -> None:
        import csv
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM inspections WHERE session_id = ?', (session_id,))
            rows = cursor.fetchall()
            
        with open(output_path, 'w', newline='') as f:
            if rows:
                writer = csv.writer(f)
                writer.writerow(rows[0].keys())
                for row in rows:
                    writer.writerow(row)
