class KeycloakError(Exception):
    def __init__(self, code: str, status_code: int | None = None, message: str | None = None):
        self.code = code
        self.status_code = status_code
        self.message = message or code
        super().__init__(self.message)


class KeycloakConfigurationError(KeycloakError):
    pass


class KeycloakRequestError(KeycloakError):
    pass
