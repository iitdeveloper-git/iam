import pytest

from iitd_iam.auth.permissions import can_assign_role, has_permission
from iitd_iam.auth.redirects import RedirectValidationError, validate_redirect_uri


def test_super_admin_has_all_permissions():
    assert has_permission({"super_admin"}, "security.keys.rotate")


def test_lower_role_cannot_assign_higher_role():
    assert not can_assign_role({"support_operator"}, "platform_admin")
    assert can_assign_role({"super_admin"}, "platform_admin")


def test_production_redirect_requires_https_and_no_localhost():
    with pytest.raises(RedirectValidationError):
        validate_redirect_uri("http://app.example.com/callback", environment="production")
    with pytest.raises(RedirectValidationError):
        validate_redirect_uri("https://*.example.com/callback", environment="production")
    with pytest.raises(RedirectValidationError):
        validate_redirect_uri("https://localhost:3030/callback", environment="production")


def test_local_redirect_allows_localhost_http_only_for_development():
    assert validate_redirect_uri("http://localhost:3030/callback", environment="development")
