import { FunctionComponent, ComponentChildren, createContext } from "preact"
import { useState, useContext } from "preact/hooks"
import { ChevronDownIcon } from "@heroicons/react/24/outline"

// Utility function for className merging (following codebase pattern)
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

// Context for accordion state
interface AccordionContextType {
  type: 'single' | 'multiple'
  collapsible: boolean
  currentValue: string | string[]
  toggleItem: (value: string) => void
  isItemOpen: (value: string) => boolean
}

const AccordionContext = createContext<AccordionContextType | null>(null)

interface AccordionProps {
  type?: 'single' | 'multiple'
  collapsible?: boolean
  value?: string | string[]
  onValueChange?: (value: string | string[]) => void
  children: ComponentChildren
  className?: string
}

interface AccordionItemProps {
  value: string
  children: ComponentChildren
  className?: string
}

interface AccordionTriggerProps {
  children: ComponentChildren
  className?: string
}

interface AccordionContentProps {
  children: ComponentChildren
  className?: string
}

const Accordion: FunctionComponent<AccordionProps> = ({
  type = 'single',
  collapsible = true,
  value,
  onValueChange,
  children,
  className = ''
}) => {
  const [internalValue, setInternalValue] = useState<string | string[]>(
    type === 'multiple' ? (Array.isArray(value) ? value : []) : (typeof value === 'string' ? value : '')
  )

  const currentValue = value !== undefined ? value : internalValue

  const handleValueChange = (newValue: string | string[]) => {
    if (onValueChange) {
      onValueChange(newValue)
    } else {
      setInternalValue(newValue)
    }
  }

  const toggleItem = (itemValue: string) => {
    if (type === 'multiple') {
      const currentArray = Array.isArray(currentValue) ? currentValue : []
      const newValue = currentArray.includes(itemValue)
        ? currentArray.filter(v => v !== itemValue)
        : [...currentArray, itemValue]
      handleValueChange(newValue)
    } else {
      const isCurrentlyOpen = currentValue === itemValue
      handleValueChange(isCurrentlyOpen && collapsible ? '' : itemValue)
    }
  }

  const isItemOpen = (itemValue: string) => {
    if (type === 'multiple') {
      return Array.isArray(currentValue) && currentValue.includes(itemValue)
    }
    return currentValue === itemValue
  }

  const contextValue: AccordionContextType = {
    type,
    collapsible,
    currentValue,
    toggleItem,
    isItemOpen
  }

  return (
    <AccordionContext.Provider value={contextValue}>
      <div 
        data-slot="accordion" 
        className={cn("w-full border border-gray-200 dark:border-gray-700 rounded-lg", className)}
      >
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

const AccordionItem: FunctionComponent<AccordionItemProps> = ({
  value,
  children,
  className = ''
}) => {
  const context = useContext(AccordionContext)
  
  if (!context) {
    throw new Error('AccordionItem must be used within an Accordion')
  }

  const isOpen = context.isItemOpen(value)

  return (
    <div
      data-slot="accordion-item"
      data-value={value}
      data-state={isOpen ? 'open' : 'closed'}
      className={cn("", className)}
    >
      {children}
    </div>
  )
}

const AccordionTrigger: FunctionComponent<AccordionTriggerProps> = ({
  children,
  className = ''
}) => {
  const context = useContext(AccordionContext)
  
  if (!context) {
    throw new Error('AccordionTrigger must be used within an Accordion')
  }

  const handleClick = (event: Event) => {
    const target = event.target as HTMLElement
    const item = target.closest('[data-slot="accordion-item"]')
    const itemValue = item?.getAttribute('data-value')
    
    if (itemValue) {
      context.toggleItem(itemValue)
    }
  }

  return (
    <div className="flex">
      <button
        data-slot="accordion-trigger"
        className={cn(
          "focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-center justify-between gap-4 px-4 py-3 text-left text-sm font-medium transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 rounded-lg",
          className
        )}
        onClick={handleClick}
        type="button"
      >
        {children}
        <ChevronDownIcon className="text-muted-foreground pointer-events-none size-4 shrink-0 transition-transform duration-200" />
      </button>
    </div>
  )
}

const AccordionContent: FunctionComponent<AccordionContentProps> = ({
  children,
  className = ''
}) => {
  const context = useContext(AccordionContext)
  
  if (!context) {
    throw new Error('AccordionContent must be used within an Accordion')
  }

  return (
    <div
      data-slot="accordion-content"
      className={cn(
        "text-sm",
        className
      )}
    >
      <div className={cn("px-4 pb-4", className)}>{children}</div>
    </div>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
