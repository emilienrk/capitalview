import re

with open('backend/tests/services/test_account_history.py', 'r') as f:
    text = f.read()

# I will just write a regex that catches the 3 lines and wraps them in _AccountSnapshot
pattern = r'(account_type=(.*?),)\s*(frozen_positions=(.*?),)\s*(total_invested=(.*?),)'

def replacer(match):
    m1 = match.group(1)
    m2 = match.group(2)
    m3 = match.group(3)
    m5 = match.group(5)
    
    return f'''account_snapshot=_AccountSnapshot(
            account_id="fake_id",
            {m1}
            {m3}
            {m5}
        ),'''

new_text = re.sub(pattern, replacer, text)

# add import _AccountSnapshot
if "_AccountSnapshot" not in new_text.split("from services.account_history")[1].split("\n")[0]:
    new_text = new_text.replace("from services.account_history import (", "from services.account_history import (\n    _AccountSnapshot,")

with open('backend/tests/services/test_account_history.py', 'w') as f:
    f.write(new_text)
