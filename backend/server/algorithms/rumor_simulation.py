from typing import Dict, List, Optional
import numpy as np
from storage_engine.repository import GraphRepository
from schemas.simulation_state import (
    SimulationState,
    TickResult,
    SimStatus,
    SimulationDay,
)
from logger_config import get_logger
from core.exceptions import (
    SimulationNotInitializedError,
    InvalidSeedNodeError,
    InvalidProbabilityError,
    InvalidThresholdError,
)

logger = get_logger(__name__)


# ============================================================================
# Helpers
# ============================================================================

def _count_statuses(statuses: Dict[str, SimStatus]) -> Dict[str, int]:
    """Count nodes by status."""
    counts = {"total": len(statuses), "ignorant": 0, "spreaders": 0, "informed": 0}
    for s in statuses.values():
        if s == SimStatus.IGNORANT:
            counts["ignorant"] += 1
        elif s == SimStatus.SPREADER:
            counts["spreaders"] += 1
        else:
            counts["informed"] += 1
    return counts

def _build_stats(statuses: Dict[str, SimStatus], newly_informed: int, node_updates: List[dict]) -> dict:
    c = _count_statuses(statuses)
    total = c["total"]
    informed = total - c["ignorant"]
    coverage = informed / max(1, total)

    return {
        "totalNodes": total,
        "ignorant": c["ignorant"],
        "spreaders": c["spreaders"],
        "informed": informed,
        "coverage": coverage,
        "infectedPercent": round(coverage * 100, 2),
        "newSpreaders": len(node_updates),
        "newlyInformed": newly_informed,
        "cumulativeInformed": informed,
        "spreaderRatio": round(c["spreaders"] / max(1, total), 4),
        "ignorantRatio": round(c["ignorant"] / max(1, total), 4),
        "informedRatio": round(informed / max(1, total), 4),
        "completed": c["spreaders"] == 0,
    }


# ============================================================================
# Propagation Tick Functions
# ============================================================================

def tick_wave(
        statuses: Dict[str, SimStatus],
        repository: GraphRepository,
        graph_id: str | None,
) -> TickResult:
    next_statuses = statuses.copy()
    changes = []

    spreader_ids = [nid for nid, s in statuses.items() if s == SimStatus.SPREADER]
    active_spreaders = len(spreader_ids)

    if not spreader_ids:
        return TickResult(next_statuses=next_statuses, newly_informed=0, active_spreaders=0, changes=[])

    all_neighbors = repository.neighbors_batch(spreader_ids, graph_id)
    newly_infected = set()

    for neighbours in all_neighbors.values():
        for nb in neighbours:
            if statuses.get(nb) == SimStatus.IGNORANT:
                newly_infected.add(nb)

    for nb in newly_infected:
        next_statuses[nb] = SimStatus.SPREADER
        changes.append({"id": nb, "status": SimStatus.SPREADER.value})

    for nid in spreader_ids:
        next_statuses[nid] = SimStatus.INFORMED
        changes.append({"id": nid, "status": SimStatus.INFORMED.value})

    return TickResult(
        next_statuses=next_statuses,
        newly_informed=len(newly_infected),
        active_spreaders=active_spreaders,
        changes=changes,
    )


def tick_random(
        statuses: Dict[str, SimStatus],
        repository: GraphRepository,
        graph_id: str | None,
        p: float,
) -> TickResult:
    next_statuses = statuses.copy()
    changes = []

    spreader_ids = [nid for nid, s in statuses.items() if s == SimStatus.SPREADER]
    active_spreaders = len(spreader_ids)

    if not spreader_ids:
        return TickResult(next_statuses=next_statuses, newly_informed=0, active_spreaders=0, changes=[])

    all_neighbors = repository.neighbors_batch(spreader_ids, graph_id)
    newly_infected = set()

    for neighbours in all_neighbors.values():
        randoms = np.random.random(len(neighbours))
        for i, nb in enumerate(neighbours):
            if statuses.get(nb) == SimStatus.IGNORANT and randoms[i] < p:
                newly_infected.add(nb)

    for nb in newly_infected:
        next_statuses[nb] = SimStatus.SPREADER
        changes.append({"id": nb, "status": SimStatus.SPREADER.value})

    for nid in spreader_ids:
        next_statuses[nid] = SimStatus.STIFLER
        changes.append({"id": nid, "status": SimStatus.STIFLER.value})

    return TickResult(
        next_statuses=next_statuses,
        newly_informed=len(newly_infected),
        active_spreaders=active_spreaders,
        changes=changes,
    )


def tick_threshold(
        statuses: Dict[str, SimStatus],
        repository: GraphRepository,
        graph_id: str | None,
        threshold: int,
) -> TickResult:
    next_statuses = statuses.copy()
    changes = []

    ignorants = [nid for nid, s in statuses.items() if s == SimStatus.IGNORANT]
    spreader_ids = [nid for nid, s in statuses.items() if s == SimStatus.SPREADER]
    active_spreaders = len(spreader_ids)

    if not ignorants:
        return TickResult(next_statuses=next_statuses, newly_informed=0, active_spreaders=active_spreaders, changes=[])

    all_neighbors = repository.neighbors_batch(ignorants, graph_id)
    status_values = {nid: s.value for nid, s in statuses.items()}

    newly_informed = 0
    for node_id, neighbours in all_neighbors.items():
        informed_count = sum(1 for nb in neighbours if status_values.get(nb, 0) != SimStatus.IGNORANT.value)
        if informed_count >= threshold:
            next_statuses[node_id] = SimStatus.SPREADER
            newly_informed += 1
            changes.append({"id": node_id, "status": SimStatus.SPREADER.value})

    for nid in spreader_ids:
        next_statuses[nid] = SimStatus.INFORMED
        changes.append({"id": nid, "status": SimStatus.INFORMED.value})

    return TickResult(
        next_statuses=next_statuses,
        newly_informed=newly_informed,
        active_spreaders=active_spreaders,
        changes=changes,
    )


def tick_weighted(
        statuses: Dict[str, SimStatus],
        repository: GraphRepository,
        graph_id: str | None,
) -> TickResult:
    next_statuses = statuses.copy()
    changes = []

    spreader_ids = [nid for nid, s in statuses.items() if s == SimStatus.SPREADER]
    active_spreaders = len(spreader_ids)

    if not spreader_ids:
        return TickResult(next_statuses=next_statuses, newly_informed=0, active_spreaders=0, changes=[])

    newly_infected = set()

    for nid in spreader_ids:
        neighbours = repository.neighbors_with_weights(nid, graph_id)
        nb_list = list(neighbours.keys())
        weights = np.array(list(neighbours.values()), dtype=np.float64)
        randoms = np.random.random(len(nb_list))

        for i, nb in enumerate(nb_list):
            if statuses.get(nb) == SimStatus.IGNORANT and randoms[i] < weights[i] / 100.0:
                newly_infected.add(nb)

    for nb in newly_infected:
        next_statuses[nb] = SimStatus.SPREADER
        changes.append({"id": nb, "status": SimStatus.SPREADER.value})

    for nid in spreader_ids:
        next_statuses[nid] = SimStatus.STIFLER
        changes.append({"id": nid, "status": SimStatus.STIFLER.value})

    return TickResult(
        next_statuses=next_statuses,
        newly_informed=len(newly_infected),
        active_spreaders=active_spreaders,
        changes=changes,
    )


# ============================================================================
# Simulation Engine
# ============================================================================

class RumorSimulationEngine:

    def __init__(self, repository: GraphRepository, graph_id: str | None = None):
        self.repository = repository
        self.graph_id = graph_id
        self.state: Optional[SimulationState] = None
        self._is_running = False
        self._tick_count = 0
        self._node_list: Optional[List[str]] = None
        self._neighbor_cache: Optional[Dict[str, List[str]]] = None

    def _preload_graph(self):
        if self._neighbor_cache is not None:
            return
        nodes = self.repository.get_nodes(self.graph_id)
        self._node_list = [n.id for n in nodes]
        self._neighbor_cache = self.repository.neighbors_batch(self._node_list, self.graph_id)

    def initialize(
            self,
            seed_ids: List[str],
            model: str = "wave",
            probability: float = 0.3,
            threshold: int = 2,
    ) -> SimulationState:
        logger.info("Initializing simulation model=%s seeds=%d", model, len(seed_ids))

        if not (0 <= probability <= 1):
            raise InvalidProbabilityError(f"Probability must be 0-1, got {probability}.")
        if threshold < 0:
            raise InvalidThresholdError(f"Threshold must be >= 0, got {threshold}.")

        self._preload_graph()

        statuses: Dict[str, SimStatus] = {nid: SimStatus.IGNORANT for nid in self._node_list}

        for nid in seed_ids:
            if not self.repository.contains_node(nid, self.graph_id):
                raise InvalidSeedNodeError(f"Seed '{nid}' not found.", graph_id=self.graph_id, node_id=nid)
            statuses[nid] = SimStatus.SPREADER

        total_nodes = len(self._node_list)
        spreaders = len(seed_ids)

        self.state = SimulationState(
            statuses=statuses,
            current_day=0,
            coverage=spreaders / max(1, total_nodes),
            is_complete=False,
        )

        seed_updates = [{"id": nid, "status": SimStatus.SPREADER.value} for nid in seed_ids]
        self.state.timeline.append(
            SimulationDay(day=0, node_updates=seed_updates,
                          stats=_build_stats(statuses, newly_informed=spreaders, node_updates=seed_updates))
        )

        self._tick_count = 0
        self._is_running = False
        logger.info("Simulation initialized nodes=%d spreaders=%d", total_nodes, spreaders)
        return self.state

    def tick(self, model: str = "wave", probability: float = 0.3, threshold: int = 2) -> TickResult:
        if self.state is None:
            raise SimulationNotInitializedError("Simulation not initialized.")

        tick_fn = {
            "random": tick_random,
            "threshold": tick_threshold,
            "weighted": tick_weighted,
        }.get(model, tick_wave)

        kwargs = {"statuses": self.state.statuses, "repository": self.repository, "graph_id": self.graph_id}
        if model == "random":
            kwargs["p"] = probability
        elif model == "threshold":
            kwargs["threshold"] = threshold

        result = tick_fn(**kwargs)

        self.state.statuses = result.next_statuses
        self._tick_count += 1
        self.state.current_day = self._tick_count

        total_nodes = len(self.state.statuses)
        informed = sum(1 for s in self.state.statuses.values() if s != SimStatus.IGNORANT)
        spreaders = sum(1 for s in self.state.statuses.values() if s == SimStatus.SPREADER)
        self.state.coverage = informed / max(1, total_nodes)
        self.state.is_complete = spreaders == 0

        self.state.timeline.append(
            SimulationDay(
                day=self.state.current_day,
                node_updates=result.changes,
                stats=_build_stats(self.state.statuses, result.newly_informed, result.changes),
            )
        )

        return result

    def run_until_complete(
            self,
            model: str = "wave",
            probability: float = 0.3,
            threshold: int = 2,
            max_ticks: int = 1000,
    ) -> SimulationState:
        if self.state is None:
            raise SimulationNotInitializedError("Simulation not initialized.")

        logger.info("Running simulation until completion")
        self._is_running = True

        while not self.state.is_complete and self._tick_count < max_ticks:
            self.tick(model=model, probability=probability, threshold=threshold)

        self._is_running = False
        logger.info("Simulation finished ticks=%d coverage=%.4f", self._tick_count, self.state.coverage)
        return self.state

    def clear_cache(self):
        self._neighbor_cache = None
        self._node_list = None