import { NotificationFactory } from "../core/factory";
import { NovuNotificationService } from "./novu";

NotificationFactory.register("novu", NovuNotificationService);

export { NovuNotificationService } from "./novu";
export type * from "./novu/types";
