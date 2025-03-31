document.addEventListener("DOMContentLoaded", () => {
    const registrarSelect = document.getElementById("registrar-select");
    const leaveDetails = document.getElementById("leave-details-summary");
    const leaveRecords = document.getElementById("leave-records");
    const annualLeaveAllowance = document.getElementById("annual-leave-allowance");
    const studyLeave = document.getElementById("study-leave");
    const leaveRecordsTable = document.querySelector("#leave-records-table tbody");
    const studyLeaveUsed = document.getElementById("study-leave-used");
    const annualLeaveUsed = document.getElementById("annual-leave-used");
    const otherLeaveUsed = document.getElementById("other-leave-used");
    const studyLeaveRemaining = document.getElementById("study-leave-remaining");
    const annualLeaveRemaining = document.getElementById("annual-leave-remaining");
    const otherLeaveRemaining = document.getElementById("other-leave-remaining");

    let authToken = ""; // To store the JWT token

    // Hide all sections by default
    function hideSections() {
        leaveDetails?.classList.add("hidden");
        leaveRecords?.classList.add("hidden");
    }

    // Show all sections after login validation
    function showSections() {
        leaveDetails?.classList.remove("hidden");
        leaveRecords?.classList.remove("hidden");
    }

    // Check token validity
    function checkLogin() {
        const tokenString = localStorage.getItem("loginToken");
        if (!tokenString) {
            redirectToLogin();
            return false;
        }

        try {
            const token = JSON.parse(tokenString);
            if (Date.now() > token.expiry) {
                alert("Session expired. Please log in again.");
                localStorage.removeItem("loginToken");
                redirectToLogin();
                return false;
            }
            authToken = token.value; // Set the global authToken
            return true;
        } catch (e) {
            console.error("Error parsing token:", e);
            redirectToLogin();
            return false;
        }
    }

    // Redirect to the login page
    function redirectToLogin() {
        window.location.href = "index.html";
    }

    // Calculate weekdays between two dates
    function calculateWeekdaysBetween(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        let count = 0;

        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const day = date.getDay();
            if (day !== 0 && day !== 6) count++; // Exclude weekends
        }

        return count;
    }

    // Populate registrar details
function displayRegistrarDetails(registrar) {
    // Extract leave allowances from the registrar record
    const studyLeaveAllowance = registrar.allowance.study || 0;
    const annualLeaveAllowance = registrar.allowance.annual || 0;

    // Assuming `annualLeaveAllowance` and `studyLeave` are DOM elements to display these values
    annualLeaveAllowanceElement.textContent = annualLeaveAllowance || 0;  // Corrected: assumed DOM element
    studyLeaveElement.textContent = studyLeaveAllowance || 0;  // Corrected: assumed DOM element

    // Extract leave records, sort them by start date
    let sortedLeaveRecords = [...registrar.leave_records];
    sortedLeaveRecords.sort((a, b) => new Date(a.start) - new Date(b.start));

    // Update Leave Records
    leaveRecordsTable.innerHTML = "";
    let studyDays = 0, annualDays = 0, otherDays = 0;

    sortedLeaveRecords.forEach((record) => {
        const row = document.createElement("tr");

        const startCell = document.createElement("td");
        startCell.textContent = record.start;
        row.appendChild(startCell);

        const endCell = document.createElement("td");
        endCell.textContent = record.end;
        row.appendChild(endCell);

        const typeCell = document.createElement("td");
        typeCell.textContent = record.type;
        row.appendChild(typeCell);

        const leaveDays = calculateWeekdaysBetween(record.start, record.end);
        if (record.type === "Study") studyDays += leaveDays;
        else if (record.type === "Annual") annualDays += leaveDays;
        else otherDays += leaveDays;

        leaveRecordsTable.appendChild(row);
    });

    // Update Summary with Remaining Leave
    studyLeaveUsed.textContent = studyDays || 0;
    studyLeaveRemaining.textContent = studyLeaveAllowance - studyDays || 0;
    annualLeaveUsed.textContent = annualDays || 0;
    annualLeaveRemaining.textContent = annualLeaveAllowance - annualDays || 0;
    otherLeaveUsed.textContent = otherDays || 0;
    otherLeaveRemaining.textContent = "N/A";  // No parentheses error here
}


    // Update Summary with Remaining Leave
    studyLeaveUsed.textContent = (studyDays || 0);
    studyLeaveRemaining.textContent = (studyLeaveAllowance - studyDays) || 0;
    annualLeaveUsed.textContent = (annualDays || 0);
    annualLeaveRemaining.textContent = (annualLeaveAllowance - annualDays) || 0;
    otherLeaveUsed.textContent = (otherDays || 0);
    otherLeaveRemaining.textContent = "N/A";
}


    // Fetch registrars data securely
 // Fetch registrar data securely
async function fetchRegistrarData() {
    try {
        // Use a relative path to fetch the JSON file from the same directory
        const response = await fetch("./registrars_data.json");

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        return await response.json();
    } catch (error) {
        console.error("Error loading registrar data:", error);
        alert("Failed to load registrar data. Please try again later.");
    }
}


    // Main initialisation
    async function initialise() {
        hideSections();

        if (!checkLogin()) return;

        const data = await fetchRegistrarData();

        // Populate registrar dropdown
        data.forEach((registrar) => {
            const option = document.createElement("option");
            option.value = registrar.name;
            option.textContent = registrar.name;
            registrarSelect.appendChild(option);
        });

        // Event listener for registrar selection
        registrarSelect.addEventListener("change", () => {
            const selectedRegistrar = data.find((registrar) => registrar.name === registrarSelect.value);
            if (selectedRegistrar) {
                showSections();
                displayRegistrarDetails(selectedRegistrar);
            }
        });
    }

    initialise();
});
