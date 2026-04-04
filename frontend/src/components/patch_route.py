import sys

with open(r'C:\Users\Utkarsh Kumar\ParakhAI\parakh_ai\api\routes\analytics.py', 'r', encoding='utf-8') as f:
    content = f.read()

new_route = '''
@router.get("")
def get_global_stats():
    return log.get_global_stats()

@router.get("/")
def get_global_stats_slash():
    return log.get_global_stats()
'''

content = content + new_route

with open(r'C:\Users\Utkarsh Kumar\ParakhAI\parakh_ai\api\routes\analytics.py', 'w', encoding='utf-8') as f:
    f.write(content)
