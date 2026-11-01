import json

import plaid
import pytest
from fastapi import HTTPException

from app.services.plaid_service import _call_plaid


def _raise_plaid(error_code: str, display_message: str | None = None):
    def fn(_request: object) -> dict:
        e = plaid.ApiException(status=400, reason="Bad Request")
        e.body = json.dumps({"error_code": error_code, "error_type": "ITEM_ERROR", "display_message": display_message})
        raise e

    return fn


async def test_login_required_maps_to_409():
    with pytest.raises(HTTPException) as exc:
        await _call_plaid(_raise_plaid("ITEM_LOGIN_REQUIRED"), None)
    assert exc.value.status_code == 409
    assert exc.value.detail["code"] == "ITEM_LOGIN_REQUIRED"


async def test_other_plaid_errors_map_to_502():
    with pytest.raises(HTTPException) as exc:
        await _call_plaid(_raise_plaid("INSTITUTION_DOWN", "The bank is unavailable"), None)
    assert exc.value.status_code == 502
    assert exc.value.detail == {"code": "INSTITUTION_DOWN", "message": "The bank is unavailable"}


async def test_success_passes_through():
    assert await _call_plaid(lambda req: {"ok": req}, 1) == {"ok": 1}
