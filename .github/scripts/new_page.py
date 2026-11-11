#!/usr/bin/env python3
"""
Создаёт новую страницу-заготовку по имени файла и (по желанию)
добавляет её карточку в список раздела (coils.md / wands.md / other.md).

Параметры приходят через переменные окружения:
  NAME      имя файла без .md (латиница, цифры, - и _)
  TITLE     название на странице (если пусто, берётся из NAME)
  KIND      auto | coil | wand | other   (auto = определить по имени)
  ADD_CARD  true | false
"""
import os
import re
import sys
from pathlib import Path

# cover = обложка карточки в списке раздела (векторная для катушек и палочек)
KINDS = {
    "coil":  {"thing": "катушка",  "parent": "coils",  "parent_title": "Катушкам",
              "cover": "images/covers/coil.svg"},
    "wand":  {"thing": "палочка",  "parent": "wands",  "parent_title": "Палочкам",
              "cover": "images/covers/wand.svg"},
    "other": {"thing": "предмет",  "parent": "other",  "parent_title": "разделу",
              "cover": "images/Screenshot_20261005_180545.avif"},
}

TEMPLATE = """---
layout: default
title: {title} — a51bfcts Вики
custom_css: /css/main.css
---

# {title}

<div class="item-card">
<img loading="lazy" decoding="async" src="images/Screenshot_ГГГГММДД_ЧЧММСС.avif" alt="{title}">
</div>

***Описание*** *- ВПИШИ ОДНУ ФРАЗУ: что делает {thing}*

**{title}** - ВПИШИ 1-2 ПРЕДЛОЖЕНИЯ: что это за {thing}, чем она особенная.

## Как получить

<!-- Какой значок нужен, где его взять, шаги по порядку -->
ВПИШИ СЮДА

## Мелочи:

<!-- Любые наблюдения, баги, трюки. Если есть координаты или видео, добавь -->
ВПИШИ СЮДА
"""

CARD = """
  <a href="{name}.html" class="item-card">
    <img src="{img}" alt="{title}">
    <h3>{title}</h3>
  </a>
"""


NOTES = []   # предупреждения, которые попадут в сводку запуска


def warn(title, msg):
    """Жёлтое предупреждение на странице запуска (аналог "окошка" в GitHub Actions)."""
    print(f"::warning title={title}::{msg}")
    NOTES.append(f"⚠️ **{title}.** {msg}")


def detect_kind(name):
    """wand в имени -> wand, coil в имени -> coil; если нет или оба сразу -> None."""
    n = name.lower()
    has_wand, has_coil = "wand" in n, "coil" in n
    if has_wand and not has_coil:
        return "wand"
    if has_coil and not has_wand:
        return "coil"
    return None


def fail(msg):
    print(f"ОШИБКА: {msg}")
    sys.exit(1)


def main():
    name = os.environ.get("NAME", "").strip()
    if name.lower().endswith(".md"):
        name = name[:-3]
    title = os.environ.get("TITLE", "").strip()
    kind = os.environ.get("KIND", "auto").strip()
    add_card = os.environ.get("ADD_CARD", "true").lower() == "true"

    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,60}", name):
        fail("имя файла: только латиница, цифры, - и _ (без пробелов и русских букв), например reversecoil")
    if kind != "auto" and kind not in KINDS:
        fail(f"неизвестный тип: {kind}")

    detected = detect_kind(name)
    if kind == "auto":
        if detected:
            kind = detected
            print(f"Тип определён по имени: {kind}")
        else:
            kind = "other"
            if "wand" in name.lower() and "coil" in name.lower():
                reason = "есть и wand, и coil, поэтому тип непонятен"
            else:
                reason = "нет ни wand, ни coil"
            warn("Тип не определён",
                 f"В имени «{name}» {reason}, выбран тип other (предмет). "
                 "Если это катушка или палочка, выберите тип вручную или поправьте имя.")
    elif detected and detected != kind:
        warn("Тип страницы изменён",
             f"В имени «{name}» есть «{detected}», а вы выбрали «{kind}». "
             f"Автоматически использован тип «{detected}».")
        kind = detected
    if not title:
        title = name
    if "\n" in title or len(title) > 100:
        fail("название должно быть в одну строку, до 100 символов")

    k = KINDS[kind]
    target = Path(f"{name}.md")
    if target.exists():
        fail(f"{target} уже существует, ничего не перезаписываю")

    target.write_text(
        TEMPLATE.format(title=title, thing=k["thing"], parent=k["parent"],
                        parent_title=k["parent_title"]),
        encoding="utf-8",
    )
    print(f"Создана страница: {target}")

    if add_card:
        parent = Path(f"{k['parent']}.md")
        if not parent.exists():
            print(f"Карточка не добавлена: нет файла {parent}")
        else:
            text = parent.read_text(encoding="utf-8")
            grid = text.find('class="items-grid"')
            marker = "\n</div>\n\n<br>"
            end = text.find(marker, grid) if grid != -1 else -1
            if f'href="{name}.html"' in text:
                print(f"Карточка не добавлена: в {parent} уже есть ссылка на {name}.html")
            elif end == -1:
                print(f"Карточка не добавлена: в {parent} не найден список items-grid")
            else:
                card = CARD.format(name=name, img=k["cover"], title=title)
                text = text[:end + 1] + card + text[end + 1:]
                parent.write_text(text, encoding="utf-8")
                print(f"Карточка добавлена в {parent}")

    url_hint = f"{name}.html"
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as f:
            f.write(f"### Страница создана: `{name}.md` (тип: {kind})\n\n"
                    f"После сборки откроется по адресу `/{url_hint}`.\n")
            for note in NOTES:
                f.write(f"\n{note}\n")


if __name__ == "__main__":
    main()
