import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import ProtectedRoute from '@/components/ProtectedRoute'

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '@/features/auth/AuthProvider'

const mockUseAuth = vi.mocked(useAuth)

function renderWithRouter(ui: React.ReactNode, initialPath = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Page de connexion</div>} />
        <Route path="/dashboard" element={ui} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  it('shows loading indicator while auth is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: true,
      signIn: vi.fn(),
      signOut: vi.fn(),
    })

    renderWithRouter(
      <ProtectedRoute>
        <div>Contenu protégé</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('Chargement...')).toBeInTheDocument()
    expect(screen.queryByText('Contenu protégé')).not.toBeInTheDocument()
  })

  it('redirects to /login when user is null and not loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    })

    renderWithRouter(
      <ProtectedRoute>
        <div>Contenu protégé</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('Page de connexion')).toBeInTheDocument()
    expect(screen.queryByText('Contenu protégé')).not.toBeInTheDocument()
  })

  it('renders children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'admin@test.local' } as any,
      session: {} as any,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    })

    renderWithRouter(
      <ProtectedRoute>
        <div>Contenu protégé</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('Contenu protégé')).toBeInTheDocument()
    expect(screen.queryByText('Page de connexion')).not.toBeInTheDocument()
  })
})
