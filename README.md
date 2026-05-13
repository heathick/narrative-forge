# NarrativeForge

AI-first инструмент для писателей и мастеров НРИ (настольных ролевых игр).

## Что он делает

- **Заметки** — пиши текстовые блоки (описания городов, персонажей, событий)
- **NER + граф связей** — LLM автоматически извлекает сущности и строит граф взаимоотношений
- **Поиск противоречий** — находит несовпадения в описаниях (голубые vs карие глаза)
- **Карточки сущностей** — каждая сущность получает карточку с атрибутами, картинкой и связями
- **Интерактивный граф** — визуализация всех связей с фильтрацией

## Стек

- **Frontend**: Next.js 14 + TailwindCSS + TypeScript
- **Backend**: Python FastAPI
- **DB**: SQLite
- **LLM**: Ollama + Qwen 3:8B

## Установка

### Требования

- Python 3.10+
- Node.js 18+
- [Ollama](https://ollama.ai) с запущенной моделью `qwen3:8b`

### Установка Ollama и модели

```bash
# Установить Ollama: https://ollama.ai
# Запустить сервер Ollama
ollama serve

# В другом терминале - скачать модель
ollama pull qwen3:8b
```

### Первый запуск

```bash
# Вариант 1: Автоматическая установка
setup.bat

# Вариант 2: Вручную
cd backend
pip install -r requirements.txt

cd ../frontend
npm install
```

### Запуск приложения

```bash
# Вариант 1: Автоматический старт
start.bat

# Вариант 2: Вручную (два терминала)
# Терминал 1 — Backend
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Терминал 2 — Frontend
cd frontend
npm run dev
```

Открыть в браузере: **http://localhost:3000**

## Использование

1. Создай заметку (Notes → New Note)
2. Напиши текст — описание персонажа, локации, события
3. Нажми **Analyze** — LLM извлечёт сущности и связи
4. Перейди в **Entities** — посмотри карточки извлечённых сущностей
5. Загрузи картинки для карточек (drag & drop)
6. Открой **Graph** — визуализация всех связей с фильтрами
7. **Contradictions** покажет найденные противоречия

## Структура проекта

```
narrative-forge/
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── database.py          # SQLite setup
│   ├── models.py            # DB models
│   ├── schemas.py           # Pydantic schemas
│   ├── routers/             # API endpoints
│   ├── services/
│   │   ├── llm_client.py    # Ollama integration
│   │   └── note_processor.py # NER + contradiction pipeline
│   └── prompts/             # LLM prompt templates
├── frontend/
│   └── app/
│       ├── page.tsx          # Dashboard
│       ├── notes/            # Notes editor
│       ├── entities/         # Entity cards
│       ├── graph/            # Graph visualization
│       └── contradictions/   # Contradiction viewer
├── setup.bat                 # First-time setup
└── start.bat                 # Start both servers
```
