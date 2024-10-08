/**
 * A* 寻路算法
 */

// 4个方向
const ROUND = [
  [ 0, 1 ],
  [ 1, 0 ],
  [ 0, -1 ],
  [ -1, 0 ],
];
// 障碍物 cost = -1
const OBSTACLE_COST = -1;
// 最小代价
const MIN_COST = 0.5;
const MAX_COST = 9999;

type TPoint = [ number, number ];

type TPointInfo = {
  x: number;
  y: number;
  g: number; // 起点到当前点的代价
  h: number; // 当前点到终点的代价
  f: number; // g + h
  cost: number;   // 代价
  parent: TPoint; // 父节点
};

class AStar {
  protected grid: number[][];
  protected openList: Record<string, TPointInfo> = {};
  protected closeList: Record<string, TPointInfo> = {};

  constructor(grid: number[][]) {
    this.grid = grid;
  }

  protected getKey(x: number, y: number) {
    return `${x},${y}`;
  }

  protected calculate(start: TPoint, end: TPoint) {
    const parentKey = this.getKey(start[0], start[1]);
    for (let i = 0; i < ROUND.length; ++i) {
      const x = start[0] + ROUND[i][0];
      const y = start[1] + ROUND[i][1];
      if (x < 0 || x >= this.grid[0].length || y < 0 || y >= this.grid.length) {
        // 超出边界
        continue;
      }
      let cost = this.grid[y][x];
      if (cost === OBSTACLE_COST) {
        // 障碍物
        cost = MAX_COST;
      }
      const key = this.getKey(x, y);
      if (typeof this.closeList[key] !== 'undefined') {
        // 已经在 closeList 中
        continue;
      }
      const g = this.closeList[parentKey].g + cost;
      const h = (Math.abs(end[0] - x) + Math.abs(end[1] - y)) * MIN_COST;  // 使用曼哈顿距离
      const f = g + h;
      if (typeof this.openList[key] !== 'undefined' && this.openList[key].f < f) {
        // 已经在 openList 中, 且代价更小
        continue;
      }
      this.openList[key] = { x, y, g, h, f, cost, parent: start };
    }
    // 从 openList 找到 f 最小的点
    let minF = null;
    let minKey = null;
    for (const key in this.openList) {
      const item = this.openList[key];
      if (minF === null || item.f < minF) {
        minF = item.f;
        minKey = key;
      }
    }
    if (minKey === null) {
      // 没有找到
      return;
    }
    const minPoint = this.openList[minKey];
    delete this.openList[minKey];
    this.closeList[minKey] = minPoint;
    if (minPoint.x === end[0] && minPoint.y === end[1]) {
      // 找到了
      return;
    }
    // 递归
    this.calculate([ minPoint.x, minPoint.y ], end);
  }

  /**
   * 寻路
   * @param start 起点
   * @param end 终点
   */
  public findPath(start: TPoint, end: TPoint): Array<TPoint> {
    // 初始化
    this.openList = {};
    this.closeList = {};
    this.closeList[this.getKey(start[0], start[1])] = { x: start[0], y: start[1], g: 0, h: 0, f: 0, cost: 0, parent: start };
    // 计算
    this.calculate(start, end);
    // 返回路径
    const path: Array<TPoint> = [];
    let key = this.getKey(end[0], end[1]);
    console.log(Object.keys(this.closeList).length);
    while (key !== this.getKey(start[0], start[1])) {
      const point = this.closeList[key];
      if (point.cost !== MAX_COST) {
        path.unshift([ point.x, point.y ]);
      }
      key = this.getKey(point.parent[0], point.parent[1]);
    }
    return path;
  }
}

export default AStar;
