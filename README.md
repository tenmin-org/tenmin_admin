# TenMin Admin

Админка на React + Vite + TypeScript + Tailwind.

## Что умеет

- Авторизация по **номеру телефона + паролю** (JWT)
- Разграничение прав:
  - **`is_superadmin = true`** — доступ ко всем сущностям: магазины, глобальные
    товары и категории, администраторы, курьеры, витрины, заказы.
  - **`is_admin = true`** — доступ только к своим магазинам (из `user_stores`):
    редактирование магазина, витрин, цен/наличия, заказов, курьеров.
- Адаптивный интерфейс (desktop-сайдбар, мобильный drawer + top-bar)
- Toast-уведомления, React Query кэш, оптимистичное UX
- Валидация форм через Zod

## Запуск (dev)

```bash
npm install
cp .env.example .env   # прописать VITE_API_URL
npm run dev
```

Фронт слушает `http://localhost:5173`.

**`VITE_API_URL`** — только **корень API** (например `http://localhost:8000`), без `/admin-api`.
Можно указать и полный путь до админского префикса (`http://localhost:8000/admin-api`) — дублирования не будет.

Бэкенд отдаёт маршруты под `/admin-api/...` (`tenmin_back/app/api/admin`).

## Первый админ

В корне бэкенда:

```bash
python -m scripts.create_admin \
    --telegram-id 123456 \
    --phone +77001234567 \
    --password mysecret123 \
    --name "Алмаз" \
    --superadmin
```

Для админа магазина (is_admin + привязка к магазинам):

```bash
python -m scripts.create_admin \
    --telegram-id 7777777 \
    --phone +77005554433 \
    --password mypass \
    --name "Мария" \
    --store-ids 1 2
```

## Production (docker-compose)

Из корня монорепо:

```bash
docker compose up -d admin
```

Админка поднимется на `http://localhost:3001`. Не забудьте переменные окружения:

- `API_URL` — публичный URL бэкенда (также используется клиентом)
- `ADMIN_API_URL` — (опционально) если для админки нужен другой URL
- `ADMIN_JWT_SECRET` — секрет для подписи JWT админских токенов
