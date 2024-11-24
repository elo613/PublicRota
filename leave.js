document.addEventListener("DOMContentLoaded", () => {
    const registrarSelect = document.getElementById("registrar-select");
    const annualLeaveAllowance = document.getElementById("annual-leave-allowance");
    const studyLeave = document.getElementById("study-leave");
    const leaveRecordsTable = document.querySelector("#leave-records-table tbody");
    const studyLeaveUsed = document.getElementById("study-leave-used");
    const annualLeaveUsed = document.getElementById("annual-leave-used");
    const otherLeaveUsed = document.getElementById("other-leave-used");
    const studyLeaveRemaining = document.getElementById("study-leave-remaining");
    const annualLeaveRemaining = document.getElementById("annual-leave-remaining");
    const otherLeaveRemaining = document.getElementById("other-leave-remaining");

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
                    displayRegistrarDetails(selectedRegistrar);
                }
            });
        })
        .catch(error => console.error("Error loading data:", error));

    function displayRegistrarDetails(registrar) {
        // Combine leave allowances into Annual Leave
        const totalAnnualLeave = registrar.statutory_leave + registrar.carried_over_leave + registrar.days_off_in_lieu;
        annualLeaveAllowance.textContent = totalAnnualLeave;
        studyLeave.textContent = registrar.study_leave;

        // Update leave records
        leaveRecordsTable.innerHTML = "";
        let studyDays = 0, annualDays = 0, otherDays = 0;

        registrar.leave_records.forEach(record => {
            const row = document.createElement("tr");

            // Start Date
            const startCell = document.createElement("td");
            startCell.textContent = record.start;
            row.appendChild(startCell);

            // End Date
            const endCell = document.createElement("td");
            endCell.textContent = record.end;
            row.appendChild(endCell);

            // Leave Type
            const typeCell = document.createElement("td");
            typeCell.textContent = record.type;
            row.appendChild(typeCell);

            // Calculate the number of days excluding weekends
            const leaveDays = calculateWeekdaysBetween(record.start, record.end);
            if (record.type === "Study") studyDays += leaveDays;
            else if (record.type === "Annual") annualDays += leaveDays;
            else otherDays += leaveDays;

            leaveRecordsTable.appendChild(row);
        });

        // Calculate remaining leave
        const studyRemaining = registrar.study_leave - studyDays;
        const annualRemaining = totalAnnualLeave - annualDays;
        const otherRemaining = 0 - otherDays; // If other leave is unpaid or unlimited, adjust accordingly

        // Update leave type summaries with remaining leave
        studyLeaveUsed.textContent = studyDays;
        studyLeaveRemaining.textContent = studyRemaining;

        annualLeaveUsed.textContent = annualDays;
        annualLeaveRemaining.textContent = annualRemaining;

        otherLeaveUsed.textContent = otherDays;
        otherLeaveRemaining.textContent = otherRemaining;
    }

    function calculateWeekdaysBetween(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        let count = 0;

        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const day = date.getDay();
            // Count only weekdays (Monday to Friday)
            if (day !== 0 && day !== 6) {
                count++;
            }
        }

        return count;
    }
});
