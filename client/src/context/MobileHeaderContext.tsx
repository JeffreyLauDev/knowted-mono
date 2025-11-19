import React, { createContext, useContext, useState, ReactNode } from 'react';

interface MobileHeaderContextType {
  showMeetingsPanel: boolean;
  setShowMeetingsPanel: (show: boolean) => void;
  toggleMeetingsPanel: () => void;
}

const defaultContextValue: MobileHeaderContextType = {
  showMeetingsPanel: false,
  setShowMeetingsPanel: () => {},
  toggleMeetingsPanel: () => {}
};

const MobileHeaderContext = createContext<MobileHeaderContextType>(defaultContextValue);

export const MobileHeaderProvider = ({ children }: { children: ReactNode }) => {
  const [showMeetingsPanel, setShowMeetingsPanel] = useState(false);

  const toggleMeetingsPanel = () => {
    setShowMeetingsPanel((prev) => !prev);
  };

  return (
    <MobileHeaderContext.Provider
      value={{
        showMeetingsPanel,
        setShowMeetingsPanel,
        toggleMeetingsPanel
      }}
    >
      {children}
    </MobileHeaderContext.Provider>
  );
};

export const useMobileHeader = () => {
  return useContext(MobileHeaderContext);
};

