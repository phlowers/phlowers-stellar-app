import logging

__version__ = "0.2.1"

logger = logging.getLogger(__name__)
logger.addHandler(logging.NullHandler())

logger.info("Stellar engine initialized.")
logger.info(f"Stellar engine version: {__version__}")
