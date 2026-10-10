"""Football parsers must not accept a result while a recognized match clock is below 90."""
import io
from dataclasses import replace

import pytest

from config import Settings
from core.types import Box, Token
from games import get_parser
from tests.make_samples import board


class FixedOcr:
    def __init__(self, clock, standalone=False, separate=False):
        self.clock = clock
        self.standalone = standalone
        self.separate = separate

    def read(self, rgb, offset=(0, 0), scale=1.0):
        if self.standalone:
            return [Token(self.clock, Box(540, 35, 660, 65), 0.99)]
        if self.separate:
            tokens = [
                Token("KINGSLEY", Box(80, 35, 280, 65), 0.99),
                Token("2 - 0", Box(480, 35, 740, 65), 0.99),
                Token("UNITED", Box(900, 35, 1100, 65), 0.99),
            ]
            if self.clock is not None:
                tokens.append(Token(self.clock, Box(540, 105, 660, 135), 0.99))
            return tokens
        return [
            Token("KINGSLEY", Box(80, 35, 280, 65), 0.99),
            Token("2", Box(480, 35, 510, 65), 0.99),
            Token(self.clock, Box(540, 35, 660, 65), 0.99),
            Token("0", Box(710, 35, 740, 65), 0.99),
            Token("UNITED", Box(900, 35, 1100, 65), 0.99),
        ]


def parse_with_clock(game, clock, monkeypatch):
    parser = get_parser(game)
    monkeypatch.setattr(parser, "layout", replace(parser.layout, implemented=True))
    image = io.BytesIO()
    board().save(image, "PNG")
    return parser.run(image.getvalue(), ["KINGSLEY", "UNITED"], FixedOcr(clock), Settings())


class FullTimeWithoutClock:
    def __init__(self, game):
        if game == "ea_fc":
            self.tokens = [
                Token("2 - 0", Box(500, 35, 780, 70), 0.99),
                Token("FULLTIME", Box(500, 90, 780, 125), 0.99),
            ]
        else:
            self.tokens = [
                Token("FULLTIME", Box(500, 35, 780, 70), 0.99),
                Token("2 - 0", Box(500, 90, 780, 125), 0.99),
            ]

    def read(self, rgb, offset=(0, 0), scale=1.0):
        return self.tokens


@pytest.mark.parametrize("game", ["dls", "efootball", "ea_fc"])
@pytest.mark.parametrize("clock", ["45:00", "89:59"])
def test_match_clock_below_90_rejects_result(game, clock, monkeypatch):
    result = parse_with_clock(game, clock, monkeypatch)
    assert result.status == "rejected"
    assert result.reject_reason == "match_not_finished"
    assert result.score == {"left": 2, "right": 0}
    assert result.clock_text == clock


@pytest.mark.parametrize("game", ["dls", "efootball", "ea_fc"])
@pytest.mark.parametrize("clock", ["90:00", "90+1"])
def test_match_clock_at_or_after_90_accepts_detected_final_score(game, clock, monkeypatch):
    result = parse_with_clock(game, clock, monkeypatch)
    assert result.status == "ok"
    assert result.score == {"left": 2, "right": 0}
    assert result.clock_text == clock


@pytest.mark.parametrize("clock", ["45:00", "89:59"])
def test_separate_incomplete_clock_rejects_a_detected_score(clock, monkeypatch):
    parser = get_parser("dls")
    image = io.BytesIO()
    board().save(image, "PNG")
    result = parser.run(image.getvalue(), [], FixedOcr(clock, separate=True), Settings())
    assert result.status == "rejected"
    assert result.reject_reason == "match_not_finished"
    assert result.score == {"left": 2, "right": 0}
    assert result.clock_text == clock


@pytest.mark.parametrize("game", ["dls", "efootball", "ea_fc"])
@pytest.mark.parametrize(
    ("require_clock", "status", "reason"),
    [(True, "rejected", "match_clock_missing"), (False, "ok", None)],
)
def test_missing_clock_behavior_uses_environment_setting(game, require_clock, status, reason, monkeypatch):
    variable = "REQUIRE_CLOCK_FOR_SOCCER_GAMES_VALIDITY"
    if require_clock:
        monkeypatch.setenv(variable, "true")
    else:
        monkeypatch.delenv(variable, raising=False)
    parser = get_parser(game)
    monkeypatch.setattr(parser, "layout", replace(parser.layout, implemented=True))
    image = io.BytesIO()
    board().save(image, "PNG")
    result = parser.run(image.getvalue(), [], FixedOcr(None, separate=True), Settings())
    assert result.status == status
    assert result.reject_reason == reason


@pytest.mark.parametrize("game", ["dls", "efootball", "ea_fc"])
def test_fulltime_label_satisfies_strict_clock_requirement_without_clock(game):
    image = io.BytesIO()
    board().save(image, "PNG")

    result = get_parser(game).run(
        image.getvalue(),
        ["KINGSLEY", "UNITED"],
        FullTimeWithoutClock(game),
        Settings(require_clock_for_soccer_games_validity=True),
    )

    assert result.status == "ok"
    assert result.score == {"left": 2, "right": 0}
    assert result.clock_text is None
    assert "fulltime_banner" in result.flags
    assert "clock_not_shown" in result.flags


@pytest.mark.parametrize(
    ("clock", "status", "reason"),
    [
        ("45:00", "rejected", "match_not_finished"),
        ("45'", "rejected", "match_not_finished"),
        ("45+1", "rejected", "match_not_finished"),
        ("90:00", "no_score_found", None),
        ("90+1", "no_score_found", None),
    ],
)
def test_standalone_clock_cannot_be_accepted_as_a_match_score(clock, status, reason):
    parser = get_parser("dls")
    image = io.BytesIO()
    board().save(image, "PNG")
    result = parser.run(image.getvalue(), [], FixedOcr(clock, standalone=True), Settings())
    assert result.status == status
    assert result.reject_reason == reason
    assert result.clock_text == clock


@pytest.mark.parametrize("game", ["dls", "efootball", "ea_fc"])
def test_football_layouts_require_at_least_90_clock_minutes(game):
    assert get_parser(game).layout.minimum_completed_clock_minute == 90
