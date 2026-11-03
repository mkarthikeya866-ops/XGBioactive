import numpy as np
from sklearn.base import BaseEstimator, ClassifierMixin
from sklearn.cluster import KMeans
from sklearn.metrics.pairwise import euclidean_distances


class RBFNetworkClassifier(ClassifierMixin, BaseEstimator):

    def __init__(self, n_centers=50, random_state=42, alpha=1.0):
        self.n_centers = n_centers
        self.random_state = random_state
        self.alpha = alpha

    def _rbf(self, X):
        distances = euclidean_distances(X, self.centers_)
        return np.exp(-self.gamma_ * distances ** 2)

    def fit(self, X, y):

        X = np.asarray(X, dtype=float)
        y = np.asarray(y, dtype=int)
        self.classes_ = np.unique(y)

        centers_count = min(self.n_centers, len(X))

        self.kmeans_ = KMeans(
            n_clusters=centers_count,
            random_state=self.random_state,
            n_init=10,
        )
        self.kmeans_.fit(X)
        self.centers_ = self.kmeans_.cluster_centers_

        center_distances = euclidean_distances(self.centers_)
        nonzero = center_distances[center_distances > 0]
        average_distance = float(np.mean(nonzero)) if len(nonzero) else 1.0
        self.gamma_ = 1.0 / (2.0 * average_distance ** 2)

        hidden = self._rbf(X)
        hidden = np.column_stack([hidden, np.ones(len(hidden))])

        identity = np.eye(hidden.shape[1])
        identity[-1, -1] = 0
        self.weights_ = np.linalg.solve(
            hidden.T @ hidden + self.alpha * identity,
            hidden.T @ y,
        )

        return self

    def predict_proba(self, X):

        X = np.asarray(X, dtype=float)

        hidden = self._rbf(X)
        hidden = np.column_stack([hidden, np.ones(len(hidden))])
        scores = np.clip(hidden @ self.weights_, 0.0, 1.0)

        return np.column_stack([1.0 - scores, scores])

    def predict(self, X):
        return (self.predict_proba(X)[:, 1] >= 0.5).astype(int)
