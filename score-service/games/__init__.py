"""Game registry. A game is available when its module exposes PARSER.

Adding a game = add games/<name>.py + one entry in GAME_MODULES + one `game` record in Strapi
whose `score_service_key` equals the layout key.
"""
from __future__ import annotations
import importlib

GAME_MODULES = ["dls", "ea_fc", "efootball", "tekken_mk", "codm", "pubg_mobile", "valorant_cs", "dota2"]
_parsers: dict = {}


def load_parsers() -> dict:
    if not _parsers:
        for name in GAME_MODULES:
            p = importlib.import_module(f"games.{name}").PARSER
            _parsers[p.layout.key] = p
    return _parsers


def get_parser(key: str):
    return load_parsers().get(key)
