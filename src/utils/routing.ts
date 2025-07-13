export type Route = 'chats' | 'matters';

export interface RouterState {
  currentRoute: Route;
  params: Record<string, string>;
}

export class Router {
  private listeners: ((state: RouterState) => void)[] = [];
  private currentState: RouterState;

  constructor() {
    this.currentState = this.parseHash();
    this.setupHashListener();
  }

  private parseHash(): RouterState {
    if (typeof window === "undefined") {
      // Default state for SSR/prerendering
      return {
        currentRoute: 'chats',
        params: {}
      };
    }
    
    const hash = window.location.hash.slice(1) || 'chats';
    const [route, ...paramParts] = hash.split('?');
    
    const params: Record<string, string> = {};
    if (paramParts.length > 0) {
      const searchParams = new URLSearchParams(paramParts.join('?'));
      searchParams.forEach((value, key) => {
        params[key] = value;
      });
    }

    return {
      currentRoute: (route as Route) || 'chats',
      params
    };
  }

  private setupHashListener() {
    if (typeof window === "undefined") {
      return;
    }
    
    window.addEventListener('hashchange', () => {
      this.currentState = this.parseHash();
      this.notifyListeners();
    });
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentState));
  }

  subscribe(listener: (state: RouterState) => void) {
    this.listeners.push(listener);
    // Immediately call with current state
    listener(this.currentState);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  navigate(route: Route, params?: Record<string, string>) {
    if (typeof window === "undefined") {
      return;
    }
    
    let hash = route;
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        searchParams.set(key, value);
      });
      hash += '?' + searchParams.toString();
    }
    
    window.location.hash = hash;
  }

  getCurrentState(): RouterState {
    return { ...this.currentState };
  }
}

// Create a singleton instance
export const router = new Router(); 