"""
Custom exceptions for ParakhAI.
Provides specific error types to fail loudly instead of returning None.
"""

class ParakhAIError(Exception):
    """Base exception for all ParakhAI errors."""
    pass

class CalibrationError(ParakhAIError):
    """Raised when calibration fails — too few images, near-duplicates, feature extraction failure."""
    pass

class InferenceError(ParakhAIError):
    """Raised when inference fails — model not loaded, corrupt image."""
    pass

class SessionNotFoundError(ParakhAIError):
    """Raised when a session_id does not exist in model store."""
    pass

class ImageQualityError(ParakhAIError):
    """Raised when image is too blurry, too small, or incorrectly exposed."""
    pass

class BenchmarkError(ParakhAIError):
    """Raised when benchmark does not meet minimum AUROC threshold."""
    pass
