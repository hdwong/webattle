export class Singleton {
  /* 实例缓存 */
  private static _instance: Record<string, Singleton> = {};

  /* 私有化构造函数 */
  protected constructor() {}

  /* 初始化 */
  protected init() {}

  /* 获取单例 */
  static getInstance<T extends Singleton>(): T {
    const key = this.name;
    if (typeof this._instance[key] === 'undefined') {
      const instance = new this();
      instance.init();
      this._instance[key] = instance;
    }
    return this._instance[key] as T;
  }
}
