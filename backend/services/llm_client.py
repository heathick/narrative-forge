import json
import logging
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"
OLLAMA_BASE_URL = "http://localhost:11434"
DEFAULT_MODEL = "qwen3:8b"


class OllamaClient:
    def __init__(self, base_url: str = OLLAMA_BASE_URL, model: str = DEFAULT_MODEL):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.client = httpx.Client(timeout=120.0)

    def _load_prompt(self, name: str) -> str:
        prompt_path = PROMPTS_DIR / f"{name}.txt"
        return prompt_path.read_text(encoding="utf-8")

    def _call_ollama(self, prompt: str) -> str:
        try:
            response = self.client.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.1,
                        "num_predict": 4096,
                    },
                },
            )
            response.raise_for_status()
            data = response.json()
            return data.get("response", "")
        except httpx.ConnectError:
            logger.error("Cannot connect to Ollama. Is it running?")
            raise
        except httpx.HTTPStatusError as e:
            logger.error(f"Ollama HTTP error: {e}")
            raise

    def _extract_json(self, text: str) -> dict | list | None:
        text = text.strip()
        # Try to find JSON in the response (LLM might wrap it in markdown)
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Try to find first { and last }
            start = text.find("{")
            end = text.rfind("}") + 1
            if start != -1 and end > start:
                try:
                    return json.loads(text[start:end])
                except json.JSONDecodeError:
                    pass
            # Try array
            start = text.find("[")
            end = text.rfind("]") + 1
            if start != -1 and end > start:
                try:
                    return json.loads(text[start:end])
                except json.JSONDecodeError:
                    pass
            logger.error(f"Failed to parse JSON from LLM response: {text[:500]}")
            return None

    def extract_ner(self, text: str) -> dict | None:
        prompt_template = self._load_prompt("ner_extraction")
        prompt = prompt_template.replace("{text}", text)
        response = self._call_ollama(prompt)
        return self._extract_json(response)

    def check_contradictions(
        self,
        entity_name: str,
        entity_type: str,
        existing_attributes: dict,
        new_text: str,
        new_attributes: dict,
    ) -> dict | None:
        prompt_template = self._load_prompt("contradiction_check")
        prompt = prompt_template.format(
            entity_name=entity_name,
            entity_type=entity_type,
            existing_attributes=json.dumps(existing_attributes, ensure_ascii=False, indent=2),
            new_text=new_text,
            new_attributes=json.dumps(new_attributes, ensure_ascii=False, indent=2),
        )
        response = self._call_ollama(prompt)
        return self._extract_json(response)

    def check_relation_contradictions(
        self,
        entity_name: str,
        existing_relations: str,
        new_relations: str,
    ) -> dict | None:
        prompt_template = self._load_prompt("relation_contradiction")
        prompt = prompt_template.format(
            entity_name=entity_name,
            existing_relations=existing_relations,
            new_relations=new_relations,
        )
        response = self._call_ollama(prompt)
        return self._extract_json(response)

    def generate_summary(
        self,
        entity_name: str,
        entity_type: str,
        all_mentions: str,
    ) -> str | None:
        prompt_template = self._load_prompt("entity_summary")
        prompt = prompt_template.format(
            entity_name=entity_name,
            entity_type=entity_type,
            all_mentions=all_mentions,
        )
        response = self._call_ollama(prompt)
        return response.strip() if response else None

    def health_check(self) -> bool:
        try:
            response = self.client.get(f"{self.base_url}/api/tags")
            return response.status_code == 200
        except Exception:
            return False


ollama_client = OllamaClient()
