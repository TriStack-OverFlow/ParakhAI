import logging
import torch
import numpy as np
import faiss
from typing import Tuple
from pathlib import Path
from parakh_ai.core.exceptions import ParakhAIError

logger = logging.getLogger(__name__)

class CoresetSampler:
    """
    Greedy coreset subsampling with Johnson-Lindenstrauss dimensionality reduction
    and FAISS index for nearest neighbor search.
    """
    def __init__(self, target_dim: int = 128, seed: int = 42):
        self.target_dim = target_dim
        self.seed = seed
        self.index = None
        
        # We need a reproducible projection matrix
        torch.manual_seed(seed)
        
    def _get_random_projection_matrix(self, d_in: int, d_out: int, device: torch.device) -> torch.Tensor:
        """Johnson-Lindenstrauss projection matrix"""
        # scaled random gaussian
        return (torch.randn((d_out, d_in), device=device) / np.sqrt(d_out))

    def fit(self, features: torch.Tensor, ratio: float = 0.01) -> np.ndarray:
        """
        Run greedy selection on features.
        features: (N, D)
        Returns: selected indices (K,)
        """
        N, D = features.shape
        K = max(1, int(N * ratio))
        logger.info(f"Subsampling {K} out of {N} patches (ratio: {ratio})")
        
        if K >= N:
            return np.arange(N)

        device = features.device
        
        # JL projection to speed up distance calculations
        proj_matrix = self._get_random_projection_matrix(D, self.target_dim, device)
        proj_features = torch.nn.functional.linear(features, proj_matrix) # (N, target_dim)
        
        # Greedy K-Center algorithm
        # Keep track of the min distances from each point to the selected set
        min_distances = torch.full((N,), float('inf'), device=device)
        coreset_indices = []
        
        # Pick first point randomly
        np.random.seed(self.seed)
        first_idx = np.random.randint(N)
        coreset_indices.append(first_idx)
        
        # Update distances using the first point
        selected_pt = proj_features[first_idx].unsqueeze(0)
        # L2 squared distance
        dists = torch.sum((proj_features - selected_pt) ** 2, dim=1)
        min_distances = torch.minimum(min_distances, dists)
        
        # Greedily pick the remaining K-1 points
        for i in range(1, K):
            max_idx = torch.argmax(min_distances).item()
            coreset_indices.append(max_idx)
            
            selected_pt = proj_features[max_idx].unsqueeze(0)
            dists = torch.sum((proj_features - selected_pt) ** 2, dim=1)
            min_distances = torch.minimum(min_distances, dists)

        return np.array(coreset_indices)

    def build_index(self, coreset_features: np.ndarray) -> None:
        """Build FAISS index on full-dim coreset."""
        # Using IndexFlatL2 for exact search
        D = coreset_features.shape[1]
        self.index = faiss.IndexFlatL2(D)
        self.index.add(coreset_features.astype(np.float32))
        logger.info(f"Built FAISS IndexFlatL2 on {coreset_features.shape[0]} points")

    def search(self, query_patches: np.ndarray, k: int = 1) -> Tuple[np.ndarray, np.ndarray]:
        """
        Query FAISS index.
        query_patches: (Q, D)
        Returns: (distances, indices)
        """
        if self.index is None:
            raise ParakhAIError("FAISS index not built. Call build_index first or load from disk.")
            
        distances, indices = self.index.search(query_patches.astype(np.float32), k)
        return distances, indices

    def save(self, path: Path) -> None:
        if self.index is None:
            raise ParakhAIError("FAISS index is empty; cannot save.")
        faiss.write_index(self.index, str(path))

    def load(self, path: Path) -> None:
        if not path.exists():
            raise ParakhAIError(f"FAISS index file {path} not found.")
        self.index = faiss.read_index(str(path))

    def add_with_coverage_check(
        self,
        new_patches: np.ndarray,
        coverage_threshold: float = 0.01,
        max_coreset_size: int = 5000,
    ) -> dict:
        """
        Bounded Incremental Coreset Merge.

        For each new patch, check if its nearest-neighbor distance to the
        existing coreset exceeds `coverage_threshold`.  If yes → the patch
        fills a genuine coverage gap and is admitted.  If no → it is
        redundant and skipped.

        After insertion, if the coreset exceeds `max_coreset_size`, the
        most redundant existing point (smallest max-distance to its
        neighbors) is evicted.

        Finally the FAISS FlatL2 index is rebuilt in-place.

        Returns dict with insertion statistics.
        """
        if self.index is None:
            raise ParakhAIError("FAISS index not built.")

        new_patches = new_patches.astype(np.float32)
        old_size = self.index.ntotal
        dim = self.index.d

        # ── 1. Coverage-gap filtering ─────────────────────────────────────
        dists, _ = self.index.search(new_patches, 1)  # (N_new, 1)
        dists = dists.squeeze(-1)                      # (N_new,)
        mask = dists > coverage_threshold
        novel_patches = new_patches[mask]

        if len(novel_patches) == 0:
            return {
                "patches_offered": int(len(new_patches)),
                "patches_admitted": 0,
                "patches_evicted": 0,
                "coreset_size": old_size,
            }

        # ── 2. Reconstruct full coreset + append novel patches ────────────
        existing = np.zeros((old_size, dim), dtype=np.float32)
        for i in range(old_size):
            existing[i] = self.index.reconstruct(i)

        merged = np.vstack([existing, novel_patches])

        # ── 3. Bounded eviction — remove most redundant points ────────────
        evicted = 0
        while len(merged) > max_coreset_size:
            # Build temp index to find 2-NN (self + nearest other)
            tmp = faiss.IndexFlatL2(dim)
            tmp.add(merged)
            d2, _ = tmp.search(merged, 2)  # (M, 2) — col 0 is self (dist=0)
            nn_dists = d2[:, 1]            # distance to nearest *other* point
            # The most redundant = smallest nn distance
            victim = int(np.argmin(nn_dists))
            merged = np.delete(merged, victim, axis=0)
            evicted += 1

        # ── 4. Rebuild FAISS index in-place ───────────────────────────────
        self.index = faiss.IndexFlatL2(dim)
        self.index.add(merged)

        return {
            "patches_offered": int(len(new_patches)),
            "patches_admitted": int(len(novel_patches)),
            "patches_evicted": evicted,
            "coreset_size": self.index.ntotal,
        }
