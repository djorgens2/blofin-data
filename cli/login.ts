"use strict";

import * as Frames from "#cli/ui/layout";
import * as Keys from "#cli/ui/keypress";

Frames.initializeLayout().then(async () => {
  do {
    const key = await Keys.keypress(["left", "right", "up", "down", "escape"]);
    if (key && key === "ctrl-c") process.exit(1);
  } while (true);
});
