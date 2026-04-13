"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import {
  clearAuthSession,
  getAccessToken,
  getStoredAuthUser,
  persistAuthSession,
} from "@/lib/auth"
import { getCurrentUser, login as loginRequest } from "../services/auth.service"
import type { LoginFormValues } from "../lib/login-schema"
import type { AuthenticatedUser } from "../types/auth.types"

interface AuthContextValue {
  user: AuthenticatedUser | null
  isAuthenticated: boolean
  isHydrated: boolean
  login: (values: LoginFormValues) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = React.useState<AuthenticatedUser | null>(null)
  const [isHydrated, setIsHydrated] = React.useState(false)

  const refreshUser = React.useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null)
      return
    }

    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    } catch {
      clearAuthSession()
      setUser(null)
    }
  }, [])

  React.useEffect(() => {
    setUser(getStoredAuthUser<AuthenticatedUser>())
    setIsHydrated(true)
  }, [])

  React.useEffect(() => {
    if (!isHydrated || !getAccessToken() || user) {
      return
    }

    void refreshUser()
  }, [isHydrated, refreshUser, user])

  const login = React.useCallback(
    async (values: LoginFormValues) => {
      const session = await loginRequest(values)

      persistAuthSession({
        accessToken: session.tokens.accessToken,
        refreshToken: session.tokens.refreshToken,
        user: session.user,
      })

      setUser(session.user)
      router.replace("/dashboard")
      router.refresh()
    },
    [router]
  )

  const logout = React.useCallback(() => {
    clearAuthSession()
    setUser(null)

    if (pathname?.startsWith("/dashboard")) {
      router.replace("/login")
      router.refresh()
    }
  }, [pathname, router])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user && getAccessToken()),
        isHydrated,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = React.useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  return context
}
