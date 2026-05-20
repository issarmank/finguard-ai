import httpx
from fastapi import HTTPException, status

from app.config import settings

_BASE_URL = "https://openrouter.ai/api/v1"
_HEADERS = {
    "HTTP-Referer": "https://finguard.ai",
    "X-Title": "FinGuard AI",
}


async def chat_completion(
    model: str,
    messages: list[dict],
    response_format: dict | None = None,
    temperature: float = 0.1,
) -> str:
    if not settings.OPENROUTER_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPENROUTER_API_KEY is not configured",
        )

    payload: dict = {"model": model, "messages": messages, "temperature": temperature}
    if response_format:
        payload["response_format"] = response_format

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            resp = await client.post(
                f"{_BASE_URL}/chat/completions",
                headers={**_HEADERS, "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}"},
                json=payload,
            )
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"OpenRouter error {e.response.status_code}: {e.response.text}",
            )
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"OpenRouter request failed: {e}",
            )

    return resp.json()["choices"][0]["message"]["content"]
