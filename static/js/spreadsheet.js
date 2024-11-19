// [Previous code remains the same until the saveLocal function]

function saveLocal() {
    const data = JSON.stringify(sheets);
    sessionStorage.setItem('spreadsheetData', data);
    alert('Spreadsheet saved for current session.');
}

// [Rest of the code remains the same]
