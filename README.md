# Mira Food Manager

A standalone React application containing only Mira's food, nutrition-goal, and hydration experience. The existing Mira frontend, backend, and expense manager are not modified by this project.

## Existing backend contract

- `GET /api/food/entries?start=YYYY-MM-DD&end=YYYY-MM-DD`
- `POST /api/food/entries`
- `PUT /api/food/entries/:id`
- `DELETE /api/food/entries/:id`
- `GET /api/food/goal`
- `PUT /api/food/goal`
- `GET /api/food/water?start=YYYY-MM-DD&end=YYYY-MM-DD`
- `PUT /api/food/water/:date`

Local development defaults to `/api` and the Vite proxy target in `.env.example`. A deployment can set `VITE_API_URL`.

## Authentication integration

Authentication UI and Firebase are intentionally omitted. When authentication is ready, register a token provider once during startup:

```js
import { configureAccessTokenProvider } from "./api/client";

configureAccessTokenProvider(async () => yourAuthSession.getAccessToken());
```

Without a provider, API requests are sent without an `Authorization` header.

## Later setup

Install the declared packages only when you are ready to run the project. No dependency installation, build, preview, application execution, or test execution was performed while this source was created.

