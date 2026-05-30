from __future__ import annotations

from typing import Dict

from accounts.api.custom_jwt import CustomTokenObtainPairSerializer


def get_jwt_tokens_for_user(user) -> Dict[str, str]:
    """Return a refresh/access pair using the custom JWT serializer."""
    refresh = CustomTokenObtainPairSerializer.get_token(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }
