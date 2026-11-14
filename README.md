# SlotKZ API

SlotKZ - сұлулық салондары мен сервис орталықтарына онлайн жазылуға арналған веб-сервистің оқу жобасы (NestJS 12). Жоба «Бағдарламалық қамтамасыз етуді тестілеу» пәні бойынша тестілеу объектісі ретінде жасалған.

## Мүмкіндіктер

- Тіркелу, кіру және шығу: JWT HttpOnly cookie-де беріледі, 5 қате әрекеттен кейін аккаунт 15 минутқа бұғатталады
- Салондар каталогы: қала, санат, баға және аты бойынша іздеу
- Брондау: жазба жасау, басқа уақытқа көшіру, алдын ала төлем және бас тарту (қайтарым есебімен). Жазылу мерзімі: басталуына кемінде 60 минут қалуы керек және 30 күннен артық алдын ала жазылуға болмайды
- Тест беті: http://localhost:3000
- Лог файлдары: `logs/app.log`, `logs/error.log`

Деректер уақытша жадта сақталады, сервер қайта қосылғанда тазаланады.

## Талаптар

- Node.js 22.22.3 және одан жоғары (немесе 24.15+)
- npm

## Іске қосу

```bash
git clone https://github.com/slotkz-qa/slotkz-api.git
cd slotkz-api
npm install
npm run start:dev
```

Сервер http://localhost:3000 мекенжайында іске қосылады. Портты `PORT` айнымалысымен өзгертуге болады.

Өндірістік режим:

```bash
npm run build
node dist/main
```

## API

| Әдіс | Жол | Сипаттама | Cookie |
|---|---|---|---|
| GET | /api/health | Сервер күйін тексеру | жоқ |
| POST | /api/auth/register | Тіркелу | жоқ |
| POST | /api/auth/login | Кіру, cookie беру | жоқ |
| POST | /api/auth/logout | Шығу | қажет |
| GET | /api/auth/me | Профиль | қажет |
| GET | /api/salons | Іздеу: city, category, priceMin, priceMax, q | жоқ |
| GET | /api/salons/:id | Салон карточкасы | жоқ |
| GET | /api/bookings | Менің жазбаларым | қажет |
| POST | /api/bookings | Жазба жасау | қажет |
| PUT | /api/bookings/:id | Басқа уақытқа көшіру | қажет |
| POST | /api/bookings/:id/pay | Алдын ала төлем | қажет |
| DELETE | /api/bookings/:id | Бас тарту | қажет |

## Жүктемелік тестілеу (k6)

k6 орнату (Arch Linux): `sudo pacman -S k6`. Басқа жүйелер үшін: https://grafana.com/docs/k6/latest/set-up/install-k6/

Бір терминалда серверді іске қосыңыз, екіншісінде тестті орындаңыз:

```bash
npm run build && node dist/main
```

```bash
K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=load-test/report.html k6 run load-test/slotkz.js
```
## Unit-тестілеу

Тесттер `test/` қалтасында, Vitest қолданылады.

```
npm test              барлық unit тесттер
npm run test:tdd      TDD циклімен жазылған тесттер
npm run test:mock     stub және mock қолданатын тесттер
npm run test:cov      код қамтуы (coverage)
npm run test:e2e      интеграциялық (e2e) тесттер
```

Сценарий төрт деңгейден тұрады: 20, 100, 300 және 600 виртуалды пайдаланушы. Әр деңгейде 30 секунд ішінде жүктеме өседі (ramp-up), содан кейін 60 секунд ұсталады. Әр пайдаланушы бір рет тіркеліп кіреді, содан кейін қайталайды: іздеу, салон карточкасы, жазба жасау, жазбалар тізімі, 1 секунд үзіліс. Параметрлер: `-e LEVELS=20,100 -e RAMP_UP_SECONDS=30 -e HOLD_SECONDS=60 -e BASE_URL=http://localhost:3000`. Нақты тестілерден бұрын серверді қайта қосқан жөн.

## Жоба құрылымы

```text
src/auth       авторизация (тіркелу, кіру, JWT guard)
src/salons     салондар каталогы және іздеу
src/bookings   жазбалар, төлем, бас тарту
src/common     логгер және қателер сүзгісі
public         тест беті
load-test      k6 жүктемелік тест сценарийі
docs           тест құжаттамасы (Excel) және Postman коллекциясы
logs           лог файлдары (git-ке кірмейді)
test           unit және e2e тесттер
```

## Белгілі ақаулар

Тестілеу кезінде табылған ақаулар: BUG-001 (қосарланған бронь), BUG-002 (іздеуде 500 қатесі), BUG-003 (қайтарым есебі). Сипаттамасы: https://github.com/slotkz-qa/slotkz-qa/issues
