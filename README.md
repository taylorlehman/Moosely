# Moosely

A simple, locally-hosted work tracking application designed for managing releases, feature areas, and tasks.

## Key Features

*   **Asana Import:** Seamlessly migrate your workflow by importing CSV exports directly from Asana.
*   **Local File Storage:** Your data is saved securely to a local JSON file on your machine, ensuring persistence and privacy.
*   **Task Management:** Organize tasks by Release and Feature Area.
*   **Visual Organization:** Automatic color-coding, filtering, and sorting to keep your work organized.

## Getting Started

### Prerequisites
*   Node.js installed
*   Python 3 installed

### Installation
First, install the required dependencies:
```bash
npm install
```

### Running the App
Start the application with a single command:
```bash
./start_moosely
```
This script will:
1.  Start the local Node.js server.
2.  Automatically launch the application in Google Chrome (or your default browser).

## Usage

1.  **Import Data**:
    -   Click the menu button (⋮) in the header.
    -   Select "Import CSV".
    -   Upload your Asana CSV export to instantly populate your tracker.

2.  **Manage Work**:
    -   **Add Items**: Use the buttons in the header to add Releases, Feature Areas, and Tasks.
    -   **Edit/Delete**: Use the action buttons on each task item.
    -   **Filter & Sort**: Use the dropdowns to filter by Feature Area/Release or sort by Date.

3.  **Data Storage**:
    -   All changes are automatically saved to `data/data.json` in your project folder.
    -   You can also export a JSON backup via the menu.

## Data Privacy

All data is processed and stored locally on your computer. No data is sent to the cloud or any external servers.
