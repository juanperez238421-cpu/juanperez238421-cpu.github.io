# IJR Web Defense Lab

This package is the runnable environment for the **Defensive Cybersecurity** track.

The objective is to make students defend a real web service against measurable, reproducible hostile traffic **inside an isolated lab**. The attack runner is intentionally fixed to the internal Docker service `http://proxy`; it does not accept arbitrary domains, public IP addresses, or target URLs.

## Lab topology

```text
browser on teacher/student PC
        |
        | 127.0.0.1:8080
        v
     [nginx proxy] ----> [Node target web app]
          ^
          |
   [controlled attack runner]
        internal Docker network only
```

The Docker network is marked `internal: true`, and the only published port is bound to `127.0.0.1`.

## What students must defend

The target application exposes:

- `/` — normal page.
- `/health` — availability check.
- `/metrics` — application metrics.
- `/api/report` — intentionally expensive test route used for the availability scenario.
- `/login` — fictitious authentication endpoint.
- `/api/echo` — controlled payload-validation endpoint.

The starting reverse-proxy configuration is intentionally minimal. Students must diagnose first and only then decide what to change.


## Real defensive case library

The Project Decision Center now includes four guided cases that use this same lab:

1. **HTTP Flood / Application-layer DoS** — real concurrent requests against `/api/report`, followed by before/after availability analysis.
2. **Credential Abuse** — repeated invalid login attempts against fictitious accounts, followed by rate limiting/backoff and legitimate-user validation.
3. **Broken Access Control / IDOR** — the starting `/api/records/:id` endpoint intentionally omits object ownership checks so students can reproduce and then fix authorization.
4. **Stored HTML / XSS** — the starting `/board` renderer intentionally inserts comment text as markup so students can reproduce a harmless DOM marker and then fix output encoding/CSP.

The intentionally vulnerable routes exist only in this localhost/internal-network lab. They use synthetic data and are designed to be repaired by students.

## Start the lab

From this directory:

```bash
docker compose up --build
```

Open:

```text
http://127.0.0.1:8080
```

Application metrics:

```text
http://127.0.0.1:8080/metrics
```

## Controlled profiles

Run one profile at a time. The runner has no configurable target; all profiles are locked to the internal proxy service.

Baseline:

```bash
ATTACK_PROFILE=baseline docker compose --profile attack run --rm attack
```

Availability / HTTP-flood simulation:

```bash
ATTACK_PROFILE=flood docker compose --profile attack run --rm attack
```

Authentication-abuse simulation against fictitious accounts:

```bash
ATTACK_PROFILE=auth docker compose --profile attack run --rm attack
```

Large-input simulation:

```bash
ATTACK_PROFILE=payload docker compose --profile attack run --rm attack
```

Each run reports request count, requests per second, HTTP status distribution, mean latency, p95 latency, and maximum latency.

## Required investigation protocol

1. Start the web app and confirm `/health`.
2. Record the baseline.
3. Run the assigned hostile profile.
4. Preserve the output and relevant proxy/app logs.
5. State a hypothesis for the failure or degradation.
6. Implement one defense at a time.
7. Rebuild/reload the affected service.
8. Repeat the **same** profile.
9. Compare before/after metrics.
10. Explain whether the defense improved availability without unnecessarily blocking legitimate traffic.

## Defense surface

Students may modify:

- `proxy/nginx.conf`
- `app/server.js`

Potential defense families include rate limiting, quotas, connection/request limits, timeouts, caching where valid, payload limits, authentication controls, structured logging, and least privilege. Every control must be justified from observed evidence.

## Evidence to submit

- Architecture and trust-boundary diagram.
- Baseline metrics.
- First hostile run.
- Incident hypothesis.
- Defense commit.
- Repeated run using the same profile.
- Before/after comparison.
- Final UML/architecture diagram.
- Short incident postmortem.
- Live blue-team defense.

## Scope rule

This project is for systems owned and controlled by the course. Do not redirect, rewrite, proxy, or adapt the traffic runner to public websites, third-party services, school production systems, or any system outside the isolated lab.
