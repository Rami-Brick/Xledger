import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="text-2xl font-bold">Une erreur inattendue s'est produite</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            {this.state.error.message || 'Erreur inconnue'}
          </p>
          <Button onClick={() => window.location.reload()}>
            Recharger la page
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
