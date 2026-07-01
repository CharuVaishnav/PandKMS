import httpx

from app.config import settings


def send_email(to: str, subject: str, html: str) -> None:
    if not settings.RESEND_API_KEY:
        print(f"[email:dev-fallback] to={to} subject={subject!r}\n{html}")
        return

    resp = httpx.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
        json={"from": settings.EMAIL_FROM, "to": [to], "subject": subject, "html": html},
        timeout=10,
    )
    if resp.is_error:
        print(f"[email:resend-error] status={resp.status_code} body={resp.text}")
    resp.raise_for_status()
