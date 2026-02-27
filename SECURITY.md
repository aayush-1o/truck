# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest (`main`) | ✅ Actively maintained |
| All prior releases | ❌ No security backports |

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.** Public disclosure before a fix is available puts other users at risk.

Instead, report vulnerabilities privately by emailing:

**📧 ayushh.ofc10@gmail.com**

**Subject line:** `[SECURITY] FreightFlow — <brief description>`

I will acknowledge your report within **48 hours** and aim to deliver a fix within **7 days** for critical issues.

---

## What to Include in Your Report

A good security report should include:

1. **Description** — What is the vulnerability? What is the affected component?
2. **Steps to reproduce** — Exact steps needed to trigger the issue
3. **Impact** — What can an attacker do, and which users/data are affected?
4. **Proof of concept** — A curl command, HTTP request, or code snippet (if safe to share)
5. **Suggested fix** — Optional but appreciated

---

## What NOT To Do

- ❌ Do not publicly disclose the vulnerability before a fix is released
- ❌ Do not run automated scanners against the live production instance at `truck-production.up.railway.app` without permission
- ❌ Do not access, modify, or exfiltrate real user data during testing — use local dev only

---

## Scope

**In scope:**

- Authentication and authorization bypasses
- JWT handling vulnerabilities
- HMAC payment signature bypass (Razorpay integration)
- SQL/NoSQL injection
- XSS
- IDOR (Insecure Direct Object Reference) in shipment/driver/user endpoints
- Exposed sensitive environment variables or keys

**Out of scope:**

- Issues in third-party dependencies (report to the respective maintainer)
- Missing rate limiting on non-auth endpoints
- Missing security headers (Content-Security-Policy, etc.) — known, planned for Week 4
- Self-XSS or attacks requiring physical access to the device

---

## Disclosure Timeline

| Day | Action |
|-----|--------|
| 0 | You submit the report |
| 1–2 | Acknowledgement sent |
| 1–7 | Fix developed and tested |
| 7–14 | Fix deployed to production |
| 14+ | Public disclosure (coordinated with reporter) |

---

Thank you for helping keep FreightFlow and its users safe.
