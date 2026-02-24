from dataclasses import dataclass
from typing import Literal


@dataclass
class GuyingInputs:
    horizontalDistance: float
    altitude: float
    hasPulley: bool
    selectedSpanIndex: int
    selectedSupport: Literal['LEFT', 'RIGHT']
