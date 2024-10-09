import { TPath } from "../utils/astar";
import { Singleton } from "../utils/singleton";

type TGameMoveListener = (username: string, x: number, y: number) => void;

class GameMove extends Singleton {
  protected paths: Record<string, TPath> = {};
  protected timer: Record<string, NodeJS.Timeout> = {};
  protected listeners: Array<TGameMoveListener> = [];
  private _duration = 100;

  public set duration(v: number) {
    this._duration = v;
  }

  /**
   * 添加移动回调
   * @param cb 回调函数
   */
  public addListener(cb: TGameMoveListener) {
    this.listeners.push(cb);
  }

  /**
   * 移除移动回调
   * @param cb 回调函数
   */
  public removeListener(cb: TGameMoveListener) {
    const index = this.listeners.indexOf(cb);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 移除所有移动回调
   */
  public removeAllListeners() {
    this.listeners = [];
  }

  /**
   * 设置路径
   * @param username 用户名
   * @param path 路径
   */
  public setPath(username: string, path: TPath) {
    this.paths[username] = path;
    if (this.timer[username]) {
      clearTimeout(this.timer[username]);
    }
    // 开始执行移动
    this.move(username);
  }

  protected move(username: string) {
    this.timer[username] = setTimeout(() => {
      const path = this.paths[username];
      if (! path || path.length === 0) {
        return;
      }
      const [ x, y ] = path.shift();
      this.listeners.forEach(cb => cb(username, x, y));
      if (path.length === 0) {
        // 结束
        this.listeners.forEach(cb => cb(username, -1, -1));
        delete this.paths[username];
        delete this.timer[username];
      } else {
        // 继续移动
        this.move(username);
      }
    }, this._duration);
  }
}

export default GameMove;
