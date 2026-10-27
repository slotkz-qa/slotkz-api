import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const LEVELS = (__ENV.LEVELS || '20,100,300,600').split(',').map(Number);
const RAMP_UP_SECONDS = Number(__ENV.RAMP_UP_SECONDS || 30);
const HOLD_SECONDS = Number(__ENV.HOLD_SECONDS || 60);
const GAP_SECONDS = 10;
const PASSWORD = 'Passw0rd!';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

const ENDPOINTS = [
  'POST /api/auth/register',
  'POST /api/auth/login',
  'GET /api/salons',
  'GET /api/salons/:id',
  'POST /api/bookings',
  'GET /api/bookings',
];

export const options = {
  noCookiesReset: true,
  scenarios: Object.fromEntries(
    LEVELS.map((vus, index) => [
      `level_${vus}`,
      {
        executor: 'ramping-vus',
        startTime: `${index * (RAMP_UP_SECONDS + HOLD_SECONDS + GAP_SECONDS)}s`,
        stages: [
          { duration: `${RAMP_UP_SECONDS}s`, target: vus },
          { duration: `${HOLD_SECONDS}s`, target: vus },
        ],
        gracefulRampDown: '5s',
        gracefulStop: '5s',
      },
    ]),
  ),
  thresholds: {
    ...Object.fromEntries(
      LEVELS.flatMap((vus) => [
        [`http_req_duration{scenario:level_${vus}}`, ['p(95)<500']],
        [`http_req_failed{scenario:level_${vus}}`, ['rate<0.01']],
      ]),
    ),
    ...Object.fromEntries(ENDPOINTS.map((name) => [`http_req_duration{name:${name}}`, ['p(95)<500']])),
  },
};

let signedIn = false;

function post(path, name, body) {
  return http.post(`${BASE_URL}${path}`, JSON.stringify(body), { headers: JSON_HEADERS, tags: { name } });
}

function get(path, name) {
  return http.get(`${BASE_URL}${path}`, { tags: { name } });
}

function signIn() {
  const credentials = { email: `load_${__VU}_${Date.now()}@slotkz.kz`, password: PASSWORD };
  const registered = post('/api/auth/register', 'POST /api/auth/register', credentials);
  const loggedIn = post('/api/auth/login', 'POST /api/auth/login', credentials);
  signedIn = check(null, {
    'register 201': () => registered.status === 201,
    'login 200': () => loggedIn.status === 200,
  });
}

export default function () {
  if (!signedIn) signIn();

  const search = get(`/api/salons?city=${encodeURIComponent('Алматы')}`, 'GET /api/salons');
  check(search, { 'search 200': (response) => response.status === 200 });

  const salon = get('/api/salons/1', 'GET /api/salons/:id');
  check(salon, { 'salon 200': (response) => response.status === 200 });

  const startsAt = new Date(Date.now() + 30 * 3600 * 1000 + (__VU * 100000 + __ITER) * 1000).toISOString();
  const booking = post('/api/bookings', 'POST /api/bookings', { masterId: (__VU % 10) + 1, startsAt });
  check(booking, { 'booking 201': (response) => response.status === 201 });

  const list = get('/api/bookings', 'GET /api/bookings');
  check(list, { 'list 200': (response) => response.status === 200 });

  sleep(1);
}
