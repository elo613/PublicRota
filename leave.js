document.addEventListener("DOMContentLoaded", () => {
    const registrarSelect = document.getElementById("registrar-select");
    const statutoryLeave = document.getElementById("statutory-leave");
    const carriedOverLeave = document.getElementById("carried-over-leave");
    const daysOffInLieu = document.getElementById("days-off-in-lieu");
    const studyLeave = document.getElementById("study-leave");
    const leaveRecordsTable = document.querySelector("#leave-records-table tbody");
    const studyLeaveUsed = document.getElementById("study-leave-used");
    const annualLeaveUsed = document.getElementById("annual-leave-used");
    const otherLeaveUsed = document.getElementById("other-leave-used");

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
        // Update leave allowances
        statutoryLeave.textContent = registrar.statutory_leave;
        carriedOverLeave.textContent = registrar.carried_over_leave;
        daysOffInLieu.textContent = registrar.days_off_in_lieu;
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

        // Update leave type summaries
        studyLeaveUsed.textContent = studyDays;
        annualLeaveUsed.textContent = annualDays;
        otherLeaveUsed.textContent = otherDays;
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
