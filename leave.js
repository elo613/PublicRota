document.addEventListener("DOMContentLoaded", () => {
    const registrarSelect = document.getElementById("registrar-select");
    const leaveDetailsTable = document.querySelector("#leave-details-summary table tbody");
    const leaveRecords = document.getElementById("leave-records");
    const leaveRecordsTable = document.querySelector("#leave-records-table tbody");
    const leaveDetailsSection = document.getElementById("leave-details-summary");

    // Hide sections by default
    hideSections();

    // Fetch the JSON data
    fetch('registrars_data.json')
        .then(response => response.json())
        .then(data => {
            // Populate the dropdown
            data.forEach(registrar => {
                const option = document.createElement("option");
                option.value = registrar.name;
                option.textContent = registrar.name;
                registrarSelect.appendChild(option);
            });

            // Event listener for registrar selection
            registrarSelect.addEventListener("change", () => {
                const selectedRegistrar = data.find(registrar => registrar.name === registrarSelect.value);
                if (selectedRegistrar) {
                    showSections();
                    displayRegistrarDetails(selectedRegistrar);
                } else {
                    hideSections();
                }
            });
        })
        .catch(error => console.error("Error loading data:", error));

    function displayRegistrarDetails(registrar) {
        // Combine leave allowances into Annual Leave
        const totalAnnualLeave = registrar.statutory_leave + registrar.carried_over_leave + registrar.days_off_in_lieu;

        // Update Leave Details Table
        leaveDetailsTable.innerHTML = ""; // Clear existing rows

        // Add Annual Leave Row
        addLeaveRow("Annual Leave", totalAnnualLeave, calculateUsedLeave(registrar.leave_records, "Annual"), totalAnnualLeave);

        // Add Study Leave Row
        addLeaveRow("Study Leave", registrar.study_leave, calculateUsedLeave(registrar.leave_records, "Study"), registrar.study_leave);

        // Add Other Leave Row
        const otherLeaveUsed = calculateUsedLeave(registrar.leave_records, "Other");
        addLeaveRow("Other Leave", "N/A", otherLeaveUsed, "N/A");

        // Update Leave Records Table
        leaveRecordsTable.innerHTML = ""; // Clear existing rows

        registrar.leave_records.forEach(record => {
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

            leaveRecordsTable.appendChild(row);
        });
    }

    function addLeaveRow(type, allowance, used, remaining) {
        const row = document.createElement("tr");

        const typeCell = document.createElement("td");
        typeCell.textContent = type;
        row.appendChild(typeCell);

        const allowanceCell = document.createElement("td");
        allowanceCell.textContent = allowance;
        row.appendChild(allowanceCell);

        const usedCell = document.createElement("td");
        usedCell.textContent = used || 0;
        row.appendChild(usedCell);

        const remainingCell = document.createElement("td");
        remainingCell.textContent = remaining || 0;
        row.appendChild(remainingCell);

        leaveDetailsTable.appendChild(row);
    }

    function calculateUsedLeave(leaveRecords, type) {
        return leaveRecords
            .filter(record => record.type === type)
            .reduce((total, record) => total + calculateWeekdaysBetween(record.start, record.end), 0);
    }

    function calculateWeekdaysBetween(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        let count = 0;

        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const day = date.getDay();
            if (day !== 0 && day !== 6) { // Exclude weekends
                count++;
            }
        }

        return count;
    }

    function hideSections() {
        leaveDetailsSection.classList.add("hidden");
        leaveRecords.classList.add("hidden");
    }

    function showSections() {
        leaveDetailsSection.classList.remove("hidden");
        leaveRecords.classList.remove("hidden");
    }
});
