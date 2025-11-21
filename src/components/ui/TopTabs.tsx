import React from "react";
import type { FeedTopTab } from "../../pages/types/domain";

interface Props {
  tab: FeedTopTab;
  setTab: (t: FeedTopTab) => void;
}

const TopTabs: React.FC<Props> = ({ tab, setTab }) => {
  const tabs: FeedTopTab[] = ["Explore", "Following", "ForYou"];
  const labels: Record<FeedTopTab, string> = {
    "Explore": "Explorar",
    "Following": "A seguir",
    "ForYou": "Para ti"
  };
  return (
    <div className="flex items-center gap-3 text-sm">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => setTab(t)}
          className={`px-3 py-1.5 rounded-full ${
            tab === t ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"
          }`}
        >
          {labels[t]}
        </button>
      ))}
    </div>
  );
};

export default TopTabs;
