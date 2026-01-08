# Reports/Dashboards Feature - Implementation Plan

## Overview
This document outlines the architecture and implementation plan for the Reports/Dashboards feature, which allows analysts to create, manage, preview, and export reports/dashboards containing multiple visualizations with filters and access control.

## 1. Architecture Overview

### 1.1 Data Layer
```
┌─────────────────┐
│  ReportsStore   │  ← Stores report/dashboard definitions
│  (reports.js)    │     - Title, visualizations, filters, access
└─────────────────┘
         │
         ├─── References ───┐
         │                   │
┌────────▼────────┐   ┌──────▼────────┐
│ Visualizations  │   │   Datasets     │
│    Store        │   │     Store      │
└─────────────────┘   └────────────────┘
```

### 1.2 Component Layer
```
ReportsPanel (Main Component)
├── ReportList View
│   ├── Report Cards (grid/list)
│   └── Actions: Create, Edit, Duplicate, Delete, Preview
│
├── Report Editor View
│   ├── Title Input
│   ├── Visualization Selector (multi-select checkboxes)
│   ├── Filter Builder
│   ├── Access Control Manager
│   └── Custom Text/Buttons (optional)
│
└── Report Preview View
    ├── Filter Controls (interactive)
    ├── Visualization Renderer
    └── Export Actions (PDF)
```

## 2. Data Models

### 2.1 Report/Dashboard Model
```javascript
{
  id: "report_1",
  title: "Sales Dashboard Q4",
  visualizationIds: ["viz_1", "viz_2", "viz_3"],
  filters: [
    {
      datasetId: "ds_1",
      field: "date",
      type: "date",  // date, text, number, select
      label: "Date Range",
      defaultValue: null
    }
  ],
  access: {
    users: ["user1", "user2"],
    groups: ["analysts", "managers"]
  },
  customTexts: [
    { id: "text_1", text: "Report description...", order: 0 }
  ],
  customButtons: [
    {
      id: "btn_1",
      label: "Open LIMS",
      actionType: "lims", // or "report"
      limsWindow: "sample_viewer",
      context: {}
    }
  ],
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-02T00:00:00Z"
}
```

### 2.2 Visualization Model (already exists)
```javascript
{
  id: "viz_1",
  name: "Sales Trend",
  type: "line", // line, bar, pie, table, scorecard, etc.
  config: {
    xAxis: { type: "column", value: "date", datasetId: "ds_1" },
    yAxis: { type: "column", value: "sales", datasetId: "ds_1" },
    styling: { title: "Sales Over Time", color: "#007bff" }
  },
  datasetId: "ds_1",
  accessControl: { users: [], groups: [] }
}
```

### 2.3 Filter Model
```javascript
{
  datasetId: "ds_1",
  field: "status",
  type: "select", // date, text, number, select
  label: "Status Filter",
  defaultValue: null,
  options: [] // For select type, populated from dataset
}
```

## 3. User Flows

### 3.1 Create New Report/Dashboard
```
1. User clicks "New Report/Dashboard" button
   ↓
2. Modal dialog appears with:
   - Title input (required)
   - Visualization selector (multi-select checkboxes)
   - Filter builder (optional - can add later)
   - Access control (optional - can manage later)
   ↓
3. User fills in:
   - Enters title
   - Selects visualizations from saved list
   - Optionally adds filters
   ↓
4. User clicks "Create Report"
   ↓
5. Report is saved and editor opens
```

### 3.2 Edit Report/Dashboard
```
1. User clicks "Edit" on report card
   ↓
2. Editor view opens with:
   - Current title (editable)
   - Current visualizations (checkboxes, can modify)
   - Current filters (can add/remove/edit)
   - Access control (can add/remove users/groups)
   ↓
3. User makes changes
   ↓
4. User clicks "Save Report"
   ↓
5. Changes are persisted
```

### 3.3 Preview Report/Dashboard
```
1. User clicks "Preview" button
   ↓
2. Preview view opens showing:
   - Report title
   - Active filters (if any) with controls
   - All selected visualizations rendered
   ↓
3. User can:
   - Apply/change filters (updates visualizations in real-time)
   - Export as PDF
   - Navigate back to list
```

### 3.4 Export to PDF
```
1. User clicks "Export as PDF" in preview
   ↓
2. System:
   - Captures current filter state
   - Renders all visualizations with current data
   - Generates PDF document
   ↓
3. PDF includes:
   - Report title
   - Active filters (if any)
   - All visualizations (as images/charts)
   - Timestamp
```

## 4. Component Structure

### 4.1 ReportsPanel Component
**Location:** `components/reports-panel.js`

**Responsibilities:**
- Main container for all report views
- State management (current report, active filters)
- Navigation between views (list, editor, preview)
- Event handling and coordination

**Key Methods:**
```javascript
class ReportsPanel {
  // View Management
  render()                    // Main render - shows list view
  renderReportsList()        // Grid/list of report cards
  renderReportEditor()        // Edit/create form
  renderPreview()             // Preview with visualizations
  
  // Report Operations
  showCreateReportDialog()    // Modal for creating new report
  editReport(reportId)        // Open editor for existing report
  duplicateReport(reportId)   // Clone a report
  deleteReport(reportId)      // Remove a report
  saveReport()                // Persist changes
  
  // Preview Operations
  previewReport(reportId)     // Show preview view
  applyFilters(reportId)      // Apply filter values to visualizations
  exportToPDF(reportId)       // Generate PDF export
  
  // Filter Management
  addFilter()                 // Add new filter to report
  removeFilter(index)          // Remove filter
  renderFilterControls()      // Render filter UI in preview
  
  // Access Control
  addAccessItem(type)         // Add user/group to access list
  removeAccessItem(type, index) // Remove from access list
}
```

### 4.2 Supporting Components

**ReportCard Component** (embedded in ReportsPanel)
- Displays report metadata
- Action buttons (Edit, Duplicate, Delete, Preview)
- Access badge

**FilterBuilder Component** (embedded in ReportsPanel)
- Add/remove filters
- Configure filter type and field
- Set default values

**AccessControlManager Component** (embedded in ReportsPanel)
- Add/remove users
- Add/remove groups
- Display current access list

**VisualizationRenderer Component** (new utility)
- Takes visualization config and dataset
- Renders appropriate chart type using Highcharts
- Handles filtering and data transformation

## 5. Integration Points

### 5.1 With Visualization System
- **Read:** Load saved visualizations from `visualizationsStore`
- **Render:** Use visualization config to recreate charts in preview
- **Filter:** Apply report-level filters to visualization data

### 5.2 With Dataset System
- **Read:** Access datasets for filter options
- **Filter:** Apply filters to dataset rows before visualization
- **Validate:** Ensure datasets exist before rendering

### 5.3 With Access Control System
- **Check:** Verify user has access to report
- **Filter:** Show only accessible reports in list
- **Manage:** Add/remove users and groups

## 6. Technical Implementation Details

### 6.1 Modal Dialog for Create
**Approach:** Custom modal using existing Modal utility pattern
- Use `Modal.custom()` or create backdrop manually
- Include all required fields in single dialog
- Validate before creating

**Fields:**
- Title (text input, required)
- Visualizations (multi-select checkboxes)
- Filters (can be added later in editor)
- Access control (can be managed later)

### 6.2 Filter System
**Types:**
- **Date:** Date picker input
- **Text:** Text input with contains matching
- **Number:** Number input with exact/range matching
- **Select:** Dropdown with unique values from dataset

**Implementation:**
- Filters stored per report
- Applied to dataset rows before visualization rendering
- Can be changed in preview (non-destructive)

### 6.3 Visualization Rendering in Preview
**Approach:**
- Load visualization config from store
- Get associated dataset
- Apply filters to dataset
- Recreate chart using Highcharts based on config
- Handle all chart types: line, bar, pie, table, scorecard, scatter

**Challenges:**
- Need to recreate exact chart from config
- Handle different visualization types
- Apply filters correctly
- Maintain interactivity (click-to-filter)

### 6.4 PDF Export
**Approach:** Use browser print API or jsPDF library
- Capture current state (filters applied)
- Render visualizations as images
- Generate PDF with report structure
- Include metadata (title, date, filters)

**Options:**
1. **Browser Print:** Use `window.print()` with print styles
2. **jsPDF:** Generate PDF programmatically
3. **html2pdf.js:** Convert HTML to PDF

### 6.5 Access Control
**Implementation:**
- Store users and groups arrays in report
- Check access when displaying reports
- Filter list view based on user role
- Allow analysts to manage access, viewers can only view

## 7. UI/UX Considerations

### 7.1 Create Flow
- **Simple Start:** Minimal required fields (title + visualizations)
- **Progressive Enhancement:** Add filters and access control in editor
- **Validation:** Clear error messages
- **Feedback:** Success confirmation after creation

### 7.2 Editor View
- **Sections:** Clear separation of concerns
- **Visualization List:** Scrollable, searchable if many
- **Filter Builder:** Add/remove with clear UI
- **Access Control:** Simple add/remove interface
- **Save:** Prominent save button, auto-save option?

### 7.3 Preview View
- **Layout:** Responsive grid of visualizations
- **Filters:** Sticky filter bar at top
- **Interactivity:** Click charts to filter other charts
- **Export:** Easy access to PDF export

### 7.4 List View
- **Cards:** Visual cards with key info
- **Actions:** Clear action buttons
- **Empty State:** Helpful message with create button
- **Search/Filter:** If many reports, add search

## 8. Implementation Steps

### Phase 1: Core Structure ✅ (DONE)
- [x] Create ReportsStore
- [x] Create ReportsPanel component
- [x] Add navigation link
- [x] Basic list view

### Phase 2: Create/Edit Flow
- [ ] Fix create dialog modal (CURRENT ISSUE)
- [ ] Implement editor view
- [ ] Save/update functionality
- [ ] Duplicate functionality

### Phase 3: Preview & Rendering
- [ ] Preview view layout
- [ ] Visualization renderer utility
- [ ] Filter application logic
- [ ] Interactive filtering

### Phase 4: Advanced Features
- [ ] Access control management UI
- [ ] PDF export implementation
- [ ] Custom text/buttons
- [ ] Click-to-filter interactions

### Phase 5: Polish
- [ ] Error handling
- [ ] Loading states
- [ ] Responsive design
- [ ] Performance optimization

## 9. Current Issues & Solutions

### Issue 1: Modal Not Displaying
**Problem:** Backdrop appears but modal content not visible
**Root Cause:** Bootstrap CSS conflicts or z-index issues
**Solution:** 
- Use explicit inline styles with !important
- Ensure proper z-index hierarchy
- Check for Bootstrap modal class conflicts

### Issue 2: Event Listeners Not Attaching
**Problem:** Buttons in modal not responding
**Root Cause:** Elements not found when listeners attached
**Solution:**
- Attach listeners after DOM is ready
- Use event delegation if needed
- Add error handling for missing elements

### Issue 3: Visualization Rendering
**Problem:** Need to recreate charts from saved config
**Solution:**
- Create VisualizationRenderer utility
- Map config to Highcharts options
- Handle all chart types consistently

## 10. Testing Strategy

### Unit Tests
- ReportsStore CRUD operations
- Filter application logic
- Access control checks

### Integration Tests
- Create report flow
- Edit report flow
- Preview with filters
- PDF export

### Manual Testing Checklist
- [ ] Create new report
- [ ] Edit existing report
- [ ] Add/remove visualizations
- [ ] Add/remove filters
- [ ] Preview report
- [ ] Apply filters in preview
- [ ] Export to PDF
- [ ] Duplicate report
- [ ] Delete report
- [ ] Access control (viewer vs analyst)

## 11. Future Enhancements

- Report templates
- Scheduled exports
- Email distribution
- Report versioning
- Collaborative editing
- Report sharing links
- Custom layouts/dashboards
- Real-time data updates

