import re

with open('backend/tests/services/test_account_history.py', 'r') as f:
    text = f.read()

# Replace:
#         account_type=...,
#         frozen_positions=...,
#         total_invested=...,
# with:
#         account_snapshot=_AccountSnapshot(
#             account_id="fake_id",
#             account_type=...,
#             frozen_positions=...,
#             total_invested=...
#         ),

import ast

def replace_call(call_str):
    # This is a bit tricky with regex, let's just do it string by string if possible
    pass

