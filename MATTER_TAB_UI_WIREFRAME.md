# Matter Tab UI Wireframe

## Left Sidebar Structure

```
┌─────────────────┐
│   [💬] Chats    │ ← Active tab
│   [📄] Matter   │ ← New tab with badge
│                 │
│   [🌙] Theme    │
│   [☰] Menu     │
└─────────────────┘
```

## Matter Tab Content (When Active)

### Empty State (No Matter Yet)
```
┌─────────────────────────────────┐
│ 📄 Matter                       │
├─────────────────────────────────┤
│                                 │
│    📝                            │
│                                 │
│ Start a chat to create          │
│ your matter                     │
│                                 │
│ [Start Chat]                    │
│                                 │
└─────────────────────────────────┘
```

### Incomplete Matter State
```
┌─────────────────────────────────┐
│ 📄 Matter              🟠       │ ← Orange badge
├─────────────────────────────────┤
│                                 │
│ MAT-2025-001                    │
│ Family Law Matter               │
│                                 │
│ ⚠️  Missing Information         │
│ • Timeline of events            │
│ • Location/venue info           │
│ • Supporting documents          │
│                                 │
│ 📋 Suggested Documents          │
│ • Marriage certificate          │
│ • Financial records             │
│ • Child custody info            │
│                                 │
│ 💳 Payment Required             │
│ $150 consultation fee           │
│ [Pay Now] [View in Chat]        │
│                                 │
└─────────────────────────────────┘
```

### Ready Matter State
```
┌─────────────────────────────────┐
│ 📄 Matter              🟢       │ ← Green badge
├─────────────────────────────────┤
│                                 │
│ MAT-2025-001                    │
│ Employment Law Matter           │
│                                 │
│ ✅ Matter Complete              │
│ All required information        │
│ has been provided               │
│                                 │
│ 📋 Documents Uploaded           │
│ • Employment contract ✅        │
│ • Pay stubs ✅                  │
│ • Termination letter ✅         │
│                                 │
│ 💳 Payment Complete             │
│ $150 consultation fee ✅        │
│                                 │
│ [View PDF] [Share Matter]       │
│                                 │
└─────────────────────────────────┘
```

## Badge System

### Badge Colors & Meanings:
- **🟠 Orange Dot**: Missing information or incomplete
- **🟢 Green Dot**: Matter is ready/complete
- **⚪ Gray Dot**: No matter exists yet

### Badge Placement:
- Small dot in top-right corner of Matter tab button
- Only visible when there's a matter to track
- Updates in real-time as matter status changes

## Mobile Responsive Behavior

### Desktop (lg+):
- Matter tab always visible in left sidebar
- Content expands in sidebar when active

### Mobile (< lg):
- Matter tab accessible via mobile sidebar toggle
- Content shows in mobile sidebar overlay
- Same badge system applies

## Component Hierarchy

```
LeftSidebar
├── Chats Tab (existing)
├── Matter Tab (new)
│   ├── Badge Indicator
│   └── MatterTabContent (when active)
│       ├── EmptyState (no matter)
│       ├── IncompleteState (missing info)
│       └── ReadyState (complete)
└── Theme Toggle + Menu (existing)

MatterTabContent
├── Matter Header (ID, Type)
├── Status Section
│   ├── Missing Information (if any)
│   └── Completion Status
├── Document Suggestions
│   ├── Default suggestions by type
│   └── Upload status
└── Payment Section
    ├── Payment status
    └── Action buttons
```

## Styling Notes

### Colors (Dark/Light Theme):
- **Orange badge**: `bg-orange-500` / `dark:bg-orange-400`
- **Green badge**: `bg-green-500` / `dark:bg-green-400`
- **Gray badge**: `bg-gray-400` / `dark:bg-gray-500`
- **Background**: `bg-light-card-bg` / `dark:bg-dark-card-bg`
- **Text**: `text-light-text` / `dark:text-dark-text`

### Spacing:
- Follow existing sidebar padding patterns
- Use consistent gap spacing between sections
- Maintain visual hierarchy with proper typography

### Icons:
- Use Heroicons for consistency
- DocumentIcon for matter tab
- CheckCircleIcon for completed items
- ExclamationTriangleIcon for missing items
- CreditCardIcon for payment section
