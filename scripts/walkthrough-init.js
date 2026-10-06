import { initWalkthroughs } from "./project-walkthrough.js";
import { WALKTHROUGHS } from "./walkthrough-config.js?v=photo1";

initWalkthroughs(WALKTHROUGHS, { base: "/assets/home/walkthroughs/" });
