def clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def smoothstep(value: float) -> float:
    t = clamp01(value)
    return t * t * (3.0 - 2.0 * t)


def ease_out_back(value: float) -> float:
    t = clamp01(value)
    c1 = 1.70158
    c3 = c1 + 1.0
    return 1.0 + c3 * (t - 1.0) ** 3 + c1 * (t - 1.0) ** 2


def interval(progress: float, start: float, end: float) -> float:
    if end <= start:
        return 1.0 if progress >= end else 0.0
    return clamp01((progress - start) / (end - start))
