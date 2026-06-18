class _Errors:
    NO_INITIAL_CONDITIONS = "No initial conditions provided"
    NO_INITIAL_CONDITION_SELECTED = "No initial condition selected"
    NO_SUPPORTS = "No supports data provided"

    @staticmethod
    def unsupported_symmetry_type(symmetry_type: str) -> str:
        return f"Unsupported symmetryType: {symmetry_type}. Expected 'dis_symmetric' or 'symmetric'"


class GeneratedPointsNoneError(ValueError):
    """Raised when generated points (spans, supports, insulators, others) are None."""
