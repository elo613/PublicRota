document.addEventListener("DOMContentLoaded", () => {
    const registrarSelect = document.getElementById("registrar-select");
    const currentCycleSection = document.getElementById("current-cycle-section");
    const otherCyclesSection = document.getElementById("other-cycles-section");
    const leaveRecordsTable = document.querySelector("#leave-records-table tbody");
    const currentCycleDisplay = document.getElementById("current-cycle-display");
    const cycleTablesContainer = document.getElementById("cycle-tables-container");
    
    // Summary elements
    const annualLeaveAllowance = document.getElementById("annual-leave-allowance");
    const studyLeave = document.getElementById("study-leave");
    const studyLeaveUsed = document.getElementById("study-leave-used");
    const annualLeaveUsed = document.getElementById("annual-leave-used");
    const otherLeaveUsed = document.getElementById("other-leave-used");
    const studyLeaveRemaining = document.getElementById("study-leave-remaining");
    const annualLeaveRemaining = document.getElementById("annual-leave-remaining");
    const otherLeaveRemaining = document.getElementById("other-leave-remaining");

    let authToken = "";

    function hideSections() {
        currentCycleSection?.classList.add("hidden");
        otherCyclesSection?.classList.add("hidden");
    }

    function showSections() {
        currentCycleSection?.classList.remove("hidden");
        otherCyclesSection?.classList.remove("hidden");
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

        const start = new Date(year, 7, 1); // August 1st
        while (start.getDay() !== 3) start.setDate(start.getDate() + 1); // Find first Wednesday

        const end = new Date(year + 1, 7, 1); // August 1st next year
        while (end.getDay() !== 2) end.setDate(end.getDate() + 1); // Find first Tuesday

        return {
            start,
            end,
            key: `${formatDate(start)} to ${formatDate(end)}`,
            year: `${year}-${year + 1}`
        };
    }

    function formatDate(date) {
        return date.toDateString();
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
        
        // Initialize with the current cycle
        const currentCycle = getCurrentLeaveCycle();
        grouped[currentCycle.key] = { 
            cycle: currentCycle, 
            records: [],
            isCurrent: true
        };

        // Process all leave records
        records.forEach(record => {
            // Find which cycle(s) this leave record belongs to
            let foundCycle = false;
            
            // Check if it belongs to existing cycles in our grouped object
            for (const [key, group] of Object.entries(grouped)) {
                if (isInCycle(record.start, record.end, group.cycle)) {
                    // Create a copy of the record with days calculated for this specific cycle
                    const recordCopy = {...record};
                    recordCopy.daysInCycle = calculateDaysInCycle(record.start, record.end, group.cycle);
                    group.records.push(recordCopy);
                    foundCycle = true;
                }
            }
            
            // If it doesn't belong to any existing cycles, create a new one
            if (!foundCycle) {
                const recordCycle = getLeaveCycleForDate(record.start);
                const key = recordCycle.key;
                
                if (!grouped[key]) {
                    grouped[key] = { 
                        cycle: recordCycle, 
                        records: [],
                        isCurrent: false 
                    };
                }
                
                const recordCopy = {...record};
                recordCopy.daysInCycle = calculateDaysInCycle(record.start, record.end, recordCycle);
                grouped[key].records.push(recordCopy);
            }
        });
        
        return grouped;
    }

    function displayCurrentCycleLeave(cycleData, allowances) {
        // Clear existing data
        leaveRecordsTable.innerHTML = "";
        
        // Display leave records for current cycle
        let studyDays = 0, annualDays = 0, otherDays = 0;
        
        // Sort by start date
        const sortedRecords = [...cycleData.records].sort(
            (a, b) => new Date(a.start) - new Date(b.start)
        );
        
        sortedRecords.forEach(record => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${record.start}</td>
                <td>${record.end}</td>
                <td>${record.type}</td>
                <td>${record.daysInCycle}</td>
            `;
            
            // Calculate totals for summary
            if (record.type === "Study") studyDays += record.daysInCycle;
            else if (record.type === "Annual") annualDays += record.daysInCycle;
            else otherDays += record.daysInCycle;
            
            leaveRecordsTable.appendChild(row);
        });
        
        // Update summary section
        studyLeaveUsed.textContent = studyDays;
        studyLeaveRemaining.textContent = allowances.study - studyDays;
        annualLeaveUsed.textContent = annualDays;
        annualLeaveRemaining.textContent = allowances.annual - annualDays;
        otherLeaveUsed.textContent = otherDays;
    }

    function displayOtherCyclesLeave(groupedLeave) {
        // Clear container
        cycleTablesContainer.innerHTML = "";
        
        // Sort cycles by start date (descending - newest first)
        const sortedCycles = Object.entries(groupedLeave)
            .filter(([_, group]) => !group.isCurrent)
            .sort(([_, groupA], [__, groupB]) => 
                groupB.cycle.start.getTime() - groupA.cycle.start.getTime()
            );
            
        // Display each cycle
        sortedCycles.forEach(([key, group]) => {
            const section = document.createElement("div");
            section.className = "cycle-section";
            section.innerHTML = `<h3>Cycle: ${group.cycle.year} (${key})</h3>`;
            
            if (group.records.length === 0) {
                section.innerHTML += `<p>No leave records for this cycle.</p>`;
                cycleTablesContainer.appendChild(section);
                return;
            }
            
            // Sort records by start date
            const sortedRecords = [...group.records].sort(
                (a, b) => new Date(a.start) - new Date(b.start)
            );
            
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
                    ${sortedRecords.map(record => `
                        <tr>
                            <td>${record.start}</td>
                            <td>${record.end}</td>
                            <td>${record.type}</td>
                            <td>${record.daysInCycle}</td>
                        </tr>
                    `).join("")}
                </tbody>
            `;
            
            section.appendChild(table);
            cycleTablesContainer.appendChild(section);
        });
        
        // Show or hide the section based on whether we have any cycles to display
        if (sortedCycles.length === 0) {
            otherCyclesSection.classList.add("hidden");
        } else {
            otherCyclesSection.classList.remove("hidden");
        }
    }

    function displayRegistrarDetails(registrar) {
        const currentCycle = getCurrentLeaveCycle();
        currentCycleDisplay.textContent = `${formatDate(currentCycle.start)} to ${formatDate(currentCycle.end)}`;

        // Set allowance values
        const allowances = {
            study: registrar.allowance.study || 0,
            annual: registrar.allowance.annual || 0
        };
        
        annualLeaveAllowance.textContent = allowances.annual;
        studyLeave.textContent = allowances.study;

        // Group leave records by cycle
        const groupedLeave = groupLeaveByCycle(registrar.leave_records);
        
        // Display current cycle data (including summary)
        if (groupedLeave[currentCycle.key]) {
            displayCurrentCycleLeave(groupedLeave[currentCycle.key], allowances);
            currentCycleSection.classList.remove("hidden");
        } else {
            currentCycleSection.classList.add("hidden");
        }
        
        // Display other cycles (no summary, just dates)
        displayOtherCyclesLeave(groupedLeave);
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
            } else {
                hideSections();
            }
        });
    }

    initialise();
});
