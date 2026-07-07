import base64
import json
import time

import requests
from cryptography import x509
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding


GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v1/certs"
GOOGLE_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


class InvalidGoogleToken(ValueError):
    pass


def _decode_segment(segment):
    padding_length = (-len(segment)) % 4
    return base64.urlsafe_b64decode(segment + ("=" * padding_length))


def verify_google_id_token(token, client_id):
    try:
        header_segment, payload_segment, signature_segment = token.split(".")
        header = json.loads(_decode_segment(header_segment))
        payload = json.loads(_decode_segment(payload_segment))
        signature = _decode_segment(signature_segment)
    except (ValueError, TypeError, json.JSONDecodeError) as exc:
        raise InvalidGoogleToken("Malformed Google credential.") from exc

    if header.get("alg") != "RS256" or not header.get("kid"):
        raise InvalidGoogleToken("Unsupported Google credential.")

    try:
        response = requests.get(GOOGLE_CERTS_URL, timeout=5)
        response.raise_for_status()
        certificate_pem = response.json()[header["kid"]].encode("ascii")
        public_key = x509.load_pem_x509_certificate(certificate_pem).public_key()
        public_key.verify(
            signature,
            f"{header_segment}.{payload_segment}".encode("ascii"),
            padding.PKCS1v15(),
            hashes.SHA256(),
        )
    except (
        requests.RequestException,
        InvalidSignature,
        KeyError,
        ValueError,
        TypeError,
    ) as exc:
        raise InvalidGoogleToken("Google credential verification failed.") from exc

    audience = payload.get("aud")
    if client_id not in ([audience] if isinstance(audience, str) else audience or []):
        raise InvalidGoogleToken("Google credential audience does not match.")
    if payload.get("iss") not in GOOGLE_ISSUERS:
        raise InvalidGoogleToken("Google credential issuer does not match.")
    if payload.get("exp", 0) <= time.time():
        raise InvalidGoogleToken("Google credential has expired.")

    return payload
