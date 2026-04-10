/**
 * A* Pathfinding implementation for the autonomous vehicle.
 */
export class PathFinder {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }

  findPath(start, target, obstacles) {
    const openSet = [start];
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    const startKey = this.posToKey(start);
    const targetKey = this.posToKey(target);

    gScore.set(startKey, 0);
    fScore.set(startKey, this.heuristic(start, target));

    while (openSet.length > 0) {
      // Get node with lowest fScore
      let current = openSet[0];
      let currentIndex = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (fScore.get(this.posToKey(openSet[i])) < fScore.get(this.posToKey(current))) {
          current = openSet[i];
          currentIndex = i;
        }
      }

      const currentKey = this.posToKey(current);
      if (currentKey === targetKey) {
        return this.reconstructPath(cameFrom, current);
      }

      openSet.splice(currentIndex, 1);

      for (const neighbor of this.getNeighbors(current, obstacles)) {
        const neighborKey = this.posToKey(neighbor);
        const tentativeGScore = gScore.get(currentKey) + 1;

        if (tentativeGScore < (gScore.get(neighborKey) ?? Infinity)) {
          cameFrom.set(neighborKey, current);
          gScore.set(neighborKey, tentativeGScore);
          fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, target));

          if (!openSet.some(node => this.posToKey(node) === neighborKey)) {
            openSet.push(neighbor);
          }
        }
      }
    }

    return []; // No path found
  }

  heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  getNeighbors(node, obstacles) {
    const neighbors = [];
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

    for (const [dx, dy] of dirs) {
      const nx = node.x + dx;
      const ny = node.y + dy;

      if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
        if (!obstacles.has(this.posToKey({ x: nx, y: ny }))) {
          neighbors.push({ x: nx, y: ny });
        }
      }
    }
    return neighbors;
  }

  posToKey(pos) {
    return `${pos.x},${pos.y}`;
  }

  reconstructPath(cameFrom, current) {
    const path = [current];
    let currentKey = this.posToKey(current);
    while (cameFrom.has(currentKey)) {
      current = cameFrom.get(currentKey);
      currentKey = this.posToKey(current);
      path.unshift(current);
    }
    return path;
  }
}
