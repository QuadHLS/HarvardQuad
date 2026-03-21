"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

interface SubViewContextType {
  isSubView: boolean
  setIsSubView: (value: boolean) => void
}

const SubViewContext = createContext<SubViewContextType>({
  isSubView: false,
  setIsSubView: () => {},
})

export function SubViewProvider({ children }: { children: ReactNode }) {
  const [isSubView, setIsSubViewState] = useState(false)
  const setIsSubView = useCallback((value: boolean) => setIsSubViewState(value), [])

  return (
    <SubViewContext.Provider value={{ isSubView, setIsSubView }}>
      {children}
    </SubViewContext.Provider>
  )
}

export function useSubView() {
  return useContext(SubViewContext)
}
