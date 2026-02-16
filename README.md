# Simple Work Tracker

A single-page HTML application for tracking work, releases, and tasks. No server required.

## How to Use

1.  **Open the Application**:
    Simply double-click `index.html` to open it in your web browser.

2.  **Import Data**:
    -   Click the "Import CSV" button (or "Choose File").
    -   Select your `ScarsdaleBuzz.csv` file.
    -   The application will parse the file and populate the tracker.

3.  **Manage Work**:
    -   **Add Items**: Use the buttons in the header to add Releases, Feature Areas, CUJs, and Tasks.
    -   **Edit/Delete**: Use the buttons on each task item.
    -   **Filter**: Use the "View" dropdown to filter by Feature Area or Release.
    -   **Sort**: Use the "Sort By" dropdown to organize your list.

4.  **Save Data**:
    -   **Automatic Saving**: Changes are automatically saved to your browser's `localStorage`. They will persist even if you close the browser (as long as you don't clear your browser cache).
    -   **Export Backup**: Click "Export JSON" to download a `work_tracker_data.json` file containing all your data.
    -   **Reset**: Click "Reset" to clear all data and start over.

## Data Privacy

All data is processed and stored locally in your browser. No data is sent to any server.
