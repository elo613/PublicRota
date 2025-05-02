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
    const allCyclesLeave = document.getElementById("all-cycles-leave");
    const cycleTablesContainer = document.getElementById("cycle-tables-container");

    let authToken = "";

    function hideSections() {
        leaveDetails?.classList.add("hidden");
        leaveRecords?.classList.add("hidden");
        allCyclesLeave?.classList.add("hidden");
    }

    function showSections() {
        leaveDetails?.classList.remove("hidden");
        leaveRecords?.classList.remove("hidden");
        allCyclesLeave?.classList.remove("hidden");
    }

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
            authToken = token.value;
            return true;
        } catch (e) {
            console.error("Error parsing token:", e);
            redirectToLogin();
            return false;
        }
    }

    function redirectToLogin() {
        window.location.href = "index.html";
    }

    function calculateWeekdaysBetween(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        let count = 0;

        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const day = date.getDay();
            if (day !== 0 && day !== 6) count++;
        }

        return count;
    }

    function getLeaveCycleForDate(date) {
        const d = new Date(date);
        let year = d.getFullYear();
        if (d.getMonth() < 7) year--;

        const start = new Date(year, 7, 1);
        while (start.getDay() !== 3) start.setDate(start.getDate() + 1);

        const end = new Date(year + 1, 7, 1);
        while (end.getDay() !== 2) end.setDate(end.getDate() + 1);

        return {
            start,
            end,
            key: `${start.toDateString()} to ${end.toDateString()}`
        };
    }

    function getCurrentLeaveCycle() {
        return getLeaveCycleForDate(new Date());
    }

    function isInCycle(startDate, endDate, cycle) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return (start >= cycle.start && start <= cycle.end) ||
               (end >= cycle.start && end <= cycle.end) ||
               (start <= cycle.start && end >= cycle.end);
    }

    function calculateDaysInCycle(startDate, endDate, cycle) {
        const start = new Date(Math.max(new Date(startDate).getTime(), cycle.start.getTime()));
        const end = new Date(Math.min(new Date(endDate).getTime(), cycle.end.getTime()));
        if (start > end) return 0;
        return calculateWeekdaysBetween(start, end);
    }

    function groupLeaveByCycle(records) {
        const grouped = {};
        records.forEach(record => {
            const cycle = getLeaveCycleForDate(record.start);
            const key = cycle.key;
            if (!grouped[key]) {
                grouped[key] = { cycle, records: [] };
            }
            grouped[key].records.push(record);
        });
        return grouped;
    }

    function displayRegistrarDetails(registrar) {
        const currentCycle = getCurrentLeaveCycle();
        currentCycleDisplay.textContent = `${currentCycle.start.toDateString()} to ${currentCycle.end.toDateString()}`;

        const studyLeaveAllowance = registrar.allowance.study || 0;
        const annualLeaveAllowanceValue = registrar.allowance.annual || 0;

        annualLeaveAllowance.textContent = annualLeaveAllowanceValue;
        studyLeave.textContent = studyLeaveAllowance;

        const sortedLeaveRecords = [...registrar.leave_records].sort(
            (a, b) => new Date(a.start) - new Date(b.start)
        );

        leaveRecordsTable.innerHTML = "";
        let studyDays = 0, annualDays = 0, otherDays = 0;

        sortedLeaveRecords.forEach(record => {
            if (isInCycle(record.start, record.end, currentCycle)) {
                const row = document.createElement("tr");

                row.innerHTML = `
                    <td>${record.start}</td>
                    <td>${record.end}</td>
                    <td>${record.type}</td>
                    <td>${calculateDaysInCycle(record.start, record.end, currentCycle)}</td>
                `;

                const leaveDays = calculateDaysInCycle(record.start, record.end, currentCycle);
                if (record.type === "Study") studyDays += leaveDays;
                else if (record.type === "Annual") annualDays += leaveDays;
                else otherDays += leaveDays;

                leaveRecordsTable.appendChild(row);
            }
        });

        studyLeaveUsed.textContent = studyDays;
        studyLeaveRemaining.textContent = studyLeaveAllowance - studyDays;
        annualLeaveUsed.textContent = annualDays;
        annualLeaveRemaining.textContent = annualLeaveAllowanceValue - annualDays;
        otherLeaveUsed.textContent = otherDays;
        otherLeaveRemaining.textContent = "N/A";

        // Populate all leave windows per cycle
        cycleTablesContainer.innerHTML = "";
        const grouped = groupLeaveByCycle(sortedLeaveRecords);

        Object.entries(grouped).forEach(([key, group]) => {
            const section = document.createElement("div");
            section.innerHTML = `<h4>Cycle: ${key}</h4>`;

            const table = document.createElement("table");
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Type</th>
                        <th>Duration (Days)</th>
                    </tr>
                </thead>
                <tbody>
                    ${group.records.map(record => `
                        <tr>
                            <td>${record.start}</td>
                            <td>${record.end}</td>
                            <td>${record.type}</td>
                            <td>${calculateDaysInCycle(record.start, record.end, group.cycle)}</td>
                        </tr>
                    `).join("")}
                </tbody>
            `;

            section.appendChild(table);
            cycleTablesContainer.appendChild(section);
        });
    }

    async function fetchRegistrarData() {
        try {
            const response = await fetch("./registrars_data.json");
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error("Error loading registrar data:", error);
            alert("Failed to load registrar data. Please try again later.");
        }
    }

    async function initialise() {
        hideSections();
        if (!checkLogin()) return;

        const data = await fetchRegistrarData();
        data.forEach(registrar => {
            const option = document.createElement("option");
            option.value = registrar.name;
            option.textContent = registrar.name;
            registrarSelect.appendChild(option);
        });

        registrarSelect.addEventListener("change", () => {
            const selected = data.find(r => r.name === registrarSelect.value);
            if (selected) {
                showSections();
                displayRegistrarDetails(selected);
            }
        });
    }

    initialise();
});
