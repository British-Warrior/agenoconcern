import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Contributors (4 tools)
import { registerGetContributorProfile } from "./contributors/get-contributor-profile.js";
import { registerUpdateContributorProfile } from "./contributors/update-contributor-profile.js";
import { registerGetContributorCircles } from "./contributors/get-contributor-circles.js";
import { registerGetContributorImpact } from "./contributors/get-contributor-impact.js";

// Challenges (4 tools)
import { registerListChallenges } from "./challenges/list-challenges.js";
import { registerGetChallengeDetail } from "./challenges/get-challenge-detail.js";
import { registerExpressInterest } from "./challenges/express-interest.js";
import { registerSubmitChallenge } from "./challenges/submit-challenge.js";

// Circles (5 tools)
import { registerGetCircleDetail } from "./circles/get-circle-detail.js";
import { registerAddCircleNote } from "./circles/add-circle-note.js";
import { registerGetCircleNotes } from "./circles/get-circle-notes.js";
import { registerSubmitResolution } from "./circles/submit-resolution.js";
import { registerUpdateSocialLink } from "./circles/update-social-link.js";

// Wellbeing (1 tool)
import { registerSubmitWellbeingCheckin } from "./wellbeing/submit-wellbeing-checkin.js";

export function registerAllTools(server: McpServer): void {
  // Contributors (4 tools)
  registerGetContributorProfile(server);
  registerUpdateContributorProfile(server);
  registerGetContributorCircles(server);
  registerGetContributorImpact(server);

  // Challenges (4 tools)
  registerListChallenges(server);
  registerGetChallengeDetail(server);
  registerExpressInterest(server);
  registerSubmitChallenge(server);

  // Circles (5 tools)
  registerGetCircleDetail(server);
  registerAddCircleNote(server);
  registerGetCircleNotes(server);
  registerSubmitResolution(server);
  registerUpdateSocialLink(server);

  // Wellbeing (1 tool)
  registerSubmitWellbeingCheckin(server);

  console.log("[mcp] Registered 14 tool stubs");
}
