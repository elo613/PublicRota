document.addEventListener("DOMContentLoaded", () => {
    const registrarSelect = document.getElementById("registrar-select");
    const currentCycleSection = document.getElementById("current-cycle-section");
    const otherCyclesSection = document.getElementById("other-cycles-section");
    const leaveRecordsTableBody = document.getElementById("leave-records-table-body");
    const currentCycleDisplay = document.getElementById("current-cycle-display");
    const cycleTablesContainer = document.getElementById("cycle-tables-container");
    
    // Summary elements
    const annualLeaveAllowance = document.getElementById("annual-leave-allowance");
    const studyLeaveAllowance = document.getElementById("study-leave-allowance");
    const studyLeaveUsed = document.getElementById("study-leave-used");
    const annualLeaveUsed = document.getElementById("annual-leave-used");
    const otherLeaveUsed = document.getElementById("other-leave-used");
    const studyLeaveRemaining = document.getElementById("study-leave-remaining");
    const annualLeaveRemaining = document.getElementById("annual-leave-remaining");

    let registrarsData = [];

    function hideSections() {
        currentCycleSection?.classList.add("hidden");
        otherCyclesSection?.classList.add("hidden");
    }

    function showSections() {
        currentCycleSection?.classList.remove("hidden");
        otherCyclesSection?.classList.remove("hidden");
    }

    function calculateWeekdaysBetween(startDate, endDate) {
        let count = 0;
        const current = new Date(startDate);
        while (current <= endDate) {
            const day = current.getDay();
            if (day !== 0 && day !== 6) {
                count++;
            }
            current.setDate(current.getDate() + 1);
        }
        return count;
    }

    function getLeaveCycleForDate(date) {
        const d = new Date(date);
        let year = d.getFullYear();
        if (d.getMonth() < 7) { 
            year--;
        }

        const start = new Date(year, 7, 1);
        while (start.getDay() !== 3) start.setDate(start.getDate() + 1);

        const end = new Date(year + 1, 7, 1);
        while (end.getDay() !== 2) end.setDate(end.getDate() + 1);
        
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

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
    
    function parseDate(dateStr) {
        const parts = dateStr.split(' ');
        const day = parts[0];
        const month = parts[1];
        const year = parts[2];
        const newDate = new Date(`${month} ${day}, ${year}`);
        newDate.setHours(0, 0, 0, 0); // Standardize to midnight
        return newDate;
    }

    function isInCycle(startDate, endDate, cycle) {
        return (startDate.getTime() <= cycle.end.getTime() && endDate.getTime() >= cycle.start.getTime());
    }
    
    function calculateDaysInCycle(startDate, endDate, leaveType, isHalfDay, cycle) {
        const start = new Date(Math.max(startDate.getTime(), cycle.start.getTime()));
        const end = new Date(Math.min(endDate.getTime(), cycle.end.getTime()));
        end.setHours(0, 0, 0, 0); // Standardize the end date for duration calculation
        
        if (start > end) return 0;
        
        let days = 0;
        if (isHalfDay) {
            if (start.toDateString() === end.toDateString() && isInCycle(start, end, cycle)) {
                days = 0.5;
            }
        } else {
            if (leaveType === "Annual") {
                days = calculateWeekdaysBetween(start, end);
            } else {
                days = ((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            }
        }
        return days;
    }

    function groupLeaveByCycle(records) {
        const grouped = {};
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const currentCycle = getLeaveCycleForDate(now);

        records.forEach(record => {
            const start = parseDate(record.start);
            const end = parseDate(record.end);
            
            let current = new Date(start);
            current.setHours(0, 0, 0, 0); // Start from the beginning of the day
            while (current <= end) {
                let thisCycle = getLeaveCycleForDate(current);
                let key = thisCycle.key;
                
                if (!grouped[key]) {
                    grouped[key] = {
                        cycle: thisCycle,
                        records: [],
                        isCurrent: thisCycle.key === currentCycle.key
                    };
                }
                
                if (!grouped[key].records.some(r => r.start === record.start && r.end === record.end)) {
                    const recordCopy = {
                        ...record,
                        start: record.start,
                        end: record.end,
                        type: record.type,
                        isHalfDay: record.half_day || false,
                        daysInCycle: calculateDaysInCycle(start, end, record.type, record.half_day, thisCycle)
                    };
                    grouped[key].records.push(recordCopy);
                }
                current.setDate(current.getDate() + 1);
            }
        });
        return grouped;
    }

    function displayCurrentCycleLeave(cycleData, allowances) {
        leaveRecordsTableBody.innerHTML = "";
        
        let studyDays = 0, annualDays = 0, otherDays = 0;
        
        const sortedRecords = [...cycleData.records].sort(
            (a, b) => parseDate(a.start) - parseDate(b.start)
        );
        
        sortedRecords.forEach(record => {
            const row = document.createElement("tr");
            
            const recordStart = parseDate(record.start);
            const recordEnd = parseDate(record.end);
            
            let duration = 0;
            if (record.isHalfDay) {
                duration = 0.5;
            } else if (record.type === "Annual") {
                duration = calculateWeekdaysBetween(recordStart, recordEnd);
            } else {
                duration = ((recordEnd.getTime() - recordStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            }
            
            row.innerHTML = `
                <td>${record.start}</td>
                <td>${record.end}</td>
                <td>${record.type}</td>
                <td>${duration}</td>
            `;
            
            if (record.type === "Study") studyDays += duration;
            else if (record.type === "Annual") annualDays += duration;
            else otherDays += duration;
            
            leaveRecordsTableBody.appendChild(row);
        });
        
        studyLeaveUsed.textContent = studyDays;
        studyLeaveRemaining.textContent = (allowances.study - studyDays).toFixed(1);
        annualLeaveUsed.textContent = annualDays;
        annualLeaveRemaining.textContent = (allowances.annual - annualDays).toFixed(1);
        otherLeaveUsed.textContent = otherDays;
    }

    function displayOtherCyclesLeave(groupedLeave) {
        cycleTablesContainer.innerHTML = "";
        
        const sortedCycles = Object.entries(groupedLeave)
            .filter(([_, group]) => !group.isCurrent)
            .sort(([_, groupA], [__, groupB]) => 
                groupB.cycle.start.getTime() - groupA.cycle.start.getTime()
            );
            
        if (sortedCycles.length === 0) {
            otherCyclesSection.classList.add("hidden");
            return;
        }
        
        sortedCycles.forEach(([key, group]) => {
            const section = document.createElement("div");
            section.className = "cycle-section";
            section.innerHTML = `<h3>Cycle: ${group.cycle.year} (${group.cycle.start.toDateString()} to ${group.cycle.end.toDateString()})</h3>`;
            
            if (group.records.length === 0) {
                section.innerHTML += `<p>No leave records for this cycle.</p>`;
                cycleTablesContainer.appendChild(section);
                return;
            }
            
            const sortedRecords = [...group.records].sort(
                (a, b) => parseDate(a.start) - parseDate(b.start)
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
                    ${sortedRecords.map(record => {
                        const recordStart = parseDate(record.start);
                        const recordEnd = parseDate(record.end);
                        let duration = 0;
                        if (record.isHalfDay) {
                            duration = 0.5;
                        } else if (record.type === "Annual") {
                            duration = calculateWeekdaysBetween(recordStart, recordEnd);
                        } else {
                            duration = ((recordEnd.getTime() - recordStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                        }
                        return `<tr><td>${record.start}</td><td>${record.end}</td><td>${record.type}</td><td>${duration}</td></tr>`;
                    }).join("")}
                </tbody>
            `;
            
            section.appendChild(table);
            cycleTablesContainer.appendChild(section);
        });
        
        otherCyclesSection.classList.remove("hidden");
    }

    function displayRegistrarDetails(registrar) {
        const currentCycle = getLeaveCycleForDate(new Date());
        currentCycleDisplay.textContent = `${formatDate(currentCycle.start)} to ${formatDate(currentCycle.end)}`;

        const allowances = {
            study: parseFloat(registrar.allowance.study) || 0,
            annual: parseFloat(registrar.allowance.annual) || 0
        };
        
        annualLeaveAllowance.textContent = allowances.annual;
        studyLeaveAllowance.textContent = allowances.study;

        const groupedLeave = groupLeaveByCycle(registrar.leave_records);
        
        if (groupedLeave[currentCycle.key]) {
            displayCurrentCycleLeave(groupedLeave[currentCycle.key], allowances);
        } else {
            leaveRecordsTableBody.innerHTML = '<tr><td colspan="4">No leave records for this cycle.</td></tr>';
            annualLeaveUsed.textContent = 0;
            annualLeaveRemaining.textContent = allowances.annual;
            studyLeaveUsed.textContent = 0;
            studyLeaveRemaining.textContent = allowances.study;
            otherLeaveUsed.textContent = 0;
        }
        
        displayOtherCyclesLeave(groupedLeave);
        showSections();
    }

    async function fetchRegistrarData() {
        try {
            const response = await fetch("./registrars_data.json");
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            registrarsData = await response.json();
            return registrarsData;
        } catch (error) {
            console.error("Error loading registrar data:", error);
            alert("Failed to load registrar data. Please try again later.");
        }
    }

    async function initialise() {
        hideSections();
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
                displayRegistrarDetails(selected);
            } else {
                hideSections();
            }
        });
    }

    initialise();
});
