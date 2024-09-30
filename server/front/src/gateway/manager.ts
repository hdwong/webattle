import { Singleton } from "../utils/singleton";

class GatewayManager extends Singleton {
  /* 开启 gateway manager */
  public start() {
    console.log("GatewayManager start");
  }
}

export { GatewayManager };
