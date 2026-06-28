from iitd_iam.integrations.keycloak.token_verifier import extract_roles_and_permissions


def test_extracts_roles_from_standard_and_custom_claims():
    roles, permissions = extract_roles_and_permissions(
        {
            "application_roles": ["application_admin"],
            "permissions": ["applications.view"],
            "realm_access": {"roles": ["platform_admin"]},
            "resource_access": {"iitd-iam-admin": {"roles": ["auditor"]}},
        }
    )

    assert roles == {"application_admin", "platform_admin", "auditor"}
    assert permissions == {"applications.view"}


def test_defaults_to_user_role_when_token_has_no_roles():
    roles, permissions = extract_roles_and_permissions({})

    assert roles == {"user"}
    assert permissions == set()
