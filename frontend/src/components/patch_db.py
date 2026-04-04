import sys

with open(r'C:\Users\Utkarsh Kumar\ParakhAI\parakh_ai\storage\defect_log.py', 'r', encoding='utf-8') as f:
    content = f.read()

new_method = '''
    def get_global_stats(self) -> dict:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(*) as total, SUM(is_defective) as defects FROM inspections')
            row = cursor.fetchone()
            total = row[0] if (row and row[0]) else 0
            defects = row[1] if (row and row[1]) else 0
            fail_rate = (float(defects) / float(total) * 100.0) if total > 0 else 0.0
            return {"total_inspections": total, "failure_rate": fail_rate}
'''

content = content.replace('def get_defect_rate(self', new_method + '\n    def get_defect_rate(self')

with open(r'C:\Users\Utkarsh Kumar\ParakhAI\parakh_ai\storage\defect_log.py', 'w', encoding='utf-8') as f:
    f.write(content)
