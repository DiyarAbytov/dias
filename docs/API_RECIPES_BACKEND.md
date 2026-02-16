# Контракт API для бэкенда — Рецепты

## 1. Справочник хим. элементов (`GET /chemistry/elements/`)

Фронт использует этот эндпоинт для списка элементов в рецептах (если нет balances/tasks).

**Ответ:**
```json
{
  "items": [
    {
      "id": 1,
      "name": "test",
      "unit": "л"
    }
  ]
}
```

**Важно:** поле `unit` должно быть строкой (`"кг"`, `"л"`, `"г"`, `"мл"` и т.п.).

Если бэкенд возвращает объект, например:
```json
{ "unit": { "code": "л", "name": "литры" } }
```
фронт умеет брать `unit.code` или `unit.short` / `unit.name`. Поддерживаются и поля `unit_of_measure`, `unit.code`, `unit.short`, `unit.name`.

---

## 2. Склад сырья (`GET /raw-materials/`)

**Ответ:**
```json
{
  "items": [
    {
      "id": 1,
      "name": "Плёнка ПВД 50 мкм",
      "unit": "кг"
    }
  ]
}
```

`unit` — строка единицы измерения.

---

## 3. Создание рецепта (`POST /recipes/`)

**Тело запроса:**
```json
{
  "name": "Название рецепта",
  "product": "Название рецепта",
  "components": [
    {
      "type": "raw_material",
      "material_id": 123,
      "quantity": 1,
      "unit": "кг"
    },
    {
      "type": "chemistry",
      "chemistry_id": 45,
      "quantity": 1,
      "unit": "л"
    }
  ]
}
```

- `type`: `"raw_material"` или `"chemistry"`
- `material_id` — ID из `/raw-materials/` (только для сырья)
- `chemistry_id` — ID из `/chemistry/elements/` (только для хим. элементов)
- `quantity` — число
- `unit` — строка (`"кг"`, `"л"`, `"г"`, `"мл"` и т.д.), берётся из справочника элемента/сырья

---

## 4. Редактирование (`PATCH /recipes/{id}/`)

Формат тела — такой же, как при создании.

---

## 5. Рекомендация для бэкенда

В ответах `/chemistry/elements/` и `/raw-materials/` обязательно возвращайте `unit` как строку:

```json
{ "id": 1, "name": "test", "unit": "л" }
```

Так фронт всегда корректно отобразит единицу измерения.
