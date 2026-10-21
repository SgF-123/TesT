# Security Policy

## Reporting a vulnerability

Please report security issues privately through GitHub Security Advisories rather
than opening a public issue. Include a short reproduction, affected version and
the impact you observed.

## Local data

TesT stores credentials, sessions and model configuration in the data directory
chosen on first launch. These files are intentionally excluded from Git.

Do not attach `auth.json`, `models-store.json`, Feishu secrets or full data
directories to issues. Redact local usernames and absolute paths before sharing
logs or screenshots.
