[Español](README.md) · **English**

<table>
  <tr>
    <td width="38%" align="center" valign="middle">
      <img src="docs/screenshots/mobile.png" width="270" alt="Network status on mobile" />
      <br />
      <sub>Network status on mobile</sub>
    </td>
    <td width="62%" valign="middle">
      <h1>Subte de Buenos Aires</h1>
      <p>Estimated arrival times in real time for lines A, B, C, D, E, H and the Premetro. Built for mobile, to check on the go.</p>
      <p><a href="https://subte-ba.netlify.app"><strong>View live site ↗</strong></a></p>
      <ul>
        <li>Arrivals by station and direction</li>
        <li>Service alerts and network status</li>
        <li>No app, no sign-up</li>
      </ul>
      <p><sub>Astro 7 SSR · Preact · Tailwind CSS 4 · Netlify</sub></p>
    </td>
  </tr>
</table>

## How it works

On the first request, the server downloads the static GTFS feed from the GCBA Transport API and then refreshes it every 30 minutes. Positions from the `forecastGTFS` feed are cached for 30 seconds. The browser requests `GET /api/forecast/{routeId}` every 30 seconds and calculates arrivals on the client.

```text
GCBA API ──► server cache ──► /api/forecast/{routeId} ──► Preact islands
```

- **Static GTFS**: routes and stations for each line.
- **forecastGTFS**: train positions and next arrivals.
- **serviceAlerts**: network status and per-line notices.

## Tech stack

| Area | Detail |
| --- | --- |
| Runtime | Astro 7 in SSR mode (`output: "server"`) |
| UI | Preact islands and Astro components |
| Styling | Tailwind CSS 4 |
| Data | GCBA Transport API (GTFS, forecastGTFS, serviceAlerts) |
| Cache | GTFS: 30 min · positions: 30 s |
| Deploy | Netlify |
| Node | ≥ 22.12 |

## Getting started

Requirements: Node ≥ 22.12 and credentials for the [GCBA Transport API](https://buenosaires.gob.ar/gcaba_historico/infraestructura/movilidad/api-transporte).

```bash
npm install
```

Create a `.env` file at the project root with your credentials:

```env
GCBA_CLIENT_ID=your_client_id
GCBA_CLIENT_SECRET=your_client_secret
```

```bash
npm run dev
```

The site is available at `http://localhost:4321`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server at `localhost:4321` |
| `npm run build` | Production build in `dist/` |
| `npm run astro ...` | Astro CLI (`astro add`, `astro check`, etc.) |

## Project structure

```text
.
├── docs/screenshots/   # README screenshots
├── public/             # static assets
├── src/
│   ├── api/            # data access (alerts)
│   ├── components/     # Preact islands and Astro components
│   ├── layouts/
│   ├── pages/          # site routes and the /api/forecast endpoint
│   ├── services/       # GTFS download, cache and parsing
│   ├── styles/
│   └── utils/          # arrival time calculation
├── astro.config.mjs
├── netlify.toml
└── package.json
```

## Data and credits

Open data from the Government of the City of Buenos Aires through the [Transport API](https://buenosaires.gob.ar/gcaba_historico/infraestructura/movilidad/api-transporte).

Personal project by [Cristian Leguizamón](https://github.com/pudinero).
