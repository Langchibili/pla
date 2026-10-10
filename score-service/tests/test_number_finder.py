"""Rule tests on fake OCR tokens: no image or OCR engine needed, so they run in milliseconds."""
import pytest
from core.number_finder import FinderConfig, find_pairs
from core.splitter import split
from core.types import Box, Token

W, H = 1280, 720
R = split(W, H)
CFG = FinderConfig()


def tok(text, x, y=60, w=None, h=40, conf=0.97):
    w = w if w is not None else 24 * len(text)
    return Token(text, Box(x, y, x + w, y + h), conf)


def scores(tokens, cfg=CFG):
    return [(p.left.text, p.right.text, p.link, p.zone) for p in find_pairs(tokens, R, cfg)]


@pytest.mark.parametrize("text", ["2:0", "2 : 0", "2-0", "2 - 0", "2 \u2013 0"])
def test_accepted_formats_in_one_token(text):
    assert scores([tok(text, 590)]) == [("2", "0", "sep", "top_center")]


def test_numbers_as_separate_tokens():
    got = scores([tok("2", 560), tok("-", 610, w=14), tok("0", 650)])
    assert got == [("2", "0", "sep", "top_center")]


def test_clock_between_numbers_is_dropped():
    got = scores([tok("2", 500), tok("45:12", 560, w=120), tok("0", 720)])
    assert got == [("2", "0", "clock", "top_center")]


def test_clock_with_tick_is_dropped():
    got = scores([tok("2", 500), tok("45'", 560, w=70), tok("0", 680)])
    assert got == [("2", "0", "clock", "top_center")]


def test_stoppage_time_clock_is_dropped():
    pairs = find_pairs([tok("2", 500), tok("90+1", 560, w=120), tok("0", 720)], R, CFG)
    assert len(pairs) == 1
    assert pairs[0].link == "clock"
    assert pairs[0].clock_text == "90+1"


@pytest.mark.parametrize("text", ["5:00", "45:00", "90:00", "45'", "45+1"])
def test_standalone_match_clock_is_not_reported_as_a_score(text):
    pairs = find_pairs([tok(text, 590)], R, CFG)
    assert len(pairs) == 1
    assert pairs[0].link == "clock_only"
    assert pairs[0].clock_text == text


@pytest.mark.parametrize("text", ["2%", "22%", "2 %"])
def test_number_touching_percent_is_not_a_score(text):
    assert scores([tok("1", 500), tok(text, 540)]) == []


def test_number_next_to_a_number_that_touches_percent():
    # "2" sits right next to "2%": the first 2 is not a score either, so "2:0" built from it fails
    assert scores([tok("0", 480), tok("2", 520, w=20), tok("2%", 546, w=44)]) == []


@pytest.mark.parametrize("text", ["2.2", "22.2", "2.", "0.5"])
def test_number_touching_period_is_not_a_score(text):
    assert scores([tok(text, 590)]) == []


def test_numbers_need_a_separator_by_default():
    assert scores([tok("2", 560), tok("0", 640)]) == []
    assert len(scores([tok("2", 560), tok("0", 640)], FinderConfig(allow_no_separator=True))) == 1


def test_numbers_on_different_lines_are_not_paired():
    assert scores([tok("2", 560, y=40), tok("-", 610, y=40, w=14), tok("0", 650, y=200)]) == []


def test_word_between_numbers_blocks_the_pair():
    assert scores([tok("2", 500), tok("FT", 560, w=40), tok("0", 640)]) == []


def test_out_of_range_numbers_rejected():
    assert scores([tok("150-0", 590)]) == []
    assert scores([tok("2-0", 590)], FinderConfig(score_max=1)) == []


def test_zone_follows_position():
    assert scores([tok("3-1", 80)])[0][3] == "top_left"
    assert scores([tok("3-1", 1100)])[0][3] == "top_right"
    assert scores([tok("3-1", 590, y=600)])[0][3] == "bottom_center"


def test_best_pair_ranked_first_when_two_scores_exist():
    got = find_pairs([tok("2-0", 590), tok("1-1", 100, y=300)], R, CFG)
    assert (got[0].left.text, got[0].right.text) == ("2", "0") or got[0].score >= got[1].score
