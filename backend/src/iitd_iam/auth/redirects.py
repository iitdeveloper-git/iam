from urllib.parse import urlparse


class RedirectValidationError(ValueError):
    pass


def validate_redirect_uri(uri: str, *, environment: str) -> str:
    parsed = urlparse(uri)
    if "*" in uri:
        raise RedirectValidationError("wildcard redirect URIs are not allowed")
    if parsed.scheme not in {"https", "http"}:
        raise RedirectValidationError("redirect URI must use http or https")
    if not parsed.netloc:
        raise RedirectValidationError("redirect URI must include a host")
    if parsed.fragment:
        raise RedirectValidationError("redirect URI must not include a fragment")
    if environment == "production" and parsed.scheme != "https":
        raise RedirectValidationError("production redirect URIs must use https")
    if environment == "production" and parsed.hostname in {"localhost", "127.0.0.1", "::1"}:
        raise RedirectValidationError("localhost redirects are not allowed in production")
    return uri

