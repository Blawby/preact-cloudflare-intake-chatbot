import { Component, ComponentChildren } from 'preact';
import { Button } from './ui/Button';

interface Props {
    children: ComponentChildren;
    fallback?: ComponentChildren;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    state = {
        hasError: false,
        error: null
    };

    static getDerivedStateFromError(error: Error) {
        return {
            hasError: true,
            error
        };
    }

    componentDidCatch(error: Error, errorInfo: any) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div class="error-boundary">
                    <h2>Something went wrong</h2>
                    <details>
                        <summary>Error details</summary>
                        <pre>{this.state.error?.message}</pre>
                    </details>
                    <Button 
                        variant="primary"
                        onClick={() => {
                            this.setState({ hasError: false, error: null });
                        }}
                    >
                        Try again
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
} 