import React from 'react';
import { Fabric } from 'office-ui-fabric-react/lib/Fabric';
import { initializeIcons } from 'office-ui-fabric-react/lib/Icons';

// Initialize Fluent UI icons once
if (typeof window !== 'undefined') {
  initializeIcons();
}

export const ThemeWrapper: React.SFC<{children: React.ReactNode}> = ({ children }) => {
  return (
    <Fabric>
      {children}
    </Fabric>
  );
};