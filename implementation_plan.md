# Dashboard and Data Explorer Redesign

The goal is to modify the Dashboard to support file-specific views with date filtering, and update the Data Explorer to require explicit file selection before showing results.

## User Review Required

- **Date Filtering on Dashboard**: To filter by date without re-triggering expensive LLM calls, the backend will dynamically recalculate KPIs using rule-based logic (non-LLM) and regenerate charts for the selected date range. Does this approach sound good?
- **Dashboard Global View**: Should the dashboard still show the "Global Stats" (total uploads, etc.) when no file is selected, or should it immediately force the user to select a file? I will default to showing the global overview if no file is selected.

## Open Questions

- What should be displayed if the selected file doesn't have any date columns to filter by? I plan to simply disable or hide the date filter in this case.

## Proposed Changes

### Backend Changes (API & Services)

#### [MODIFY] `backend/app/api/routes/analysis.py`
- Add a new endpoint `POST /api/analysis/{analysis_id}/filter` that accepts a start and end date.
- It will load the original file, parse it into a Polars DataFrame, and locate the first date column.
- It will filter the rows by the specified date range.
- It will use `_fallback_kpis` and `generate_charts` to quickly return updated KPIs, Charts, and data preview without calling the Groq LLM.

#### [MODIFY] `backend/app/models/schemas.py`
- Add a `FilterRequest` schema for the new endpoint.

#### [MODIFY] `backend/app/services/file_parser.py`
- Ensure robust date parsing for Excel and CSV files to ensure we can filter by date properly.

### Frontend Changes (UI & Flow)

#### [MODIFY] `frontend/src/lib/api.ts`
- Add the API client function `filterAnalysis(analysisId, startDate, endDate)` to call the new backend endpoint.

#### [MODIFY] `frontend/src/app/page.tsx` (Dashboard)
- Update the layout to include a Top Bar for filtering:
  - File selector (Dropdown of completed analyses).
  - Date Range picker (only enabled if a file is selected and has date columns).
- When a file is selected:
  - Fetch its analysis results.
  - If date filters are applied, fetch the filtered results via the new endpoint.
  - Render the KPIs and Charts specifically for that file on the Dashboard.
- When no file is selected (Global view):
  - Show the existing QuickStats and Recent Analyses.

#### [MODIFY] `frontend/src/app/explorer/page.tsx`
- Remove the logic that automatically selects the first analysis.
- Show a prominent "Select a File to Explore" UI when `selectedId` is null.
- Once selected, show the data table and breakdown.

## Verification Plan

### Automated Tests
- N/A

### Manual Verification
- Upload a dataset with date columns (e.g. sales data).
- Navigate to Dashboard, select the file, and apply a date range filter. Verify KPIs and charts update instantly.
- Navigate to Data Explorer and verify no data is shown until a file is explicitly selected.
