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
    const currentCycleDisplay = document.getElementById("current-cycle-display");

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

    // Calculate the current leave cycle dates (1st Wed in Aug to 1st Tue in Aug next year)
    function getCurrentLeaveCycle() {
        const today = new Date();
        let year = today.getFullYear();
        
        // If we're before August, use previous year's cycle
        if (today.getMonth() < 7) { // Month is 0-indexed (7 = August)
            year -= 1;
        }

        // Find 1st Wednesday in August
        const firstWed = new Date(year, 7, 1); // August is month 7 (0-indexed)
        while (firstWed.getDay() !== 3) { // 3 = Wednesday
            firstWed.setDate(firstWed.getDate() + 1);
        }

        // Find 1st Tuesday in August next year
        const firstTueNextYear = new Date(year + 1, 7, 1);
        while (firstTueNextYear.getDay() !== 2) { // 2 = Tuesday
            firstTueNextYear.setDate(firstTueNextYear.getDate() + 1);
        }

        return {
            start: firstWed,
            end: firstTueNextYear,
            display: `${firstWed.toDateString()} to ${firstTueNextYear.toDateString()}`
        };
    }

    // Check if a date range falls within the current leave cycle
    function isInCurrentCycle(startDate, endDate, cycle) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return (start >= cycle.start && start <= cycle.end) || 
               (end >= cycle.start && end <= cycle.end) ||
               (start <= cycle.start && end >= cycle.end);
    }

    // Calculate days within current cycle only
    function calculateDaysInCycle(startDate, endDate, cycle) {
        const start = new Date(Math.max(new Date(startDate).getTime(), cycle.start.getTime()));
        const end = new Date(Math.min(new Date(endDate).getTime(), cycle.end.getTime()));
        
        if (start > end) return 0;
        
        return calculateWeekdaysBetween(start, end);
    }

    // Populate registrar details for current cycle only
    function displayRegistrarDetails(registrar) {
        const currentCycle = getCurrentLeaveCycle();
        currentCycleDisplay.textContent = currentCycle.display;

        // Extract leave allowances from the registrar record
        const studyLeaveAllowance = registrar.allowance.study || 0;
        const annualLeaveAllowanceValue = registrar.allowance.annual || 0;

        // Update the DOM elements with the allowance values
        annualLeaveAllowance.textContent = annualLeaveAllowanceValue;
        studyLeave.textContent = studyLeaveAllowance;

        // Extract leave records, sort them by start date
        let sortedLeaveRecords = [...registrar.leave_records];
        sortedLeaveRecords.sort((a, b) => new Date(a.start) - new Date(b.start));

        // Update Leave Records - only show current cycle
        leaveRecordsTable.innerHTML = "";
        let studyDays = 0, annualDays = 0, otherDays = 0;

        sortedLeaveRecords.forEach((record) => {
            if (isInCurrentCycle(record.start, record.end, currentCycle)) {
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

                const leaveDays = calculateDaysInCycle(record.start, record.end, currentCycle);
                if (record.type === "Study") studyDays += leaveDays;
                else if (record.type === "Annual") annualDays += leaveDays;
                else otherDays += leaveDays;

                leaveRecordsTable.appendChild(row);
            }
        });

        // Update Summary with Remaining Leave for current cycle
        studyLeaveUsed.textContent = studyDays;
        studyLeaveRemaining.textContent = studyLeaveAllowance - studyDays;
        annualLeaveUsed.textContent = annualDays;
        annualLeaveRemaining.textContent = annualLeaveAllowanceValue - annualDays;
        otherLeaveUsed.textContent = otherDays;
        otherLeaveRemaining.textContent = "N/A";
    }

    // Fetch registrars data securely
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
