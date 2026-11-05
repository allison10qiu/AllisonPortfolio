import { initWalkthroughs } from "./project-walkthrough.js";
import { WALKTHROUGHS } from "./walkthrough-config.js?v=roam1";

initWalkthroughs(WALKTHROUGHS, { base: "/assets/home/walkthroughs/" });
