from pydantic import (
    BaseModel,
    Field,
)


class EnsembleCommunityConfig(
    BaseModel,
):
    resolution: float = Field(
        default=1.0,
        ge=0.5,
        le=2.0,
    )

    ensembleRuns: int = Field(
        default=16,
        ge=5,
        le=30,
    )

    consensusThreshold: float = Field(
        default=0.5,
        ge=0.3,
        le=0.8,
    )


class EnsembleCommunityRequest(
    BaseModel,
):
    config: EnsembleCommunityConfig = (
        EnsembleCommunityConfig()
    )