import { createContext, useState } from "react";

export const TargetPickContext = createContext();

export const TargetPickProvider = ({ children }) => {
  const [pickedTarget, setPickedTarget] = useState(null);
  return (
    <TargetPickContext.Provider value={{ pickedTarget, setPickedTarget }}>
      {children}
    </TargetPickContext.Provider>
  );
};
