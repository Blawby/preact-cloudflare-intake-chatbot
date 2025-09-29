# Matter Tab Implementation Plan

## Overview
Add a "Matter" tab to the left sidebar below the "Chats" tab to help users develop their matter by showing missing information, payment status, and document upload suggestions.

## Goals
- **Frontend-only solution** - No backend changes needed
- **Reuse existing components** - Leverage current UI patterns and components
- **Help users develop their matter** - Show what's missing, payment needs, document suggestions
- **Dark/light theme support** - Use existing theme handling

## Current State Analysis

### Existing Components We Can Reuse:
1. **MatterCanvas** - Already analyzes missing information and shows matter summary
2. **DocumentChecklist** - Perfect for showing document upload suggestions
3. **Button** - Consistent UI component with dark/light support
4. **LeftSidebar** - Current sidebar structure to extend
5. **Message components** - Matter data is already in message.matterCanvas

### Current Data Flow:
- Matters are created via `createMatterRecord()` in worker
- Matter data appears in chat messages as `matterCanvas` property
- MatterCanvas component already analyzes missing info
- DocumentChecklist component exists for document management

## Implementation Plan

### Phase 1: Matter State Management
**File: `src/hooks/useMatterState.ts`**
- Extract matter data from existing messages
- Track current active matter in session (latest by timestamp)
- Return status enum: `"empty" | "incomplete" | "ready"`
- Provide matter data to sidebar components
- No API calls - just parse existing message data

### Phase 2: Matter Tab Component
**File: `src/components/MatterTab.tsx`**
- Reuse MatterCanvas logic for missing info analysis
- Reuse DocumentChecklist for document suggestions
- Show payment status if paymentEmbed exists in messages
- **Empty state**: "Start a chat to create your matter" placeholder
- **Default document suggestions** per matter type (even without analysis)
- Use existing Button and styling patterns
- Dark/light theme support via existing CSS classes

### Phase 3: Left Sidebar Integration
**File: `src/components/LeftSidebar.tsx`**
- Add "Matter" tab below "Chats" tab
- Use DocumentIcon from Heroicons
- **Badge indicator system**:
  - Orange dot = missing info
  - Green dot = ready
  - Gray dot = no matter yet
- Handle tab switching between Chats and Matter views
- Reuse existing Button component and styling

### Phase 4: App Layout Integration
**File: `src/components/AppLayout.tsx`**
- Add matter tab state management
- Pass matter data to sidebar
- Handle tab switching logic
- Maintain existing responsive behavior

## Component Structure

```
LeftSidebar
├── Chats Tab (existing)
├── Matter Tab (new)
│   ├── Matter Status Indicator
│   └── Matter Content (when active)
└── Theme Toggle + Menu (existing)

MatterTab (new component)
├── Matter Summary (reuse MatterCanvas logic)
├── Missing Information Section (reuse MatterCanvas analysis)
├── Document Suggestions (reuse DocumentChecklist)
├── Payment Status (check for paymentEmbed in messages)
└── Action Buttons (reuse Button component)
```

## Data Sources (Frontend Only)

### Matter Data:
- Extract from `messages[].matterCanvas` in current session
- Use latest matter data from messages
- No additional API calls needed

### Missing Information:
- Reuse `analyzeMissingInfo()` logic from MatterCanvas
- Check matter summary, service type, answers
- Show suggestions for improvement

### Document Suggestions:
- Reuse DocumentChecklist component
- Generate document suggestions based on matter type
- Show upload status and requirements

### Payment Status:
- Check for `paymentEmbed` in messages
- Show payment status and actions
- Reuse existing payment components

## Styling Approach

### Theme Support:
- Use existing `dark:` and `light:` CSS classes
- Follow current color scheme patterns
- Reuse existing component styling

### Responsive Design:
- Follow existing mobile sidebar pattern
- Use existing breakpoint classes
- Maintain consistent spacing and sizing

## Implementation Steps

1. **Create useMatterState hook** - Extract matter data from messages
2. **Create MatterTab component** - Reuse existing components and logic
3. **Update LeftSidebar** - Add matter tab with proper styling
4. **Update AppLayout** - Integrate matter tab state management
5. **Test functionality** - Ensure matter tab works with existing chat flow

## Success Criteria

- [ ] Matter tab appears below Chats tab in left sidebar
- [ ] Shows current matter information when available
- [ ] Displays missing information suggestions
- [ ] Shows document upload suggestions
- [ ] Indicates payment status if applicable
- [ ] **Shows empty state message when no matter exists**
- [ ] **Badge indicator on Matter tab reflects current state**
- [ ] **Payment CTA is visible in sidebar, not just chat**
- [ ] Works in both dark and light themes
- [ ] Responsive on mobile devices
- [ ] No backend changes required
- [ ] Reuses existing components and patterns

## Risk Mitigation

- **No API changes** - Only use existing message data
- **Reuse existing components** - Minimize new code and bugs
- **Follow existing patterns** - Maintain consistency
- **Incremental implementation** - Test each phase before proceeding
- **Empty states** - Prevent sidebar from feeling broken when no matter is active
- **Mobile sidebar** - Confirm usability in collapsed mode

## Future Enhancements (Not in Scope)

- Matter editing capabilities
- Multiple matter support
- Matter history
- Advanced document management
- Payment processing integration
