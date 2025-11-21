import React from "react";

const SettingsFab: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed right-4 top-20 z-30 h-10 px-3 rounded-full bg-white/90 backdrop-blur ring-1 ring-neutral-300 shadow text-sm"
    >
      Ajustes
    </button>
  );
};

export default SettingsFab;
