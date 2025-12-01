import { ScorePanel } from "../crm/ScorePanel";
import { mockContacts } from "@/lib/mockData";

export default function ScorePanelExample() {
  const contact = mockContacts[0];
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 max-w-2xl">
      <ScorePanel
        type="contribution"
        scores={contact.contributionDetails}
        totalScore={contact.contributionScore}
        scoreClass={contact.contributionClass}
      />
      <ScorePanel
        type="potential"
        scores={contact.potentialDetails}
        totalScore={contact.potentialScore}
        scoreClass={contact.potentialClass}
      />
    </div>
  );
}
